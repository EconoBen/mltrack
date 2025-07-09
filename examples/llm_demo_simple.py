"""Simple demo of mltrack's LLM tracking features - no actual API calls."""

# Add src to path for demo
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from mltrack.utils import estimate_llm_cost

def demo_cost_estimation():
    """Demo cost estimation for various LLM models."""
    print("🤖 MLtrack LLM Cost Estimation Demo\n")
    
    models_to_test = [
        ("gpt-4", 1000, 500),
        ("gpt-4o-mini", 5000, 2000),
        ("claude-3-opus", 2000, 1000),
        ("claude-3-haiku", 10000, 5000),
        ("gpt-3.5-turbo", 8000, 4000),
        ("mistral-large", 3000, 1500),
    ]
    
    total_cost = 0.0
    
    print("Model Cost Estimation:")
    print("-" * 70)
    print(f"{'Model':<20} {'Prompt Tokens':<15} {'Completion':<15} {'Total Cost':<15}")
    print("-" * 70)
    
    for model, prompt_tokens, completion_tokens in models_to_test:
        cost = estimate_llm_cost(model, prompt_tokens, completion_tokens)
        if cost:
            total_cost += cost["total_cost"]
            print(f"{model:<20} {prompt_tokens:<15,} {completion_tokens:<15,} ${cost['total_cost']:<14.4f}")
        else:
            print(f"{model:<20} {prompt_tokens:<15,} {completion_tokens:<15,} N/A")
    
    print("-" * 70)
    print(f"{'Total Estimated Cost:':<50} ${total_cost:.4f}")
    print()
    
    # Show pricing details for one model
    print("\n📊 Detailed Pricing for GPT-4:")
    cost = estimate_llm_cost("gpt-4", 1000, 500)
    if cost:
        print(f"  Prompt rate: ${cost['prompt_rate_per_1m']}/1M tokens")
        print(f"  Completion rate: ${cost['completion_rate_per_1m']}/1M tokens")
        print(f"  Prompt cost: ${cost['prompt_cost']:.4f}")
        print(f"  Completion cost: ${cost['completion_cost']:.4f}")
        print(f"  Total cost: ${cost['total_cost']:.4f}")


def demo_llm_tracking_config():
    """Demo LLM tracking configuration."""
    print("\n📋 MLtrack LLM Configuration Options:\n")
    
    config_yaml = """# .mltrack.yml - LLM tracking configuration
    
# LLM tracking settings
llm_tracking_enabled: true         # Enable LLM-specific features
llm_log_prompts: true             # Log prompts sent to LLMs
llm_log_responses: true           # Log responses from LLMs
llm_track_token_usage: true       # Track token usage
llm_track_costs: true             # Estimate and track costs
llm_token_limit_warning: 100000   # Warn at 100k tokens
llm_cost_limit_warning: 10.0      # Warn at $10 USD

# Provider-specific settings
llm_providers:
  openai:
    default_model: "gpt-4o-mini"
    max_retries: 3
  anthropic:
    default_model: "claude-3-haiku-20240307"
    max_retries: 2
"""
    
    print(config_yaml)


def demo_tracking_features():
    """Demo what gets tracked for LLM calls."""
    print("\n🔍 What MLtrack Tracks for LLMs:\n")
    
    features = [
        ("Prompts & Responses", "Full conversation history with timestamps"),
        ("Token Usage", "Input, output, and total tokens per call"),
        ("Cost Estimation", "Automatic cost calculation based on model pricing"),
        ("Cumulative Metrics", "Running totals for tokens and costs"),
        ("Model Parameters", "Temperature, max_tokens, top_p, etc."),
        ("Execution Time", "Latency for each API call"),
        ("Error Tracking", "Failed calls with error messages"),
        ("Multi-turn Conversations", "Full context preservation"),
        ("Framework Detection", "Auto-detect OpenAI, Anthropic, LangChain, etc."),
        ("MLflow Integration", "Seamless integration with MLflow's tracing features"),
    ]
    
    for feature, description in features:
        print(f"  ✓ {feature:<25} - {description}")


def main():
    """Run all demos."""
    print("=" * 80)
    print("🚀 MLtrack LLM Tracking Features Demo")
    print("=" * 80)
    
    demo_cost_estimation()
    demo_llm_tracking_config()
    demo_tracking_features()
    
    print("\n✨ To use MLtrack with your LLM projects:")
    print("  1. Install: pip install mltrack (or uv add mltrack)")
    print("  2. Import: from mltrack import track_llm_context")
    print("  3. Track: with track_llm_context('my-llm-task', 'gpt-4', 'openai'): ...")
    print("\n📊 View results in MLflow UI: mlflow ui")
    print("=" * 80)


if __name__ == "__main__":
    main()