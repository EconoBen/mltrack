# LLM Tracking in mltrack

mltrack provides lightweight LLM tracking on top of MLflow. Use the `@track_llm` decorator to log prompts, responses, token usage, cost, and latency with a canonical schema so the UI works out of the box.

## Features

### 🔍 Provider Auto-Detection
- OpenAI
- Anthropic (Claude)
- Google Gemini (GenAI)
- Google Vertex AI
- AWS Bedrock
- LangChain and LiteLLM (provider inferred from model name)
- **llama-party** (automatic tracking built-in)

### ⏱️ Async + Streaming Support
- Async functions are tracked automatically.
- Streaming iterators and async generators log metrics when the stream completes.
- Tokens and cost are derived from the final chunk when available.

### 📊 What Gets Logged
- **Prompt & Response Artifacts** (JSON for messages/outputs)
- **Token Usage** (prompt/completion/total)
- **Cost Estimate** (when pricing is known)
- **Latency** in milliseconds

## Usage

### Track a Single Call

```python
from mltrack import track_llm
from openai import OpenAI

client = OpenAI()

@track_llm()
def call_openai(prompt: str, model: str = "gpt-4o-mini"):
    return client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )

response = call_openai("Explain quantum computing.")
print(response.choices[0].message.content)
```

### Track a Streaming Call

```python
from mltrack import track_llm
from openai import OpenAI

client = OpenAI()

@track_llm()
def stream_openai(prompt: str, model: str = "gpt-4o-mini"):
    return client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

for chunk in stream_openai("Explain quantum computing."):
    pass
```

### Group Multiple Calls

```python
from mltrack import track_llm, track_llm_context
from anthropic import Anthropic

client = Anthropic()

@track_llm(name="claude-turn")
def claude_turn(messages, model: str = "claude-3-haiku-20240307"):
    return client.messages.create(
        model=model,
        messages=messages,
        max_tokens=200,
    )

with track_llm_context(
    "conversation",
    tags={"llm.provider": "anthropic", "llm.model": "claude-3-haiku-20240307"},
):
    messages = [{"role": "user", "content": "Hi"}]
    response = claude_turn(messages)
```

### MLflow Auto-Logging (Optional)

MLflow also offers provider-specific autologging. You can use it alongside `track_llm` if desired:

```python
import mlflow

mlflow.openai.autolog()
mlflow.anthropic.autolog()
```

## Canonical Tags and Metrics

### Tags
- `llm.provider`
- `llm.model`

### Metrics
- `llm.tokens.prompt_tokens`
- `llm.tokens.completion_tokens`
- `llm.tokens.total_tokens`
- `llm.cost_usd`
- `llm.latency_ms`

### Provider-Specific Token Metrics (Optional)
- Anthropic: `llm.tokens.cache_creation_input_tokens`, `llm.tokens.cache_read_input_tokens`
- Bedrock: `llm.tokens.cache_read_input_tokens`, `llm.tokens.cache_write_input_tokens`
- Gemini: `llm.tokens.cached_content_token_count`, `llm.tokens.tool_use_prompt_token_count`

## Cost Estimation

`mltrack` estimates cost using a LiteLLM pricing snapshot. If pricing is missing for a model, cost is not logged.

To provide or refresh pricing:
1. Generate a snapshot from LiteLLM (see `scripts/refresh_pricing_snapshot.py`).
2. Point `MLTRACK_LLM_PRICING_SNAPSHOT` at the generated JSON if you want to override the bundled snapshot.

## Integrated Providers

### llama-party

[llama-party](https://github.com/workhelix/llama-party) has built-in mltrack support. Install with the mltrack extra:

```bash
uv add llama-party[mltrack]
```

All LLM calls are automatically tracked—no decorators needed:

```python
from llama_party import LlamaPartyClient
import mlflow

client = LlamaPartyClient()

# Optional: set experiment
mlflow.set_experiment("my-app")

# Tracking happens automatically
response = client.generate(
    "Summarize this document...",
    model="claude-sonnet-4-20250514"
)
```

llama-party logs the same canonical metrics (`llm.latency_ms`, `llm.tokens.*`, `llm.cost_usd`) and tags (`llm.provider`, `llm.model`, `llm.finish_reason`, `llm.request_id`) so dashboards work out of the box.

## Best Practices

1. **Track tokens + cost** for budget visibility.
2. **Log prompts and responses** for debugging (use `log_inputs=False` / `log_outputs=False` to disable).
3. **Tag experiments** with `llm.provider` and `llm.model` for clean dashboards.
