# mltrack - Universal ML Tracking Tool

🚀 **Zero-config ML experiment tracking that just works**

mltrack makes ML experiment tracking effortless. It automatically detects your ML framework, captures all relevant metrics, and integrates with your existing workflow.

## Why mltrack?

- **Zero Configuration**: Just add `@track` to your training function
- **Auto-Detection**: Automatically configures for sklearn, PyTorch, TensorFlow, and more
- **Git Integration**: Tracks code version, uncommitted changes, and links to commits
- **Team Friendly**: Built-in support for shared experiments and notifications
- **UV First**: Optimized for UV package manager for fast, reliable environments

## Installation

### Recommended: Using UV (fastest)

```bash
# Install UV if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install mltrack as a tool
uvx mltrack

# Or add to your project
uv add mltrack
```

### Alternative: Using pip

```bash
pip install mltrack
```

> ⚠️ **Note**: We strongly recommend using UV for better performance and reproducibility. mltrack will warn when not running in a UV environment.

## Quick Start

### 1. Basic Usage

```python
from mltrack import track

@track  # That's it!
def train_model(X, y, learning_rate=0.01):
    from sklearn.ensemble import RandomForestClassifier
    
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X, y)
    
    return model

# Your experiment is automatically tracked!
model = train_model(X_train, y_train)
```

### 2. Using Context Manager

```python
from mltrack import track_context
import mlflow

with track_context("data-preprocessing"):
    # Your preprocessing code
    processed_data = preprocess(raw_data)
    
    # Log custom metrics
    mlflow.log_metric("num_samples", len(processed_data))
    mlflow.log_metric("num_features", processed_data.shape[1])
```

### 3. CLI Usage

```bash
# Initialize mltrack in your project
mltrack init

# Run any Python script with tracking
mltrack run python train.py

# Launch experiment tracking UI
mltrack ui                    # Launches MLflow UI
mltrack ui --port 5001       # Use a different port

# Check your setup
mltrack doctor

# View the demo
mltrack demo
```

## Features

### 🔍 Auto-Detection
- Automatically detects and configures for sklearn, PyTorch, TensorFlow, XGBoost, and more
- **NEW**: Full support for LLM frameworks - OpenAI, Anthropic, LangChain, LlamaIndex, and more
- No manual configuration needed

### 📊 Comprehensive Tracking
- Model parameters and hyperparameters
- Training metrics and artifacts
- System information (Python version, dependencies)
- Git information (commit, branch, uncommitted changes)
- **NEW**: LLM-specific tracking:
  - Prompt and response logging
  - Token usage tracking
  - Cost estimation for popular models
  - Multi-turn conversation support
  - Streaming response support

### 👥 Team Features
- Shared MLflow server configuration
- Team namespaces for experiments
- Slack/Teams notifications for completed runs
- Automatic experiment comparison

### 🔗 Integrations
- **GitHub**: Automatic PR comments with experiment results
- **Linear**: Link experiments to tasks
- **Jupyter**: Auto-track notebook executions
- **VS Code**: Extension for one-click tracking

## Configuration

Create a `.mltrack.yml` file in your project root:

```yaml
# Team settings
team_name: ml-team
experiment_name: my-project/experiments

# MLflow server (optional)
tracking_uri: http://mlflow.company.com:5000

# Notifications (optional)
slack_webhook: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Environment settings
require_uv: false  # Set to true to enforce UV usage
warn_non_uv: true  # Show warning when not using UV

# Auto-logging settings
auto_log_git: true
auto_log_pip: true
auto_detect_frameworks: true

# LLM tracking settings
llm_tracking_enabled: true
llm_log_prompts: true
llm_log_responses: true
llm_track_token_usage: true
llm_track_costs: true
llm_token_limit_warning: 100000  # Warn at 100k tokens
llm_cost_limit_warning: 10.0  # Warn at $10 USD
```

## LLM Tracking Features 🤖

### Track OpenAI API Calls

```python
from mltrack import track_llm_context
import openai

# Automatic tracking with context manager
with track_llm_context("chat-session", model="gpt-4", provider="openai") as tracker:
    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello!"}]
    )
    
    # Automatic logging of prompts, responses, and token usage
    tracker.log_prompt_response(
        prompt=[{"role": "user", "content": "Hello!"}],
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

### Track Anthropic Claude

```python
import anthropic

with track_llm_context("claude-chat", model="claude-3-haiku", provider="anthropic") as tracker:
    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-3-haiku-20240307",
        messages=[{"role": "user", "content": "Explain quantum computing"}],
        max_tokens=100
    )
    # Token usage and costs are automatically tracked
```

### Enable Auto-Logging for LLMs

```python
import mlflow

# Enable automatic tracking for OpenAI
mlflow.openai.autolog()

# Enable automatic tracking for Anthropic
mlflow.anthropic.autolog()

# Now all API calls are automatically tracked!
```

### Cost Tracking

mltrack automatically estimates costs for popular LLM models:

```python
# After your LLM calls, check the MLflow UI for:
# - llm.cost.prompt ($ for input tokens)
# - llm.cost.completion ($ for output tokens)  
# - llm.cost.total (total cost)
# - llm.cost.cumulative (running total)
```

## Advanced Usage

### Custom Tags

```python
@track(tags={"version": "2.0", "dataset": "customers"})
def train_model(data):
    # Your training code
    pass
```

### Disable Argument Logging

```python
@track(log_args=False)  # Don't log function arguments
def train_model(sensitive_data):
    pass
```

### Enhanced UI with Aim

mltrack supports [Aim](https://github.com/aimhubio/aim) for a more advanced experiment tracking UI:

```bash
# Launch Aim UI (recommended)
mltrack ui

# Custom port
mltrack ui --port 43801

# Access Aim UI at http://localhost:43800
```

**Aim Features:**
- 🎯 Advanced experiment comparison and grouping
- 📊 Interactive metric exploration
- 🔍 Powerful search and filtering
- 📈 Custom dashboards and views
- 🤝 Better collaboration features
- 🔄 Automatic sync from MLflow experiments

**Note**: Aim requires Python 3.12 or earlier on macOS ARM64.

**Fallback to MLflow UI:**
```bash
# Use standard MLflow UI
mltrack ui --use-mlflow

# Custom port
mltrack ui --use-mlflow --port 5001
```

**Docker Option (if native installation fails):**
```bash
# Generate docker-compose.yml
mltrack ui --docker-compose
docker-compose up -d
```

## LLM Tracking

mltrack provides specialized tracking for Large Language Models:

### Basic LLM Tracking

```python
from mltrack import track_llm
from openai import OpenAI

client = OpenAI()

@track_llm(name="gpt-completion")
def generate_text(prompt: str):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    return response

# Automatically tracks:
# - Prompt and response
# - Token usage (input/output/total)
# - Cost estimation
# - Latency
# - Model parameters
response = generate_text("Explain machine learning")
```

### Multi-turn Conversations

```python
from mltrack import track_llm_context

with track_llm_context("customer-support-chat"):
    # All LLM calls within this context are tracked together
    messages = []
    
    for user_input in conversation:
        response = generate_response(messages + [{"role": "user", "content": user_input}])
        messages.append({"role": "assistant", "content": response})
    
    # Aggregated metrics are automatically logged:
    # - Total tokens across all turns
    # - Total cost
    # - Number of turns
    # - Total latency
```

### Anthropic (Claude) Support

```python
from anthropic import Anthropic

client = Anthropic()

@track_llm(name="claude-analysis")
def analyze_with_claude(text: str):
    response = client.messages.create(
        model="claude-3-sonnet-20240229",
        messages=[{"role": "user", "content": f"Analyze this: {text}"}],
        max_tokens=300
    )
    return response
```

### LLM Configuration

Configure LLM tracking in `.mltrack.yml`:

```yaml
# LLM tracking settings
llm_tracking_enabled: true
llm_log_prompts: true
llm_log_responses: true
llm_track_token_usage: true
llm_track_costs: true
llm_token_limit_warning: 100000  # Warn after 100k tokens
llm_cost_limit_warning: 10.0     # Warn after $10 USD
```

### Manual Framework Setup

```python
from mltrack import MLTracker
from mltrack.config import MLTrackConfig

# Custom configuration
config = MLTrackConfig(
    tracking_uri="http://localhost:5000",
    require_uv=True,  # Enforce UV environment
)

tracker = MLTracker(config)
```

## Environment Management

mltrack is optimized for UV environments and will warn when not using UV:

```bash
# Create a UV environment
uv venv

# Install dependencies
uv pip install -r requirements.txt

# Run with UV
uv run python train.py
```

## Examples

mltrack includes comprehensive examples for both traditional ML and LLM tracking:

### Traditional ML Examples

```bash
# Scikit-learn examples
uv run python examples/ml/sklearn_examples.py

# PyTorch examples  
uv run python examples/ml/pytorch_examples.py

# XGBoost/LightGBM examples
uv run python examples/ml/xgboost_lightgbm_examples.py
```

### LLM Examples

```bash
# OpenAI examples (requires OPENAI_API_KEY)
uv run python examples/llm/openai_example.py

# Anthropic examples (requires ANTHROPIC_API_KEY)
uv run python examples/llm/anthropic_example.py

# Unified ML + LLM example
uv run python examples/unified_ml_llm_example.py
```

## Contributing

```bash
# Clone the repository
git clone https://github.com/yourorg/mltrack
cd mltrack

# Create UV environment
uv venv
uv pip install -e ".[dev]"

# Run tests
uv run pytest

# Run linting
uv run ruff check .
uv run mypy .
```

## License

MIT License - see LICENSE file for details.