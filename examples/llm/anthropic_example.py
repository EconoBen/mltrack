"""Anthropic (Claude) tracking example for mltrack."""

import asyncio
import os
from typing import List

from dotenv import load_dotenv

from mltrack import track_llm, track_llm_context

# Load environment variables from .env file
load_dotenv()

# Try to import Anthropic
try:
    from anthropic import Anthropic, AsyncAnthropic

    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    print("⚠️  Anthropic not installed. Install with: uv add anthropic")


def basic_completion_example():
    """Basic Claude completion with tracking."""
    if not HAS_ANTHROPIC:
        print("Skipping Anthropic example (not installed)")
        return

    print("\n🤖 Basic Claude Completion")

    # Initialize client
    client = Anthropic()

    @track_llm(name="anthropic-basic-completion")
    def generate_text(prompt: str, model: str = "claude-3-haiku-20240307", **kwargs):
        """Generate text using Claude."""
        response = client.messages.create(
            model=model, messages=[{"role": "user", "content": prompt}], **kwargs
        )
        return response

    # Generate text
    response = generate_text(
        prompt="Write a haiku about machine learning", max_tokens=100, temperature=0.7
    )

    print(f"Response: {response.content[0].text}")
    if hasattr(response, "usage"):
        print(f"Input tokens: {response.usage.input_tokens}")
        print(f"Output tokens: {response.usage.output_tokens}")


def conversation_example():
    """Multi-turn conversation with context tracking."""
    if not HAS_ANTHROPIC:
        return

    print("\n💬 Multi-turn Conversation with Claude")

    client = Anthropic()

    # Track entire conversation
    with track_llm_context("anthropic-conversation", tags={"type": "chat"}):
        messages = []

        # First turn
        @track_llm(name="turn-1")
        def first_turn():
            messages.append({"role": "user", "content": "What is gradient descent?"})
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                messages=messages,
                max_tokens=200,
                temperature=0.5,
                system="You are a helpful ML teacher who gives concise explanations.",
            )
            messages.append({"role": "assistant", "content": response.content[0].text})
            return response

        response1 = first_turn()
        print(f"Turn 1 response preview: {response1.content[0].text[:100]}...")

        # Second turn
        @track_llm(name="turn-2")
        def second_turn():
            messages.append({"role": "user", "content": "Can you provide a simple Python example?"})
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                messages=messages,
                max_tokens=300,
                temperature=0.5,
                system="You are a helpful ML teacher who gives concise explanations.",
            )
            return response

        response2 = second_turn()
        print(f"Turn 2 response preview: {response2.content[0].text[:100]}...")


def system_prompt_example():
    """Example with detailed system prompts."""
    if not HAS_ANTHROPIC:
        return

    print("\n📋 System Prompt Example")

    client = Anthropic()

    system_prompt = """You are an expert data scientist specializing in explaining complex ML concepts
    in simple terms. Always:
    1. Use analogies when helpful
    2. Provide concrete examples
    3. Keep explanations concise but complete
    4. Highlight key takeaways"""

    @track_llm(name="anthropic-system-prompt", tags={"feature": "system"})
    def explain_concept(concept: str):
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            system=system_prompt,
            messages=[{"role": "user", "content": f"Explain {concept} to someone new to ML"}],
            max_tokens=300,
            temperature=0.7,
        )
        return response

    concepts = ["overfitting", "cross-validation", "feature engineering"]

    for concept in concepts:
        print(f"\n📚 Explaining: {concept}")
        response = explain_concept(concept)
        print(f"Response: {response.content[0].text[:200]}...")


def streaming_example():
    """Example with streaming responses."""
    if not HAS_ANTHROPIC:
        return

    print("\n🌊 Streaming Response Example")

    client = Anthropic()

    @track_llm(name="anthropic-streaming", tags={"feature": "streaming"})
    def stream_response(prompt: str):
        # Note: We collect the stream for tracking purposes
        full_response = ""
        total_tokens = 0

        with client.messages.stream(
            model="claude-3-haiku-20240307",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7,
        ) as stream:
            for event in stream:
                if event.type == "content_block_delta":
                    content = event.delta.text
                    full_response += content
                    print(content, end="", flush=True)
                elif event.type == "message_stop":
                    # Get final message with usage info
                    message = stream.get_final_message()
                    if hasattr(message, "usage"):
                        total_tokens = message.usage.input_tokens + message.usage.output_tokens

        print()  # New line after streaming

        # Return collected response for tracking
        return {"content": full_response, "stream": True, "total_tokens": total_tokens}

    result = stream_response("Tell me a short story about a robot learning to paint.")
    print(f"\nTotal tokens used: {result['total_tokens']}")


async def async_example():
    """Async Anthropic API calls."""
    if not HAS_ANTHROPIC:
        return

    print("\n⚡ Async API Example")

    client = AsyncAnthropic()

    @track_llm(name="anthropic-async")
    async def async_generate(prompts: List[str]):
        """Generate multiple responses concurrently."""
        tasks = []
        for i, prompt in enumerate(prompts):
            task = client.messages.create(
                model="claude-3-haiku-20240307",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.7,
            )
            tasks.append(task)

        responses = await asyncio.gather(*tasks)
        return responses

    prompts = [
        "Define machine learning in one sentence.",
        "What is the difference between AI and ML?",
        "Give an example of unsupervised learning.",
    ]

    responses = await async_generate(prompts)

    for i, response in enumerate(responses):
        print(f"\nPrompt {i+1}: {prompts[i]}")
        print(f"Response: {response.content[0].text}")


def compare_models_example():
    """Compare different Claude models."""
    if not HAS_ANTHROPIC:
        return

    print("\n📊 Claude Model Comparison")

    client = Anthropic()
    prompt = "Explain quantum computing to a 10-year-old in 2-3 sentences."

    models = [
        ("claude-3-opus-20240229", "Most capable, best for complex tasks"),
        ("claude-3-sonnet-20240229", "Balanced performance and speed"),
        ("claude-3-haiku-20240307", "Fastest, most cost-effective"),
    ]

    with track_llm_context("claude-model-comparison", tags={"experiment": "compare"}):
        for model_id, description in models:
            try:

                @track_llm(name=f"test-{model_id}", tags={"model": model_id})
                def test_model():
                    response = client.messages.create(
                        model=model_id,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=150,
                        temperature=0.7,
                    )
                    return response

                print(f"\n{model_id} ({description}):")
                response = test_model()
                print(f"  Response: {response.content[0].text}")
                if hasattr(response, "usage"):
                    print(f"  Tokens: {response.usage.input_tokens + response.usage.output_tokens}")

            except Exception as e:
                print(f"  Error: {str(e)}")


def tool_use_example():
    """Example with Claude's tool use (function calling)."""
    if not HAS_ANTHROPIC:
        return

    print("\n🔧 Tool Use Example")

    client = Anthropic()

    # Define tools
    tools = [
        {
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "The unit of temperature",
                    },
                },
                "required": ["location"],
            },
        }
    ]

    @track_llm(name="anthropic-tool-use", tags={"feature": "tools"})
    def call_with_tools(query: str):
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=[{"role": "user", "content": query}],
            tools=tools,
            max_tokens=300,
        )
        return response

    response = call_with_tools("What's the weather like in New York?")

    print(f"Response: {response.content[0].text if response.content else 'No text response'}")

    # Check if Claude wants to use a tool
    for content in response.content:
        if hasattr(content, "name"):  # Tool use request
            print(f"Tool requested: {content.name}")
            print(f"Arguments: {content.input}")


def vision_example():
    """Example with Claude's vision capabilities."""
    if not HAS_ANTHROPIC:
        return

    print("\n👁️ Vision Model Example")

    client = Anthropic()

    @track_llm(name="anthropic-vision", tags={"feature": "vision"})
    def analyze_image(image_url: str, prompt: str):
        # For Claude, we need to specify image in message content
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image", "source": {"type": "url", "url": image_url}},
                    ],
                }
            ],
            max_tokens=300,
        )
        return response

    # Example with a public image
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"

    try:
        response = analyze_image(image_url, "Describe this image in detail. What can you see?")
        print(f"Vision response: {response.content[0].text}")
    except Exception as e:
        print(f"Vision example error: {str(e)}")


def main():
    """Run all Anthropic examples."""
    if not HAS_ANTHROPIC:
        print("\n⚠️  Anthropic package not installed.")
        print("Install with: uv add anthropic")
        print("Also set your ANTHROPIC_API_KEY environment variable")
        return

    # Check for API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("\n⚠️  ANTHROPIC_API_KEY not set")
        print("Set it with: export ANTHROPIC_API_KEY='your-key-here'")
        return

    print("🚀 MLtrack Anthropic (Claude) Integration Examples\n")
    print("=" * 50)

    # Run examples
    basic_completion_example()
    conversation_example()
    system_prompt_example()
    streaming_example()
    compare_models_example()
    tool_use_example()
    vision_example()

    # Run async example
    asyncio.run(async_example())

    print("\n" + "=" * 50)
    print("✅ All examples completed!")
    print("\nTo view results:")
    print("  1. Run: uv run python -m mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("  3. Look for runs tagged with 'mltrack.type': 'llm'")


if __name__ == "__main__":
    main()
