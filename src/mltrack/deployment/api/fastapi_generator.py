"""FastAPI application generator for MLTrack models."""

from typing import Dict, Any, Optional
from pathlib import Path
import json


class FastAPIGenerator:
    """Generate FastAPI applications for different model types."""
    
    # OpenAPI metadata enrichment templates
    OPENAPI_INFO = {
        "classification": {
            "description": "Classification model API with prediction and probability endpoints",
            "tags": [
                {
                    "name": "predictions",
                    "description": "Model prediction operations",
                },
                {
                    "name": "model",
                    "description": "Model information and health",
                }
            ]
        },
        "regression": {
            "description": "Regression model API for continuous value predictions",
            "tags": [
                {
                    "name": "predictions",
                    "description": "Model prediction operations",
                },
                {
                    "name": "model",
                    "description": "Model information and health",
                }
            ]
        },
        "llm": {
            "description": "Language model API for text generation",
            "tags": [
                {
                    "name": "generation",
                    "description": "Text generation operations",
                },
                {
                    "name": "model",
                    "description": "Model information and health",
                }
            ]
        },
        "clustering": {
            "description": "Clustering model API for grouping operations",
            "tags": [
                {
                    "name": "clustering",
                    "description": "Clustering operations",
                },
                {
                    "name": "model",
                    "description": "Model information and health",
                }
            ]
        }
    }
    
    @classmethod
    def generate_project_structure(
        cls,
        model_info: Dict[str, Any],
        output_dir: Path,
    ) -> Dict[str, Path]:
        """Generate complete FastAPI project structure.
        
        Args:
            model_info: Model metadata
            output_dir: Directory to create project in
            
        Returns:
            Dictionary of created file paths
        """
        # Create project structure
        project_name = model_info["model_name"].replace("-", "_")
        project_dir = output_dir / project_name
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (project_dir / "app").mkdir(exist_ok=True)
        (project_dir / "app" / "models").mkdir(exist_ok=True)
        (project_dir / "app" / "routers").mkdir(exist_ok=True)
        (project_dir / "app" / "core").mkdir(exist_ok=True)
        (project_dir / "tests").mkdir(exist_ok=True)
        
        files = {}
        
        # Generate main app file
        files["main"] = project_dir / "app" / "main.py"
        files["main"].write_text(cls._generate_main_app(model_info))
        
        # Generate models (Pydantic schemas)
        files["schemas"] = project_dir / "app" / "models" / "schemas.py"
        files["schemas"].write_text(cls._generate_schemas(model_info))
        
        # Generate routers
        files["predict_router"] = project_dir / "app" / "routers" / "predict.py"
        files["predict_router"].write_text(cls._generate_predict_router(model_info))
        
        files["health_router"] = project_dir / "app" / "routers" / "health.py"
        files["health_router"].write_text(cls._generate_health_router(model_info))
        
        # Generate core modules
        files["model_loader"] = project_dir / "app" / "core" / "model.py"
        files["model_loader"].write_text(cls._generate_model_loader(model_info))
        
        files["config"] = project_dir / "app" / "core" / "config.py"
        files["config"].write_text(cls._generate_config())
        
        # Generate tests
        files["test_api"] = project_dir / "tests" / "test_api.py"
        files["test_api"].write_text(cls._generate_tests(model_info))
        
        # Generate Docker files
        files["dockerfile"] = project_dir / "Dockerfile"
        files["dockerfile"].write_text(cls._generate_dockerfile(model_info))
        
        files["dockerignore"] = project_dir / ".dockerignore"
        files["dockerignore"].write_text(cls._generate_dockerignore())
        
        # Generate requirements
        files["pyproject"] = project_dir / "pyproject.toml"
        files["pyproject"].write_text(cls._generate_pyproject(model_info))
        
        # Generate README
        files["readme"] = project_dir / "README.md"
        files["readme"].write_text(cls._generate_readme(model_info))
        
        return files
    
    @classmethod
    def _generate_main_app(cls, model_info: Dict[str, Any]) -> str:
        """Generate main FastAPI application."""
        task_type = model_info.get("task_type", "unknown")
        openapi_config = cls.OPENAPI_INFO.get(task_type, cls.OPENAPI_INFO["regression"])
        
        return f'''"""
FastAPI application for {model_info["model_name"]}
Auto-generated by MLTrack
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import logging

from app.routers import predict, health
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="{model_info["model_name"]} API",
    description="{openapi_config["description"]}",
    version="{model_info["version"]}",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags={json.dumps(openapi_config["tags"], indent=4)}
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict.router, prefix="/api/v1", tags=["predictions"])
app.include_router(health.router, prefix="/api/v1", tags=["model"])

@app.get("/", include_in_schema=False)
async def root():
    """Redirect to documentation."""
    return RedirectResponse(url="/docs")

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup."""
    logger.info("Starting {model_info["model_name"]} API...")
    from app.core.model import load_model
    load_model()
    logger.info("Model loaded successfully!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
    )
'''
    
    @classmethod
    def _generate_schemas(cls, model_info: Dict[str, Any]) -> str:
        """Generate Pydantic schemas based on model type."""
        task_type = model_info.get("task_type", "unknown")
        
        base_schemas = '''"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service health status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    version: str = Field(..., description="API version")
    
class ModelInfo(BaseModel):
    """Model information"""
    name: str
    version: str
    framework: str
    task_type: str
    model_type: str
    metrics: Dict[str, float]
    
'''
        
        if task_type == "classification":
            return base_schemas + '''
class PredictionRequest(BaseModel):
    """Classification prediction request"""
    data: List[List[float]] = Field(
        ...,
        description="Input features as 2D array",
        example=[[5.1, 3.5, 1.4, 0.2]]
    )
    return_proba: bool = Field(
        False,
        description="Return class probabilities"
    )
    
class PredictionResponse(BaseModel):
    """Classification prediction response"""
    predictions: List[Any] = Field(..., description="Predicted classes")
    probabilities: Optional[List[List[float]]] = Field(
        None,
        description="Class probabilities (if requested)"
    )
    model_version: str
    timestamp: datetime
    
class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    instances: List[PredictionRequest]
    
class BatchPredictionResponse(BaseModel):
    """Batch prediction response"""
    results: List[PredictionResponse]
    total_time_ms: float
'''
        
        elif task_type == "regression":
            return base_schemas + '''
class PredictionRequest(BaseModel):
    """Regression prediction request"""
    data: List[List[float]] = Field(
        ...,
        description="Input features as 2D array",
        example=[[1.0, 2.0, 3.0, 4.0]]
    )
    
class PredictionResponse(BaseModel):
    """Regression prediction response"""
    predictions: List[float] = Field(..., description="Predicted values")
    model_version: str
    timestamp: datetime
    
class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    instances: List[PredictionRequest]
    
class BatchPredictionResponse(BaseModel):
    """Batch prediction response"""
    results: List[PredictionResponse]
    total_time_ms: float
'''
        
        elif task_type == "llm":
            return base_schemas + '''
class GenerationRequest(BaseModel):
    """Text generation request"""
    prompt: str = Field(..., description="Input prompt", min_length=1)
    max_tokens: int = Field(100, description="Maximum tokens to generate", ge=1, le=4096)
    temperature: float = Field(0.7, description="Sampling temperature", ge=0, le=2)
    top_p: float = Field(1.0, description="Top-p sampling", ge=0, le=1)
    
class GenerationResponse(BaseModel):
    """Text generation response"""
    text: str = Field(..., description="Generated text")
    usage: Dict[str, int] = Field(..., description="Token usage statistics")
    model_version: str
    timestamp: datetime
    
class ChatMessage(BaseModel):
    """Chat message"""
    role: str = Field(..., description="Message role (system/user/assistant)")
    content: str = Field(..., description="Message content")
    
class ChatRequest(BaseModel):
    """Chat completion request"""
    messages: List[ChatMessage]
    max_tokens: int = Field(100, ge=1, le=4096)
    temperature: float = Field(0.7, ge=0, le=2)
    
class ChatResponse(BaseModel):
    """Chat completion response"""
    response: str
    usage: Dict[str, int]
    model_version: str
    timestamp: datetime
'''
        
        else:
            # Default schemas
            return base_schemas + '''
class PredictionRequest(BaseModel):
    """Generic prediction request"""
    data: Dict[str, Any] = Field(..., description="Input data")
    
class PredictionResponse(BaseModel):
    """Generic prediction response"""
    result: Any = Field(..., description="Prediction result")
    model_version: str
    timestamp: datetime
'''
    
    @classmethod
    def _generate_predict_router(cls, model_info: Dict[str, Any]) -> str:
        """Generate prediction router based on model type."""
        task_type = model_info.get("task_type", "unknown")
        
        base_router = '''"""
Prediction endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
import logging
import time
import numpy as np

from app.models.schemas import *
from app.core.model import get_model

router = APIRouter()
logger = logging.getLogger(__name__)

'''
        
        if task_type == "classification":
            return base_router + '''
@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions with the classification model."""
    try:
        model = get_model()
        data = np.array(request.data)
        
        if request.return_proba and hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(data).tolist()
            predictions = np.argmax(probabilities, axis=1).tolist()
            return PredictionResponse(
                predictions=predictions,
                probabilities=probabilities,
                model_version=model.version,
                timestamp=datetime.utcnow(),
            )
        else:
            predictions = model.predict(data).tolist()
            return PredictionResponse(
                predictions=predictions,
                model_version=model.version,
                timestamp=datetime.utcnow(),
            )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """Batch predictions for multiple instances."""
    start_time = time.time()
    results = []
    
    for instance in request.instances:
        result = await predict(instance)
        results.append(result)
    
    total_time_ms = (time.time() - start_time) * 1000
    
    return BatchPredictionResponse(
        results=results,
        total_time_ms=total_time_ms,
    )
'''
        
        elif task_type == "regression":
            return base_router + '''
@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions with the regression model."""
    try:
        model = get_model()
        data = np.array(request.data)
        predictions = model.predict(data).tolist()
        
        return PredictionResponse(
            predictions=predictions,
            model_version=model.version,
            timestamp=datetime.utcnow(),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """Batch predictions for multiple instances."""
    start_time = time.time()
    results = []
    
    for instance in request.instances:
        result = await predict(instance)
        results.append(result)
    
    total_time_ms = (time.time() - start_time) * 1000
    
    return BatchPredictionResponse(
        results=results,
        total_time_ms=total_time_ms,
    )
'''
        
        elif task_type == "llm":
            return base_router + '''
@router.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    """Generate text with the language model."""
    try:
        model = get_model()
        response = model.generate(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
        )
        
        return GenerationResponse(
            text=response.get("text", ""),
            usage=response.get("usage", {}),
            model_version=model.version,
            timestamp=datetime.utcnow(),
        )
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat completion endpoint."""
    try:
        model = get_model()
        
        # Convert messages to model format
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        
        response = model.chat(
            messages=messages,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
        )
        
        return ChatResponse(
            response=response.get("text", ""),
            usage=response.get("usage", {}),
            model_version=model.version,
            timestamp=datetime.utcnow(),
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
        
        else:
            # Generic prediction endpoint
            return base_router + '''
@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions with the model."""
    try:
        model = get_model()
        result = model.predict(request.data)
        
        return PredictionResponse(
            result=result,
            model_version=model.version,
            timestamp=datetime.utcnow(),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
    
    @classmethod
    def _generate_health_router(cls, model_info: Dict[str, Any]) -> str:
        """Generate health check router."""
        return f'''"""
Health and model information endpoints
"""

from fastapi import APIRouter
from app.models.schemas import HealthResponse, ModelInfo
from app.core.model import get_model, is_model_loaded

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy" if is_model_loaded() else "unhealthy",
        model_loaded=is_model_loaded(),
        version="{model_info["version"]}",
    )

@router.get("/info", response_model=ModelInfo)
async def model_info():
    """Get model information."""
    model = get_model()
    return ModelInfo(
        name="{model_info["model_name"]}",
        version="{model_info["version"]}",
        framework="{model_info.get("framework", "unknown")}",
        task_type="{model_info.get("task_type", "unknown")}",
        model_type="{model_info.get("model_type", "unknown")}",
        metrics={json.dumps(model_info.get("metrics", {}))},
    )
'''
    
    @classmethod
    def _generate_model_loader(cls, model_info: Dict[str, Any]) -> str:
        """Generate model loading logic."""
        return '''"""
Model loading and management
"""

import mlflow
import logging
from typing import Any, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Global model instance
_model: Optional[Any] = None
_model_metadata: dict = {}


class ModelWrapper:
    """Wrapper to provide consistent interface."""
    
    def __init__(self, model: Any, metadata: dict):
        self.model = model
        self.version = metadata.get("version", "unknown")
        self.metadata = metadata
    
    def predict(self, data):
        """Make predictions."""
        return self.model.predict(data)
    
    def predict_proba(self, data):
        """Get prediction probabilities."""
        if hasattr(self.model, 'predict_proba'):
            return self.model.predict_proba(data)
        raise NotImplementedError("Model does not support probability predictions")
    
    def generate(self, **kwargs):
        """Generate text (for LLMs)."""
        if hasattr(self.model, 'generate'):
            return self.model.generate(**kwargs)
        elif hasattr(self.model, 'predict'):
            return self.model.predict(kwargs)
        raise NotImplementedError("Model does not support generation")
    
    def chat(self, **kwargs):
        """Chat interface (for LLMs)."""
        if hasattr(self.model, 'chat'):
            return self.model.chat(**kwargs)
        elif hasattr(self.model, 'generate'):
            # Fallback to generate with last message
            messages = kwargs.get('messages', [])
            if messages:
                kwargs['prompt'] = messages[-1]['content']
            return self.generate(**kwargs)
        raise NotImplementedError("Model does not support chat")


def load_model() -> ModelWrapper:
    """Load the model from MLflow."""
    global _model, _model_metadata
    
    if _model is None:
        logger.info("Loading model from /app/model...")
        try:
            # Load model
            _model = mlflow.pyfunc.load_model("/app/model")
            
            # Load metadata
            import json
            try:
                with open("/app/model/model_info.json") as f:
                    _model_metadata = json.load(f)
            except:
                _model_metadata = {"version": "unknown"}
            
            logger.info("Model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    return ModelWrapper(_model, _model_metadata)


@lru_cache()
def get_model() -> ModelWrapper:
    """Get the loaded model (cached)."""
    return load_model()


def is_model_loaded() -> bool:
    """Check if model is loaded."""
    return _model is not None
'''
    
    @classmethod
    def _generate_config(cls) -> str:
        """Generate configuration module."""
        return '''"""
Application configuration
"""

from pydantic import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    PORT: int = 8000
    DEBUG: bool = False
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Model
    MODEL_PATH: str = "/app/model"
    
    # Monitoring
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"


settings = Settings()
'''
    
    @classmethod
    def _generate_tests(cls, model_info: Dict[str, Any]) -> str:
        """Generate basic tests."""
        task_type = model_info.get("task_type", "unknown")
        
        base_tests = '''"""
API tests
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    """Test health endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "unhealthy"]


def test_model_info():
    """Test model info endpoint."""
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data


def test_docs():
    """Test documentation endpoint."""
    response = client.get("/docs")
    assert response.status_code == 200
'''
        
        if task_type == "classification":
            return base_tests + '''

def test_predict():
    """Test prediction endpoint."""
    response = client.post(
        "/api/v1/predict",
        json={"data": [[1.0, 2.0, 3.0, 4.0]]}
    )
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data
    assert "model_version" in data


def test_predict_with_proba():
    """Test prediction with probabilities."""
    response = client.post(
        "/api/v1/predict",
        json={"data": [[1.0, 2.0, 3.0, 4.0]], "return_proba": true}
    )
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data
    assert "probabilities" in data
'''
        
        elif task_type == "regression":
            return base_tests + '''

def test_predict():
    """Test prediction endpoint."""
    response = client.post(
        "/api/v1/predict",
        json={"data": [[1.0, 2.0, 3.0, 4.0]]}
    )
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data
    assert isinstance(data["predictions"], list)
'''
        
        elif task_type == "llm":
            return base_tests + '''

def test_generate():
    """Test generation endpoint."""
    response = client.post(
        "/api/v1/generate",
        json={"prompt": "Hello", "max_tokens": 10}
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "usage" in data
'''
        
        else:
            return base_tests
    
    @classmethod
    def _generate_dockerfile(cls, model_info: Dict[str, Any]) -> str:
        """Generate production Dockerfile."""
        from mltrack.deployment.docker.base_images import get_base_image
        
        framework = model_info.get("framework", "unknown")
        base_image, _ = get_base_image(framework, use_gpu=False)
        
        return f'''# Production Dockerfile for {model_info["model_name"]}

FROM ghcr.io/astral-sh/uv:latest AS uv
FROM {base_image} AS builder

COPY --from=uv /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock* ./

RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --frozen --no-install-project --compile-bytecode

COPY . .

FROM {base_image}

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

WORKDIR /app
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
'''
    
    @classmethod
    def _generate_dockerignore(cls) -> str:
        """Generate .dockerignore file."""
        return '''__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.tox/
.coverage
.coverage.*
.cache
*.log
.git
.gitignore
.pytest_cache
.mypy_cache
.ruff_cache
tests/
docs/
*.md
'''
    
    @classmethod
    def _generate_pyproject(cls, model_info: Dict[str, Any]) -> str:
        """Generate pyproject.toml."""
        return f'''[project]
name = "{model_info["model_name"]}-api"
version = "{model_info["version"]}"
description = "FastAPI service for {model_info["model_name"]}"
requires-python = ">=3.9"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "pydantic>=2.0.0",
    "numpy>=1.24.0",
    "mlflow>=2.9.0",
    "python-multipart>=0.0.6",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
compile-bytecode = true
'''
    
    @classmethod
    def _generate_readme(cls, model_info: Dict[str, Any]) -> str:
        """Generate README."""
        return f'''# {model_info["model_name"]} API

Auto-generated FastAPI service for MLTrack model.

## Quick Start

```bash
# Run with Docker
docker build -t {model_info["model_name"]} .
docker run -p 8000:8000 {model_info["model_name"]}

# Or run locally
uv sync
uv run uvicorn app.main:app --reload
```

## API Documentation

Once running, visit:
- http://localhost:8000/docs - Interactive API documentation
- http://localhost:8000/redoc - Alternative documentation
- http://localhost:8000/openapi.json - OpenAPI schema

## Model Information

- **Name**: {model_info["model_name"]}
- **Version**: {model_info["version"]}
- **Framework**: {model_info.get("framework", "unknown")}
- **Task Type**: {model_info.get("task_type", "unknown")}

## Endpoints

- `GET /health` - Health check
- `GET /info` - Model information
- `POST /predict` - Make predictions

## Development

```bash
# Install dependencies
uv sync

# Run tests
uv run pytest

# Format code
uv run black .
uv run ruff check --fix .
```
'''