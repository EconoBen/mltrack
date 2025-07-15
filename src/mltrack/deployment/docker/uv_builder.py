"""UV-optimized Docker builder for MLTrack models."""

import os
import json
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import shutil

from mltrack.model_registry import ModelRegistry
from mltrack.deployment.docker.base_images import get_base_image, get_python_version_from_image


class DockerBuilder:
    """Build optimized Docker containers for MLTrack models using UV."""
    
    def __init__(self, registry: Optional[ModelRegistry] = None):
        self.registry = registry or ModelRegistry()
        self.templates_dir = Path(__file__).parent / "templates"
    
    def build_container(
        self,
        model_name: str,
        version: Optional[str] = None,
        use_gpu: bool = False,
        optimize: bool = True,
        push: bool = False,
        registry_url: Optional[str] = None,
        platform: Optional[List[str]] = None,
        tag_latest: bool = True,
    ) -> Dict[str, Any]:
        """Build a Docker container for a model.
        
        Args:
            model_name: Name of the model to containerize
            version: Model version (latest if None)
            use_gpu: Include GPU support
            optimize: Apply size optimizations
            push: Push to registry after build
            registry_url: Docker registry URL
            platform: Target platforms (e.g., ["linux/amd64", "linux/arm64"])
            tag_latest: Also tag as latest
            
        Returns:
            Build results and metadata
        """
        # Get model info
        model_info = self.registry.get_model(model_name, version)
        framework = model_info.get("framework", "unknown")
        task_type = model_info.get("task_type", "unknown")
        
        # Create build directory
        build_dir = Path(tempfile.mkdtemp(prefix=f"mltrack-docker-{model_name}-"))
        
        try:
            # Generate Dockerfile
            dockerfile_content = self._generate_dockerfile(
                model_info=model_info,
                use_gpu=use_gpu,
                optimize=optimize,
            )
            
            dockerfile_path = build_dir / "Dockerfile"
            dockerfile_path.write_text(dockerfile_content)
            
            # Generate FastAPI app
            app_content = self._generate_fastapi_app(model_info)
            app_path = build_dir / "app.py"
            app_path.write_text(app_content)
            
            # Generate pyproject.toml
            pyproject_content = self._generate_pyproject(model_info)
            pyproject_path = build_dir / "pyproject.toml"
            pyproject_path.write_text(pyproject_content)
            
            # Copy model artifacts
            self._copy_model_artifacts(model_info, build_dir)
            
            # Build image
            image_name = self._get_image_name(model_name, model_info, registry_url)
            build_result = self._docker_build(
                build_dir=build_dir,
                image_name=image_name,
                platform=platform,
                push=push,
                tag_latest=tag_latest,
            )
            
            # Update registry with container info
            self._update_registry_with_container(
                model_name=model_name,
                version=model_info['version'],
                image_name=image_name,
                build_result=build_result,
            )
            
            return {
                "success": True,
                "image_name": image_name,
                "build_time": build_result.get("build_time"),
                "size": build_result.get("size"),
                "pushed": push,
                "platforms": platform or ["linux/amd64"],
            }
            
        finally:
            # Cleanup
            if build_dir.exists():
                shutil.rmtree(build_dir)
    
    def _generate_dockerfile(
        self,
        model_info: Dict[str, Any],
        use_gpu: bool = False,
        optimize: bool = True,
    ) -> str:
        """Generate UV-optimized Dockerfile content."""
        framework = model_info.get("framework", "unknown")
        base_image, config = get_base_image(framework, use_gpu)
        python_version = get_python_version_from_image(base_image)
        
        # UV version to use
        uv_version = "0.4.18"  # Pin to stable version
        
        dockerfile = f'''# Auto-generated Dockerfile for {model_info['model_name']}
# Framework: {framework}, Task: {model_info.get("task_type", "unknown")}
# Generated: {datetime.utcnow().isoformat()}

# UV for fast builds
FROM ghcr.io/astral-sh/uv:{uv_version} AS uv

# Build stage
FROM {base_image} AS builder

# Install UV
COPY --from=uv /uv /uvx /bin/

# Install system dependencies
'''
        
        # Add system packages if needed
        if config.system_packages:
            packages = " ".join(config.system_packages)
            dockerfile += f'''RUN apt-get update && apt-get install -y \\
    {packages} \\
    && rm -rf /var/lib/apt/lists/*

'''
        
        # Set up working directory
        dockerfile += '''# Set up app directory
WORKDIR /app

# Copy dependency files first (for caching)
COPY pyproject.toml .
COPY uv.lock* .

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --no-install-project --compile-bytecode

# Copy application code
COPY app.py .
COPY model/ ./model/

# Final stage
'''
        
        if optimize:
            # Use distroless or slim final image
            dockerfile += f'''FROM python:{python_version}-slim

# Copy only the virtual environment
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app.py /app/
COPY --from=builder /app/model /app/model/

# Set environment
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1

WORKDIR /app
'''
        else:
            # Keep everything in single stage
            dockerfile += '''
# Install project
RUN uv sync --frozen

# Set environment
ENV PYTHONUNBUFFERED=1
'''
        
        # Add health check
        dockerfile += '''
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
'''
        
        return dockerfile
    
    def _generate_fastapi_app(self, model_info: Dict[str, Any]) -> str:
        """Generate FastAPI application code."""
        task_type = model_info.get("task_type", "unknown")
        model_type = model_info.get("model_type", "unknown")
        
        # Base imports and setup
        app_code = f'''"""
FastAPI application for {model_info['model_name']}
Model Type: {model_type}
Task: {task_type}
Version: {model_info['version']}
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import numpy as np
import mlflow
import logging
from datetime import datetime
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="{model_info['model_name']} API",
    description="Auto-generated API for MLTrack model",
    version="{model_info['version']}",
)

# Load model
logger.info("Loading model...")
model = mlflow.pyfunc.load_model("/app/model")
logger.info("Model loaded successfully")

'''
        
        # Add request/response models based on task type
        if task_type == "classification":
            app_code += '''
# Request/Response models
class PredictionRequest(BaseModel):
    data: List[List[float]] = Field(..., description="Input features as 2D array")
    return_proba: bool = Field(False, description="Return probabilities instead of classes")

class PredictionResponse(BaseModel):
    predictions: List[Any]
    model_version: str
    timestamp: str
    probabilities: Optional[List[List[float]]] = None

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions with the model."""
    try:
        data = np.array(request.data)
        
        if request.return_proba and hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(data).tolist()
            predictions = np.argmax(probabilities, axis=1).tolist()
            return PredictionResponse(
                predictions=predictions,
                probabilities=probabilities,
                model_version=model_info['version'],
                timestamp=datetime.utcnow().isoformat(),
            )
        else:
            predictions = model.predict(data).tolist()
            return PredictionResponse(
                predictions=predictions,
                model_version=model_info['version'],
                timestamp=datetime.utcnow().isoformat(),
            )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
        
        elif task_type == "regression":
            app_code += '''
# Request/Response models
class PredictionRequest(BaseModel):
    data: List[List[float]] = Field(..., description="Input features as 2D array")

class PredictionResponse(BaseModel):
    predictions: List[float]
    model_version: str
    timestamp: str

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions with the model."""
    try:
        data = np.array(request.data)
        predictions = model.predict(data).tolist()
        
        return PredictionResponse(
            predictions=predictions,
            model_version="{model_info['version']}",
            timestamp=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
        
        elif task_type == "llm":
            app_code += '''
# Request/Response models
class GenerationRequest(BaseModel):
    prompt: str = Field(..., description="Input prompt")
    max_tokens: int = Field(100, description="Maximum tokens to generate")
    temperature: float = Field(0.7, description="Sampling temperature")
    
class GenerationResponse(BaseModel):
    text: str
    model_version: str
    timestamp: str
    usage: Optional[Dict[str, int]] = None

@app.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    """Generate text with the language model."""
    try:
        response = model.predict({
            "prompt": request.prompt,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        })
        
        return GenerationResponse(
            text=response.get("text", response),
            model_version="{model_info['version']}",
            timestamp=datetime.utcnow().isoformat(),
            usage=response.get("usage"),
        )
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
        
        # Add common endpoints
        app_code += f'''
# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {{"status": "healthy", "model": "{model_info['model_name']}", "version": "{model_info['version']}"}}

# Model info
@app.get("/info")
async def model_info():
    """Get model information."""
    return {{
        "model_name": "{model_info['model_name']}",
        "version": "{model_info['version']}",
        "framework": "{model_info.get("framework", "unknown")}",
        "task_type": "{task_type}",
        "model_type": "{model_type}",
        "metrics": {json.dumps(model_info.get("metrics", {}))},
    }}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API documentation links."""
    return {{
        "message": "MLTrack Model API",
        "model": "{model_info['model_name']}",
        "version": "{model_info['version']}",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
        
        return app_code
    
    def _generate_pyproject(self, model_info: Dict[str, Any]) -> str:
        """Generate pyproject.toml with UV configuration."""
        framework = model_info.get("framework", "unknown")
        
        # Base dependencies
        base_deps = [
            "fastapi>=0.104.0",
            "uvicorn[standard]>=0.24.0",
            "pydantic>=2.0.0",
            "numpy>=1.24.0",
            "mlflow>=2.9.0",
            "python-multipart>=0.0.6",
        ]
        
        # Framework-specific dependencies
        framework_deps = {
            "sklearn": ["scikit-learn>=1.3.0"],
            "xgboost": ["xgboost>=2.0.0"],
            "lightgbm": ["lightgbm>=4.0.0"],
            "catboost": ["catboost>=1.2.0"],
            "pytorch": ["torch>=2.0.0"],
            "tensorflow": ["tensorflow>=2.14.0"],
            "transformers": ["transformers>=4.35.0", "torch>=2.0.0"],
            "openai": ["openai>=1.0.0"],
            "anthropic": ["anthropic>=0.8.0"],
            "langchain": ["langchain>=0.0.350"],
        }
        
        # Combine dependencies
        all_deps = base_deps + framework_deps.get(framework, [])
        deps_str = "\n".join(f'    "{dep}",' for dep in all_deps)
        
        # Convert version to valid semantic version
        # Extract numeric part or default to 0.1.0
        version = model_info.get("version", "0.1.0")
        if version.startswith("v"):
            # Try to extract a numeric version
            parts = version[1:].split("_")
            if parts[0].isdigit():
                # Convert YYYYMMDD to semantic version
                date_part = parts[0]
                sem_version = f"0.{date_part[:4]}.{date_part[4:]}"
            else:
                sem_version = "0.1.0"
        else:
            sem_version = version if version.count(".") >= 1 else "0.1.0"
        
        return f'''[project]
name = "mltrack-model-{model_info['model_name']}"
version = "{sem_version}"
description = "Containerized MLTrack model: {model_info['model_name']}"
requires-python = ">=3.9"
dependencies = [
{deps_str}
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
compile-bytecode = true
'''
    
    def _copy_model_artifacts(self, model_info: Dict[str, Any], build_dir: Path) -> None:
        """Copy model artifacts to build directory."""
        # Download model from MLflow
        run_id = model_info["run_id"]
        model_path = "model"  # Default MLflow path
        
        local_model_dir = build_dir / "model"
        local_model_dir.mkdir(exist_ok=True)
        
        # Use MLflow client to download
        self.registry.mlflow_client.download_artifacts(
            run_id=run_id,
            path=model_path,
            dst_path=str(build_dir),
        )
    
    def _get_image_name(
        self,
        model_name: str,
        model_info: Dict[str, Any],
        registry_url: Optional[str] = None
    ) -> str:
        """Generate Docker image name."""
        # Clean model name for Docker
        clean_name = model_name.lower().replace("_", "-").replace(" ", "-")
        
        if registry_url:
            # Ensure registry URL doesn't end with /
            registry_url = registry_url.rstrip("/")
            return f"{registry_url}/{clean_name}:{model_info['version']}"
        else:
            return f"{clean_name}:{model_info['version']}"
    
    def _docker_build(
        self,
        build_dir: Path,
        image_name: str,
        platform: Optional[List[str]] = None,
        push: bool = False,
        tag_latest: bool = True,
    ) -> Dict[str, Any]:
        """Execute Docker build."""
        import time
        start_time = time.time()
        
        # Build command
        cmd = ["docker", "build", "-t", image_name]
        
        # Add platform flags
        if platform:
            for p in platform:
                cmd.extend(["--platform", p])
        
        # Add build directory
        cmd.append(str(build_dir))
        
        # Execute build
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Docker build failed: {result.stderr}")
        
        build_time = time.time() - start_time
        
        # Tag as latest if requested
        if tag_latest:
            latest_tag = image_name.rsplit(":", 1)[0] + ":latest"
            subprocess.run(["docker", "tag", image_name, latest_tag])
        
        # Get image size
        size_result = subprocess.run(
            ["docker", "images", image_name, "--format", "{{.Size}}"],
            capture_output=True,
            text=True,
        )
        size = size_result.stdout.strip() if size_result.returncode == 0 else "unknown"
        
        # Push if requested
        if push:
            push_result = subprocess.run(["docker", "push", image_name], capture_output=True, text=True)
            if push_result.returncode != 0:
                raise RuntimeError(f"Docker push failed: {push_result.stderr}")
            
            if tag_latest:
                subprocess.run(["docker", "push", latest_tag])
        
        return {
            "build_time": build_time,
            "size": size,
            "pushed": push,
        }
    
    def _update_registry_with_container(
        self,
        model_name: str,
        version: str,
        image_name: str,
        build_result: Dict[str, Any],
    ) -> None:
        """Update model registry with container information."""
        # Load registry file
        registry_file = Path.home() / ".mltrack" / "registry" / f"{model_name}.json"
        
        if registry_file.exists():
            with open(registry_file) as f:
                data = json.load(f)
            
            # Find and update the model version
            for model in data["models"]:
                if model.get("version") == version:
                    model["container"] = {
                        "image": image_name,
                        "built_at": datetime.utcnow().isoformat(),
                        "build_time": build_result.get("build_time"),
                        "size": build_result.get("size"),
                        "pushed": build_result.get("pushed", False),
                    }
                    break
            
            # Save updated registry
            with open(registry_file, "w") as f:
                json.dump(data, f, indent=2)