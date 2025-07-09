"""Standalone demo of LLM cost estimation functionality."""

def estimate_llm_cost_demo(model: str, prompt_tokens: int, completion_tokens: int) -> dict:
    """Simplified cost estimation for demo purposes."""
    # Cost per 1M tokens (as of 2024)
    pricing = {
        "gpt-4": {"prompt": 30.0, "completion": 60.0},
        "gpt-4o": {"prompt": 5.0, "completion": 15.0},
        "gpt-4o-mini": {"prompt": 0.15, "completion": 0.60},
        "gpt-3.5-turbo": {"prompt": 0.50, "completion": 1.50},
        "claude-3-opus": {"prompt": 15.0, "completion": 75.0},
        "claude-3-sonnet": {"prompt": 3.0, "completion": 15.0},
        "claude-3-haiku": {"prompt": 0.25, "completion": 1.25},
        "mistral-large": {"prompt": 8.0, "completion": 24.0},
    }
    
    if model not in pricing:
        return None
    
    rates = pricing[model]
    prompt_cost = (prompt_tokens / 1_000_000) * rates["prompt"]
    completion_cost = (completion_tokens / 1_000_000) * rates["completion"]
    
    return {
        "prompt_cost": prompt_cost,
        "completion_cost": completion_cost,
        "total_cost": prompt_cost + completion_cost,
        "model": model,
        "tokens": prompt_tokens + completion_tokens
    }


def main():
    print("🤖 MLtrack LLM Cost Estimation Demo\n")
    print("This demo shows how mltrack estimates costs for various LLM providers.\n")
    
    # Example scenarios
    scenarios = [
        ("Simple chat query", [
            ("gpt-4o-mini", 150, 50),
            ("claude-3-haiku", 150, 50),
        ]),
        ("Complex analysis task", [
            ("gpt-4", 2000, 1500),
            ("claude-3-opus", 2000, 1500),
        ]),
        ("Bulk processing", [
            ("gpt-3.5-turbo", 50000, 25000),
            ("mistral-large", 50000, 25000),
        ]),
    ]
    
    for scenario_name, models in scenarios:
        print(f"\n📊 Scenario: {scenario_name}")
        print("-" * 60)
        
        for model, prompt_tokens, completion_tokens in models:
            cost = estimate_llm_cost_demo(model, prompt_tokens, completion_tokens)
            if cost:
                print(f"  {model:<20} {cost['tokens']:>8} tokens = ${cost['total_cost']:>8.4f}")
    
    print("\n✨ Key Features of mltrack LLM Tracking:")
    print("  • Automatic cost estimation for 20+ models")
    print("  • Token usage tracking (input/output/total)")
    print("  • Cumulative cost warnings")
    print("  • Prompt and response logging")
    print("  • Multi-turn conversation support")
    print("  • Integration with MLflow tracing")
    print("\n📈 With mltrack, you can:")
    print("  • Monitor LLM costs in real-time")
    print("  • Set budget alerts")
    print("  • Compare model performance vs cost")
    print("  • Track token usage patterns")
    print("  • Optimize prompt engineering")


if __name__ == "__main__":
    main()