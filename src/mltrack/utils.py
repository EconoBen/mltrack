"""Utility functions for mltrack."""

import subprocess
import json
import os
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


def is_uv_environment() -> bool:
    """Check if we're running in a UV-managed environment."""
    # Check for UV environment markers
    if os.environ.get("UV_PROJECT_ENVIRONMENT"):
        return True
    
    # Check for .venv created by UV
    venv_path = Path.cwd() / ".venv"
    if venv_path.exists():
        # Check if it was created by UV by looking for UV metadata
        uv_marker = venv_path / "uv.lock"
        if uv_marker.exists():
            return True
    
    # Check if uv is available in PATH
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def get_uv_info() -> Dict[str, Any]:
    """Get information about the UV environment."""
    info = {
        "is_uv": is_uv_environment(),
        "uv_version": None,
        "python_version": None,
        "project_root": None,
    }
    
    if not info["is_uv"]:
        return info
    
    try:
        # Get UV version
        result = subprocess.run(["uv", "--version"], capture_output=True, text=True, check=True)
        info["uv_version"] = result.stdout.strip()
        
        # Get Python version from UV
        result = subprocess.run(["uv", "python", "--version"], capture_output=True, text=True, check=True)
        info["python_version"] = result.stdout.strip()
        
        # Find project root (where pyproject.toml is)
        current = Path.cwd()
        while current != current.parent:
            if (current / "pyproject.toml").exists():
                info["project_root"] = str(current)
                break
            current = current.parent
            
    except Exception as e:
        logger.debug(f"Error getting UV info: {e}")
    
    return info


def get_pip_requirements() -> str:
    """Get pip requirements for the current environment."""
    # Check if we're in a UV environment
    uv_info = get_uv_info()
    
    if not uv_info["is_uv"]:
        logger.warning(
            "⚠️  Not running in a UV environment! "
            "For best results, use UV to manage your Python environment. "
            "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
        )
    
    try:
        # Try UV first if available
        if uv_info["is_uv"]:
            result = subprocess.run(
                ["uv", "pip", "freeze"],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        else:
            # Fall back to regular pip
            result = subprocess.run(
                ["pip", "freeze"],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
    except subprocess.CalledProcessError as e:
        logger.warning(f"Failed to get pip requirements: {e}")
        return ""


def get_pyproject_toml() -> Optional[Dict[str, Any]]:
    """Get pyproject.toml contents if available."""
    try:
        import tomllib
    except ImportError:
        try:
            import tomli as tomllib
        except ImportError:
            logger.debug("TOML library not available")
            return None
    
    # Look for pyproject.toml
    current = Path.cwd()
    while current != current.parent:
        pyproject_path = current / "pyproject.toml"
        if pyproject_path.exists():
            try:
                with open(pyproject_path, "rb") as f:
                    return tomllib.load(f)
            except Exception as e:
                logger.warning(f"Failed to parse pyproject.toml: {e}")
                return None
        current = current.parent
    
    return None


def get_conda_environment() -> Optional[str]:
    """Get conda environment specification if in a conda environment."""
    # Check if we're in a conda environment
    if not os.environ.get("CONDA_DEFAULT_ENV"):
        return None
    
    # Warn if using conda instead of UV
    logger.info(
        "📦 Detected Conda environment. Consider using UV for better performance: "
        "https://github.com/astral-sh/uv"
    )
    
    try:
        # Export current environment
        result = subprocess.run(
            ["conda", "env", "export", "--no-builds"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.warning(f"Failed to get conda environment: {e}")
        return None


def format_metrics_table(metrics: Dict[str, float]) -> str:
    """Format metrics as a nice table."""
    if not metrics:
        return "No metrics recorded"
    
    from rich.table import Table
    from rich.console import Console
    from io import StringIO
    
    # Create a string buffer for the output
    buffer = StringIO()
    console = Console(file=buffer, force_terminal=True)
    
    # Create table
    table = Table(title="Metrics")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    for key, value in sorted(metrics.items()):
        # Format value based on type
        if isinstance(value, float):
            if value < 0.01 or value > 1000:
                value_str = f"{value:.2e}"
            else:
                value_str = f"{value:.4f}"
        else:
            value_str = str(value)
        
        table.add_row(key, value_str)
    
    console.print(table)
    return buffer.getvalue()


def format_params_table(params: Dict[str, Any]) -> str:
    """Format parameters as a nice table."""
    if not params:
        return "No parameters recorded"
    
    from rich.table import Table
    from rich.console import Console
    from io import StringIO
    
    buffer = StringIO()
    console = Console(file=buffer, force_terminal=True)
    
    table = Table(title="Parameters")
    table.add_column("Parameter", style="cyan")
    table.add_column("Value", style="yellow")
    
    for key, value in sorted(params.items()):
        # Truncate long values
        value_str = str(value)
        if len(value_str) > 50:
            value_str = value_str[:47] + "..."
        
        table.add_row(key, value_str)
    
    console.print(table)
    return buffer.getvalue()


def send_slack_notification(
    webhook_url: str,
    run_id: str,
    run_name: str,
    status: str,
    metrics: Optional[Dict[str, float]] = None,
    tags: Optional[Dict[str, str]] = None,
) -> bool:
    """Send a Slack notification about a completed run."""
    try:
        import requests
        
        # Build message
        color = "good" if status == "success" else "danger"
        
        fields = [
            {"title": "Run Name", "value": run_name, "short": True},
            {"title": "Status", "value": status, "short": True},
        ]
        
        # Add top metrics
        if metrics:
            top_metrics = sorted(metrics.items(), key=lambda x: x[0])[:5]
            for name, value in top_metrics:
                fields.append({
                    "title": name,
                    "value": f"{value:.4f}" if isinstance(value, float) else str(value),
                    "short": True
                })
        
        # Build payload
        payload = {
            "attachments": [{
                "color": color,
                "title": f"MLflow Run Completed: {run_id[:8]}",
                "fields": fields,
                "footer": "mltrack",
                "ts": int(time.time())
            }]
        }
        
        # Send notification
        response = requests.post(webhook_url, json=payload)
        return response.status_code == 200
        
    except Exception as e:
        logger.warning(f"Failed to send Slack notification: {e}")
        return False


def parse_experiment_name(name: str) -> Dict[str, str]:
    """Parse experiment name to extract metadata."""
    # Example: "team-ml/project-x/experiment-1"
    parts = name.split("/")
    
    metadata = {}
    if len(parts) >= 1:
        metadata["experiment"] = parts[-1]
    if len(parts) >= 2:
        metadata["project"] = parts[-2]
    if len(parts) >= 3:
        metadata["team"] = parts[-3]
    
    return metadata


def estimate_llm_cost(model: str, prompt_tokens: int, completion_tokens: int) -> Optional[Dict[str, float]]:
    """Estimate the cost of an LLM API call based on token usage.
    
    Args:
        model: Model name (e.g., 'gpt-4', 'claude-3-opus')
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens
    
    Returns:
        Dictionary with prompt_cost, completion_cost, and total_cost in USD
    """
    # Cost per 1M tokens (as of 2024)
    # These are approximate and should be updated regularly
    pricing = {
        # OpenAI models
        "gpt-4": {"prompt": 30.0, "completion": 60.0},
        "gpt-4-32k": {"prompt": 60.0, "completion": 120.0},
        "gpt-4-turbo": {"prompt": 10.0, "completion": 30.0},
        "gpt-4-turbo-preview": {"prompt": 10.0, "completion": 30.0},
        "gpt-4o": {"prompt": 5.0, "completion": 15.0},
        "gpt-4o-mini": {"prompt": 0.15, "completion": 0.60},
        "gpt-3.5-turbo": {"prompt": 0.50, "completion": 1.50},
        "gpt-3.5-turbo-16k": {"prompt": 3.0, "completion": 4.0},
        
        # Anthropic models
        "claude-3-opus": {"prompt": 15.0, "completion": 75.0},
        "claude-3-opus-20240229": {"prompt": 15.0, "completion": 75.0},
        "claude-3-sonnet": {"prompt": 3.0, "completion": 15.0},
        "claude-3-sonnet-20240229": {"prompt": 3.0, "completion": 15.0},
        "claude-3-haiku": {"prompt": 0.25, "completion": 1.25},
        "claude-3-haiku-20240307": {"prompt": 0.25, "completion": 1.25},
        "claude-3.5-sonnet": {"prompt": 3.0, "completion": 15.0},
        "claude-3-5-sonnet-20241022": {"prompt": 3.0, "completion": 15.0},
        "claude-2.1": {"prompt": 8.0, "completion": 24.0},
        "claude-2.0": {"prompt": 8.0, "completion": 24.0},
        "claude-instant-1.2": {"prompt": 0.80, "completion": 2.40},
        
        # Google models
        "gemini-pro": {"prompt": 0.50, "completion": 1.50},
        "gemini-pro-vision": {"prompt": 0.50, "completion": 1.50},
        "gemini-1.5-pro": {"prompt": 3.50, "completion": 10.50},
        "gemini-1.5-flash": {"prompt": 0.35, "completion": 1.05},
        
        # Cohere models
        "command": {"prompt": 0.50, "completion": 1.50},
        "command-light": {"prompt": 0.15, "completion": 0.60},
        "command-r": {"prompt": 0.50, "completion": 1.50},
        "command-r-plus": {"prompt": 3.0, "completion": 15.0},
        
        # Meta/Llama models (via various providers)
        "llama-2-70b": {"prompt": 0.75, "completion": 1.0},
        "llama-2-13b": {"prompt": 0.20, "completion": 0.25},
        "llama-2-7b": {"prompt": 0.10, "completion": 0.15},
        "llama-3-70b": {"prompt": 0.70, "completion": 0.90},
        "llama-3-8b": {"prompt": 0.15, "completion": 0.20},
        
        # Mistral models
        "mistral-tiny": {"prompt": 0.14, "completion": 0.42},
        "mistral-small": {"prompt": 0.65, "completion": 1.95},
        "mistral-medium": {"prompt": 2.70, "completion": 8.10},
        "mistral-large": {"prompt": 8.0, "completion": 24.0},
        "mixtral-8x7b": {"prompt": 0.45, "completion": 0.70},
    }
    
    # Try to find exact match first
    model_lower = model.lower()
    if model_lower in pricing:
        rates = pricing[model_lower]
    else:
        # Try to find partial match
        found = False
        for key, rates in pricing.items():
            if key in model_lower or model_lower in key:
                found = True
                break
        
        if not found:
            logger.debug(f"No pricing information available for model: {model}")
            return None
    
    # Calculate costs (pricing is per 1M tokens)
    prompt_cost = (prompt_tokens / 1_000_000) * rates["prompt"]
    completion_cost = (completion_tokens / 1_000_000) * rates["completion"]
    total_cost = prompt_cost + completion_cost
    
    return {
        "prompt_cost": prompt_cost,
        "completion_cost": completion_cost,
        "total_cost": total_cost,
        "prompt_rate_per_1m": rates["prompt"],
        "completion_rate_per_1m": rates["completion"],
    }