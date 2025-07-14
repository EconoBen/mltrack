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
from mltrack.user_info import setup_api_key, UserRegistry, get_current_user

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
@click.option("--port", type=int, default=5000, help="Port for the MLflow server (default: 5000)")
@click.option("--host", default="127.0.0.1", help="Host to bind the MLflow server (default: 127.0.0.1)")
@click.option("--modern", is_flag=True, help="Launch modern React UI instead of classic MLflow UI")
@click.option("--ui-port", type=int, default=3000, help="Port for modern UI (default: 3000)")
def ui(port: int, host: str, modern: bool, ui_port: int):
    """Launch MLflow UI for experiment tracking.
    
    Examples:
        mltrack ui                    # Classic MLflow UI
        mltrack ui --modern          # Modern React UI
        mltrack ui --modern --ui-port 3001  # Modern UI on custom port
    """
    from mltrack.ui import launch_ui
    
    # Launch UI
    try:
        config = MLTrackConfig.find_config()
        
        if modern:
            console.print("[bold cyan]🎨 Launching modern mltrack UI...[/bold cyan]")
            console.print(f"   React UI: http://localhost:{ui_port}")
            console.print(f"   MLflow API: http://localhost:{port}")
        
        launch_ui(
            config=config,
            port=port,
            host=host,
            modern=modern,
            ui_port=ui_port
        )
    except KeyboardInterrupt:
        console.print("\n[yellow]UI server stopped[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Error launching UI:[/red] {e}")
        console.print("\n[yellow]Troubleshooting:[/yellow]")
        if modern:
            console.print("• Check if Node.js is installed: [cyan]node --version[/cyan]")
            console.print("• Check if npm is installed: [cyan]npm --version[/cyan]")
            console.print("• Try the classic UI: [cyan]mltrack ui[/cyan]")
        else:
            console.print("• Check if MLflow is installed: [cyan]pip show mlflow[/cyan]")
            console.print("• Try a different port: [cyan]mltrack ui --port 5001[/cyan]")
            console.print("• Check MLflow logs for more details")


@cli.group()
def models():
    """Model registry commands."""
    pass


# User management commands
@cli.group()
def user():
    """Manage MLtrack users and API keys."""
    pass


@user.command()
def info():
    """Show current user information."""
    user = get_current_user()
    if user.id == "anonymous":
        console.print("No user configured. You're running as anonymous.")
        console.print("\nTo set up a user, run:")
        console.print("  [cyan]mltrack user create --email your@email.com --name 'Your Name'[/cyan]")
        console.print("\nOr set environment variable:")
        console.print("  [cyan]export MLTRACK_API_KEY=your_api_key[/cyan]")
    else:
        console.print(f"Current user: [green]{user.name}[/green]")
        console.print(f"Email: [cyan]{user.email}[/cyan]")
        console.print(f"User ID: [dim]{user.id}[/dim]")
        if user.team:
            console.print(f"Team: [yellow]{user.team}[/yellow]")
        if user.api_key and os.environ.get('MLTRACK_API_KEY') == user.api_key:
            console.print("Authentication: [green]API Key (from environment)[/green]")
        elif user.api_key:
            console.print("Authentication: [yellow]Local user[/yellow]")
        else:
            console.print("Authentication: [dim]Git config[/dim]")


@user.command()
@click.option('--email', required=True, help='User email address')
@click.option('--name', required=True, help='User display name')
@click.option('--team', help='Team name')
def create(email: str, name: str, team: Optional[str]):
    """Create a new user and generate API key."""
    try:
        api_key = setup_api_key(email, name, team)
        if api_key:
            console.print(f"[green]✅ User created successfully![/green]")
            console.print(f"\nYour API key: [bold cyan]{api_key}[/bold cyan]")
            console.print("\nTo use this API key, set the environment variable:")
            console.print(f"  [dim]export MLTRACK_API_KEY={api_key}[/dim]")
            console.print("\nOr add it to your shell profile (~/.bashrc, ~/.zshrc, etc.)")
            console.print("\n[yellow]⚠️  Keep this API key secure! It won't be shown again.[/yellow]")
        else:
            console.print("[yellow]User already exists. Use 'mltrack user reset-key' to generate a new API key.[/yellow]")
    except Exception as e:
        console.print(f"[red]Error creating user:[/red] {e}")
        raise click.Abort()


@user.command()
def list():
    """List all registered users."""
    registry = UserRegistry()
    users = registry.list_users()
    
    if not users:
        console.print("[yellow]No users registered.[/yellow]")
        return
    
    # Create table
    table = Table(title="Registered Users")
    table.add_column("Name", style="cyan")
    table.add_column("Email", style="green")
    table.add_column("Team", style="yellow")
    table.add_column("Has API Key", justify="center")
    table.add_column("Created", style="dim")
    
    for user in users:
        table.add_row(
            user.name,
            user.email,
            user.team or "-",
            "✓" if user.api_key else "✗",
            user.created_at[:10]  # Just date
        )
    
    console.print(table)


@models.command(name="register")
@click.option("--run-id", required=True, help="MLflow run ID containing the model")
@click.option("--name", required=True, help="Name for the registered model")
@click.option("--path", default="model", help="Path to model in run artifacts (default: model)")
@click.option("--stage", default="staging", type=click.Choice(["staging", "production", "archived"]))
@click.option("--description", help="Model description")
@click.option("--s3-bucket", envvar="MLTRACK_S3_BUCKET", help="S3 bucket for model storage")
def register(run_id: str, name: str, path: str, stage: str, description: Optional[str], s3_bucket: Optional[str]):
    """Register a model from an MLflow run."""
    from mltrack.model_registry import ModelRegistry
    
    console.print(f"\n[bold]Registering model from run {run_id}...[/bold]")
    
    try:
        registry = ModelRegistry(s3_bucket=s3_bucket)
        
        # Register the model
        model_info = registry.register_model(
            run_id=run_id,
            model_name=name,
            model_path=path,
            stage=stage,
            description=description
        )
        
        console.print(f"\n[green]✅ Model registered successfully![/green]")
        console.print(f"Name: [cyan]{model_info['model_name']}[/cyan]")
        console.print(f"Version: [cyan]{model_info['version']}[/cyan]")
        console.print(f"Stage: [cyan]{model_info['stage']}[/cyan]")
        
        if model_info.get("s3_location"):
            console.print(f"S3 Location: [dim]{model_info['s3_location']}[/dim]")
        
        console.print("\n[bold]Loading code:[/bold]")
        console.print(f"[dim]from mltrack import ModelRegistry[/dim]")
        console.print(f"[dim]registry = ModelRegistry()[/dim]")
        console.print(f"[dim]model = registry.load_model('{name}', '{model_info['version']}')[/dim]")
        
    except Exception as e:
        console.print(f"[red]Error registering model:[/red] {e}")


@models.command(name="list")
@click.option("--stage", type=click.Choice(["staging", "production", "archived"]), help="Filter by stage")
def list_models(stage: Optional[str]):
    """List registered models."""
    from mltrack.model_registry import ModelRegistry
    
    try:
        registry = ModelRegistry()
        models = registry.list_models(stage=stage)
        
        if not models:
            console.print("[yellow]No models found in registry[/yellow]")
            return
        
        # Create table
        table = Table(title="Registered Models")
        table.add_column("Name", style="cyan")
        table.add_column("Version", style="green")
        table.add_column("Stage", style="yellow")
        table.add_column("Registered", style="dim")
        table.add_column("Framework", style="magenta")
        
        for model in models:
            table.add_row(
                model.get("model_name", ""),
                model.get("version", ""),
                model.get("stage", ""),
                model.get("registered_at", "")[:19],  # Truncate timestamp
                model.get("framework", "unknown")
            )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]Error listing models:[/red] {e}")


@models.command(name="info")
@click.argument("model_name")
@click.option("--version", help="Specific version (latest if not specified)")
def model_info(model_name: str, version: Optional[str]):
    """Show detailed model information."""
    from mltrack.model_registry import ModelRegistry
    
    try:
        registry = ModelRegistry()
        model = registry.get_model(model_name, version)
        
        console.print(f"\n[bold]Model: {model['model_name']}[/bold]")
        console.print(f"Version: [green]{model['version']}[/green]")
        console.print(f"Stage: [yellow]{model['stage']}[/yellow]")
        console.print(f"Registered: {model['registered_at']}")
        
        if model.get("description"):
            console.print(f"\nDescription: {model['description']}")
        
        # Metrics
        if model.get("metrics"):
            console.print("\n[bold]Training Metrics:[/bold]")
            for key, value in model["metrics"].items():
                console.print(f"  {key}: {value:.4f}" if isinstance(value, float) else f"  {key}: {value}")
        
        # Parameters
        if model.get("params"):
            console.print("\n[bold]Parameters:[/bold]")
            for key, value in model["params"].items():
                console.print(f"  {key}: {value}")
        
        # S3 location
        if model.get("s3_location"):
            console.print(f"\n[bold]S3 Location:[/bold] {model['s3_location']}")
        
        # Git info
        if model.get("git_commit"):
            console.print(f"\n[bold]Git Commit:[/bold] {model['git_commit']}")
        
    except Exception as e:
        console.print(f"[red]Error getting model info:[/red] {e}")


@models.command(name="load-code")
@click.argument("model_name")
@click.option("--version", help="Specific version (latest if not specified)")
@click.option("--output", "-o", type=click.Path(), help="Save code to file")
def load_code(model_name: str, version: Optional[str], output: Optional[str]):
    """Generate code to load a model."""
    from mltrack.model_registry import ModelRegistry
    
    try:
        registry = ModelRegistry()
        code = registry.generate_loading_code(model_name, version)
        
        if output:
            with open(output, "w") as f:
                f.write(code)
            console.print(f"[green]✅ Code saved to {output}[/green]")
        else:
            syntax = Syntax(code, "python", theme="monokai", line_numbers=True)
            console.print(Panel(syntax, title=f"Loading code for {model_name}", border_style="cyan"))
        
    except Exception as e:
        console.print(f"[red]Error generating code:[/red] {e}")


@models.command(name="transition")
@click.argument("model_name")
@click.argument("version")
@click.argument("stage", type=click.Choice(["staging", "production", "archived"]))
@click.option("--archive-existing/--no-archive-existing", default=True, 
              help="Archive existing production models when promoting to production")
def transition(model_name: str, version: str, stage: str, archive_existing: bool):
    """Transition a model to a different stage."""
    from mltrack.model_registry import ModelRegistry
    
    try:
        registry = ModelRegistry()
        
        # Confirm if promoting to production
        if stage == "production":
            console.print(f"\n[yellow]⚠️  Promoting model to production[/yellow]")
            console.print(f"Model: {model_name}")
            console.print(f"Version: {version}")
            if not click.confirm("Are you sure?"):
                console.print("[yellow]Cancelled[/yellow]")
                return
        
        updated = registry.transition_model_stage(
            model_name=model_name,
            version=version,
            stage=stage,
            archive_existing=archive_existing
        )
        
        console.print(f"\n[green]✅ Model transitioned to {stage}[/green]")
        console.print(f"Model: {updated['model_name']}")
        console.print(f"Version: {updated['version']}")
        console.print(f"New stage: {updated['stage']}")
        
    except Exception as e:
        console.print(f"[red]Error transitioning model:[/red] {e}")


def main():
    """Main entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()