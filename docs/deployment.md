# 🚀 MLTrack Deployment Guide

MLTrack makes deploying ML models as simple as possible with intuitive commands and UV-optimized Docker containers.

## Quick Start

```bash
# Train and track a model
python train.py  # Uses @track decorator

# Save the model
ml save my-model

# Ship it as a container
ml ship my-model

# Serve it locally
ml serve my-model

# Try it interactively
ml try my-model
```

## Intuitive Commands

### `ml save` - Save Your Model

Saves the most recent tracked model to the registry:

```bash
# Save with auto-detected name
ml save

# Save with custom name
ml save weather-predictor

# Save a specific run
ml save --run-id abc123def456
```

### `ml ship` - Build Container

Creates an optimized Docker container using UV for fast builds:

```bash
# Simple shipping
ml ship my-model

# With GPU support
ml ship my-model --gpu

# Push to registry
ml ship my-model --push --registry ghcr.io/myorg

# Multi-platform build
ml ship my-model --platform linux/amd64 --platform linux/arm64
```

### `ml serve` - Run Your Model

Serves your model as a FastAPI application:

```bash
# Serve on default port (8000)
ml serve my-model

# Custom port
ml serve my-model --port 8080

# Run in background
ml serve my-model -d

# Production mode
ml serve my-model --prod
```

### `ml try` - Interactive Testing

Opens an interactive testing interface:

```bash
# Test the most recent model
ml try

# Test specific model
ml try my-model

# API will be available at:
# - http://localhost:8000 - Main API
# - http://localhost:8000/docs - Interactive Swagger UI
# - http://localhost:8000/openapi.json - OpenAPI schema
```

### `ml list` - View Your Models

Lists all saved models:

```bash
# List all models
ml list

# Filter by stage
ml list --stage production
```

## UV-Optimized Docker Builds

MLTrack uses UV for lightning-fast Docker builds with:

- **Multi-stage builds** for minimal image size
- **Build caching** for faster rebuilds
- **Bytecode compilation** for faster startup
- **Framework-specific optimizations**

Example generated Dockerfile:

```dockerfile
# UV for fast builds
FROM ghcr.io/astral-sh/uv:0.4.18 AS uv

# Build stage
FROM python:3.11-slim AS builder

# Copy UV
COPY --from=uv /uv /uvx /bin/

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --compile-bytecode

# Final minimal image
FROM python:3.11-slim
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
```

## API Endpoints

MLTrack automatically generates appropriate endpoints based on model type:

### Classification Models
- `POST /predict` - Make predictions
- `POST /predict` with `return_proba=true` - Get probabilities

### Regression Models
- `POST /predict` - Get predictions

### Language Models
- `POST /generate` - Generate text

### Common Endpoints
- `GET /health` - Health check
- `GET /info` - Model information
- `GET /docs` - Interactive API documentation

## Example Workflow

```python
# 1. Train your model with tracking
from mltrack import track
from sklearn.ensemble import RandomForestClassifier

@track
def train_model():
    model = RandomForestClassifier()
    model.fit(X_train, y_train)
    return model

# Train it
model = train_model()
```

```bash
# 2. Deploy with simple commands
ml save forest-classifier
ml ship forest-classifier
ml serve forest-classifier

# 3. Test it
curl http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"data": [[5.1, 3.5, 1.4, 0.2]]}'
```

## Production Deployment

For production deployments:

```bash
# Build optimized multi-platform image
ml ship my-model \
  --optimize \
  --platform linux/amd64 \
  --platform linux/arm64 \
  --push \
  --registry ghcr.io/mycompany

# Generate Kubernetes manifests
ml deploy my-model --k8s > deployment.yaml

# Or use Docker Compose
ml deploy my-model --compose > docker-compose.yml
```

## Smart Features

### Auto-Detection
- Automatically detects recent models
- Suggests names based on training context
- Identifies framework and requirements

### Progressive Disclosure
- Simple commands work out of the box
- Advanced options available when needed
- Helpful prompts guide you

### Container Optimization
- Framework-specific base images
- GPU support when needed
- Multi-stage builds for size
- Platform-specific optimizations

## Tips

1. **Use UV locally**: Install UV for consistent environments
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Tag your training**: Use descriptive names
   ```python
   @track(name="weather-lstm-v2")
   def train():
       ...
   ```

3. **Test before shipping**: Use `ml try` to verify locally

4. **Monitor your models**: Check `/health` endpoints in production

5. **Version everything**: Models are automatically versioned

## Troubleshooting

### Docker not found
```bash
# Install Docker Desktop or Docker Engine
# https://docs.docker.com/get-docker/
```

### Port already in use
```bash
# Use a different port
ml serve my-model --port 8081
```

### Build fails
```bash
# Check Docker daemon
docker ps

# Try without optimization
ml ship my-model --no-optimize
```

### Can't find model
```bash
# List recent models
ml list

# Check MLflow UI
mlflow ui
```