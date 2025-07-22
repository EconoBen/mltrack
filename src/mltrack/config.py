"""Configuration management for mltrack."""

import os
from pathlib import Path
from typing import Optional, Dict, Any
import yaml
from pydantic import BaseModel, Field, validator


class MLTrackConfig(BaseModel):
    """Configuration for mltrack."""
    
    # MLflow settings
    tracking_uri: str = Field(
        default="file://./mlruns",
        description="MLflow tracking server URI"
    )
    experiment_name: Optional[str] = Field(
        default=None,
        description="Default experiment name (auto-generated if not set)"
    )
    
    # Team settings
    team_name: Optional[str] = Field(
        default=None,
        description="Team name for shared experiments"
    )
    default_tags: Dict[str, str] = Field(
        default_factory=dict,
        description="Default tags to apply to all runs"
    )
    
    # Tracking settings
    auto_log_pip: bool = Field(
        default=True,
        description="Automatically log pip requirements"
    )
    auto_log_conda: bool = Field(
        default=True,
        description="Automatically log conda environment"
    )
    auto_log_git: bool = Field(
        default=True,
        description="Automatically log git information"
    )
    auto_log_system: bool = Field(
        default=True,
        description="Automatically log system information"
    )
    
    # Framework detection
    auto_detect_frameworks: bool = Field(
        default=True,
        description="Automatically detect and configure ML frameworks"
    )
    
    # Notification settings
    slack_webhook: Optional[str] = Field(
        default=None,
        description="Slack webhook URL for notifications"
    )
    
    # Environment preferences
    require_uv: bool = Field(
        default=False,
        description="Require UV environment (warn if not present)"
    )
    warn_non_uv: bool = Field(
        default=True,
        description="Show warning when not using UV"
    )
    
    # Storage settings
    artifact_location: Optional[str] = Field(
        default=None,
        description="Default artifact storage location"
    )
    
    @validator("tracking_uri", pre=True, always=True)
    def expand_tracking_uri(cls, v: str) -> str:
        """Expand environment variables and paths in tracking URI."""
        # Check environment variable first
        if not v:
            v = os.environ.get("MLFLOW_TRACKING_URI", "file://./mlruns")
        
        if v.startswith("file://"):
            path = v[7:]
            expanded = os.path.expandvars(os.path.expanduser(path))
            # Handle relative paths properly
            if not os.path.isabs(expanded):
                # For relative paths, resolve from current directory
                expanded = os.path.abspath(expanded)
            return f"file://{expanded}"
        return v
    
    @classmethod
    def from_file(cls, path: Path) -> "MLTrackConfig":
        """Load configuration from YAML file."""
        if path.exists():
            with open(path) as f:
                data = yaml.safe_load(f) or {}
            return cls(**data)
        return cls()
    
    @classmethod
    def find_config(cls, start_path: Optional[Path] = None) -> "MLTrackConfig":
        """Find and load configuration file from current or parent directories."""
        start = Path(start_path or os.getcwd())
        
        # Look for .mltrack.yml in current and parent directories
        for path in [start, *start.parents]:
            config_file = path / ".mltrack.yml"
            if config_file.exists():
                return cls.from_file(config_file)
        
        # Check home directory
        home_config = Path.home() / ".mltrack.yml"
        if home_config.exists():
            return cls.from_file(home_config)
        
        # Return default config
        return cls()
    
    def save(self, path: Path) -> None:
        """Save configuration to YAML file."""
        with open(path, "w") as f:
            yaml.dump(self.dict(exclude_none=True), f, default_flow_style=False)