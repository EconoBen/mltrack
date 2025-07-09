#!/usr/bin/env python3
"""
LLM Cost Tracking Demo
Shows real-time cost accumulation across different models
"""

import os

from mltrack import track_llm, track_llm_context

# Check for API keys
if not os.getenv("OPENAI_API_KEY"):
    print("⚠️  OPENAI_API_KEY not set. Please set it to run this demo.")
    print("   export OPENAI_API_KEY='your-key-here'")
    exit(1)

from openai import OpenAI

client = OpenAI()

print("💰 MLtrack LLM Cost Tracking Demo")
print("=" * 60)

# Different tasks to demonstrate cost differences
tasks = [
    {
        "name": "simple_classification",
        "prompt": "Is this positive or negative: 'Great product!' Reply with one word only.",
        "max_tokens": 5,
    },
    {
        "name": "code_generation",
        "prompt": "Write a Python function to calculate fibonacci numbers. Include docstring.",
        "max_tokens": 150,
    },
    {
        "name": "summarization",
        "prompt": "Summarize in 3 bullet points: Machine learning is a subset of AI that enables systems to learn from data.",
        "max_tokens": 100,
    },
]

# Test different models
models = ["gpt-4o", "o3-mini"]

print("\nRunning cost comparison across models and tasks...\n")

with track_llm_context("llm-cost-analysis", tags={"demo": "cost_tracking"}):
    total_cost = 0.0

    for model in models:
        print(f"\n🤖 Testing {model}:")
        print("-" * 40)

        for task in tasks:

            @track_llm(name=f"{model}-{task['name']}")
            def run_task():
                try:
                    # o3-mini uses different parameters
                    if model == "o3-mini":
                        response = client.chat.completions.create(
                            model=model,
                            messages=[{"role": "user", "content": task["prompt"]}],
                            max_completion_tokens=task["max_tokens"],
                            # o3-mini doesn't support temperature
                        )
                    else:
                        response = client.chat.completions.create(
                            model=model,
                            messages=[{"role": "user", "content": task["prompt"]}],
                            max_tokens=task["max_tokens"],
                            temperature=0.7,
                        )
                    return response
                except Exception as e:
                    print(f"   Error: {e}")
                    return None

            response = run_task()
            if response:
                tokens = response.usage.total_tokens
                # Rough cost estimation based on current pricing
                if model == "gpt-4o":
                    # GPT-4o: $5/1M input, $15/1M output tokens
                    input_cost = (response.usage.prompt_tokens / 1_000_000) * 5
                    output_cost = (response.usage.completion_tokens / 1_000_000) * 15
                    cost = input_cost + output_cost
                elif model == "o3-mini":
                    # o3-mini: $15/1M input, $60/1M output tokens
                    input_cost = (response.usage.prompt_tokens / 1_000_000) * 15
                    output_cost = (response.usage.completion_tokens / 1_000_000) * 60
                    cost = input_cost + output_cost
                else:
                    # Default/GPT-3.5 pricing
                    cost = (tokens / 1000) * 0.002

                total_cost += cost
                print(f"   {task['name']}: {tokens} tokens ≈ ${cost:.4f}")

print(f"\n💵 Total estimated cost: ${total_cost:.4f}")
print("\n✅ Run 'mltrack ui' to see detailed cost breakdowns and token usage!")
