"""Data storage system for MLtrack with S3 backend.

Standardized S3 Structure:
========================
mltrack/
├── experiments/
│   └── {experiment_id}/
│       └── runs/
│           └── {run_id}/
│               ├── inputs/
│               │   ├── data_{timestamp}.parquet     # Training data
│               │   ├── features_{timestamp}.json    # Feature metadata
│               │   └── config_{timestamp}.json      # Training config
│               ├── outputs/
│               │   ├── predictions_{timestamp}.parquet
│               │   ├── metrics_{timestamp}.json
│               │   └── artifacts/                   # Other outputs
│               ├── models/
│               │   ├── model.pkl                    # Serialized model
│               │   ├── metadata.json                # Model metadata
│               │   ├── requirements.txt             # Dependencies
│               │   └── loading_code.py              # Generated code
│               ├── docker/
│               │   ├── Dockerfile                   # Container definition
│               │   └── docker-compose.yml           # Compose config
│               └── manifest.json                    # Run manifest
"""

import os
import json
import hashlib
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Tuple
import pickle
import pandas as pd
import numpy as np
from dataclasses import dataclass, asdict
from functools import wraps

import boto3
from botocore.exceptions import ClientError
import mlflow

from mltrack.config import MLTrackConfig


@dataclass
class DataManifest:
    """Manifest for tracking stored data."""
    run_id: str
    experiment_id: str
    timestamp: str
    inputs: Dict[str, Dict[str, Any]]  # filename -> metadata
    outputs: Dict[str, Dict[str, Any]]  # filename -> metadata
    model: Optional[Dict[str, Any]] = None
    docker: Optional[Dict[str, Any]] = None
    s3_prefix: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class DataStore:
    """Centralized data storage for MLtrack."""
    
    def __init__(
        self,
        s3_bucket: Optional[str] = None,
        s3_prefix: str = "mltrack",
        aws_profile: Optional[str] = None,
        config: Optional[MLTrackConfig] = None
    ):
        """Initialize data store.
        
        Args:
            s3_bucket: S3 bucket name
            s3_prefix: Base prefix for all MLtrack data
            aws_profile: AWS profile to use
            config: MLtrack configuration
        """
        self.config = config or MLTrackConfig.find_config()
        self.s3_bucket = s3_bucket or os.environ.get("MLTRACK_S3_BUCKET")
        self.s3_prefix = s3_prefix
        
        # Initialize S3 client
        self.s3_client = None
        if self.s3_bucket:
            try:
                session = boto3.Session(profile_name=aws_profile) if aws_profile else boto3.Session()
                self.s3_client = session.client('s3')
                self._validate_s3_access()
            except Exception as e:
                print(f"⚠️ S3 initialization failed: {e}")
                self.s3_client = None
                self.s3_bucket = None
    
    def _validate_s3_access(self):
        """Validate S3 bucket access."""
        try:
            self.s3_client.head_bucket(Bucket=self.s3_bucket)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise Exception(f"Bucket '{self.s3_bucket}' does not exist")
            elif error_code == '403':
                raise Exception(f"Access denied to bucket '{self.s3_bucket}'")
            else:
                raise Exception(f"S3 error: {e}")
    
    def _get_s3_key(self, experiment_id: str, run_id: str, category: str, filename: str) -> str:
        """Generate S3 key for a file.
        
        Args:
            experiment_id: Experiment ID
            run_id: Run ID
            category: Category (inputs/outputs/models/docker)
            filename: File name
            
        Returns:
            S3 key string
        """
        return f"{self.s3_prefix}/experiments/{experiment_id}/runs/{run_id}/{category}/{filename}"
    
    def _generate_timestamp(self) -> str:
        """Generate timestamp string."""
        return datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    def _compute_hash(self, data: Any) -> str:
        """Compute hash of data for versioning."""
        if isinstance(data, pd.DataFrame):
            return hashlib.md5(pd.util.hash_pandas_object(data).values).hexdigest()[:8]
        elif isinstance(data, np.ndarray):
            return hashlib.md5(data.tobytes()).hexdigest()[:8]
        else:
            return hashlib.md5(str(data).encode()).hexdigest()[:8]
    
    def store_inputs(
        self,
        data: Union[pd.DataFrame, np.ndarray, Dict[str, Any]],
        experiment_id: str,
        run_id: str,
        name: str = "training_data",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Store input data for a run.
        
        Args:
            data: Input data (DataFrame, array, or dict)
            experiment_id: Experiment ID
            run_id: Run ID
            name: Name for the data
            metadata: Additional metadata
            
        Returns:
            Storage information
        """
        timestamp = self._generate_timestamp()
        data_hash = self._compute_hash(data)
        
        # Prepare metadata
        storage_metadata = {
            "name": name,
            "timestamp": timestamp,
            "hash": data_hash,
            "type": type(data).__name__,
            "shape": None,
            "columns": None,
            "dtype": None
        }
        
        # Handle different data types
        if isinstance(data, pd.DataFrame):
            filename = f"{name}_{timestamp}_{data_hash}.parquet"
            storage_metadata["shape"] = list(data.shape)
            storage_metadata["columns"] = list(data.columns)
            storage_metadata["dtype"] = {col: str(dtype) for col, dtype in data.dtypes.items()}
            
            # Save locally first
            local_path = Path(tempfile.mkdtemp()) / filename
            data.to_parquet(local_path)
            
        elif isinstance(data, np.ndarray):
            filename = f"{name}_{timestamp}_{data_hash}.npy"
            storage_metadata["shape"] = list(data.shape)
            storage_metadata["dtype"] = str(data.dtype)
            
            # Save locally first
            local_path = Path(tempfile.mkdtemp()) / filename
            np.save(local_path, data)
            
        else:  # Dict or other
            filename = f"{name}_{timestamp}_{data_hash}.json"
            
            # Save locally first
            local_path = Path(tempfile.mkdtemp()) / filename
            with open(local_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        
        # Upload to S3 if available
        if self.s3_client and self.s3_bucket:
            s3_key = self._get_s3_key(experiment_id, run_id, "inputs", filename)
            try:
                self.s3_client.upload_file(str(local_path), self.s3_bucket, s3_key)
                storage_metadata["s3_location"] = f"s3://{self.s3_bucket}/{s3_key}"
                
                # Also store metadata
                meta_key = self._get_s3_key(experiment_id, run_id, "inputs", f"{name}_metadata.json")
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=meta_key,
                    Body=json.dumps(storage_metadata, indent=2),
                    ContentType="application/json"
                )
            except Exception as e:
                print(f"⚠️ Failed to upload to S3: {e}")
        
        # Log to MLflow
        mlflow.log_dict(storage_metadata, f"inputs/{name}_metadata.json")
        
        # Update custom metadata
        if metadata:
            storage_metadata.update(metadata)
        
        return storage_metadata
    
    def store_outputs(
        self,
        data: Union[pd.DataFrame, np.ndarray, Dict[str, Any]],
        experiment_id: str,
        run_id: str,
        name: str = "predictions",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Store output data for a run.
        
        Args:
            data: Output data
            experiment_id: Experiment ID
            run_id: Run ID
            name: Name for the data
            metadata: Additional metadata
            
        Returns:
            Storage information
        """
        timestamp = self._generate_timestamp()
        data_hash = self._compute_hash(data)
        
        # Similar to store_inputs but in outputs directory
        storage_metadata = {
            "name": name,
            "timestamp": timestamp,
            "hash": data_hash,
            "type": type(data).__name__,
        }
        
        # Handle different data types (similar to inputs)
        if isinstance(data, pd.DataFrame):
            filename = f"{name}_{timestamp}_{data_hash}.parquet"
            storage_metadata["shape"] = list(data.shape)
            storage_metadata["columns"] = list(data.columns)
            
            local_path = Path(tempfile.mkdtemp()) / filename
            data.to_parquet(local_path)
            
        elif isinstance(data, np.ndarray):
            filename = f"{name}_{timestamp}_{data_hash}.npy"
            storage_metadata["shape"] = list(data.shape)
            storage_metadata["dtype"] = str(data.dtype)
            
            local_path = Path(tempfile.mkdtemp()) / filename
            np.save(local_path, data)
            
        else:
            filename = f"{name}_{timestamp}_{data_hash}.json"
            
            local_path = Path(tempfile.mkdtemp()) / filename
            with open(local_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        
        # Upload to S3
        if self.s3_client and self.s3_bucket:
            s3_key = self._get_s3_key(experiment_id, run_id, "outputs", filename)
            try:
                self.s3_client.upload_file(str(local_path), self.s3_bucket, s3_key)
                storage_metadata["s3_location"] = f"s3://{self.s3_bucket}/{s3_key}"
            except Exception as e:
                print(f"⚠️ Failed to upload to S3: {e}")
        
        # Log to MLflow
        mlflow.log_dict(storage_metadata, f"outputs/{name}_metadata.json")
        
        if metadata:
            storage_metadata.update(metadata)
        
        return storage_metadata
    
    def store_model_artifacts(
        self,
        model: Any,
        experiment_id: str,
        run_id: str,
        loading_code: str,
        requirements: List[str],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Store model with all artifacts in standardized structure.
        
        Args:
            model: The model object
            experiment_id: Experiment ID
            run_id: Run ID
            loading_code: Generated loading code
            requirements: List of requirements
            metadata: Model metadata
            
        Returns:
            Storage information
        """
        # Create local directory structure
        local_dir = Path(tempfile.mkdtemp()) / "model_artifacts"
        local_dir.mkdir(parents=True)
        
        # Save model
        model_path = local_dir / "model.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        # Save loading code
        code_path = local_dir / "loading_code.py"
        with open(code_path, 'w') as f:
            f.write(loading_code)
        
        # Save requirements
        req_path = local_dir / "requirements.txt"
        with open(req_path, 'w') as f:
            f.write('\n'.join(requirements))
        
        # Save metadata
        meta_path = local_dir / "metadata.json"
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Upload to S3
        storage_info = {
            "timestamp": self._generate_timestamp(),
            "files": []
        }
        
        if self.s3_client and self.s3_bucket:
            for file_path in local_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(local_dir)
                    s3_key = self._get_s3_key(experiment_id, run_id, "models", str(relative_path))
                    
                    try:
                        self.s3_client.upload_file(str(file_path), self.s3_bucket, s3_key)
                        storage_info["files"].append({
                            "name": str(relative_path),
                            "s3_location": f"s3://{self.s3_bucket}/{s3_key}"
                        })
                    except Exception as e:
                        print(f"⚠️ Failed to upload {relative_path}: {e}")
        
        return storage_info
    
    def create_manifest(
        self,
        experiment_id: str,
        run_id: str,
        inputs: Dict[str, Dict[str, Any]],
        outputs: Dict[str, Dict[str, Any]],
        model: Optional[Dict[str, Any]] = None,
        docker: Optional[Dict[str, Any]] = None
    ) -> DataManifest:
        """Create and store a manifest for the run.
        
        Args:
            experiment_id: Experiment ID
            run_id: Run ID
            inputs: Input storage metadata
            outputs: Output storage metadata
            model: Model storage metadata
            docker: Docker configuration metadata
            
        Returns:
            DataManifest object
        """
        manifest = DataManifest(
            run_id=run_id,
            experiment_id=experiment_id,
            timestamp=datetime.utcnow().isoformat(),
            inputs=inputs,
            outputs=outputs,
            model=model,
            docker=docker,
            s3_prefix=f"{self.s3_prefix}/experiments/{experiment_id}/runs/{run_id}"
        )
        
        # Store manifest
        if self.s3_client and self.s3_bucket:
            manifest_key = self._get_s3_key(experiment_id, run_id, "", "manifest.json")
            try:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=manifest_key,
                    Body=json.dumps(manifest.to_dict(), indent=2),
                    ContentType="application/json"
                )
            except Exception as e:
                print(f"⚠️ Failed to store manifest: {e}")
        
        # Also log to MLflow
        mlflow.log_dict(manifest.to_dict(), "data_manifest.json")
        
        return manifest
    
    def retrieve_data(
        self,
        experiment_id: str,
        run_id: str,
        category: str,
        filename: str
    ) -> Any:
        """Retrieve stored data.
        
        Args:
            experiment_id: Experiment ID
            run_id: Run ID
            category: Category (inputs/outputs/models)
            filename: File name
            
        Returns:
            Retrieved data
        """
        if not self.s3_client or not self.s3_bucket:
            raise Exception("S3 not configured")
        
        s3_key = self._get_s3_key(experiment_id, run_id, category, filename)
        local_path = Path(tempfile.mkdtemp()) / filename
        
        try:
            self.s3_client.download_file(self.s3_bucket, s3_key, str(local_path))
            
            # Load based on file extension
            if filename.endswith('.parquet'):
                return pd.read_parquet(local_path)
            elif filename.endswith('.npy'):
                return np.load(local_path)
            elif filename.endswith('.json'):
                with open(local_path) as f:
                    return json.load(f)
            elif filename.endswith('.pkl'):
                with open(local_path, 'rb') as f:
                    return pickle.load(f)
            else:
                with open(local_path) as f:
                    return f.read()
                    
        except Exception as e:
            raise Exception(f"Failed to retrieve data: {e}")


# Decorator for automatic data capture
def capture_data(
    store_inputs: bool = True,
    store_outputs: bool = True,
    input_params: Optional[List[str]] = None,
    output_param: Optional[str] = None,
    s3_bucket: Optional[str] = None
):
    """Decorator to automatically capture function inputs and outputs.
    
    Args:
        store_inputs: Whether to store inputs
        store_outputs: Whether to store outputs
        input_params: List of parameter names to store (None = all)
        output_param: Name for the output (default: "result")
        s3_bucket: S3 bucket override
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get current MLflow run
            run = mlflow.active_run()
            if not run:
                # Just execute without storage
                return func(*args, **kwargs)
            
            # Initialize data store
            data_store = DataStore(s3_bucket=s3_bucket)
            
            # Get experiment ID
            experiment_id = run.info.experiment_id
            run_id = run.info.run_id
            
            # Store inputs if requested
            stored_inputs = {}
            if store_inputs:
                import inspect
                sig = inspect.signature(func)
                bound_args = sig.bind(*args, **kwargs)
                bound_args.apply_defaults()
                
                # Determine which parameters to store
                params_to_store = input_params or list(bound_args.arguments.keys())
                
                for param_name in params_to_store:
                    if param_name in bound_args.arguments:
                        param_value = bound_args.arguments[param_name]
                        
                        # Only store DataFrame, ndarray, or dict
                        if isinstance(param_value, (pd.DataFrame, np.ndarray, dict)):
                            try:
                                storage_info = data_store.store_inputs(
                                    param_value,
                                    experiment_id,
                                    run_id,
                                    name=f"input_{param_name}",
                                    metadata={"parameter": param_name}
                                )
                                stored_inputs[param_name] = storage_info
                            except Exception as e:
                                print(f"⚠️ Failed to store input {param_name}: {e}")
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store outputs if requested
            stored_outputs = {}
            if store_outputs and result is not None:
                output_name = output_param or "result"
                
                # Store result if it's a supported type
                if isinstance(result, (pd.DataFrame, np.ndarray, dict)):
                    try:
                        storage_info = data_store.store_outputs(
                            result,
                            experiment_id,
                            run_id,
                            name=output_name
                        )
                        stored_outputs[output_name] = storage_info
                    except Exception as e:
                        print(f"⚠️ Failed to store output: {e}")
            
            # Create manifest if we stored anything
            if stored_inputs or stored_outputs:
                data_store.create_manifest(
                    experiment_id,
                    run_id,
                    stored_inputs,
                    stored_outputs
                )
            
            return result
            
        return wrapper
    return decorator