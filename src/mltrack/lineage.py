"""Data lineage tracking for MLTrack.

This module provides functionality to track data lineage - the flow of data
through ML pipelines from sources through transformations to outputs.
"""

import hashlib
import json
import logging
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Union, Any, Tuple
from urllib.parse import urlparse

import mlflow
from mlflow.entities import Run

logger = logging.getLogger(__name__)


class DataSourceType(Enum):
    """Types of data sources."""
    FILE = "file"
    DATABASE = "database"
    API = "api"
    S3 = "s3"
    GCS = "gcs"
    AZURE_BLOB = "azure_blob"
    HTTP = "http"
    MEMORY = "memory"
    MLFLOW_ARTIFACT = "mlflow_artifact"
    UNKNOWN = "unknown"


class TransformationType(Enum):
    """Types of data transformations."""
    PREPROCESSING = "preprocessing"
    FEATURE_ENGINEERING = "feature_engineering"
    AUGMENTATION = "augmentation"
    SAMPLING = "sampling"
    SPLITTING = "splitting"
    AGGREGATION = "aggregation"
    FILTERING = "filtering"
    NORMALIZATION = "normalization"
    ENCODING = "encoding"
    CUSTOM = "custom"


@dataclass
class DataSource:
    """Represents a data source in the lineage graph."""
    source_id: str
    source_type: DataSourceType
    location: str
    format: Optional[str] = None
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    created_at: Optional[datetime] = None
    accessed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data['source_type'] = self.source_type.value
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.accessed_at:
            data['accessed_at'] = self.accessed_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DataSource':
        """Create from dictionary."""
        data = data.copy()
        data['source_type'] = DataSourceType(data['source_type'])
        if data.get('created_at'):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if data.get('accessed_at'):
            data['accessed_at'] = datetime.fromisoformat(data['accessed_at'])
        return cls(**data)


@dataclass
class Transformation:
    """Represents a data transformation."""
    transform_id: str
    transform_type: TransformationType
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    code_ref: Optional[str] = None  # Reference to code location
    applied_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data['transform_type'] = self.transform_type.value
        if self.applied_at:
            data['applied_at'] = self.applied_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Transformation':
        """Create from dictionary."""
        data = data.copy()
        data['transform_type'] = TransformationType(data['transform_type'])
        if data.get('applied_at'):
            data['applied_at'] = datetime.fromisoformat(data['applied_at'])
        return cls(**data)


@dataclass
class DataLineage:
    """Complete lineage information for a run."""
    run_id: str
    inputs: List[DataSource] = field(default_factory=list)
    outputs: List[DataSource] = field(default_factory=list)
    transformations: List[Transformation] = field(default_factory=list)
    parent_runs: List[str] = field(default_factory=list)  # Parent run IDs
    child_runs: List[str] = field(default_factory=list)   # Child run IDs
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'run_id': self.run_id,
            'inputs': [inp.to_dict() for inp in self.inputs],
            'outputs': [out.to_dict() for out in self.outputs],
            'transformations': [t.to_dict() for t in self.transformations],
            'parent_runs': self.parent_runs,
            'child_runs': self.child_runs,
            'created_at': self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DataLineage':
        """Create from dictionary."""
        return cls(
            run_id=data['run_id'],
            inputs=[DataSource.from_dict(inp) for inp in data.get('inputs', [])],
            outputs=[DataSource.from_dict(out) for out in data.get('outputs', [])],
            transformations=[Transformation.from_dict(t) for t in data.get('transformations', [])],
            parent_runs=data.get('parent_runs', []),
            child_runs=data.get('child_runs', []),
            created_at=datetime.fromisoformat(data['created_at'])
        )


class LineageTracker:
    """Tracks data lineage for ML experiments."""
    
    def __init__(self):
        self._current_lineage: Optional[DataLineage] = None
        self._tracking_enabled = True
        
    def start_tracking(self, run_id: str) -> DataLineage:
        """Start tracking lineage for a run."""
        self._current_lineage = DataLineage(run_id=run_id)
        return self._current_lineage
    
    def stop_tracking(self) -> Optional[DataLineage]:
        """Stop tracking and return the lineage."""
        lineage = self._current_lineage
        self._current_lineage = None
        return lineage
    
    def track_input(self, 
                   source: Union[str, Path, DataSource],
                   source_type: Optional[DataSourceType] = None,
                   **metadata) -> Optional[DataSource]:
        """Track a data input source."""
        if not self._current_lineage or not self._tracking_enabled:
            return None
            
        if isinstance(source, DataSource):
            data_source = source
        else:
            # Auto-detect source type if not provided
            if source_type is None:
                source_type = self._detect_source_type(str(source))
            
            # Generate source ID
            source_id = self._generate_source_id(str(source), source_type)
            
            # Get file info if it's a file
            size_bytes = None
            checksum = None
            if source_type == DataSourceType.FILE and os.path.exists(str(source)):
                size_bytes = os.path.getsize(str(source))
                checksum = self._calculate_checksum(str(source))
            
            data_source = DataSource(
                source_id=source_id,
                source_type=source_type,
                location=str(source),
                size_bytes=size_bytes,
                checksum=checksum,
                accessed_at=datetime.now(),
                metadata=metadata
            )
        
        self._current_lineage.inputs.append(data_source)
        logger.debug(f"Tracked input: {data_source.location}")
        return data_source
    
    def track_output(self,
                    destination: Union[str, Path, DataSource],
                    source_type: Optional[DataSourceType] = None,
                    **metadata) -> Optional[DataSource]:
        """Track a data output destination."""
        if not self._current_lineage or not self._tracking_enabled:
            return None
            
        if isinstance(destination, DataSource):
            data_source = destination
        else:
            # Auto-detect source type if not provided
            if source_type is None:
                source_type = self._detect_source_type(str(destination))
            
            # Generate source ID
            source_id = self._generate_source_id(str(destination), source_type)
            
            data_source = DataSource(
                source_id=source_id,
                source_type=source_type,
                location=str(destination),
                created_at=datetime.now(),
                metadata=metadata
            )
        
        self._current_lineage.outputs.append(data_source)
        logger.debug(f"Tracked output: {data_source.location}")
        return data_source
    
    def track_transformation(self,
                           name: str,
                           transform_type: TransformationType = TransformationType.CUSTOM,
                           description: Optional[str] = None,
                           parameters: Optional[Dict[str, Any]] = None,
                           code_ref: Optional[str] = None) -> Optional[Transformation]:
        """Track a data transformation."""
        if not self._current_lineage or not self._tracking_enabled:
            return None
        
        transform_id = self._generate_transform_id(name, transform_type)
        
        transformation = Transformation(
            transform_id=transform_id,
            transform_type=transform_type,
            name=name,
            description=description,
            parameters=parameters or {},
            code_ref=code_ref,
            applied_at=datetime.now()
        )
        
        self._current_lineage.transformations.append(transformation)
        logger.debug(f"Tracked transformation: {name}")
        return transformation
    
    def add_parent_run(self, parent_run_id: str) -> None:
        """Add a parent run relationship."""
        if self._current_lineage and parent_run_id not in self._current_lineage.parent_runs:
            self._current_lineage.parent_runs.append(parent_run_id)
    
    def add_child_run(self, child_run_id: str) -> None:
        """Add a child run relationship."""
        if self._current_lineage and child_run_id not in self._current_lineage.child_runs:
            self._current_lineage.child_runs.append(child_run_id)
    
    def save_lineage(self, lineage: Optional[DataLineage] = None) -> None:
        """Save lineage to MLflow."""
        lineage = lineage or self._current_lineage
        if not lineage:
            return
        
        try:
            # Save as MLflow artifact
            lineage_dict = lineage.to_dict()
            mlflow.log_dict(lineage_dict, "lineage/lineage.json")
            
            # Also set tags for quick access
            mlflow.set_tag("mltrack.has_lineage", "true")
            mlflow.set_tag("mltrack.lineage.num_inputs", str(len(lineage.inputs)))
            mlflow.set_tag("mltrack.lineage.num_outputs", str(len(lineage.outputs)))
            mlflow.set_tag("mltrack.lineage.num_transforms", str(len(lineage.transformations)))
            
            if lineage.parent_runs:
                mlflow.set_tag("mltrack.lineage.parent_runs", ",".join(lineage.parent_runs))
            if lineage.child_runs:
                mlflow.set_tag("mltrack.lineage.child_runs", ",".join(lineage.child_runs))
            
            logger.info(f"Saved lineage for run {lineage.run_id}")
        except Exception as e:
            logger.error(f"Failed to save lineage: {e}")
    
    def load_lineage(self, run_id: str) -> Optional[DataLineage]:
        """Load lineage from MLflow run."""
        try:
            client = mlflow.tracking.MlflowClient()
            
            # Try to download lineage artifact
            local_path = client.download_artifacts(run_id, "lineage/lineage.json")
            
            with open(local_path, 'r') as f:
                lineage_dict = json.load(f)
            
            return DataLineage.from_dict(lineage_dict)
        except Exception as e:
            logger.debug(f"Failed to load lineage for run {run_id}: {e}")
            return None
    
    def get_upstream_runs(self, run_id: str, max_depth: int = 10) -> Set[str]:
        """Get all upstream runs (recursively following parent relationships)."""
        visited = set()
        to_visit = [run_id]
        depth = 0
        
        while to_visit and depth < max_depth:
            current_batch = to_visit[:]
            to_visit = []
            
            for current_run_id in current_batch:
                if current_run_id in visited:
                    continue
                
                visited.add(current_run_id)
                lineage = self.load_lineage(current_run_id)
                
                if lineage and lineage.parent_runs:
                    to_visit.extend(lineage.parent_runs)
            
            depth += 1
        
        visited.discard(run_id)  # Remove the starting run
        return visited
    
    def get_downstream_runs(self, run_id: str, max_depth: int = 10) -> Set[str]:
        """Get all downstream runs (recursively following child relationships)."""
        visited = set()
        to_visit = [run_id]
        depth = 0
        
        while to_visit and depth < max_depth:
            current_batch = to_visit[:]
            to_visit = []
            
            for current_run_id in current_batch:
                if current_run_id in visited:
                    continue
                
                visited.add(current_run_id)
                lineage = self.load_lineage(current_run_id)
                
                if lineage and lineage.child_runs:
                    to_visit.extend(lineage.child_runs)
            
            depth += 1
        
        visited.discard(run_id)  # Remove the starting run
        return visited
    
    def _detect_source_type(self, location: str) -> DataSourceType:
        """Auto-detect the source type from location string."""
        # Parse as URL
        parsed = urlparse(location)
        
        if parsed.scheme:
            if parsed.scheme == 's3':
                return DataSourceType.S3
            elif parsed.scheme == 'gs':
                return DataSourceType.GCS
            elif parsed.scheme in ['http', 'https']:
                return DataSourceType.HTTP
            elif parsed.scheme == 'azure':
                return DataSourceType.AZURE_BLOB
            elif parsed.scheme in ['postgresql', 'mysql', 'sqlite']:
                return DataSourceType.DATABASE
        
        # Check if it's a file path
        if os.path.exists(location) or '/' in location or '\\' in location:
            return DataSourceType.FILE
        
        # Check for MLflow artifact pattern
        if location.startswith('runs:/') or location.startswith('models:/'):
            return DataSourceType.MLFLOW_ARTIFACT
        
        return DataSourceType.UNKNOWN
    
    def _generate_source_id(self, location: str, source_type: DataSourceType) -> str:
        """Generate a unique ID for a data source."""
        content = f"{source_type.value}:{location}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _generate_transform_id(self, name: str, transform_type: TransformationType) -> str:
        """Generate a unique ID for a transformation."""
        content = f"{transform_type.value}:{name}:{datetime.now().isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _calculate_checksum(self, filepath: str, chunk_size: int = 8192) -> str:
        """Calculate SHA256 checksum of a file."""
        sha256 = hashlib.sha256()
        try:
            with open(filepath, 'rb') as f:
                while chunk := f.read(chunk_size):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except Exception as e:
            logger.warning(f"Failed to calculate checksum for {filepath}: {e}")
            return ""


# Global lineage tracker instance
_lineage_tracker = LineageTracker()


def get_lineage_tracker() -> LineageTracker:
    """Get the global lineage tracker instance."""
    return _lineage_tracker


# Convenience functions for direct usage
def track_input(source: Union[str, Path, DataSource], 
               source_type: Optional[DataSourceType] = None,
               **metadata) -> Optional[DataSource]:
    """Track a data input source."""
    return _lineage_tracker.track_input(source, source_type, **metadata)


def track_output(destination: Union[str, Path, DataSource],
                source_type: Optional[DataSourceType] = None,
                **metadata) -> Optional[DataSource]:
    """Track a data output destination."""
    return _lineage_tracker.track_output(destination, source_type, **metadata)


def track_transformation(name: str,
                       transform_type: TransformationType = TransformationType.CUSTOM,
                       description: Optional[str] = None,
                       parameters: Optional[Dict[str, Any]] = None,
                       code_ref: Optional[str] = None) -> Optional[Transformation]:
    """Track a data transformation."""
    return _lineage_tracker.track_transformation(
        name, transform_type, description, parameters, code_ref
    )


def add_parent_run(parent_run_id: str) -> None:
    """Add a parent run relationship."""
    _lineage_tracker.add_parent_run(parent_run_id)


def add_child_run(child_run_id: str) -> None:
    """Add a child run relationship."""
    _lineage_tracker.add_child_run(child_run_id)