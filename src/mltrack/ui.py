"""UI integration for mltrack - MLflow UI only."""

import subprocess
import sys
from typing import Optional
import click

from mltrack.config import MLTrackConfig


def launch_mlflow_ui(port: int = 5000, host: str = "127.0.0.1"):
    """Launch the standard MLflow UI.
    
    Args:
        port: Port to run the UI on (default: 5000)
        host: Host to bind the UI to (default: 127.0.0.1)
    """
    click.echo("🚀 Launching MLflow UI...")
    click.echo(f"   Access at: http://{host}:{port}")
    click.echo("   Press Ctrl+C to stop")
    
    try:
        subprocess.run([
            sys.executable, "-m", "mlflow", "ui",
            "--host", host,
            "--port", str(port)
        ])
    except KeyboardInterrupt:
        click.echo("\n✋ MLflow UI stopped")


def launch_ui(
    config: Optional[MLTrackConfig] = None,
    port: int = 5000,
    host: str = "127.0.0.1"
):
    """Launch MLflow UI for experiment tracking.
    
    Args:
        config: MLTrack configuration (will find if not provided)
        port: Port to run the UI on (default: 5000)
        host: Host to bind the UI to (default: 127.0.0.1)
    """
    if config is None:
        config = MLTrackConfig.find_config()
    
    # Set MLflow tracking URI
    import mlflow
    mlflow.set_tracking_uri(config.tracking_uri)
    
    # Launch MLflow UI
    launch_mlflow_ui(port=port, host=host)