"""Core tracking functionality for mltrack."""

import functools
import inspect
import os
import platform
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Union, TypeVar, cast
import logging

import mlflow
from mlflow.entities import RunStatus
import psutil

from mltrack.config import MLTrackConfig
from mltrack.detectors import FrameworkDetector, get_model_info
from mltrack.git_utils import get_git_tags, get_git_info, create_git_commit_url
from mltrack.utils import get_pip_requirements, get_conda_environment, get_uv_info, get_pyproject_toml

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


class MLTracker:
    """Main tracking class for mltrack."""
    
    def __init__(self, config: Optional[MLTrackConfig] = None):
        self.config = config or MLTrackConfig.find_config()
        self._check_environment()
        self._setup_mlflow()
        self.detector = FrameworkDetector()
    
    def _check_environment(self) -> None:
        """Check if we're in a UV environment and warn if not."""
        from mltrack.utils import is_uv_environment
        
        is_uv = is_uv_environment()
        
        if self.config.require_uv and not is_uv:
            raise RuntimeError(
                "UV environment required but not detected! "
                "Please use UV to manage your Python environment. "
                "Install UV: curl -LsSf https://astral.sh/uv/install.sh | sh"
            )
        
        if self.config.warn_non_uv and not is_uv:
            logger.warning(
                "⚠️  Not running in a UV environment! "
                "For best reproducibility and performance, use UV: "
                "uvx mltrack or uv run mltrack"
            )
        
    def _setup_mlflow(self) -> None:
        """Configure MLflow with our settings."""
        mlflow.set_tracking_uri(self.config.tracking_uri)
        
        # Set up experiment
        if self.config.experiment_name:
            mlflow.set_experiment(self.config.experiment_name)
        else:
            # Auto-generate experiment name from project
            project_name = Path.cwd().name
            mlflow.set_experiment(f"{project_name}-experiments")
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get system information."""
        return {
            "platform": platform.platform(),
            "python_version": sys.version,
            "cpu_count": psutil.cpu_count(),
            "memory_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "hostname": platform.node(),
            "user": os.environ.get("USER", "unknown"),
        }
    
    def _log_environment(self) -> None:
        """Log environment information."""
        # Log UV environment info
        uv_info = get_uv_info()
        if uv_info["is_uv"]:
            mlflow.log_dict(uv_info, "uv_info.json")
            mlflow.set_tag("environment.type", "uv")
            mlflow.set_tag("environment.uv_version", uv_info["uv_version"])
        else:
            mlflow.set_tag("environment.type", "other")
        
        # Log pyproject.toml if available
        pyproject = get_pyproject_toml()
        if pyproject:
            mlflow.log_dict(pyproject, "pyproject.toml.json")
        
        if self.config.auto_log_pip:
            try:
                requirements = get_pip_requirements()
                mlflow.log_text(requirements, "requirements.txt")
            except Exception as e:
                logger.warning(f"Failed to log pip requirements: {e}")
        
        if self.config.auto_log_conda:
            try:
                conda_env = get_conda_environment()
                if conda_env:
                    mlflow.log_text(conda_env, "conda.yaml")
            except Exception as e:
                logger.warning(f"Failed to log conda environment: {e}")
    
    def _prepare_tags(self, extra_tags: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """Prepare tags for the MLflow run."""
        tags = self.config.default_tags.copy()
        
        # Add git tags
        if self.config.auto_log_git:
            tags.update(get_git_tags())
        
        # Add system tags
        if self.config.auto_log_system:
            system_info = self._get_system_info()
            tags["system.platform"] = system_info["platform"]
            tags["system.python_version"] = system_info["python_version"]
            tags["system.user"] = system_info["user"]
        
        # Add framework tags
        if self.config.auto_detect_frameworks:
            frameworks = self.detector.detect_all()
            if frameworks:
                tags["frameworks"] = ", ".join(f"{f.name}=={f.version}" for f in frameworks)
        
        # Add team tag
        if self.config.team_name:
            tags["team"] = self.config.team_name
        
        # Add extra tags
        if extra_tags:
            tags.update(extra_tags)
        
        return tags
    
    def track_function(
        self,
        func: Optional[F] = None,
        *,
        name: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        log_args: bool = True,
        log_results: bool = True,
    ) -> Union[F, Callable[[F], F]]:
        """Decorator to track function execution."""
        def decorator(f: F) -> F:
            @functools.wraps(f)
            def wrapper(*args, **kwargs) -> Any:
                # Prepare run name
                run_name = name or f"{f.__name__}"
                
                # Start MLflow run
                with mlflow.start_run(run_name=run_name, tags=self._prepare_tags(tags)):
                    # Enable auto-logging for detected frameworks
                    if self.config.auto_detect_frameworks:
                        self.detector.setup_auto_logging()
                    
                    # Log function information
                    mlflow.log_param("function_name", f.__name__)
                    mlflow.log_param("function_module", f.__module__)
                    
                    # Log function arguments
                    if log_args:
                        sig = inspect.signature(f)
                        bound_args = sig.bind(*args, **kwargs)
                        bound_args.apply_defaults()
                        
                        for param_name, param_value in bound_args.arguments.items():
                            # Log simple types as parameters
                            if isinstance(param_value, (str, int, float, bool)):
                                mlflow.log_param(f"arg.{param_name}", param_value)
                            else:
                                # Log complex types as artifacts
                                mlflow.log_text(str(param_value), f"args/{param_name}.txt")
                    
                    # Log environment
                    self._log_environment()
                    
                    # Add git commit URL if available
                    git_info = get_git_info()
                    if git_info["remote"] and git_info["commit"]:
                        commit_url = create_git_commit_url(git_info["remote"], git_info["commit"])
                        if commit_url:
                            mlflow.set_tag("git.commit_url", commit_url)
                    
                    # Track execution time
                    start_time = time.time()
                    
                    try:
                        # Execute function
                        result = f(*args, **kwargs)
                        
                        # Log execution time
                        execution_time = time.time() - start_time
                        mlflow.log_metric("execution_time_seconds", execution_time)
                        
                        # Log results
                        if log_results and result is not None:
                            # Try to log model
                            if hasattr(result, "fit") or hasattr(result, "predict"):
                                try:
                                    model_info = get_model_info(result)
                                    mlflow.log_dict(model_info, "model_info.json")
                                except Exception as e:
                                    logger.warning(f"Failed to log model info: {e}")
                            
                            # Log string representation
                            mlflow.log_text(str(result), "result.txt")
                        
                        # Mark run as successful
                        mlflow.set_tag("status", "success")
                        
                        return result
                        
                    except Exception as e:
                        # Log error
                        mlflow.set_tag("status", "failed")
                        mlflow.set_tag("error", str(e))
                        mlflow.log_text(str(e), "error.txt")
                        
                        # Log traceback
                        import traceback
                        mlflow.log_text(traceback.format_exc(), "traceback.txt")
                        
                        raise
            
            return cast(F, wrapper)
        
        # Handle being called with or without parentheses
        if func is None:
            return decorator
        else:
            return decorator(func)
    
    @contextmanager
    def track_context(
        self,
        name: str,
        tags: Optional[Dict[str, str]] = None,
    ):
        """Context manager for tracking code blocks."""
        with mlflow.start_run(run_name=name, tags=self._prepare_tags(tags)):
            # Enable auto-logging
            if self.config.auto_detect_frameworks:
                self.detector.setup_auto_logging()
            
            # Log environment
            self._log_environment()
            
            # Track start time
            start_time = time.time()
            
            try:
                yield mlflow.active_run()
                
                # Log execution time
                execution_time = time.time() - start_time
                mlflow.log_metric("execution_time_seconds", execution_time)
                mlflow.set_tag("status", "success")
                
            except Exception as e:
                # Log error
                mlflow.set_tag("status", "failed")
                mlflow.set_tag("error", str(e))
                raise


# Global tracker instance
_tracker: Optional[MLTracker] = None


def _get_tracker() -> MLTracker:
    """Get or create the global tracker instance."""
    global _tracker
    if _tracker is None:
        _tracker = MLTracker()
    return _tracker


# Public API
def track(
    func: Optional[F] = None,
    *,
    name: Optional[str] = None,
    tags: Optional[Dict[str, str]] = None,
    log_args: bool = True,
    log_results: bool = True,
) -> Union[F, Callable[[F], F]]:
    """
    Decorator to automatically track ML experiments.
    
    Args:
        func: Function to track (when used without parentheses)
        name: Custom name for the MLflow run
        tags: Additional tags to add to the run
        log_args: Whether to log function arguments
        log_results: Whether to log function results
    
    Examples:
        @track
        def train_model(data, params):
            ...
        
        @track(name="custom-experiment", tags={"version": "2.0"})
        def train_model(data, params):
            ...
    """
    return _get_tracker().track_function(func, name=name, tags=tags, log_args=log_args, log_results=log_results)


@contextmanager
def track_context(name: str, tags: Optional[Dict[str, str]] = None):
    """
    Context manager for tracking code blocks.
    
    Args:
        name: Name for the MLflow run
        tags: Additional tags to add to the run
    
    Example:
        with track_context("data-preprocessing"):
            # Your code here
            processed_data = preprocess(raw_data)
            mlflow.log_metric("num_samples", len(processed_data))
    """
    with _get_tracker().track_context(name, tags):
        yield