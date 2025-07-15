"""Model Registry for mltrack with S3 backend support."""

import os
import json
import tempfile
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path
import hashlib
import pickle
import joblib
import cloudpickle
from functools import lru_cache

import mlflow
from mlflow.tracking import MlflowClient
from mlflow.models import Model
import boto3
from botocore.exceptions import ClientError

from mltrack.config import MLTrackConfig
from mltrack.templates.model_loader import ModelLoaderTemplate


class ModelRegistry:
    """Model registry with S3 backend for storing and versioning models."""
    
    def __init__(
        self,
        config: Optional[MLTrackConfig] = None,
        s3_bucket: Optional[str] = None,
        s3_prefix: str = "mltrack/models",
        aws_profile: Optional[str] = None
    ):
        """Initialize model registry.
        
        Args:
            config: MLTrack configuration
            s3_bucket: S3 bucket name for model storage
            s3_prefix: Prefix for S3 keys (default: mltrack/models)
            aws_profile: AWS profile to use for S3 access
        """
        self.config = config or MLTrackConfig.find_config()
        self.mlflow_client = MlflowClient(self.config.tracking_uri)
        
        # S3 configuration
        self.s3_bucket = s3_bucket or os.environ.get("MLTRACK_S3_BUCKET")
        self.s3_prefix = s3_prefix
        
        # Initialize S3 client
        if self.s3_bucket:
            try:
                session = boto3.Session(profile_name=aws_profile) if aws_profile else boto3.Session()
                self.s3_client = session.client('s3')
                
                # Validate S3 access
                self._validate_s3_access()
            except Exception as e:
                print(f"⚠️ S3 initialization failed: {e}")
                print("💡 To use S3 storage, ensure:")
                print("   1. AWS credentials are configured (aws configure)")
                print("   2. The bucket exists and you have write permissions")
                print("   3. The bucket name is valid")
                self.s3_client = None
                self.s3_bucket = None
        else:
            self.s3_client = None
    
    def _validate_s3_access(self):
        """Validate S3 bucket access and permissions."""
        try:
            # Check if bucket exists and we have access
            self.s3_client.head_bucket(Bucket=self.s3_bucket)
            
            # Test write permissions with a small test object
            test_key = f"{self.s3_prefix}/.mltrack_test"
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=test_key,
                Body=b'test',
                ContentType='text/plain'
            )
            
            # Clean up test object
            self.s3_client.delete_object(Bucket=self.s3_bucket, Key=test_key)
            
            print(f"✅ S3 bucket '{self.s3_bucket}' is accessible")
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise Exception(f"Bucket '{self.s3_bucket}' does not exist")
            elif error_code == '403':
                raise Exception(f"Access denied to bucket '{self.s3_bucket}'. Check your AWS credentials and permissions.")
            elif error_code == 'NoSuchBucket':
                raise Exception(f"Bucket '{self.s3_bucket}' does not exist")
            elif error_code == 'AllAccessDisabled':
                raise Exception(f"All access to bucket '{self.s3_bucket}' is disabled")
            else:
                raise Exception(f"S3 error ({error_code}): {e.response['Error']['Message']}")
    
    def register_model(
        self,
        run_id: str,
        model_name: str,
        model_path: str,
        stage: str = "staging",
        description: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        task_type: Optional[str] = None,
        model_type: Optional[str] = None,
        framework: Optional[str] = None
    ) -> Dict[str, Any]:
        """Register a model from a run to the model registry.
        
        Args:
            run_id: MLflow run ID
            model_name: Name for the registered model
            model_path: Path to model artifact in the run
            stage: Model stage (staging, production, archived)
            description: Model description
            tags: Additional tags for the model
            metadata: Additional metadata (requirements, usage, etc.)
            
        Returns:
            Model registration info
        """
        # Get run info
        run = self.mlflow_client.get_run(run_id)
        
        # Create model metadata
        model_metadata = {
            "model_name": model_name,
            "run_id": run_id,
            "experiment_id": run.info.experiment_id,
            "stage": stage,
            "registered_at": datetime.utcnow().isoformat(),
            "mlflow_version": mlflow.__version__,
            "description": description or "",
            "tags": tags or {},
            "metrics": dict(run.data.metrics),
            "params": dict(run.data.params),
            "git_commit": run.data.tags.get("mlflow.source.git.commit", ""),
            "user": run.data.tags.get("mlflow.user", ""),
            "framework": framework or run.data.tags.get("model.framework", run.data.tags.get("mlflow.source.type", "unknown")),
            "custom_metadata": metadata or {},
            # Model type and task detection - use provided values or fall back to tags
            "model_type": model_type or run.data.tags.get("model.type", run.data.tags.get("mltrack.algorithm", "unknown")),
            "task_type": task_type or run.data.tags.get("model.task_type", run.data.tags.get("mltrack.task", "unknown"))
        }
        
        # Generate model version
        version_hash = hashlib.sha256(
            f"{model_name}:{run_id}:{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:8]
        model_version = f"v{datetime.utcnow().strftime('%Y%m%d')}_{version_hash}"
        model_metadata["version"] = model_version
        
        # Generate and cache loading code
        loading_code = ModelLoaderTemplate.generate_code(model_metadata)
        model_metadata["loading_code_cached"] = loading_code
        model_metadata["loading_code_generated_at"] = datetime.utcnow().isoformat()
        
        # Download model artifacts from MLflow
        local_path = Path(tempfile.mkdtemp()) / "model"
        self.mlflow_client.download_artifacts(run_id, model_path, str(local_path))
        
        # Upload to S3 if configured
        if self.s3_client and self.s3_bucket:
            try:
                s3_key = f"{self.s3_prefix}/{model_name}/{model_version}"
                model_metadata["s3_location"] = f"s3://{self.s3_bucket}/{s3_key}"
                
                # Upload model files
                self._upload_directory_to_s3(local_path, s3_key)
                
                # Upload metadata
                metadata_key = f"{s3_key}/metadata.json"
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=metadata_key,
                    Body=json.dumps(model_metadata, indent=2),
                    ContentType="application/json"
                )
                print(f"✅ Model uploaded to S3: {model_metadata['s3_location']}")
            except Exception as e:
                print(f"⚠️ S3 upload failed (continuing with local storage): {e}")
                # Remove S3 location from metadata if upload failed
                model_metadata.pop("s3_location", None)
        
        # Register with MLflow Model Registry
        try:
            # Register model first
            model_version_info = mlflow.register_model(
                model_uri=f"runs:/{run_id}/{model_path}",
                name=model_name
            )
            
            # Transition to specified stage using the integer version from MLflow
            if hasattr(model_version_info, 'version'):
                self.mlflow_client.transition_model_version_stage(
                    name=model_name,
                    version=model_version_info.version,  # Use MLflow's integer version
                    stage=stage
                )
        except Exception as e:
            print(f"MLflow model registry error (continuing): {e}")
        
        # Store registry metadata locally
        registry_path = Path.home() / ".mltrack" / "registry"
        registry_path.mkdir(parents=True, exist_ok=True)
        
        registry_file = registry_path / f"{model_name}.json"
        if registry_file.exists():
            with open(registry_file) as f:
                registry_data = json.load(f)
        else:
            registry_data = {"models": []}
        
        registry_data["models"].append(model_metadata)
        
        with open(registry_file, "w") as f:
            json.dump(registry_data, f, indent=2)
        
        return model_metadata
    
    def list_models(self, stage: Optional[str] = None, as_json: bool = False) -> List[Dict[str, Any]]:
        """List all registered models.
        
        Args:
            stage: Filter by stage (staging, production, archived)
            
        Returns:
            List of model metadata
        """
        registry_path = Path.home() / ".mltrack" / "registry"
        models = []
        
        if registry_path.exists():
            for model_file in registry_path.glob("*.json"):
                with open(model_file) as f:
                    data = json.load(f)
                    for model in data.get("models", []):
                        if stage is None or model.get("stage") == stage:
                            models.append(model)
        
        return sorted(models, key=lambda x: x.get("registered_at", ""), reverse=True)
    
    def get_model(self, model_name: str, version: Optional[str] = None) -> Dict[str, Any]:
        """Get model metadata.
        
        Args:
            model_name: Model name
            version: Specific version (latest if None)
            
        Returns:
            Model metadata
        """
        registry_file = Path.home() / ".mltrack" / "registry" / f"{model_name}.json"
        
        if not registry_file.exists():
            raise ValueError(f"Model '{model_name}' not found in registry")
        
        with open(registry_file) as f:
            data = json.load(f)
        
        models = data.get("models", [])
        if not models:
            raise ValueError(f"No versions found for model '{model_name}'")
        
        if version:
            for model in models:
                if model.get("version") == version:
                    return model
            raise ValueError(f"Version '{version}' not found for model '{model_name}'")
        
        # Return latest version
        return models[0]
    
    def load_model(self, model_name: str, version: Optional[str] = None) -> Any:
        """Load a model from the registry.
        
        Args:
            model_name: Model name
            version: Specific version (latest if None)
            
        Returns:
            Loaded model object
        """
        model_info = self.get_model(model_name, version)
        
        # Try loading from S3 first
        if self.s3_client and model_info.get("s3_location"):
            s3_path = model_info["s3_location"].replace("s3://", "")
            bucket, key = s3_path.split("/", 1)
            
            local_path = Path(tempfile.mkdtemp()) / "model"
            self._download_directory_from_s3(bucket, key, local_path)
            
            # Try different loading methods
            return self._load_model_from_path(local_path)
        
        # Fallback to MLflow
        run_id = model_info["run_id"]
        model_path = "model"  # Default MLflow path
        
        return mlflow.pyfunc.load_model(f"runs:/{run_id}/{model_path}")
    
    @lru_cache(maxsize=128)
    def generate_loading_code(
        self,
        model_name: str,
        version: Optional[str] = None,
        include_requirements: bool = True
    ) -> str:
        """Generate code to load and use the model.
        
        Uses cached code if available, otherwise generates new code.
        
        Args:
            model_name: Model name
            version: Specific version (latest if None)
            include_requirements: Include pip requirements
            
        Returns:
            Python code as string
        """
        model_info = self.get_model(model_name, version)
        
        # Check if we have cached loading code
        if "loading_code_cached" in model_info:
            # Return cached code directly
            return model_info["loading_code_cached"]
        
        # Generate new code using template system
        # This is for backward compatibility with models registered before caching
        code = ModelLoaderTemplate.generate_code(model_info, include_requirements)
        
        # Update the registry with cached code for future use
        registry_file = Path.home() / ".mltrack" / "registry" / f"{model_name}.json"
        if registry_file.exists():
            with open(registry_file) as f:
                data = json.load(f)
            
            # Update the specific model version with cached code
            for model in data["models"]:
                if model.get("version") == model_info.get("version"):
                    model["loading_code_cached"] = code
                    model["loading_code_generated_at"] = datetime.utcnow().isoformat()
                    break
            
            # Save updated registry
            with open(registry_file, "w") as f:
                json.dump(data, f, indent=2)
        
        return code
    
    def transition_model_stage(
        self,
        model_name: str,
        version: str,
        stage: str,
        archive_existing: bool = True
    ) -> Dict[str, Any]:
        """Transition a model to a different stage.
        
        Args:
            model_name: Model name
            version: Model version
            stage: New stage (staging, production, archived)
            archive_existing: Archive existing production models
            
        Returns:
            Updated model metadata
        """
        registry_file = Path.home() / ".mltrack" / "registry" / f"{model_name}.json"
        
        if not registry_file.exists():
            raise ValueError(f"Model '{model_name}' not found")
        
        with open(registry_file) as f:
            data = json.load(f)
        
        # Archive existing production models if needed
        if stage == "production" and archive_existing:
            for model in data["models"]:
                if model.get("stage") == "production":
                    model["stage"] = "archived"
                    model["archived_at"] = datetime.utcnow().isoformat()
        
        # Update target model
        updated_model = None
        for model in data["models"]:
            if model.get("version") == version:
                model["stage"] = stage
                model["stage_transitioned_at"] = datetime.utcnow().isoformat()
                updated_model = model
                break
        
        if not updated_model:
            raise ValueError(f"Version '{version}' not found")
        
        # Save updated registry
        with open(registry_file, "w") as f:
            json.dump(data, f, indent=2)
        
        # Update in MLflow if available
        try:
            self.mlflow_client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage,
                archive_existing_versions=archive_existing
            )
        except Exception as e:
            print(f"MLflow transition error (continuing): {e}")
        
        return updated_model
    
    def _upload_directory_to_s3(self, local_path: Path, s3_prefix: str):
        """Upload a directory to S3."""
        for file_path in local_path.rglob("*"):
            if file_path.is_file():
                relative_path = file_path.relative_to(local_path)
                s3_key = f"{s3_prefix}/{relative_path}"
                
                self.s3_client.upload_file(
                    str(file_path),
                    self.s3_bucket,
                    s3_key
                )
    
    def _download_directory_from_s3(self, bucket: str, prefix: str, local_path: Path):
        """Download a directory from S3."""
        paginator = self.s3_client.get_paginator('list_objects_v2')
        
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get('Contents', []):
                s3_key = obj['Key']
                relative_path = s3_key.replace(prefix + "/", "")
                local_file = local_path / relative_path
                
                local_file.parent.mkdir(parents=True, exist_ok=True)
                self.s3_client.download_file(bucket, s3_key, str(local_file))
    
    def _load_model_from_path(self, model_path: Path) -> Any:
        """Try different methods to load a model from path."""
        # Try MLflow model
        if (model_path / "MLmodel").exists():
            return mlflow.pyfunc.load_model(str(model_path))
        
        # Try pickle files
        for pickle_file in model_path.glob("*.pkl"):
            with open(pickle_file, "rb") as f:
                return pickle.load(f)
        
        # Try joblib files
        for joblib_file in model_path.glob("*.joblib"):
            return joblib.load(joblib_file)
        
        # Try cloudpickle
        for cp_file in model_path.glob("*.cloudpickle"):
            with open(cp_file, "rb") as f:
                return cloudpickle.load(f)
        
        raise ValueError(f"Could not load model from {model_path}")