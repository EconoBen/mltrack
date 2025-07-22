"""Framework detection and auto-configuration for mltrack."""

import importlib
import sys
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class FrameworkInfo:
    """Information about a detected ML framework."""
    name: str
    version: str
    import_name: str
    setup_function: Optional[Callable] = None


class FrameworkDetector:
    """Detect installed ML frameworks and configure MLflow accordingly."""
    
    def __init__(self):
        self.detected_frameworks: List[FrameworkInfo] = []
        
    def detect_all(self) -> List[FrameworkInfo]:
        """Detect all installed ML frameworks."""
        self.detected_frameworks = []
        
        # Check for common ML frameworks
        frameworks_to_check = {
            "sklearn": ("scikit-learn", self._setup_sklearn),
            "torch": ("PyTorch", self._setup_pytorch),
            "tensorflow": ("TensorFlow", self._setup_tensorflow),
            "xgboost": ("XGBoost", self._setup_xgboost),
            "lightgbm": ("LightGBM", self._setup_lightgbm),
            "keras": ("Keras", self._setup_keras),
            "fastai": ("fastai", self._setup_fastai),
            "transformers": ("Transformers", self._setup_transformers),
        }
        
        for import_name, (display_name, setup_func) in frameworks_to_check.items():
            if self._is_framework_available(import_name):
                version = self._get_framework_version(import_name)
                framework = FrameworkInfo(
                    name=display_name,
                    version=version,
                    import_name=import_name,
                    setup_function=setup_func
                )
                self.detected_frameworks.append(framework)
                logger.info(f"Detected {display_name} {version}")
        
        return self.detected_frameworks
    
    def _is_framework_available(self, import_name: str) -> bool:
        """Check if a framework is available for import."""
        try:
            importlib.import_module(import_name)
            return True
        except ImportError:
            return False
    
    def _get_framework_version(self, import_name: str) -> str:
        """Get the version of an installed framework."""
        try:
            module = importlib.import_module(import_name)
            # Try common version attributes
            for attr in ["__version__", "VERSION", "version"]:
                if hasattr(module, attr):
                    version = getattr(module, attr)
                    if isinstance(version, str):
                        return version
                    elif hasattr(version, "__version__"):
                        return version.__version__
            return "unknown"
        except Exception:
            return "unknown"
    
    def setup_auto_logging(self) -> Dict[str, bool]:
        """Set up auto-logging for all detected frameworks."""
        results = {}
        
        for framework in self.detected_frameworks:
            if framework.setup_function:
                try:
                    framework.setup_function()
                    results[framework.name] = True
                    logger.info(f"Enabled auto-logging for {framework.name}")
                except Exception as e:
                    results[framework.name] = False
                    logger.warning(f"Failed to enable auto-logging for {framework.name}: {e}")
        
        return results
    
    def _setup_sklearn(self) -> None:
        """Set up auto-logging for scikit-learn."""
        import mlflow.sklearn
        mlflow.sklearn.autolog()
    
    def _setup_pytorch(self) -> None:
        """Set up auto-logging for PyTorch."""
        import mlflow.pytorch
        mlflow.pytorch.autolog()
    
    def _setup_tensorflow(self) -> None:
        """Set up auto-logging for TensorFlow."""
        import mlflow.tensorflow
        mlflow.tensorflow.autolog()
    
    def _setup_xgboost(self) -> None:
        """Set up auto-logging for XGBoost."""
        import mlflow.xgboost
        mlflow.xgboost.autolog()
    
    def _setup_lightgbm(self) -> None:
        """Set up auto-logging for LightGBM."""
        import mlflow.lightgbm
        mlflow.lightgbm.autolog()
    
    def _setup_keras(self) -> None:
        """Set up auto-logging for Keras."""
        import mlflow.keras
        mlflow.keras.autolog()
    
    def _setup_fastai(self) -> None:
        """Set up auto-logging for fastai."""
        import mlflow.fastai
        mlflow.fastai.autolog()
    
    def _setup_transformers(self) -> None:
        """Set up auto-logging for Transformers."""
        import mlflow.transformers
        mlflow.transformers.autolog()


def get_model_info(model: Any) -> Dict[str, Any]:
    """Extract information about a model instance."""
    info = {
        "class": model.__class__.__name__,
        "module": model.__class__.__module__,
    }
    
    # Try to get model parameters
    if hasattr(model, "get_params"):  # sklearn-style
        info["params"] = model.get_params()
    elif hasattr(model, "config"):  # transformers-style
        info["config"] = model.config.to_dict() if hasattr(model.config, "to_dict") else str(model.config)
    elif hasattr(model, "__dict__"):
        # Filter out non-serializable attributes
        info["attributes"] = {
            k: v for k, v in model.__dict__.items()
            if isinstance(v, (str, int, float, bool, list, dict, tuple))
        }
    
    return info