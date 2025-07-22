<div align="center">
  <h1>🚀 MLTrack</h1>
  
  <p>
    <strong>Drop-in MLflow enhancement with powerful CLI for ML deployment</strong>
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

## 🔄 MLflow Compatible

MLTrack is a **drop-in enhancement** for MLflow, not a replacement. Your existing code keeps working:

```python
# Your existing MLflow code works unchanged
import mlflow
mlflow.start_run()
mlflow.log_param("alpha", 0.5)
mlflow.log_metric("rmse", 0.876)
mlflow.end_run()

# Just add MLTrack for deployment superpowers
from mltrack import get_last_run, deploy
deploy(get_last_run(), platform="modal")
```

---

## 🎯 Why MLTrack?

**Stop experimenting. Start shipping.**

MLTrack is a drop-in enhancement for MLflow that focuses on what matters: getting models into production. While MLflow handles experiment tracking beautifully, MLTrack adds the missing pieces for the complete ML lifecycle: **Build → Deploy → Monitor**.

```python
# Works with your existing MLflow code
import mlflow
from mltrack import track, deploy

@track  # Automatic MLflow tracking + deployment readiness
def train_model(learning_rate=0.01, batch_size=32):
    model = train(learning_rate, batch_size)
    return model

# One command to production
deploy(model, platform="modal")  # or "lambda", "docker"
```

## ✨ Features

### 🏗️ **Build: Enhanced MLflow Tracking**
- Drop-in replacement for MLflow with zero config changes
- Simple `@track` decorator adds deployment metadata automatically
- Works with all MLflow features - just better UI and workflows

### 🚀 **Deploy: Production in One Command**
- **Modal**: Serverless GPU deployment with auto-scaling
- **AWS Lambda**: Cost-effective for lightweight models
- **Docker**: For Kubernetes, ECS, or any container platform
- Automatic FastAPI endpoints with OpenAPI documentation
- Built-in model versioning and rollback

### 📊 **Monitor: Know What's Happening**
- Real-time inference metrics and latency tracking
- Model drift detection and alerts
- Cost analysis (compute + LLM tokens)
- A/B testing and canary deployments built-in

### 💼 **Enterprise Ready**
- Works with existing MLflow tracking servers
- Integrates with your current CI/CD pipelines
- Multi-user support with SSO/SAML
- Audit logs and compliance features

### 🎯 **Built for Real ML Teams**
- Stop juggling notebooks, scripts, and YAML configs
- Go from experiment to production endpoint in minutes
- Monitor actual business impact, not just model metrics
- Scale from POC to production without rewrites

## 🎮 Powerful CLI

MLTrack provides a comprehensive CLI that makes ML operations as simple as web development.

> **Note**: You can use either `mltrack` or the shorter `ml` command - they're identical!

```bash
# Training shortcuts
mltrack train script.py --params learning_rate=0.01 batch_size=32
mltrack train --last  # Re-run last experiment with same params
mltrack train --best  # Re-run best performing experiment

# Deployment commands
mltrack deploy --last --platform modal  # Deploy last trained model
mltrack deploy --best accuracy --platform lambda  # Deploy best model by metric
mltrack deploy --run-id abc123 --platform docker --push-to ecr

# Model management
mltrack models list  # List all registered models
mltrack models promote fraud-detector --from staging --to production
mltrack models rollback fraud-detector  # Instant rollback

# Monitoring and logs
mltrack logs fraud-detector --tail  # Stream production logs
mltrack metrics fraud-detector --window 1h  # Recent performance
mltrack alerts create --model fraud-detector --metric latency --threshold 100ms

# Batch operations
mltrack experiments clean --older-than 30d  # Cleanup old experiments
mltrack deploy-all models.yaml  # Deploy multiple models from config
mltrack benchmark --models v1,v2,v3 --dataset test.csv  # Compare models

# Integration with Unix tools
mltrack list --format json | jq '.[] | select(.metrics.accuracy > 0.9)'
mltrack export --run-id abc123 | aws s3 cp - s3://models/model.pkl

# UI commands
ml ui          # Launch modern MLTrack UI (default port 3000)
ml ui --port 8080  # Custom port
ml flow        # Launch classic MLflow UI (default port 5000)
```

### CLI Highlights

- **Intuitive shortcuts**: Common workflows in single commands
- **Unix-friendly**: Pipe-able, scriptable, automation-ready  
- **Smart defaults**: `--last`, `--best` flags for quick access
- **Batch operations**: Handle multiple models/experiments at once
- **Real-time monitoring**: Stream logs and metrics from production

## 🚀 Quick Start

### Installation

```bash
pip install mltrack
```

### Basic Usage

```python
# 1. BUILD - Works with your existing MLflow code
from mltrack import track
import mlflow

@track  # Enhances MLflow tracking
def train_model(n_estimators=100, max_depth=10):
    # Your normal training code
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth)
    model.fit(X_train, y_train)
    
    # Log metrics as usual with MLflow
    mlflow.log_metric("accuracy", accuracy_score(y_test, model.predict(X_test)))
    mlflow.sklearn.log_model(model, "model")
    
    return model

# 2. DEPLOY - One line to production
from mltrack import deploy

model = train_model(n_estimators=150)
endpoint = deploy(model, 
    platform="modal",  # or "lambda", "docker"
    name="fraud-detection-v1",
    gpu=False,  # Auto-scales based on load
    env_vars={"API_KEY": "secret"}
)

# 3. MONITOR - Track production performance
print(f"Model deployed to: {endpoint.url}")
# Automatic monitoring dashboard at http://localhost:3000/deployments/fraud-detection-v1
```

### The Full Workflow

```bash
# Start with your existing MLflow setup
export MLFLOW_TRACKING_URI=http://your-mlflow-server:5000

# Add MLTrack for better UI and deployment
pip install mltrack

# Train and deploy in one script
python train.py  # Tracks with MLflow, deploys with MLTrack

# Monitor everything in one place
mltrack ui  # Beautiful dashboard at http://localhost:3000
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
    A[Your ML Code] -->|Existing MLflow calls| B[MLflow Tracking Server]
    A -->|@track decorator| C[MLTrack Enhancement Layer]
    C --> B
    C --> D[MLTrack Deployment Service]
    D --> E[Modal/Lambda/Docker]
    C --> F[MLTrack UI]
    F --> G[Monitoring Dashboard]
    B --> H[(MLflow Store)]
    
    style C fill:#7c3aed,color:#fff
    style D fill:#7c3aed,color:#fff
    style F fill:#7c3aed,color:#fff
```

**Key Points:**
- MLTrack sits **alongside** MLflow, not in front of it
- Your MLflow tracking server stays unchanged
- MLTrack adds deployment and monitoring capabilities
- All MLflow features remain accessible

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