"""UI integration for mltrack - MLflow UI and modern React UI."""

import subprocess
import sys
import os
from typing import Optional
import click
import threading
import time

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


def launch_modern_ui(mlflow_port: int = 5000, ui_port: int = 3000):
    """Launch the modern React/Next.js UI.
    
    Args:
        mlflow_port: Port where MLflow server is running (default: 5000)
        ui_port: Port to run the modern UI on (default: 3000)
    """
    ui_path = os.path.join(os.path.dirname(__file__), "..", "..", "ui")
    
    if not os.path.exists(ui_path):
        click.echo("❌ Modern UI not found. Please ensure the UI is built.")
        click.echo(f"   Expected path: {ui_path}")
        return
    
    # Check if node_modules exists
    node_modules = os.path.join(ui_path, "node_modules")
    if not os.path.exists(node_modules):
        click.echo("📦 Installing UI dependencies...")
        subprocess.run(["npm", "install"], cwd=ui_path, check=True)
    
    # Set environment variable for MLflow server
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = f"http://localhost:{mlflow_port}"
    
    click.echo("🎨 Launching modern UI...")
    click.echo(f"   Access at: http://localhost:{ui_port}")
    click.echo(f"   MLflow server: http://localhost:{mlflow_port}")
    click.echo("   Press Ctrl+C to stop")
    
    try:
        subprocess.run(["npm", "run", "dev"], cwd=ui_path, env=env)
    except KeyboardInterrupt:
        click.echo("\n✋ Modern UI stopped")


def launch_ui(
    config: Optional[MLTrackConfig] = None,
    port: int = 5000,
    host: str = "127.0.0.1",
    modern: bool = False,
    ui_port: int = 3000
):
    """Launch MLflow UI for experiment tracking.
    
    Args:
        config: MLTrack configuration (will find if not provided)
        port: Port to run the MLflow UI on (default: 5000)
        host: Host to bind the UI to (default: 127.0.0.1)
        modern: Launch modern React UI instead of classic MLflow UI
        ui_port: Port for modern UI (default: 3000)
    """
    if config is None:
        config = MLTrackConfig.find_config()
    
    # Set MLflow tracking URI
    import mlflow
    mlflow.set_tracking_uri(config.tracking_uri)
    
    if modern:
        # Launch modern UI
        launch_modern_ui(mlflow_port=port, ui_port=ui_port)
    else:
        # Launch classic MLflow UI
        launch_mlflow_ui(port=port, host=host)