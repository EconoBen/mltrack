"""Flexible data storage system for MLtrack with content-addressable storage.

Key Design Principles:
====================
1. Content-addressable storage for data deduplication
2. Flexible organization (not just experiments)
3. Multiple storage patterns based on use case
4. Efficient data versioning and retrieval

Storage Patterns:
================
1. Development/Experimentation:
   - Organized by project/experiment
   - Frequent iterations
   - Temporary/disposable runs

2. Production/Deployment:
   - Organized by model/version
   - Stable, long-lived
   - Audit trail important

3. Evaluation/Testing:
   - Organized by dataset/benchmark
   - Reproducibility critical
   - Compare across models

S3 Structure:
============
mltrack/
├── data/                          # Content-addressable data storage
│   ├── {hash[:2]}/               # First 2 chars of hash for partitioning
│   │   └── {hash}/               # Full content hash
│   │       ├── data.{format}     # Actual data (parquet/json/npy)
│   │       └── metadata.json     # Data metadata
├── models/                        # Model storage
│   ├── registry/                 # Production models
│   │   └── {model_name}/
│   │       └── v{version}/
│   │           ├── model.pkl
│   │           ├── metadata.json
│   │           └── code.py
│   └── development/              # Development models
│       └── {project}/
│           └── {run_id}/
├── runs/                         # Run organization (flexible)
│   ├── by_date/                 # Chronological
│   │   └── {yyyy-mm-dd}/
│   │       └── {run_id}/
│   ├── by_project/              # Project-based
│   │   └── {project_name}/
│   │       └── {run_id}/
│   └── by_type/                 # Type-based (production/eval/experiment)
│       └── {run_type}/
│           └── {run_id}/
└── manifests/                    # Run manifests (lightweight)
    └── {run_id}.json            # Points to data/models/outputs
"""

import os
import json
import hashlib
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Tuple, Literal
from enum import Enum
import pickle
import pandas as pd
import numpy as np
from dataclasses import dataclass, asdict, field

import boto3
from botocore.exceptions import ClientError
import mlflow

from mltrack.config import MLTrackConfig


class RunType(Enum):
    """Types of runs with different storage patterns."""
    EXPERIMENT = "experiment"      # Traditional ML experiments
    PRODUCTION = "production"      # Production model runs
    EVALUATION = "evaluation"      # Model evaluation/benchmarking
    DEVELOPMENT = "development"    # Development/debugging runs
    ANALYSIS = "analysis"         # One-off analysis runs
    
    
class StorageMode(Enum):
    """How to organize runs in storage."""
    BY_PROJECT = "by_project"      # Group by project/experiment
    BY_DATE = "by_date"           # Chronological organization
    BY_TYPE = "by_type"           # Group by run type
    BY_MODEL = "by_model"         # Group by model name
    FLAT = "flat"                 # No organization, just run_id


@dataclass
class DataReference:
    """Reference to stored data with deduplication."""
    hash: str
    storage_path: str
    size_bytes: int
    format: str  # parquet, json, npy, etc.
    shape: Optional[List[int]] = None
    columns: Optional[List[str]] = None
    dtype: Optional[Union[str, Dict[str, str]]] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    
@dataclass
class RunManifest:
    """Lightweight manifest for a run."""
    run_id: str
    run_type: RunType
    created_at: str
    
    # References to data (not copies)
    inputs: Dict[str, DataReference] = field(default_factory=dict)
    outputs: Dict[str, DataReference] = field(default_factory=dict)
    
    # Model information
    model_path: Optional[str] = None
    model_hash: Optional[str] = None
    model_metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Organization metadata
    project: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    metrics: Dict[str, float] = field(default_factory=dict)
    
    # Storage location (can be in multiple places)
    storage_locations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        # Convert enums
        data['run_type'] = self.run_type.value
        # Convert DataReference objects
        for category in ['inputs', 'outputs']:
            if category in data:
                data[category] = {
                    k: asdict(v) if isinstance(v, DataReference) else v
                    for k, v in data[category].items()
                }
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RunManifest':
        """Create from dictionary."""
        # Convert run_type
        if 'run_type' in data:
            data['run_type'] = RunType(data['run_type'])
        # Convert DataReference dicts
        for category in ['inputs', 'outputs']:
            if category in data:
                data[category] = {
                    k: DataReference(**v) if isinstance(v, dict) else v
                    for k, v in data[category].items()
                }
        return cls(**data)


class FlexibleDataStore:
    """Flexible data storage with content-addressable storage and multiple organization patterns."""
    
    def __init__(
        self,
        s3_bucket: Optional[str] = None,
        s3_prefix: str = "mltrack",
        aws_profile: Optional[str] = None,
        default_run_type: RunType = RunType.EXPERIMENT,
        default_storage_mode: StorageMode = StorageMode.BY_PROJECT,
        config: Optional[MLTrackConfig] = None
    ):
        """Initialize flexible data store.
        
        Args:
            s3_bucket: S3 bucket name
            s3_prefix: Base prefix for all MLtrack data
            aws_profile: AWS profile to use
            default_run_type: Default type for runs
            default_storage_mode: Default organization mode
            config: MLtrack configuration
        """
        self.config = config or MLTrackConfig.find_config()
        self.s3_bucket = s3_bucket or os.environ.get("MLTRACK_S3_BUCKET")
        self.s3_prefix = s3_prefix
        self.default_run_type = default_run_type
        self.default_storage_mode = default_storage_mode
        
        # Local cache for data references
        self._data_cache: Dict[str, DataReference] = {}
        
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
    
    def _compute_hash(self, data: Any) -> str:
        """Compute SHA256 hash of data for content addressing."""
        hasher = hashlib.sha256()
        
        if isinstance(data, pd.DataFrame):
            # Use pandas hashing then hash the result
            hasher.update(pd.util.hash_pandas_object(data).values)
        elif isinstance(data, np.ndarray):
            hasher.update(data.tobytes())
        elif isinstance(data, (dict, list)):
            # Convert to JSON for consistent hashing
            hasher.update(json.dumps(data, sort_keys=True, default=str).encode())
        else:
            hasher.update(str(data).encode())
            
        return hasher.hexdigest()
    
    def _get_data_s3_key(self, data_hash: str, filename: str) -> str:
        """Get S3 key for content-addressable data."""
        # Use first 2 chars for partitioning
        return f"{self.s3_prefix}/data/{data_hash[:2]}/{data_hash}/{filename}"
    
    def _get_run_s3_key(
        self, 
        run_id: str, 
        storage_mode: StorageMode,
        run_type: RunType,
        project: Optional[str] = None,
        category: str = "",
        filename: str = ""
    ) -> str:
        """Get S3 key for run data based on storage mode."""
        base = f"{self.s3_prefix}/runs"
        
        if storage_mode == StorageMode.BY_PROJECT:
            if not project:
                project = "default"
            path = f"{base}/by_project/{project}/{run_id}"
        elif storage_mode == StorageMode.BY_DATE:
            date = datetime.utcnow().strftime("%Y-%m-%d")
            path = f"{base}/by_date/{date}/{run_id}"
        elif storage_mode == StorageMode.BY_TYPE:
            path = f"{base}/by_type/{run_type.value}/{run_id}"
        elif storage_mode == StorageMode.FLAT:
            path = f"{base}/all/{run_id}"
        else:
            raise ValueError(f"Unknown storage mode: {storage_mode}")
            
        if category:
            path = f"{path}/{category}"
        if filename:
            path = f"{path}/{filename}"
            
        return path
    
    def store_data(
        self,
        data: Union[pd.DataFrame, np.ndarray, Dict[str, Any]],
        name: str = "data",
        metadata: Optional[Dict[str, Any]] = None
    ) -> DataReference:
        """Store data using content-addressable storage.
        
        This method stores data only once - if the same data is stored again,
        it returns a reference to the existing data.
        
        Args:
            data: Data to store
            name: Name for the data
            metadata: Additional metadata
            
        Returns:
            DataReference object
        """
        # Compute hash
        data_hash = self._compute_hash(data)
        
        # Check if already stored
        if data_hash in self._data_cache:
            print(f"  ♻️  Data already stored, returning reference: {data_hash[:8]}...")
            return self._data_cache[data_hash]
        
        # Prepare storage metadata
        storage_metadata = {
            "name": name,
            "hash": data_hash,
            "type": type(data).__name__,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Handle different data types
        if isinstance(data, pd.DataFrame):
            filename = "data.parquet"
            format_type = "parquet"
            storage_metadata["shape"] = list(data.shape)
            storage_metadata["columns"] = list(data.columns)
            storage_metadata["dtype"] = {col: str(dtype) for col, dtype in data.dtypes.items()}
            
            # Save locally first
            local_path = Path(tempfile.mkdtemp()) / filename
            data.to_parquet(local_path)
            
        elif isinstance(data, np.ndarray):
            filename = "data.npy"
            format_type = "npy"
            storage_metadata["shape"] = list(data.shape)
            storage_metadata["dtype"] = str(data.dtype)
            
            # Save locally first
            local_path = Path(tempfile.mkdtemp()) / filename
            np.save(local_path, data)
            
        else:  # Dict or other
            filename = "data.json"
            format_type = "json"
            
            # Save locally first
            local_path = Path(tempfile.mkdtemp()) / filename
            with open(local_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        
        # Get file size
        size_bytes = local_path.stat().st_size
        
        # Upload to S3 if available
        s3_location = None
        if self.s3_client and self.s3_bucket:
            data_key = self._get_data_s3_key(data_hash, filename)
            
            # Check if already exists in S3
            try:
                self.s3_client.head_object(Bucket=self.s3_bucket, Key=data_key)
                print(f"  ♻️  Data already in S3: {data_hash[:8]}...")
                s3_location = f"s3://{self.s3_bucket}/{data_key}"
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    # Doesn't exist, upload it
                    try:
                        self.s3_client.upload_file(str(local_path), self.s3_bucket, data_key)
                        s3_location = f"s3://{self.s3_bucket}/{data_key}"
                        
                        # Also upload metadata
                        meta_key = self._get_data_s3_key(data_hash, "metadata.json")
                        self.s3_client.put_object(
                            Bucket=self.s3_bucket,
                            Key=meta_key,
                            Body=json.dumps(storage_metadata, indent=2),
                            ContentType="application/json"
                        )
                        print(f"  ✅ Data stored: {data_hash[:8]}...")
                    except Exception as e:
                        print(f"  ⚠️  Failed to upload to S3: {e}")
        
        # Create reference
        ref = DataReference(
            hash=data_hash,
            storage_path=s3_location or str(local_path),
            size_bytes=size_bytes,
            format=format_type,
            shape=storage_metadata.get("shape"),
            columns=storage_metadata.get("columns"),
            dtype=storage_metadata.get("dtype")
        )
        
        # Cache reference
        self._data_cache[data_hash] = ref
        
        # Add custom metadata
        if metadata:
            storage_metadata.update(metadata)
        
        return ref
    
    def create_run(
        self,
        run_id: str,
        run_type: Optional[RunType] = None,
        project: Optional[str] = None,
        storage_modes: Optional[List[StorageMode]] = None,
        tags: Optional[Dict[str, str]] = None
    ) -> RunManifest:
        """Create a new run with flexible organization.
        
        Args:
            run_id: Unique run ID
            run_type: Type of run (experiment, production, etc.)
            project: Project name for organization
            storage_modes: How to organize this run (can be multiple)
            tags: Additional tags
            
        Returns:
            RunManifest object
        """
        run_type = run_type or self.default_run_type
        storage_modes = storage_modes or [self.default_storage_mode]
        
        manifest = RunManifest(
            run_id=run_id,
            run_type=run_type,
            created_at=datetime.utcnow().isoformat(),
            project=project,
            tags=tags or {},
            storage_locations=[]
        )
        
        # Store in multiple locations if requested
        for mode in storage_modes:
            location = self._get_run_s3_key(
                run_id, mode, run_type, project, "", ""
            )
            manifest.storage_locations.append(location)
        
        return manifest
    
    def add_run_input(
        self,
        manifest: RunManifest,
        name: str,
        data: Union[pd.DataFrame, np.ndarray, Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> DataReference:
        """Add input data to a run, using deduplication.
        
        Args:
            manifest: Run manifest
            name: Name for this input
            data: Input data
            metadata: Additional metadata
            
        Returns:
            DataReference for the stored data
        """
        # Store data (will be deduplicated automatically)
        ref = self.store_data(data, name, metadata)
        
        # Add reference to manifest
        manifest.inputs[name] = ref
        
        # Log reference to MLflow (not the data itself)
        if mlflow.active_run():
            mlflow.log_dict({
                "hash": ref.hash,
                "format": ref.format,
                "size_bytes": ref.size_bytes,
                "storage_path": ref.storage_path
            }, f"inputs/{name}_reference.json")
        
        return ref
    
    def add_run_output(
        self,
        manifest: RunManifest,
        name: str,
        data: Union[pd.DataFrame, np.ndarray, Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> DataReference:
        """Add output data to a run.
        
        Args:
            manifest: Run manifest
            name: Name for this output
            data: Output data
            metadata: Additional metadata
            
        Returns:
            DataReference for the stored data
        """
        # Store data
        ref = self.store_data(data, name, metadata)
        
        # Add reference to manifest
        manifest.outputs[name] = ref
        
        # Log reference to MLflow
        if mlflow.active_run():
            mlflow.log_dict({
                "hash": ref.hash,
                "format": ref.format,
                "size_bytes": ref.size_bytes,
                "storage_path": ref.storage_path
            }, f"outputs/{name}_reference.json")
        
        return ref
    
    def save_manifest(self, manifest: RunManifest) -> None:
        """Save run manifest to storage."""
        manifest_data = manifest.to_dict()
        
        # Save to S3 if available
        if self.s3_client and self.s3_bucket:
            manifest_key = f"{self.s3_prefix}/manifests/{manifest.run_id}.json"
            try:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=manifest_key,
                    Body=json.dumps(manifest_data, indent=2),
                    ContentType="application/json"
                )
                print(f"  ✅ Manifest saved: {manifest.run_id}")
            except Exception as e:
                print(f"  ⚠️  Failed to save manifest: {e}")
        
        # Also save to MLflow
        if mlflow.active_run():
            mlflow.log_dict(manifest_data, "run_manifest.json")
    
    def retrieve_data(self, data_ref: DataReference) -> Any:
        """Retrieve data using a reference.
        
        Args:
            data_ref: DataReference object
            
        Returns:
            The original data
        """
        if not self.s3_client or not self.s3_bucket:
            raise Exception("S3 not configured")
        
        # Extract S3 key from storage path
        if data_ref.storage_path.startswith("s3://"):
            s3_path = data_ref.storage_path.replace(f"s3://{self.s3_bucket}/", "")
        else:
            raise Exception(f"Invalid storage path: {data_ref.storage_path}")
        
        # Download to temp location
        local_path = Path(tempfile.mkdtemp()) / f"data.{data_ref.format}"
        
        try:
            self.s3_client.download_file(self.s3_bucket, s3_path, str(local_path))
            
            # Load based on format
            if data_ref.format == 'parquet':
                return pd.read_parquet(local_path)
            elif data_ref.format == 'npy':
                return np.load(local_path)
            elif data_ref.format == 'json':
                with open(local_path) as f:
                    return json.load(f)
            else:
                raise ValueError(f"Unknown format: {data_ref.format}")
                
        except Exception as e:
            raise Exception(f"Failed to retrieve data: {e}")
    
    def find_runs_by_data(self, data_hash: str) -> List[str]:
        """Find all runs that use a specific data hash.
        
        Args:
            data_hash: Hash of the data
            
        Returns:
            List of run IDs that reference this data
        """
        # This would scan manifests to find runs using this data
        # For now, return empty list (would implement manifest scanning)
        return []
    
    def get_data_usage_stats(self) -> Dict[str, Any]:
        """Get statistics about data deduplication.
        
        Returns:
            Stats about data usage and savings
        """
        # Would analyze manifests and data store
        # For now, return example stats
        return {
            "unique_datasets": len(self._data_cache),
            "total_references": 0,  # Would count from manifests
            "deduplication_ratio": 0.0,
            "space_saved_bytes": 0
        }


# Decorator for flexible data capture
def capture_flexible_data(
    store_inputs: bool = True,
    store_outputs: bool = True,
    input_params: Optional[List[str]] = None,
    output_param: Optional[str] = None,
    run_type: Optional[RunType] = None,
    storage_modes: Optional[List[StorageMode]] = None,
    project: Optional[str] = None,
    s3_bucket: Optional[str] = None
):
    """Decorator to capture data with flexible organization.
    
    Args:
        store_inputs: Whether to store inputs
        store_outputs: Whether to store outputs
        input_params: List of parameter names to store
        output_param: Name for the output
        run_type: Type of run
        storage_modes: How to organize the run
        project: Project name
        s3_bucket: S3 bucket override
    """
    def decorator(func):
        from functools import wraps
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get current MLflow run
            run = mlflow.active_run()
            if not run:
                # Just execute without storage
                return func(*args, **kwargs)
            
            # Initialize data store
            data_store = FlexibleDataStore(
                s3_bucket=s3_bucket,
                default_run_type=run_type or RunType.EXPERIMENT,
                default_storage_mode=storage_modes[0] if storage_modes else StorageMode.BY_PROJECT
            )
            
            # Create run manifest
            manifest = data_store.create_run(
                run_id=run.info.run_id,
                run_type=run_type,
                project=project,
                storage_modes=storage_modes,
                tags=run.data.tags
            )
            
            # Store inputs if requested
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
                                data_store.add_run_input(
                                    manifest,
                                    param_name,
                                    param_value,
                                    metadata={"parameter": param_name}
                                )
                            except Exception as e:
                                print(f"⚠️ Failed to store input {param_name}: {e}")
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store outputs if requested
            if store_outputs and result is not None:
                output_name = output_param or "result"
                
                # Store result if it's a supported type
                if isinstance(result, (pd.DataFrame, np.ndarray, dict)):
                    try:
                        data_store.add_run_output(
                            manifest,
                            output_name,
                            result
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to store output: {e}")
            
            # Save manifest
            data_store.save_manifest(manifest)
            
            return result
            
        return wrapper
    return decorator