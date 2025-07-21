<div align="center">
  <h1>🚀 MLTrack</h1>
  
  <p>
    <strong>Modern machine learning experiment tracking and deployment platform</strong>
  </p>
  
  <p>
    <a href="https://github.com/EconoBen/mltrack/actions">
      <img src="https://github.com/EconoBen/mltrack/actions/workflows/test.yml/badge.svg" alt="Test Status">
    </a>
    <a href="https://pypi.org/project/mltrack/">
      <img src="https://img.shields.io/pypi/v/mltrack.svg" alt="PyPI Version">
    </a>
    <a href="https://github.com/EconoBen/mltrack/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
    </a>
    <a href="https://mltrack.readthedocs.io">
      <img src="https://readthedocs.org/projects/mltrack/badge/?version=latest" alt="Documentation">
    </a>
    <a href="https://github.com/EconoBen/mltrack/stargazers">
      <img src="https://img.shields.io/github/stars/EconoBen/mltrack?style=social" alt="GitHub Stars">
    </a>
  </p>
  
  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-documentation">Documentation</a> •
    <a href="#-examples">Examples</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 🎯 Why MLTrack?

**MLTrack** simplifies machine learning experiment tracking and model deployment. Built on MLflow's robust foundation, it provides a modern interface and streamlined workflows that make ML development a joy.

```python
from mltrack import track

@track
def train_model(learning_rate=0.01, batch_size=32):
    # Your training code here
    model = train(learning_rate, batch_size)
    return model

# That's it! Experiments are automatically tracked 🎉
```

## ✨ Features

### 🚀 **Zero-Configuration Tracking**
- Simple `@track` decorator automatically captures metrics, parameters, and artifacts
- Intelligent framework detection (PyTorch, TensorFlow, scikit-learn, XGBoost, and more)
- No boilerplate code required

### 💰 **LLM Cost Tracking**
- Track token usage and costs for OpenAI, Anthropic, and other providers
- Monitor spending across experiments and teams
- Set budget alerts and limits

### 🎨 **Beautiful Modern UI**
- Next.js 15 powered interface with real-time updates
- Interactive visualizations for metrics and comparisons
- Dark mode support

### 🚢 **One-Click Deployment**
- Deploy models to Modal, AWS Lambda, or containers
- Automatic API generation with FastAPI
- Built-in load balancing and scaling

### 👥 **Team Collaboration**
- Multi-user support with role-based access
- Shared experiments and model registry
- Comments and annotations

### 📊 **Advanced Analytics**
- Hyperparameter importance analysis
- Automatic experiment comparison
- Custom dashboards and reports

## 🚀 Quick Start

### Installation

```bash
pip install mltrack
```

### Basic Usage

```python
from mltrack import track, log_metric
import numpy as np

@track
def train_model(n_estimators=100, max_depth=10):
    # Simulate training
    for epoch in range(10):
        loss = np.random.random() * (0.1 / (epoch + 1))
        log_metric("loss", loss, step=epoch)
    
    accuracy = 0.85 + np.random.random() * 0.1
    log_metric("accuracy", accuracy)
    
    return {"model": "trained_model_data"}

# Run experiment
train_model(n_estimators=150, max_depth=12)
```

### Start the UI

```bash
mltrack ui
```

Navigate to http://localhost:3000 to see your experiments!

### Deploy a Model

```bash
# Deploy the best model from an experiment
mltrack deploy --experiment my_experiment --platform modal

# Or deploy a specific run
mltrack deploy --run-id abc123 --platform lambda
```

## 📚 Documentation

- **[Getting Started Guide](docs/getting-started.md)** - Set up MLTrack in 5 minutes
- **[User Guide](docs/user-guide.md)** - Comprehensive feature documentation
- **[API Reference](docs/api-reference.md)** - Detailed API documentation
- **[Deployment Guide](docs/deployment.md)** - Deploy models to production
- **[Examples](examples/)** - Sample projects and notebooks

## 🎓 Examples

### Computer Vision
```python
from mltrack import track
import torch
import torchvision

@track(project="image-classification")
def train_resnet(learning_rate=0.001, epochs=10):
    model = torchvision.models.resnet18(pretrained=True)
    # Training code...
    return model
```

### Natural Language Processing
```python
from mltrack import track
from transformers import AutoModelForSequenceClassification

@track(project="sentiment-analysis") 
def fine_tune_bert(model_name="bert-base-uncased", batch_size=16):
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    # Fine-tuning code...
    return model
```

### LLM Applications
```python
from mltrack import track, log_llm_usage
import openai

@track(project="rag-system")
def test_rag_pipeline(temperature=0.7, top_k=5):
    # Your RAG implementation
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Test query"}],
        temperature=temperature
    )
    
    # Automatically tracks tokens and cost
    log_llm_usage(response)
    return response
```

## 🏗️ Architecture

```mermaid
graph TD
    A[ML Code] -->|@track decorator| B[MLTrack Client]
    B --> C[MLflow Backend]
    B --> D[MLTrack API]
    D --> E[Next.js UI]
    D --> F[Deployment Service]
    C --> G[(Artifact Storage)]
    C --> H[(Metrics DB)]
```

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/EconoBen/mltrack.git
cd mltrack

# Install in development mode
pip install -e ".[dev]"

# Install frontend dependencies
cd frontend
npm install

# Run tests
pytest
npm test
```

### Code Style

- Python: Black + isort + flake8
- TypeScript: ESLint + Prettier
- Pre-commit hooks included

## 🗺️ Roadmap

- [ ] **v0.2.0** - AutoML integration and hyperparameter tuning
- [ ] **v0.3.0** - Distributed training support
- [ ] **v0.4.0** - Model monitoring and drift detection
- [ ] **v0.5.0** - Kubernetes operator for deployment
- [ ] **v1.0.0** - Production-ready with enterprise features

See our [full roadmap](ROADMAP.md) for more details.

## 🙏 Acknowledgments

MLTrack is built on the shoulders of giants:

- [MLflow](https://mlflow.org/) - The core tracking engine
- [Modal](https://modal.com/) - Serverless deployment platform
- [Next.js](https://nextjs.org/) - React framework for the UI
- All our [contributors](https://github.com/EconoBen/mltrack/graphs/contributors)

## 📝 License

MLTrack is MIT licensed. See the [LICENSE](LICENSE) file for details.

## 🌟 Star History

<div align="center">
  <a href="https://star-history.com/#EconoBen/mltrack&Date">
    <img src="https://api.star-history.com/svg?repos=EconoBen/mltrack&type=Date" alt="Star History Chart">
  </a>
</div>

---

<div align="center">
  <p>
    Made with ❤️ by the MLTrack community
  </p>
  <p>
    <a href="https://twitter.com/mltrack">Twitter</a> •
    <a href="https://discord.gg/mltrack">Discord</a> •
    <a href="https://mltrack.io">Website</a>
  </p>
</div>