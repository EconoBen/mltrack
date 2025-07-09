# LLM Tracking in mltrack

mltrack now includes comprehensive support for tracking Large Language Model (LLM) interactions, building on top of MLflow's LLM tracking capabilities while adding enhanced features for production use.

## Features

### 🔍 Auto-Detection of LLM Frameworks
- OpenAI
- Anthropic (Claude)
- LangChain (including community and provider-specific packages)
- LlamaIndex
- LiteLLM
- DSPy

### 📊 Comprehensive LLM Tracking
- **Prompt & Response Logging**: Full conversation history with timestamps
- **Token Usage Tracking**: Input, output, and total tokens per call
- **Cost Estimation**: Automatic cost calculation for 20+ models
- **Cumulative Metrics**: Running totals for tokens and costs
- **Multi-turn Conversations**: Full context preservation
- **Streaming Support**: Handle streaming responses
- **Error Tracking**: Capture and log failed API calls

### 💰 Cost Tracking
mltrack includes pricing data for popular models:
- OpenAI: GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo
- Anthropic: Claude 3 Opus, Sonnet, Haiku, Claude 2.x
- Google: Gemini Pro, Gemini 1.5
- Meta: Llama 2 & 3 variants
- Mistral: Tiny, Small, Medium, Large, Mixtral
- And more...

## Usage

### Basic Tracking with Context Manager

```python
from mltrack import track_llm_context
import openai

client = openai.OpenAI()

with track_llm_context("chat-analysis", model="gpt-4", provider="openai") as tracker:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Explain quantum computing"}],
        temperature=0.7
    )
    
    # Automatic logging of prompt, response, tokens, and cost
    tracker.log_prompt_response(
        prompt=[{"role": "user", "content": "Explain quantum computing"}],
        response=response.choices[0].message.content,
        model="gpt-4",
        provider="openai",
        token_usage={
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
    )
```

### Using with the @track Decorator

```python
from mltrack import track, LLMTracker

@track(tags={"task": "summarization"})
def summarize_text(text: str) -> str:
    llm_tracker = LLMTracker()
    
    # Your LLM call here
    response = call_llm_api(text)
    
    # Log the interaction
    llm_tracker.log_prompt_response(
        prompt=text,
        response=response.content,
        model="gpt-3.5-turbo",
        provider="openai",
        token_usage=response.usage
    )
    
    return response.content
```

### Enable MLflow Auto-logging

For automatic tracking without manual logging:

```python
import mlflow

# Enable for OpenAI
mlflow.openai.autolog()

# Enable for Anthropic
mlflow.anthropic.autolog()

# Now all API calls are automatically tracked!
```

### Multi-turn Conversations

```python
with track_llm_context("conversation", model="claude-3-sonnet", provider="anthropic") as tracker:
    messages = []
    
    for user_input in user_inputs:
        messages.append({"role": "user", "content": user_input})
        
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=messages,
            max_tokens=200
        )
        
        messages.append({"role": "assistant", "content": response.content})
        
        # Each turn is logged with full context
        tracker.log_prompt_response(
            prompt=messages,
            response=response.content,
            model="claude-3-sonnet-20240229",
            provider="anthropic",
            token_usage={...}
        )
```

## Configuration

Add to your `.mltrack.yml`:

```yaml
# LLM tracking settings
llm_tracking_enabled: true
llm_log_prompts: true
llm_log_responses: true
llm_track_token_usage: true
llm_track_costs: true
llm_token_limit_warning: 100000  # Warn at 100k tokens
llm_cost_limit_warning: 10.0     # Warn at $10 USD

# Provider-specific settings
llm_providers:
  openai:
    default_model: "gpt-4o-mini"
  anthropic:
    default_model: "claude-3-haiku-20240307"
```

## Metrics Tracked

### Token Metrics
- `llm.tokens.prompt` - Input token count
- `llm.tokens.completion` - Output token count
- `llm.tokens.total` - Total tokens used
- `llm.tokens.cumulative.*` - Running totals

### Cost Metrics
- `llm.cost.prompt` - Cost for input tokens
- `llm.cost.completion` - Cost for output tokens
- `llm.cost.total` - Total cost per call
- `llm.cost.cumulative` - Running total cost

### Performance Metrics
- `llm.latency` - API call response time
- `execution_time_seconds` - Total function execution time

## Custom Extractors

For LLM libraries not directly supported, you can create custom extractors:

```python
def custom_prompt_extractor(args, kwargs):
    return kwargs.get("query", "")

def custom_response_extractor(response):
    return response.get("text", "")

def custom_token_extractor(response):
    return {
        "prompt_tokens": response.get("input_tokens", 0),
        "completion_tokens": response.get("output_tokens", 0),
        "total_tokens": response.get("total_tokens", 0),
    }

llm_tracker = LLMTracker()

@llm_tracker.track_llm_call(
    model="custom-model",
    provider="custom",
    extract_prompt=custom_prompt_extractor,
    extract_response=custom_response_extractor,
    extract_token_usage=custom_token_extractor,
)
def call_custom_llm(query: str):
    # Your custom LLM call
    pass
```

## Integration with MLflow Tracing

mltrack's LLM tracking integrates seamlessly with MLflow's tracing capabilities:

- Automatic trace generation for supported providers
- OpenTelemetry compatibility
- Export traces to observability platforms
- Production-ready monitoring

## Best Practices

1. **Always track token usage** - Monitor costs and set alerts
2. **Log full conversations** - Maintain context for debugging
3. **Set cost limits** - Prevent unexpected charges
4. **Use provider auto-logging** - Reduce manual tracking code
5. **Tag your experiments** - Organize LLM experiments effectively

## Limitations

- 500-character limit for parameter logging (full prompts logged as artifacts)
- Token tracking requires MLflow >= 3.1.0 for some features
- Cost estimates are approximate and should be verified with provider billing
- Some provider-specific features may require latest MLflow versions

## Future Enhancements

- Support for more LLM providers (Cohere, AI21, etc.)
- Enhanced streaming support
- Real-time cost alerts
- Prompt template versioning
- A/B testing utilities for prompts