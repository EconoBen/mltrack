"""Modal deployment module for serving ML models as APIs."""

import os
import json
import tempfile
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime
import subprocess
import pickle
import joblib
import cloudpickle
from enum import Enum
import mlflow
from mlflow.tracking import MlflowClient

from mltrack.deploy.s3_storage import S3ModelStorage


class DeploymentStatus(Enum):
    """Deployment status enum."""
    PENDING = "pending"
    BUILDING = "building"
    DEPLOYING = "deploying"
    RUNNING = "running"
    FAILED = "failed"
    STOPPED = "stopped"


@dataclass
class DeploymentConfig:
    """Configuration for Modal deployment."""
    app_name: str
    model_name: str
    model_version: str
    cpu: float = 1.0
    memory: int = 512  # MB
    gpu: Optional[str] = None  # e.g., "T4", "A10G"
    min_replicas: int = 1
    max_replicas: int = 5
    environment_vars: Optional[Dict[str, str]] = None
    requirements: Optional[List[str]] = None
    python_version: str = "3.11"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class ModalDeployment:
    """Handles deployment of ML models to Modal."""
    
    def __init__(self, 
                 mlflow_client: Optional[MlflowClient] = None,
                 s3_storage: Optional[S3ModelStorage] = None):
        """Initialize Modal deployment handler.
        
        Args:
            mlflow_client: MLflow client instance
            s3_storage: S3 storage handler
        """
        self.client = mlflow_client or MlflowClient()
        self.s3_storage = s3_storage or S3ModelStorage()
        self.deployments_file = os.path.expanduser("~/.mltrack/deployments.json")
        self._ensure_deployments_file()
    
    def _ensure_deployments_file(self):
        """Ensure deployments tracking file exists."""
        os.makedirs(os.path.dirname(self.deployments_file), exist_ok=True)
        if not os.path.exists(self.deployments_file):
            with open(self.deployments_file, 'w') as f:
                json.dump({}, f)
    
    def _load_deployments(self) -> Dict[str, Any]:
        """Load deployments from tracking file."""
        with open(self.deployments_file, 'r') as f:
            return json.load(f)
    
    def _save_deployments(self, deployments: Dict[str, Any]):
        """Save deployments to tracking file."""
        with open(self.deployments_file, 'w') as f:
            json.dump(deployments, f, indent=2)
    
    def generate_modal_app(self, 
                          run_id: str,
                          config: DeploymentConfig,
                          model_uri: str) -> str:
        """Generate Modal app code for model deployment.
        
        Args:
            run_id: MLflow run ID
            config: Deployment configuration
            model_uri: S3 URI of the model
            
        Returns:
            Generated Modal app code
        """
        # Get run info to determine model type
        run = self.client.get_run(run_id)
        model_type = run.data.tags.get("mlflow.log-model.history", "")
        
        # Generate appropriate serving code based on model type
        if "sklearn" in model_type or "scikit-learn" in model_type:
            prediction_code = self._generate_sklearn_prediction()
        elif "pytorch" in model_type:
            prediction_code = self._generate_pytorch_prediction()
        elif "tensorflow" in model_type or "keras" in model_type:
            prediction_code = self._generate_tensorflow_prediction()
        else:
            prediction_code = self._generate_generic_prediction()
        
        # Generate requirements
        requirements = config.requirements or []
        if "sklearn" in model_type:
            requirements.extend(["scikit-learn", "numpy", "pandas"])
        elif "pytorch" in model_type:
            requirements.extend(["torch", "numpy", "pillow"])
        elif "tensorflow" in model_type:
            requirements.extend(["tensorflow", "numpy", "pillow"])
        
        requirements.extend(["boto3", "mlflow", "cloudpickle", "pydantic", "fastapi"])
        requirements = list(set(requirements))  # Remove duplicates
        
        # Generate Modal app code
        code = f'''"""
Modal app for serving {config.model_name} model.
Auto-generated by MLTrack.
"""

import modal
import os
import boto3
import pickle
import cloudpickle
import tempfile
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from fastapi import HTTPException
import numpy as np

# Create Modal app
app = modal.App("{config.app_name}")

# Define image with requirements
image = modal.Image.debian_slim(python_version="{config.python_version}").pip_install(
    {json.dumps(requirements, indent=8)}
)

# Environment configuration
env_vars = {json.dumps(config.environment_vars or {}, indent=4)}

# Model configuration
MODEL_URI = "{model_uri}"
MODEL_NAME = "{config.model_name}"
MODEL_VERSION = "{config.model_version}"


class PredictionRequest(BaseModel):
    """Request model for predictions."""
    data: Union[List[List[float]], Dict[str, Any]] = Field(..., description="Input data for prediction")
    return_proba: bool = Field(False, description="Return prediction probabilities if available")


class PredictionResponse(BaseModel):
    """Response model for predictions."""
    predictions: Union[List[Any], Any] = Field(..., description="Model predictions")
    probabilities: Optional[List[List[float]]] = Field(None, description="Prediction probabilities")
    model_name: str = Field(..., description="Name of the model")
    model_version: str = Field(..., description="Version of the model")


class ModelInfo(BaseModel):
    """Model information response."""
    name: str
    version: str
    type: str
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None


@app.cls(
    image=image,
    cpu={config.cpu},
    memory={config.memory},
    {"gpu='" + config.gpu + "'," if config.gpu else ""}
    secrets=[
        modal.Secret.from_name("aws-secret"),  # Requires AWS credentials in Modal
    ],
    env=env_vars,
    scaling=modal.autoscaling.Autoscale(
        min_replicas={config.min_replicas},
        max_replicas={config.max_replicas},
        target_qps_per_replica=10
    )
)
class ModelServer:
    def __init__(self):
        self.model = None
        self.model_type = None
    
    @modal.enter()
    def load_model(self):
        """Load model from S3 on container startup."""
        print(f"Loading model from {{MODEL_URI}}")
        
        # Parse S3 URI
        parts = MODEL_URI.replace("s3://", "").split("/", 1)
        bucket = parts[0]
        key = parts[1]
        
        # Download model from S3
        s3 = boto3.client('s3')
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            s3.download_file(bucket, key, tmp_file.name)
            
            # Load model based on file extension
            if key.endswith('.pkl'):
                with open(tmp_file.name, 'rb') as f:
                    self.model = pickle.load(f)
            elif key.endswith('.joblib'):
                import joblib
                self.model = joblib.load(tmp_file.name)
            elif key.endswith('.pt') or key.endswith('.pth'):
                import torch
                self.model = torch.load(tmp_file.name)
                self.model.eval()
                self.model_type = 'pytorch'
            elif key.endswith('.h5') or key.endswith('.keras'):
                import tensorflow as tf
                self.model = tf.keras.models.load_model(tmp_file.name)
                self.model_type = 'tensorflow'
            else:
                with open(tmp_file.name, 'rb') as f:
                    self.model = cloudpickle.load(f)
        
        print(f"Model loaded successfully: {{type(self.model)}}")
    
    @modal.web_endpoint(method="POST", docs=True)
    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        """Make predictions with the loaded model."""
        try:
            {prediction_code}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @modal.web_endpoint(method="GET", docs=True)
    async def health(self) -> Dict[str, str]:
        """Health check endpoint."""
        return {{
            "status": "healthy",
            "model": MODEL_NAME,
            "version": MODEL_VERSION
        }}
    
    @modal.web_endpoint(method="GET", docs=True)
    async def info(self) -> ModelInfo:
        """Get model information."""
        return ModelInfo(
            name=MODEL_NAME,
            version=MODEL_VERSION,
            type=str(type(self.model).__name__) if self.model else "unknown"
        )


# Create a stub for deployment
model_server = ModelServer()

if __name__ == "__main__":
    # Deploy the app
    app.deploy()
'''
        
        return code
    
    def _generate_sklearn_prediction(self) -> str:
        """Generate sklearn prediction code."""
        return '''
            # Convert input data to numpy array
            if isinstance(request.data, dict):
                # Assume dict contains feature names as keys
                import pandas as pd
                input_data = pd.DataFrame([request.data])
            else:
                input_data = np.array(request.data)
            
            # Ensure 2D array
            if input_data.ndim == 1:
                input_data = input_data.reshape(1, -1)
            
            # Make predictions
            predictions = self.model.predict(input_data)
            
            # Get probabilities if requested and available
            probabilities = None
            if request.return_proba and hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(input_data).tolist()
            
            return PredictionResponse(
                predictions=predictions.tolist(),
                probabilities=probabilities,
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION
            )'''
    
    def _generate_pytorch_prediction(self) -> str:
        """Generate PyTorch prediction code."""
        return '''
            import torch
            
            # Convert input data to tensor
            if isinstance(request.data, dict):
                # Handle dict input based on model requirements
                input_tensor = torch.tensor(request.data['values']).float()
            else:
                input_tensor = torch.tensor(request.data).float()
            
            # Ensure batch dimension
            if input_tensor.dim() == 1:
                input_tensor = input_tensor.unsqueeze(0)
            
            # Make predictions
            with torch.no_grad():
                outputs = self.model(input_tensor)
                
                # Handle different output types
                if isinstance(outputs, tuple):
                    predictions = outputs[0].numpy()
                else:
                    predictions = outputs.numpy()
            
            # Get probabilities if requested
            probabilities = None
            if request.return_proba:
                # Apply softmax for classification
                probs = torch.nn.functional.softmax(torch.tensor(predictions), dim=-1)
                probabilities = probs.numpy().tolist()
            
            return PredictionResponse(
                predictions=predictions.tolist(),
                probabilities=probabilities,
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION
            )'''
    
    def _generate_tensorflow_prediction(self) -> str:
        """Generate TensorFlow prediction code."""
        return '''
            # Convert input data to numpy array
            if isinstance(request.data, dict):
                input_data = np.array(request.data['values'])
            else:
                input_data = np.array(request.data)
            
            # Ensure batch dimension
            if input_data.ndim == 1:
                input_data = np.expand_dims(input_data, axis=0)
            
            # Make predictions
            predictions = self.model.predict(input_data)
            
            # Get probabilities if requested
            probabilities = None
            if request.return_proba:
                # For classification, predictions might already be probabilities
                probabilities = predictions.tolist()
            
            return PredictionResponse(
                predictions=predictions.tolist(),
                probabilities=probabilities,
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION
            )'''
    
    def _generate_generic_prediction(self) -> str:
        """Generate generic prediction code."""
        return '''
            # Generic prediction handling
            try:
                # Try to predict with the model
                if hasattr(self.model, 'predict'):
                    predictions = self.model.predict(request.data)
                elif callable(self.model):
                    predictions = self.model(request.data)
                else:
                    raise ValueError("Model does not have a predict method or is not callable")
                
                # Convert to list if needed
                if hasattr(predictions, 'tolist'):
                    predictions = predictions.tolist()
                
                return PredictionResponse(
                    predictions=predictions,
                    probabilities=None,
                    model_name=MODEL_NAME,
                    model_version=MODEL_VERSION
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")'''
    
    def deploy(self, 
               run_id: str,
               config: DeploymentConfig,
               artifact_path: str = "model") -> Dict[str, Any]:
        """Deploy a model from MLflow run to Modal.
        
        Args:
            run_id: MLflow run ID
            config: Deployment configuration
            artifact_path: Path to model artifact in run
            
        Returns:
            Deployment information including endpoint URL
        """
        deployment_id = f"{config.app_name}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        try:
            # Update deployment status
            self._update_deployment_status(deployment_id, DeploymentStatus.BUILDING, {
                "run_id": run_id,
                "config": config.to_dict(),
                "started_at": datetime.now().isoformat()
            })
            
            # Download model artifact from MLflow
            with tempfile.TemporaryDirectory() as tmp_dir:
                # Download artifacts
                local_path = self.client.download_artifacts(run_id, artifact_path, tmp_dir)
                
                # Find model file
                model_file = None
                for ext in ['.pkl', '.joblib', '.pt', '.pth', '.h5', '.keras']:
                    files = [f for f in os.listdir(local_path) if f.endswith(ext)]
                    if files:
                        model_file = os.path.join(local_path, files[0])
                        break
                
                if not model_file:
                    # Try pickle file without extension
                    files = os.listdir(local_path)
                    if files:
                        model_file = os.path.join(local_path, files[0])
                
                # Upload to S3
                s3_uri = self.s3_storage.upload_model(
                    model_file,
                    f"{config.model_name}/{config.model_version}/model"
                )
                
                # Generate Modal app code
                app_code = self.generate_modal_app(run_id, config, s3_uri)
                
                # Save app code
                app_file = os.path.join(tmp_dir, f"{config.app_name}.py")
                with open(app_file, 'w') as f:
                    f.write(app_code)
                
                # Update status to deploying
                self._update_deployment_status(deployment_id, DeploymentStatus.DEPLOYING)
                
                # Deploy to Modal
                result = subprocess.run(
                    ["modal", "deploy", app_file],
                    capture_output=True,
                    text=True,
                    cwd=tmp_dir
                )
                
                if result.returncode != 0:
                    raise Exception(f"Modal deployment failed: {result.stderr}")
                
                # Parse deployment URL from output
                endpoint_url = self._parse_endpoint_url(result.stdout)
                
                # Update deployment status to running
                deployment_info = {
                    "deployment_id": deployment_id,
                    "run_id": run_id,
                    "config": config.to_dict(),
                    "s3_uri": s3_uri,
                    "endpoint_url": endpoint_url,
                    "started_at": datetime.now().isoformat(),
                    "status": DeploymentStatus.RUNNING.value
                }
                
                self._update_deployment_status(
                    deployment_id, 
                    DeploymentStatus.RUNNING,
                    deployment_info
                )
                
                return deployment_info
                
        except Exception as e:
            # Update status to failed
            self._update_deployment_status(
                deployment_id,
                DeploymentStatus.FAILED,
                {"error": str(e)}
            )
            raise
    
    def _parse_endpoint_url(self, modal_output: str) -> str:
        """Parse endpoint URL from Modal deployment output."""
        # Look for the endpoint URL in the output
        lines = modal_output.split('\n')
        for line in lines:
            if 'https://' in line and '.modal.run' in line:
                # Extract URL
                import re
                urls = re.findall(r'https://[^\s]+\.modal\.run[^\s]*', line)
                if urls:
                    return urls[0]
        
        # Default URL format
        return f"https://{os.getenv('MODAL_USERNAME', 'user')}--{config.app_name}-model-server-predict.modal.run"
    
    def _update_deployment_status(self, 
                                 deployment_id: str,
                                 status: DeploymentStatus,
                                 info: Optional[Dict[str, Any]] = None):
        """Update deployment status in tracking file."""
        deployments = self._load_deployments()
        
        if deployment_id not in deployments:
            deployments[deployment_id] = {}
        
        deployments[deployment_id]["status"] = status.value
        deployments[deployment_id]["updated_at"] = datetime.now().isoformat()
        
        if info:
            deployments[deployment_id].update(info)
        
        self._save_deployments(deployments)
    
    def get_deployment(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment information."""
        deployments = self._load_deployments()
        return deployments.get(deployment_id)
    
    def list_deployments(self, 
                        model_name: Optional[str] = None,
                        status: Optional[DeploymentStatus] = None) -> List[Dict[str, Any]]:
        """List all deployments with optional filtering."""
        deployments = self._load_deployments()
        result = []
        
        for deployment_id, info in deployments.items():
            # Apply filters
            if model_name and info.get("config", {}).get("model_name") != model_name:
                continue
            if status and info.get("status") != status.value:
                continue
            
            info["deployment_id"] = deployment_id
            result.append(info)
        
        # Sort by creation time
        result.sort(key=lambda x: x.get("started_at", ""), reverse=True)
        return result
    
    def stop_deployment(self, deployment_id: str) -> bool:
        """Stop a Modal deployment."""
        deployment = self.get_deployment(deployment_id)
        if not deployment:
            return False
        
        config = deployment.get("config", {})
        app_name = config.get("app_name")
        
        if not app_name:
            return False
        
        try:
            # Stop the Modal app
            result = subprocess.run(
                ["modal", "app", "stop", app_name],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self._update_deployment_status(deployment_id, DeploymentStatus.STOPPED)
                return True
            
        except Exception:
            pass
        
        return False
    
    def get_openapi_spec(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get OpenAPI specification for a deployment."""
        deployment = self.get_deployment(deployment_id)
        if not deployment or deployment.get("status") != DeploymentStatus.RUNNING.value:
            return None
        
        endpoint_url = deployment.get("endpoint_url")
        if not endpoint_url:
            return None
        
        # Fetch OpenAPI spec from Modal endpoint
        import requests
        try:
            response = requests.get(f"{endpoint_url}/docs/openapi.json")
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        
        # Return a default spec if fetch fails
        return {
            "openapi": "3.0.0",
            "info": {
                "title": deployment.get("config", {}).get("model_name", "Model API"),
                "version": deployment.get("config", {}).get("model_version", "1.0.0")
            },
            "paths": {
                "/predict": {
                    "post": {
                        "summary": "Make predictions",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/PredictionRequest"
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Successful prediction",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/PredictionResponse"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/health": {
                    "get": {
                        "summary": "Health check",
                        "responses": {
                            "200": {
                                "description": "Service is healthy"
                            }
                        }
                    }
                },
                "/info": {
                    "get": {
                        "summary": "Get model information",
                        "responses": {
                            "200": {
                                "description": "Model information"
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "PredictionRequest": {
                        "type": "object",
                        "properties": {
                            "data": {
                                "type": "array",
                                "items": {}
                            },
                            "return_proba": {
                                "type": "boolean",
                                "default": False
                            }
                        },
                        "required": ["data"]
                    },
                    "PredictionResponse": {
                        "type": "object",
                        "properties": {
                            "predictions": {
                                "type": "array",
                                "items": {}
                            },
                            "probabilities": {
                                "type": "array",
                                "items": {
                                    "type": "array",
                                    "items": {"type": "number"}
                                }
                            },
                            "model_name": {"type": "string"},
                            "model_version": {"type": "string"}
                        }
                    }
                }
            }
        }


# Convenience functions
def deploy_to_modal(run_id: str, 
                   config: DeploymentConfig,
                   artifact_path: str = "model") -> Dict[str, Any]:
    """Deploy a model to Modal.
    
    Args:
        run_id: MLflow run ID
        config: Deployment configuration
        artifact_path: Path to model artifact
        
    Returns:
        Deployment information
    """
    deployer = ModalDeployment()
    return deployer.deploy(run_id, config, artifact_path)


def get_deployment_status(deployment_id: str) -> Optional[Dict[str, Any]]:
    """Get deployment status."""
    deployer = ModalDeployment()
    return deployer.get_deployment(deployment_id)


def list_deployments(model_name: Optional[str] = None,
                    status: Optional[DeploymentStatus] = None) -> List[Dict[str, Any]]:
    """List deployments."""
    deployer = ModalDeployment()
    return deployer.list_deployments(model_name, status)


def stop_deployment(deployment_id: str) -> bool:
    """Stop a deployment."""
    deployer = ModalDeployment()
    return deployer.stop_deployment(deployment_id)