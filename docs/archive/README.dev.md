# MLTrack Developer Guide

This guide is for developers working on MLTrack. For user documentation, see [README.md](README.md).

## 🏗️ Architecture Overview

MLTrack consists of three main components:

1. **MLflow Backend** - Experiment tracking and model registry
2. **Next.js Frontend** - Modern React UI with TypeScript
3. **Python Package** - Core tracking functionality and integrations

```
mltrack/
├── mltrack/           # Python package
│   ├── core/          # Core tracking logic
│   ├── integrations/  # Framework integrations
│   └── deployment/    # Model deployment modules
├── ui/                # Next.js frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── lib/           # Utilities and hooks
├── scripts/           # Development scripts
└── Makefile          # Single source of truth for commands
```

## 🚀 Quick Start

```bash
# Install all dependencies
make install

# Start development environment
make dev

# In another terminal, train a model
make train

# Deploy the model
make deploy

# Run tests
make test
```

## 📖 Makefile Commands

The Makefile is our single source of truth. Always check available commands:

```bash
make help
```

### Common Development Workflows

#### Starting Fresh
```bash
make clean          # Clean all artifacts
make setup          # Setup development environment
make dev           # Start all services
```

#### Training and Deployment
```bash
make train         # Train demo models
make deploy        # Deploy model as API
make test-inference # Test the deployment
```

#### Testing
```bash
make test          # Run all tests
make type-check    # TypeScript checking
make lint          # Run linters
make format        # Format code
```

#### Demo Workflows
```bash
make demo          # Complete demo workflow
make demo-linkedin # Prepare LinkedIn presentation
make demo-clean    # Clean up after demo
```

## 🛠️ Development Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- Make
- Git

### Environment Variables

Create a `.env.local` file in the `ui/` directory:

```env
# MLflow Configuration
NEXT_PUBLIC_MLFLOW_TRACKING_URI=http://localhost:5001
MLFLOW_TRACKING_URI=http://localhost:5001

# Authentication (optional)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Deployment
MODAL_TOKEN_ID=your-modal-token
MODAL_TOKEN_SECRET=your-modal-secret
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### VS Code Setup

Recommended extensions:
- Python
- Pylance
- ESLint
- Prettier
- Tailwind CSS IntelliSense

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "typescript.tsdk": "ui/node_modules/typescript/lib"
}
```

## 🏛️ Code Structure

### Python Package (`mltrack/`)

```
mltrack/
├── __init__.py         # Package initialization
├── client.py           # MLflow client wrapper
├── decorators.py       # @track decorator
├── core/
│   ├── tracking.py     # Core tracking logic
│   ├── registry.py     # Model registry
│   └── deployment/     # Deployment modules
├── integrations/
│   ├── sklearn.py      # Scikit-learn integration
│   ├── torch.py        # PyTorch integration
│   └── langchain.py    # LangChain integration
└── utils/
    ├── config.py       # Configuration management
    └── validators.py   # Input validation
```

### Frontend (`ui/`)

```
ui/
├── app/                # Next.js App Router
│   ├── (dashboard)/    # Dashboard routes
│   ├── api/            # API routes
│   └── auth/           # Authentication pages
├── components/
│   ├── ui/             # Base UI components
│   ├── experiments/    # Experiment components
│   └── deployments/    # Deployment components
├── lib/
│   ├── hooks/          # React hooks
│   ├── store/          # Zustand stores
│   └── utils/          # Utilities
└── public/             # Static assets
```

## 🧪 Testing

### Python Tests

```bash
# Run all Python tests
make test-python

# Run specific test file
pytest mltrack/tests/test_tracking.py

# Run with coverage
pytest --cov=mltrack mltrack/tests/
```

### Frontend Tests

```bash
# Run all UI tests
make test-ui

# Run in watch mode
cd ui && npm test -- --watch

# Run E2E tests
cd ui && npm run test:e2e
```

### Integration Tests

```bash
# Test full workflow
make demo

# Test specific features
cd ui && ./scripts/test-all-features.sh
```

## 🚢 Deployment

### Local Development

```bash
# Build for production
cd ui && npm run build

# Start production server
make dev-ui-prod
```

### Docker

```bash
# Build images
make docker-build

# Start services
make docker-up

# View logs
make docker-logs
```

### Production Deployment

1. **Vercel** (Recommended for UI):
   ```bash
   cd ui
   vercel
   ```

2. **Modal** (For model serving):
   ```python
   modal deploy mltrack/deployment/modal_app.py
   ```

3. **AWS** (Full stack):
   - Use CloudFormation template in `infrastructure/`
   - Or deploy with Terraform

## 🐛 Debugging

### Common Issues

1. **Port already in use**
   ```bash
   make kill-all  # Stop all services
   make dev       # Start fresh
   ```

2. **MLflow connection error**
   ```bash
   make status    # Check service status
   make mlflow-clean  # Reset MLflow data
   ```

3. **TypeScript errors**
   ```bash
   make type-check  # See all errors
   cd ui && npm run dev  # Hot reload fixes
   ```

### Debug Mode

Set environment variables:
```bash
export MLTRACK_DEBUG=true
export NEXT_PUBLIC_DEBUG=true
```

### Logs

```bash
make logs  # Show all logs
tail -f mlflow.log  # MLflow logs
tail -f ui/.next/server.log  # Next.js logs
```

## 🤝 Contributing

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/mltrack.git
   cd mltrack
   make setup
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make changes**
   - Write tests for new features
   - Update documentation
   - Run `make test` before committing

4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tool changes

## 📚 Key Concepts

### Experiment Tracking

```python
# Automatic tracking with decorator
@mltrack.track(experiment="my-experiment")
def train_model(params):
    model = train(params)
    return model

# Manual tracking
with mltrack.start_run():
    mltrack.log_params(params)
    mltrack.log_metrics(metrics)
    mltrack.log_model(model)
```

### Model Registry

```python
# Register model
mltrack.register_model(
    model=model,
    name="my-model",
    tags={"stage": "production"}
)

# Load model
model = mltrack.load_model("my-model", version="latest")
```

### Deployment

```python
# Deploy to Modal
mltrack.deploy(
    model_name="my-model",
    provider="modal",
    config={"gpu": "T4"}
)

# Deploy to AWS
mltrack.deploy(
    model_name="my-model", 
    provider="sagemaker",
    config={"instance_type": "ml.m5.large"}
)
```

## 🔗 Useful Links

- [MLflow Documentation](https://mlflow.org/docs/latest/)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Modal Documentation](https://modal.com/docs)

## 📝 Notes

- Always use the Makefile for common tasks
- Keep the UI and backend in sync
- Write tests for new features
- Update documentation as you go
- Use TypeScript strictly in the frontend
- Follow Python type hints in the backend

---

For questions or issues, check:
1. This guide
2. The Makefile (`make help`)
3. GitHub Issues
4. Team Slack channel