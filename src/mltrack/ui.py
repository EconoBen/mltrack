"""UI integration for mltrack - MLflow UI and modern React UI."""

import subprocess
import sys
import os
from typing import Optional
import click
import threading
import time
import signal
import psutil

from mltrack.config import MLTrackConfig


def kill_process_on_port(port: int):
    """Kill any process running on the specified port."""
    try:
        # Find processes using the port
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                try:
                    process = psutil.Process(conn.pid)
                    process_name = process.name()
                    
                    # Only kill if it's an MLflow or Python process
                    if 'mlflow' in process_name.lower() or 'python' in process_name.lower():
                        click.echo(f"🔫 Killing existing process on port {port} (PID: {conn.pid})")
                        process.terminate()
                        
                        # Wait up to 5 seconds for graceful termination
                        try:
                            process.wait(timeout=5)
                        except psutil.TimeoutExpired:
                            # Force kill if it didn't terminate gracefully
                            process.kill()
                            process.wait()
                        
                        click.echo(f"✅ Successfully killed process on port {port}")
                        # Give OS time to release the port
                        time.sleep(1)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
    except Exception as e:
        # If psutil fails, try using lsof as fallback
        try:
            result = subprocess.run(
                ["lsof", "-ti", f":{port}"],
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    try:
                        # Check if it's an MLflow-related process before killing
                        ps_result = subprocess.run(
                            ["ps", "-p", pid, "-o", "comm="],
                            capture_output=True,
                            text=True
                        )
                        if 'python' in ps_result.stdout.lower() or 'mlflow' in ps_result.stdout.lower():
                            click.echo(f"🔫 Killing existing process on port {port} (PID: {pid})")
                            os.kill(int(pid), signal.SIGTERM)
                            time.sleep(1)
                            # Force kill if still running
                            try:
                                os.kill(int(pid), signal.SIGKILL)
                            except ProcessLookupError:
                                pass
                            click.echo(f"✅ Successfully killed process on port {port}")
                    except:
                        pass
        except:
            pass


def launch_mlflow_ui(port: int = 5000, host: str = "127.0.0.1"):
    """Launch the standard MLflow UI.
    
    Args:
        port: Port to run the UI on (default: 5000)
        host: Host to bind the UI to (default: 127.0.0.1)
    """
    # Kill any existing process on the port
    if not check_port_available(port):
        click.echo(f"⚠️  Port {port} is already in use")
        kill_process_on_port(port)
    
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


def check_port_available(port: int) -> bool:
    """Check if a port is available."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return True
        except:
            return False


def find_available_port(start_port: int, max_attempts: int = 10) -> int:
    """Find an available port starting from start_port."""
    for i in range(max_attempts):
        port = start_port + i
        if check_port_available(port):
            return port
    raise RuntimeError(f"Could not find available port in range {start_port}-{start_port + max_attempts}")


def launch_modern_ui(mlflow_port: int = 5000, ui_port: int = 3000, config: Optional[MLTrackConfig] = None):
    """Launch the modern React/Next.js UI with MLflow server.
    
    Args:
        mlflow_port: Port where MLflow server is running (default: 5000)
        ui_port: Port to run the modern UI on (default: 3000)
        config: MLTrack configuration
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
    
    # Check if MLflow port is available
    actual_mlflow_port = mlflow_port
    mlflow_process = None
    
    if not check_port_available(mlflow_port):
        click.echo(f"⚠️  Port {mlflow_port} is already in use")
        kill_process_on_port(mlflow_port)
        
        # Check again after killing
        if not check_port_available(mlflow_port):
            # Still in use, something else grabbed it quickly
            actual_mlflow_port = find_available_port(mlflow_port + 1)
            click.echo(f"⚠️  Port {mlflow_port} still in use, using port {actual_mlflow_port} for MLflow")
            mlflow_port = actual_mlflow_port
    
    # Start MLflow server if needed
    mlflow_process = None
    if check_port_available(mlflow_port):
        click.echo(f"🚀 Starting MLflow server on port {mlflow_port}...")
        
        # Set up MLflow environment
        import mlflow
        if config:
            mlflow.set_tracking_uri(config.tracking_uri)
        
        # Start MLflow server in background
        mlflow_cmd = [
            sys.executable, "-m", "mlflow", "ui",
            "--host", "127.0.0.1",
            "--port", str(mlflow_port),
            "--serve-artifacts"
        ]
        mlflow_process = subprocess.Popen(
            mlflow_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait a bit for MLflow to start
        click.echo("   Waiting for MLflow to start...")
        time.sleep(3)
        
        # Check if MLflow started successfully
        if mlflow_process.poll() is not None:
            click.echo("❌ Failed to start MLflow server")
            stderr = mlflow_process.stderr.read().decode() if mlflow_process.stderr else ""
            if stderr:
                click.echo(f"   Error: {stderr}")
            return
    
    # Check if UI port is available
    actual_ui_port = ui_port
    if not check_port_available(ui_port):
        actual_ui_port = find_available_port(ui_port + 1)
        click.echo(f"⚠️  Port {ui_port} is in use, using port {actual_ui_port} for UI")
    
    # Set environment variable for MLflow server
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = f"http://localhost:{mlflow_port}"
    env["PORT"] = str(actual_ui_port)
    
    click.echo("🎨 Launching modern UI...")
    click.echo(f"   Access at: http://localhost:{actual_ui_port}")
    click.echo(f"   MLflow API: http://localhost:{mlflow_port}")
    click.echo("   Press Ctrl+C to stop")
    
    try:
        # Start the Next.js dev server
        ui_cmd = ["npm", "run", "dev", "--", "--port", str(actual_ui_port)]
        ui_process = subprocess.Popen(ui_cmd, cwd=ui_path, env=env)
        
        # Wait for processes
        ui_process.wait()
    except KeyboardInterrupt:
        click.echo("\n✋ Shutting down...")
        
        # Clean up processes
        if ui_process and ui_process.poll() is None:
            ui_process.terminate()
            ui_process.wait()
        
        if mlflow_process and mlflow_process.poll() is None:
            mlflow_process.terminate()
            mlflow_process.wait()
            
        click.echo("✅ All services stopped")


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
        # Launch modern UI (which also starts MLflow server)
        launch_modern_ui(mlflow_port=port, ui_port=ui_port, config=config)
    else:
        # Launch classic MLflow UI
        launch_mlflow_ui(port=port, host=host)