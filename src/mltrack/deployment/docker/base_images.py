"""Framework-specific base image configurations."""

from typing import Dict, Optional, Tuple
from dataclasses import dataclass


@dataclass
class BaseImageConfig:
    """Configuration for a base Docker image."""
    
    image: str
    python_version: str = "3.11"
    cuda_image: Optional[str] = None
    system_packages: Optional[list] = None
    setup_commands: Optional[list] = None


# Framework to base image mapping
BASE_IMAGES: Dict[str, BaseImageConfig] = {
    "sklearn": BaseImageConfig(
        image="python:{python_version}-slim",
        system_packages=["libgomp1"],  # For OpenMP support
    ),
    
    "xgboost": BaseImageConfig(
        image="python:{python_version}-slim",
        cuda_image="nvidia/cuda:12.2.0-runtime-ubuntu22.04",
        system_packages=["libgomp1"],
    ),
    
    "lightgbm": BaseImageConfig(
        image="python:{python_version}-slim",
        cuda_image="nvidia/cuda:12.2.0-runtime-ubuntu22.04",
        system_packages=["libgomp1", "libopenmpi-dev"],
    ),
    
    "catboost": BaseImageConfig(
        image="python:{python_version}-slim",
        cuda_image="nvidia/cuda:12.2.0-runtime-ubuntu22.04",
    ),
    
    "pytorch": BaseImageConfig(
        image="python:{python_version}-slim",
        cuda_image="pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime",
        setup_commands=[
            "pip install torch --index-url https://download.pytorch.org/whl/cpu"
        ],
    ),
    
    "tensorflow": BaseImageConfig(
        image="python:{python_version}-slim",
        cuda_image="tensorflow/tensorflow:2.15.0-gpu",
        system_packages=["libhdf5-dev"],
    ),
    
    "transformers": BaseImageConfig(
        image="python:{python_version}-slim",
        cuda_image="nvidia/cuda:12.2.0-runtime-ubuntu22.04",
        system_packages=["git"],  # For downloading models
    ),
    
    "openai": BaseImageConfig(
        image="python:{python_version}-slim",
    ),
    
    "anthropic": BaseImageConfig(
        image="python:{python_version}-slim",
    ),
    
    "langchain": BaseImageConfig(
        image="python:{python_version}-slim",
    ),
    
    "unknown": BaseImageConfig(
        image="python:{python_version}-slim",
    ),
}


def get_base_image(framework: str, use_gpu: bool = False, python_version: str = "3.11") -> Tuple[str, BaseImageConfig]:
    """Get the appropriate base image for a framework.
    
    Args:
        framework: ML framework name
        use_gpu: Whether to use GPU-enabled image
        python_version: Python version to use
        
    Returns:
        Tuple of (image_name, config)
    """
    config = BASE_IMAGES.get(framework, BASE_IMAGES["unknown"])
    
    if use_gpu and config.cuda_image:
        base_image = config.cuda_image
    else:
        base_image = config.image.format(python_version=python_version)
    
    return base_image, config


def get_python_version_from_image(image: str) -> str:
    """Extract Python version from a Docker image name.
    
    Args:
        image: Docker image name
        
    Returns:
        Python version string
    """
    # Handle special cases
    if "pytorch" in image:
        return "3.11"
    elif "tensorflow" in image:
        return "3.11"
    elif "python:" in image:
        # Extract from python:3.11-slim format
        parts = image.split(":")
        if len(parts) > 1:
            version = parts[1].split("-")[0]
            return version
    
    # Default
    return "3.11"