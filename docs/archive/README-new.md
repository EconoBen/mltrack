# MLTrack - Modern ML Experiment Tracking & Deployment

🚀 **Beautiful, intuitive ML experiment tracking with one-click deployment**

MLTrack provides a modern interface for tracking experiments, managing models, and deploying to production. Built on MLflow with a gorgeous Next.js UI.

## ✨ Features

- **Modern Dashboard** - Beautiful UI with real-time updates
- **Experiment Tracking** - Track ML & LLM experiments automatically  
- **One-Click Deploy** - Deploy to Modal, AWS, or any cloud provider
- **Team Collaboration** - Multi-user support with avatars & permissions
- **Advanced Analytics** - Interactive reports and insights
- **Model Registry** - Version control for your ML models

## 🚀 Quick Start

### 1. Install MLTrack

```bash
# Clone the repository
git clone https://github.com/yourusername/mltrack.git
cd mltrack

# Run the setup
make setup
```

### 2. Start the Platform

```bash
# Start everything with one command
make dev
```

Visit http://localhost:3000 to see your dashboard!

### 3. Track Your First Model

Create a simple training script `train.py`:

```python
import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

# Load data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2
)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Log metrics
accuracy = model.score(X_test, y_test)
mlflow.log_metric("accuracy", accuracy)
mlflow.sklearn.log_model(model, "model")

print(f"Model trained! Accuracy: {accuracy:.3f}")
```

Run it with automatic tracking:

```bash
ml train train.py
```

That's it! Your model is tracked automatically.

### 4. Deploy Your Model

#### Option A: Deploy to Modal (Serverless)

Deploy to Modal's serverless infrastructure:

```bash
# Using the ML CLI
ml ship my-model --modal

# Or with GPU support
ml ship my-model --modal --modal-gpu T4

# Test the deployed model
ml try my-model --modal
```

#### Option B: Deploy as Docker Container

Build and run locally:

```bash
# Build container
ml ship my-model

# Serve locally
ml serve my-model

# Or use Makefile
make deploy
```

Your model is now available as a REST API!

## 🚀 Complete Workflow Example

Here's the full ML workflow in just 4 commands:

```bash
# 1. Train your model
ml train train.py

# 2. Save it to the registry
ml save iris-classifier

# 3. Deploy to Modal
ml ship iris-classifier --modal

# 4. Test the API
ml try iris-classifier --modal
```

That's it! From training to production API in minutes.

## 📚 Documentation

- **For Users**: You're reading it!
- **For Developers**: See [README.dev.md](README.dev.md)
- **API Reference**: Visit `/docs` when running

## 🎯 Use Cases

### For Data Scientists
- Track experiments without changing your workflow
- Compare models with interactive visualizations
- Deploy models without DevOps knowledge

### For ML Engineers  
- Manage model versions and stages
- Monitor deployed models
- Integrate with CI/CD pipelines

### For Teams
- Collaborate on experiments
- Share results and insights
- Maintain model governance

## 🎮 ML CLI Commands

MLTrack includes an intuitive `ml` CLI for common workflows:

```bash
# Train a model (automatically tracked!)
ml train train.py              # Just works!
ml train train.py --epochs 50  # With arguments
ml train train.py --name "experiment-1"

# Save a model to registry
ml save                  # Save the most recent model
ml save my-model         # Save with a specific name

# Ship (deploy) a model
ml ship                  # Ship the most recent model
ml ship my-model         # Ship a specific model
ml ship --modal          # Deploy to Modal (serverless)
ml ship --modal --modal-gpu A10G  # With GPU support

# Serve a model locally
ml serve                 # Serve the most recent model
ml serve my-model        # Serve a specific model
ml serve -d              # Run in background (detached)

# Test a model interactively
ml try                   # Test the most recent model
ml try my-model          # Test a specific model
ml try --modal           # Test a Modal deployment

# List saved models
ml list                  # List all models
ml list --stage production  # Filter by stage

# Run any command with tracking
ml run python evaluate.py  # Track any Python script
ml run jupyter notebook    # Track Jupyter sessions
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Python, MLflow, FastAPI
- **Deployment**: Modal, AWS, Docker
- **Database**: SQLite (dev), PostgreSQL (prod)

## 📖 Common Commands

All commands are available via Make:

```bash
make help          # Show all commands
make dev           # Start development environment
make train         # Train a demo model
make deploy        # Deploy a model
make test          # Run tests
make demo          # Run full demo
```

## 🤝 Contributing

We welcome contributions! Please see [README.dev.md](README.dev.md) for development setup.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built on top of the amazing [MLflow](https://mlflow.org) project.

---

<p align="center">
  Made with ❤️ by the MLTrack team
</p>