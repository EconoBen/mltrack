"""Command-line interface for mltrack."""

import os
import sys
import subprocess
from pathlib import Path
from typing import Optional, List
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax
from rich import print as rprint
import yaml

from mltrack.config import MLTrackConfig
from mltrack.version import __version__
from mltrack.utils import is_uv_environment, get_uv_info
from mltrack.detectors import FrameworkDetector

console = Console()


@click.group()
@click.version_option(__version__, prog_name="mltrack")
def cli():
    """mltrack - Universal ML tracking tool for teams."""
    pass


@cli.command()
@click.option(
    "--path",
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
    default=".",
    help="Project path to initialize",
)
@click.option("--team", help="Team name for shared experiments")
@click.option("--tracking-uri", help="MLflow tracking server URI")
@click.option("--force", is_flag=True, help="Overwrite existing configuration")
def init(path: str, team: Optional[str], tracking_uri: Optional[str], force: bool):
    """Initialize mltrack in your project."""
    project_path = Path(path).resolve()
    config_path = project_path / ".mltrack.yml"
    
    # Check if already initialized
    if config_path.exists() and not force:
        console.print("[yellow]⚠️  Project already initialized![/yellow]")
        console.print(f"Configuration exists at: {config_path}")
        console.print("Use --force to overwrite")
        return
    
    # Create configuration
    config_data = {
        "experiment_name": f"{project_path.name}/experiments",
        "auto_log_git": True,
        "auto_log_pip": True,
        "auto_detect_frameworks": True,
        "warn_non_uv": True,
    }
    
    if team:
        config_data["team_name"] = team
        config_data["experiment_name"] = f"{team}/{project_path.name}/experiments"
    
    if tracking_uri:
        config_data["tracking_uri"] = tracking_uri
    
    # Write configuration
    with open(config_path, "w") as f:
        yaml.dump(config_data, f, default_flow_style=False, sort_keys=False)
    
    # Create .gitignore if needed
    gitignore_path = project_path / ".gitignore"
    if gitignore_path.exists():
        with open(gitignore_path, "r") as f:
            content = f.read()
        
        # Add mlflow artifacts if not present
        if "mlruns/" not in content:
            with open(gitignore_path, "a") as f:
                f.write("\n# MLflow artifacts\nmlruns/\n.mlflow/\n")
    
    # Success message
    console.print("\n[green]✅ mltrack initialized successfully![/green]")
    console.print(f"\nConfiguration saved to: [cyan]{config_path}[/cyan]")
    
    # Show next steps
    console.print("\n[bold]Next steps:[/bold]")
    console.print("1. Add [cyan]@track[/cyan] decorator to your training functions")
    console.print("2. Run your script with: [cyan]mltrack run python train.py[/cyan]")
    console.print("3. View results in MLflow UI: [cyan]mlflow ui[/cyan]")
    
    # Check UV environment
    if not is_uv_environment():
        console.print("\n[yellow]💡 Tip: Use UV for better reproducibility:[/yellow]")
        console.print("   [dim]curl -LsSf https://astral.sh/uv/install.sh | sh[/dim]")
        console.print("   [dim]uv venv && uv pip install mltrack[/dim]")


@cli.command()
@click.argument("command", nargs=-1, required=True)
@click.option("--name", help="Custom name for the MLflow run")
@click.option("--tags", help="Comma-separated tags (key=value)")
def run(command: tuple, name: Optional[str], tags: Optional[str]):
    """Run a command with mltrack tracking enabled."""
    # Parse tags
    tag_dict = {}
    if tags:
        for tag in tags.split(","):
            if "=" in tag:
                key, value = tag.split("=", 1)
                tag_dict[key.strip()] = value.strip()
    
    # Set environment variables for tracking
    env = os.environ.copy()
    env["MLTRACK_ENABLED"] = "1"
    
    if name:
        env["MLFLOW_RUN_NAME"] = name
    
    if tag_dict:
        # MLflow doesn't have a direct env var for tags, so we'll use a custom one
        env["MLTRACK_TAGS"] = yaml.dump(tag_dict)
    
    # Ensure MLflow tracking is enabled
    config = MLTrackConfig.find_config()
    env["MLFLOW_TRACKING_URI"] = config.tracking_uri
    
    # Build command
    cmd = list(command)
    
    # Show tracking info
    console.print(f"\n[green]🚀 Running with mltrack:[/green] {' '.join(cmd)}")
    if name:
        console.print(f"   Run name: [cyan]{name}[/cyan]")
    if tag_dict:
        console.print(f"   Tags: [cyan]{tag_dict}[/cyan]")
    console.print(f"   Tracking URI: [cyan]{config.tracking_uri}[/cyan]")
    
    # Execute command
    try:
        result = subprocess.run(cmd, env=env)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n[red]Error running command:[/red] {e}")
        sys.exit(1)


@cli.command()
def doctor():
    """Check mltrack setup and environment."""
    console.print("\n[bold]🏥 mltrack Doctor[/bold]\n")
    
    checks = []
    warnings = []
    errors = []
    
    # Check UV environment
    uv_info = get_uv_info()
    if uv_info["is_uv"]:
        checks.append(("UV Environment", "✅", f"v{uv_info['uv_version']}"))
    else:
        warnings.append(("UV Environment", "⚠️", "Not detected (recommended for reproducibility)"))
    
    # Check configuration
    try:
        config = MLTrackConfig.find_config()
        config_path = Path.cwd() / ".mltrack.yml"
        if config_path.exists():
            checks.append(("Configuration", "✅", f"Found at {config_path}"))
        else:
            warnings.append(("Configuration", "⚠️", "Using defaults (run 'mltrack init')"))
    except Exception as e:
        errors.append(("Configuration", "❌", str(e)))
    
    # Check MLflow
    try:
        import mlflow
        checks.append(("MLflow", "✅", f"v{mlflow.__version__}"))
        
        # Test tracking URI
        mlflow.set_tracking_uri(config.tracking_uri)
        checks.append(("Tracking URI", "✅", config.tracking_uri))
    except Exception as e:
        errors.append(("MLflow", "❌", str(e)))
    
    # Check Git
    try:
        from mltrack.git_utils import get_git_info
        git_info = get_git_info()
        if git_info["commit"]:
            checks.append(("Git Repository", "✅", f"Branch: {git_info['branch']}"))
        else:
            warnings.append(("Git Repository", "⚠️", "Not initialized"))
    except Exception as e:
        warnings.append(("Git Repository", "⚠️", str(e)))
    
    # Detect ML frameworks
    detector = FrameworkDetector()
    frameworks = detector.detect_all()
    if frameworks:
        framework_list = ", ".join(f"{f.name} {f.version}" for f in frameworks)
        checks.append(("ML Frameworks", "✅", framework_list))
    else:
        warnings.append(("ML Frameworks", "⚠️", "None detected"))
    
    # Create results table
    table = Table(title="System Check Results")
    table.add_column("Component", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Details", style="dim")
    
    # Add all results
    for item in checks:
        table.add_row(*item)
    for item in warnings:
        table.add_row(item[0], item[1], item[2])
    for item in errors:
        table.add_row(item[0], item[1], item[2])
    
    console.print(table)
    
    # Summary
    console.print(f"\n[green]✅ Checks passed:[/green] {len(checks)}")
    if warnings:
        console.print(f"[yellow]⚠️  Warnings:[/yellow] {len(warnings)}")
    if errors:
        console.print(f"[red]❌ Errors:[/red] {len(errors)}")
    
    # Recommendations
    if warnings or errors:
        console.print("\n[bold]Recommendations:[/bold]")
        if not uv_info["is_uv"]:
            console.print("• Install UV for better environment management:")
            console.print("  [dim]curl -LsSf https://astral.sh/uv/install.sh | sh[/dim]")
        if not (Path.cwd() / ".mltrack.yml").exists():
            console.print("• Initialize mltrack in your project:")
            console.print("  [dim]mltrack init[/dim]")
        if not frameworks:
            console.print("• Install ML frameworks you plan to use:")
            console.print("  [dim]uv pip install scikit-learn torch tensorflow[/dim]")


@cli.command()
def demo():
    """Run an interactive mltrack demo."""
    console.print("\n[bold]🎯 mltrack Demo[/bold]\n")
    
    # Create demo code
    demo_code = '''from mltrack import track
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Decorated function - automatically tracked!
@track(name="demo-random-forest")
def train_random_forest(n_estimators=100, max_depth=10):
    """Train a Random Forest classifier on synthetic data."""
    # Generate synthetic data
    X = np.random.rand(1000, 20)
    y = (X[:, 0] + X[:, 1] > 1).astype(int)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    print(f"Training accuracy: {train_score:.3f}")
    print(f"Test accuracy: {test_score:.3f}")
    
    return model

# Run the demo
if __name__ == "__main__":
    print("Running mltrack demo...")
    model = train_random_forest(n_estimators=50, max_depth=5)
    print("\\nDemo complete! Check MLflow UI to see tracked experiment.")
'''
    
    # Display code
    syntax = Syntax(demo_code, "python", theme="monokai", line_numbers=True)
    console.print(Panel(syntax, title="Demo Code", border_style="cyan"))
    
    # Ask to run
    if click.confirm("\nWould you like to run this demo?", default=True):
        # Save demo file
        demo_file = Path("mltrack_demo.py")
        with open(demo_file, "w") as f:
            f.write(demo_code)
        
        console.print(f"\n[green]Running demo...[/green]\n")
        
        # Run demo
        try:
            subprocess.run([sys.executable, str(demo_file)])
            console.print(f"\n[green]✅ Demo complete![/green]")
            console.print("\n[bold]View results:[/bold]")
            console.print("1. Start MLflow UI: [cyan]mlflow ui[/cyan]")
            console.print("2. Open browser: [cyan]http://localhost:5000[/cyan]")
            console.print("3. Look for experiment: [cyan]demo-random-forest[/cyan]")
        finally:
            # Clean up
            if demo_file.exists():
                demo_file.unlink()
    else:
        console.print("\n[yellow]Demo cancelled[/yellow]")


@cli.command()
def config():
    """Show current mltrack configuration."""
    try:
        config = MLTrackConfig.find_config()
        config_dict = config.dict(exclude_none=True)
        
        # Find config file location
        config_path = None
        for path in [Path.cwd(), *Path.cwd().parents]:
            potential_path = path / ".mltrack.yml"
            if potential_path.exists():
                config_path = potential_path
                break
        
        # Display configuration
        console.print("\n[bold]mltrack Configuration[/bold]\n")
        
        if config_path:
            console.print(f"Config file: [cyan]{config_path}[/cyan]\n")
        else:
            console.print("[yellow]Using default configuration (no .mltrack.yml found)[/yellow]\n")
        
        # Create table
        table = Table(show_header=False)
        table.add_column("Setting", style="cyan")
        table.add_column("Value")
        
        for key, value in config_dict.items():
            if isinstance(value, dict):
                value = yaml.dump(value, default_flow_style=True).strip()
            table.add_row(key, str(value))
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]Error loading configuration:[/red] {e}")


@cli.command()
@click.option("--port", default=3000, help="Port for the modern UI (default: 3000)")
@click.option("--host", default="localhost", help="Host to bind to (default: localhost)")
def ui(port, host):
    """Launch the modern MLTrack UI dashboard."""
    console.print(f"\n[bold green]🚀 Starting MLTrack Modern UI[/bold green]\n")
    
    # Check if UI directory exists
    ui_path = Path(__file__).parent.parent.parent / "ui"
    if not ui_path.exists():
        # Try alternate location
        ui_path = Path.home() / "Documents" / "GitHub" / "mltrack" / "ui"
    
    if not ui_path.exists():
        console.print("[red]❌ Modern UI not found![/red]")
        console.print("\nPlease ensure the MLTrack UI is installed:")
        console.print("  [dim]cd ~/Documents/GitHub/mltrack/ui && npm install[/dim]")
        return
    
    # Change to UI directory
    import os
    os.chdir(ui_path)
    
    # Check if node_modules exists
    if not (ui_path / "node_modules").exists():
        console.print("[yellow]⚠️  Dependencies not installed. Installing now...[/yellow]")
        subprocess.run(["npm", "install"], check=True)
    
    console.print(f"Starting UI on [cyan]http://{host}:{port}[/cyan]")
    console.print("\n[dim]Press Ctrl+C to stop[/dim]\n")
    
    # Start the Next.js dev server
    env = os.environ.copy()
    env["PORT"] = str(port)
    env["HOST"] = host
    
    try:
        subprocess.run(["npm", "run", "dev"], env=env, check=True)
    except KeyboardInterrupt:
        console.print("\n[yellow]UI stopped[/yellow]")


@cli.command()
@click.option("--port", default=5000, help="Port for MLflow UI (default: 5000)")
@click.option("--host", default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)")
def flow(port, host):
    """Launch the classic MLflow UI."""
    console.print(f"\n[bold]🔍 Starting MLflow Classic UI[/bold]\n")
    
    config = MLTrackConfig.find_config()
    console.print(f"Tracking URI: [cyan]{config.tracking_uri}[/cyan]")
    console.print(f"Starting UI on [cyan]http://{host}:{port}[/cyan]")
    console.print("\n[dim]Press Ctrl+C to stop[/dim]\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "mlflow", "ui",
            "--backend-store-uri", config.tracking_uri,
            "--host", host,
            "--port", str(port)
        ], check=True)
    except KeyboardInterrupt:
        console.print("\n[yellow]MLflow UI stopped[/yellow]")


def main():
    """Main entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()