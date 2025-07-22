"""Smart CLI shortcuts for intuitive model deployment."""

import os
import subprocess
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import click
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt, Confirm
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich import print as rprint

from mltrack.model_registry import ModelRegistry
from mltrack.deployment.docker.uv_builder import DockerBuilder
from mltrack.deploy import deploy_to_modal, DeploymentConfig, get_deployment_status, DeploymentStatus
from mlflow.tracking import MlflowClient


console = Console()


class SmartCLI:
    """Provides intuitive CLI shortcuts for model deployment."""
    
    def __init__(self):
        self.registry = ModelRegistry()
        self.docker_builder = DockerBuilder(self.registry)
        self.mlflow_client = MlflowClient()
    
    def get_recent_models(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recently tracked models from MLflow."""
        # Search for recent experiments
        experiments = self.mlflow_client.search_experiments()
        
        recent_runs = []
        for exp in experiments[:10]:  # Check last 10 experiments
            runs = self.mlflow_client.search_runs(
                experiment_ids=[exp.experiment_id],
                order_by=["start_time DESC"],
                max_results=limit,
            )
            
            for run in runs:
                # Check if run has a model
                artifacts = self.mlflow_client.list_artifacts(run.info.run_id)
                has_model = any(a.path == "model" for a in artifacts)
                
                if has_model:
                    # Get model metadata from tags
                    tags = run.data.tags
                    recent_runs.append({
                        "run_id": run.info.run_id,
                        "run_name": run.info.run_name or "Unnamed",
                        "start_time": datetime.fromtimestamp(run.info.start_time / 1000),
                        "model_type": tags.get("mltrack.model_type", "unknown"),
                        "framework": tags.get("mltrack.framework", "unknown"),
                        "task": tags.get("mltrack.task", "unknown"),
                        "metrics": run.data.metrics,
                    })
        
        # Sort by time and limit
        recent_runs.sort(key=lambda x: x["start_time"], reverse=True)
        return recent_runs[:limit]
    
    def select_model(self, model_name: Optional[str] = None) -> Optional[str]:
        """Smart model selection with recent models."""
        if model_name:
            # Check if it's a registered model
            try:
                self.registry.get_model(model_name)
                return model_name
            except:
                # Try to find in recent runs
                recent = self.get_recent_models()
                for run in recent:
                    if run["run_name"] == model_name or run["run_id"].startswith(model_name):
                        return run["run_id"]
                
                console.print(f"[red]Model '{model_name}' not found[/red]")
                return None
        
        # No model specified, show recent options
        recent = self.get_recent_models()
        if not recent:
            console.print("[yellow]No recent models found. Train a model first![/yellow]")
            return None
        
        console.print("\n🔍 [bold]Found recent models:[/bold]")
        
        # Create table
        table = Table(show_header=True, header_style="bold cyan")
        table.add_column("#", style="dim", width=3)
        table.add_column("Name/ID", style="green")
        table.add_column("Type", style="yellow")
        table.add_column("Framework", style="blue")
        table.add_column("When", style="dim")
        
        for i, run in enumerate(recent, 1):
            # Format time
            time_diff = datetime.now() - run["start_time"]
            if time_diff.days > 0:
                when = f"{time_diff.days}d ago"
            elif time_diff.seconds > 3600:
                when = f"{time_diff.seconds // 3600}h ago"
            else:
                when = f"{time_diff.seconds // 60}m ago"
            
            name = run["run_name"] if run["run_name"] != "Unnamed" else run["run_id"][:8]
            table.add_row(
                str(i),
                name,
                run["model_type"],
                run["framework"],
                when,
            )
        
        console.print(table)
        
        # Prompt for selection
        choice = Prompt.ask(
            "\nWhich model?",
            choices=[str(i) for i in range(1, len(recent) + 1)],
            default="1",
        )
        
        selected = recent[int(choice) - 1]
        return selected["run_id"]
    
    def save_model(
        self,
        name: Optional[str] = None,
        run_id: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Save a model to the registry (ml save)."""
        # Get run ID if not provided
        if not run_id:
            recent = self.get_recent_models(limit=1)
            if not recent:
                console.print("[red]No recent models found to save[/red]")
                return {"success": False}
            
            run_id = recent[0]["run_id"]
            console.print(f"📦 Using most recent model from run: {run_id[:8]}")
        
        # Get name if not provided
        if not name:
            run = self.mlflow_client.get_run(run_id)
            suggested_name = run.info.run_name or f"model-{datetime.now().strftime('%Y%m%d')}"
            name = Prompt.ask("Model name", default=suggested_name)
        
        # Register the model
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
        ) as progress:
            task = progress.add_task("Saving model...", total=None)
            
            result = self.registry.register_model(
                run_id=run_id,
                model_name=name,
                model_path="model",
                description=description,
            )
        
        console.print(f"\n✅ [green]Model saved as '{name}' (version: {result['version']})[/green]")
        return {"success": True, "model_name": name, "version": result["version"]}
    
    def ship_model(
        self,
        model_name: Optional[str] = None,
        gpu: bool = False,
        push: bool = False,
        platform: Optional[List[str]] = None,
        optimize: bool = True,
        registry_url: Optional[str] = None,
        modal: bool = False,
        modal_gpu: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Build and ship a model container (ml ship)."""
        # Select model
        model_name = self.select_model(model_name)
        if not model_name:
            return {"success": False}
        
        # Check if it's a run ID that needs to be saved first
        if len(model_name) == 32 and "-" not in model_name:  # Likely a run ID
            run_id = model_name
            console.print("\n📝 This model needs to be saved first.")
            save_result = self.save_model(run_id=model_name)
            if not save_result["success"]:
                return {"success": False}
            model_name = save_result["model_name"]
        else:
            # Get run ID from model name
            try:
                model_info = self.registry.get_model(model_name)
                run_id = model_info.get("run_id")
                if not run_id:
                    console.print(f"[red]Cannot find run ID for model '{model_name}'[/red]")
                    return {"success": False}
            except:
                console.print(f"[red]Model '{model_name}' not found in registry[/red]")
                return {"success": False}
        
        # Deploy to Modal if requested
        if modal:
            console.print(f"\n🚀 [bold]Deploying model to Modal: {model_name}[/bold]")
            return self._ship_to_modal(run_id, model_name, modal_gpu)
        
        # Build container (existing Docker logic)
        console.print(f"\n🚢 [bold]Shipping model: {model_name}[/bold]")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
        ) as progress:
            task = progress.add_task("Building container...", total=None)
            
            try:
                result = self.docker_builder.build_container(
                    model_name=model_name,
                    use_gpu=gpu,
                    optimize=optimize,
                    push=push,
                    registry_url=registry_url,
                    platform=platform,
                )
                
                if result["success"]:
                    console.print(f"\n✅ [green]Container built successfully![/green]")
                    console.print(f"   Image: [cyan]{result['image_name']}[/cyan]")
                    console.print(f"   Size: {result['size']}")
                    console.print(f"   Build time: {result['build_time']:.1f}s")
                    
                    if push:
                        console.print(f"   ✅ Pushed to registry")
                    
                    # Show run command
                    console.print(f"\n💡 [bold]Run with:[/bold]")
                    console.print(f"   [dim]docker run -p 8000:8000 {result['image_name']}[/dim]")
                    
                    return result
                
            except Exception as e:
                console.print(f"\n❌ [red]Build failed: {e}[/red]")
                return {"success": False, "error": str(e)}
    
    def serve_model(
        self,
        model_name: Optional[str] = None,
        port: int = 8000,
        production: bool = False,
        detach: bool = False,
    ) -> Dict[str, Any]:
        """Serve a model locally (ml serve)."""
        # Select model
        model_name = self.select_model(model_name)
        if not model_name:
            return {"success": False}
        
        # Get model info to find container
        try:
            model_info = self.registry.get_model(model_name)
            container_info = model_info.get("container")
            
            if not container_info:
                console.print("\n📦 [yellow]Model not containerized yet. Building now...[/yellow]")
                ship_result = self.ship_model(model_name=model_name)
                if not ship_result["success"]:
                    return {"success": False}
                
                # Refresh model info
                model_info = self.registry.get_model(model_name)
                container_info = model_info["container"]
            
            image_name = container_info["image"]
            
        except:
            # Fallback: try to ship first
            console.print("\n📦 [yellow]Preparing model for serving...[/yellow]")
            ship_result = self.ship_model(model_name=model_name)
            if not ship_result["success"]:
                return {"success": False}
            image_name = ship_result["image_name"]
        
        # Run container
        console.print(f"\n🚀 [bold]Serving model: {model_name}[/bold]")
        
        container_name = f"mltrack-{model_name}-{port}"
        cmd = [
            "docker", "run",
            "--name", container_name,
            "-p", f"{port}:8000",
        ]
        
        if detach:
            cmd.append("-d")
        else:
            cmd.append("--rm")
        
        if production:
            cmd.extend([
                "--restart", "unless-stopped",
                "-e", "MLTRACK_ENV=production",
            ])
        
        cmd.append(image_name)
        
        try:
            # Check if container already exists
            check = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"name={container_name}", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
            )
            if container_name in check.stdout:
                if Confirm.ask(f"Container '{container_name}' already exists. Remove it?"):
                    subprocess.run(["docker", "rm", "-f", container_name])
                else:
                    return {"success": False}
            
            # Start container
            if detach:
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    console.print(f"\n✅ [green]Model serving in background[/green]")
                    console.print(f"   API: [cyan]http://localhost:{port}[/cyan]")
                    console.print(f"   Docs: [cyan]http://localhost:{port}/docs[/cyan]")
                    console.print(f"\n💡 Stop with: [dim]docker stop {container_name}[/dim]")
                    
                    # Wait for health check
                    console.print("\n⏳ Waiting for API to be ready...")
                    time.sleep(3)
                    
                    return {"success": True, "container": container_name, "port": port}
                else:
                    console.print(f"[red]Failed to start container: {result.stderr}[/red]")
                    return {"success": False}
            else:
                console.print(f"\n✅ [green]Model serving at:[/green]")
                console.print(f"   API: [cyan]http://localhost:{port}[/cyan]")
                console.print(f"   Docs: [cyan]http://localhost:{port}/docs[/cyan]")
                console.print(f"\n[dim]Press Ctrl+C to stop[/dim]\n")
                
                # Run interactively
                subprocess.run(cmd)
                return {"success": True}
                
        except KeyboardInterrupt:
            console.print("\n\n👋 Stopped serving")
            return {"success": True}
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            return {"success": False, "error": str(e)}
    
    def try_model(
        self,
        model_name: Optional[str] = None,
        port: int = 8000,
    ) -> Dict[str, Any]:
        """Interactive model testing (ml try)."""
        # First, ensure model is serving
        console.print("🧪 [bold]Starting interactive model test[/bold]\n")
        
        # Check if already serving
        container_name = f"mltrack-{model_name}-{port}" if model_name else None
        if container_name:
            check = subprocess.run(
                ["docker", "ps", "--filter", f"name={container_name}", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
            )
            if container_name not in check.stdout:
                # Need to start serving
                serve_result = self.serve_model(model_name, port=port, detach=True)
                if not serve_result["success"]:
                    return {"success": False}
                time.sleep(3)  # Wait for startup
        else:
            # Select and serve
            serve_result = self.serve_model(port=port, detach=True)
            if not serve_result["success"]:
                return {"success": False}
            container_name = serve_result["container"]
        
        # Open browser to Swagger UI
        api_url = f"http://localhost:{port}"
        docs_url = f"{api_url}/docs"
        
        console.print(f"\n🌐 [bold]Opening API documentation...[/bold]")
        console.print(f"   URL: [cyan]{docs_url}[/cyan]")
        
        # Try to open browser
        try:
            import webbrowser
            webbrowser.open(docs_url)
        except:
            pass
        
        # Show example curl commands
        console.print(f"\n📋 [bold]Example requests:[/bold]")
        
        # Get model info
        try:
            import requests
            info_response = requests.get(f"{api_url}/info", timeout=5)
            if info_response.ok:
                info = info_response.json()
                task_type = info.get("task_type", "unknown")
                
                if task_type == "classification":
                    console.print(f'''
[dim]# Check API health[/dim]
curl {api_url}/health

[dim]# Get model info[/dim]
curl {api_url}/info

[dim]# Make prediction[/dim]
curl -X POST {api_url}/predict \\
  -H "Content-Type: application/json" \\
  -d '{{"data": [[1.0, 2.0, 3.0, 4.0]]}}'

[dim]# Get probabilities[/dim]
curl -X POST {api_url}/predict \\
  -H "Content-Type: application/json" \\
  -d '{{"data": [[1.0, 2.0, 3.0, 4.0]], "return_proba": true}}'
''')
                elif task_type == "regression":
                    console.print(f'''
[dim]# Check API health[/dim]
curl {api_url}/health

[dim]# Get model info[/dim]
curl {api_url}/info

[dim]# Make prediction[/dim]
curl -X POST {api_url}/predict \\
  -H "Content-Type: application/json" \\
  -d '{{"data": [[1.0, 2.0, 3.0, 4.0]]}}'
''')
                elif task_type == "llm":
                    console.print(f'''
[dim]# Check API health[/dim]
curl {api_url}/health

[dim]# Get model info[/dim]
curl {api_url}/info

[dim]# Generate text[/dim]
curl -X POST {api_url}/generate \\
  -H "Content-Type: application/json" \\
  -d '{{"prompt": "Hello, how are you?", "max_tokens": 50}}'
''')
        except:
            # Fallback examples
            console.print(f'''
[dim]# Check API health[/dim]
curl {api_url}/health

[dim]# Get model info[/dim]
curl {api_url}/info

[dim]# See interactive docs[/dim]
open {docs_url}
''')
        
        console.print(f"\n💡 [bold]Tips:[/bold]")
        console.print("   • Use the Swagger UI to test endpoints interactively")
        console.print("   • Copy curl commands and modify the data")
        console.print(f"   • Stop the API with: [dim]docker stop {container_name}[/dim]")
        
        return {"success": True, "container": container_name, "port": port}
    
    def list_models(self, stage: Optional[str] = None) -> None:
        """List saved models (ml list)."""
        models = self.registry.list_models(stage=stage)
        
        if not models:
            console.print("[yellow]No models found in registry[/yellow]")
            console.print("\n💡 Save a model with: [dim]ml save[/dim]")
            return
        
        # Group by model name
        model_groups = {}
        for model in models:
            name = model["model_name"]
            if name not in model_groups:
                model_groups[name] = []
            model_groups[name].append(model)
        
        console.print(f"\n📦 [bold]Saved Models{f' ({stage})' if stage else ''}:[/bold]\n")
        
        for name, versions in model_groups.items():
            # Get latest version
            latest = versions[0]
            
            # Create panel content
            content = f"[bold]{name}[/bold]\n"
            content += f"Latest: {latest['version']} ({latest['stage']})\n"
            content += f"Type: {latest.get('model_type', 'unknown')}\n"
            content += f"Framework: {latest.get('framework', 'unknown')}\n"
            
            # Check if containerized
            if latest.get("container"):
                content += f"🐳 Container: {latest['container']['image']}\n"
            
            # Add metrics if available
            metrics = latest.get("metrics", {})
            if metrics:
                key_metrics = list(metrics.keys())[:3]  # Show first 3
                metrics_str = ", ".join(f"{k}={metrics[k]:.3f}" for k in key_metrics)
                content += f"Metrics: {metrics_str}\n"
            
            panel = Panel(
                content.strip(),
                title=f"[cyan]{name}[/cyan]",
                title_align="left",
                padding=(0, 1),
            )
            console.print(panel)
        
        console.print(f"\n💡 [bold]Commands:[/bold]")
        console.print("   [dim]ml ship <model>[/dim]  - Build container")
        console.print("   [dim]ml serve <model>[/dim] - Serve locally")
        console.print("   [dim]ml try <model>[/dim]   - Test interactively")
    
    def _ship_to_modal(self, run_id: str, model_name: str, gpu: Optional[str] = None) -> Dict[str, Any]:
        """Deploy a model to Modal."""
        try:
            # Prepare deployment configuration
            app_name = model_name.lower().replace(" ", "-").replace("_", "-")
            
            # Default configuration
            config_params = {
                "app_name": f"mltrack-{app_name}",
                "model_name": model_name,
                "model_version": "latest",
                "cpu": 1.0,
                "memory": 512,
                "min_replicas": 1,
                "max_replicas": 5,
                "python_version": "3.11"
            }
            
            # Add GPU if requested
            if gpu:
                config_params["gpu"] = gpu
                config_params["memory"] = 2048  # More memory for GPU
            
            # Get model info for framework-specific requirements
            try:
                run = self.mlflow_client.get_run(run_id)
                tags = run.data.tags
                framework = tags.get("mltrack.framework", "").lower()
                
                # Set framework-specific requirements
                if "sklearn" in framework or "scikit" in framework:
                    config_params["requirements"] = ["scikit-learn", "numpy", "pandas"]
                elif "torch" in framework or "pytorch" in framework:
                    config_params["requirements"] = ["torch", "numpy", "pillow"]
                    config_params["cpu"] = 2.0
                    config_params["memory"] = 4096
                elif "tensorflow" in framework or "keras" in framework:
                    config_params["requirements"] = ["tensorflow", "numpy", "pillow"]
                    config_params["cpu"] = 2.0
                    config_params["memory"] = 4096
                else:
                    config_params["requirements"] = ["numpy", "pandas"]
            except:
                pass
            
            config = DeploymentConfig(**config_params)
            
            # Deploy with progress tracking
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
            ) as progress:
                task = progress.add_task("Deploying to Modal...", total=None)
                
                # Deploy
                deployment_info = deploy_to_modal(run_id, config)
                deployment_id = deployment_info["deployment_id"]
                
                # Wait for deployment to be ready
                progress.update(task, description="Waiting for deployment to be ready...")
                timeout = 300  # 5 minutes
                start_time = time.time()
                
                while time.time() - start_time < timeout:
                    status = get_deployment_status(deployment_id)
                    if status and status["status"] == DeploymentStatus.RUNNING.value:
                        break
                    elif status and status["status"] == DeploymentStatus.FAILED.value:
                        raise Exception(f"Deployment failed: {status.get('error', 'Unknown error')}")
                    time.sleep(5)
                else:
                    raise Exception("Deployment timed out")
            
            # Success!
            endpoint_url = status.get("endpoint_url", "")
            console.print(f"\n✅ [green]Model deployed to Modal successfully![/green]")
            console.print(f"   Deployment ID: [cyan]{deployment_id}[/cyan]")
            console.print(f"   Endpoint: [cyan]{endpoint_url}[/cyan]")
            console.print(f"   API Docs: [cyan]{endpoint_url}/docs[/cyan]")
            console.print(f"\n💡 [bold]Test your model:[/bold]")
            console.print(f"   [dim]ml try {model_name} --modal[/dim]")
            console.print(f"\n💡 [bold]Stop deployment:[/bold]")
            console.print(f"   [dim]make modal-stop DEPLOYMENT_ID={deployment_id}[/dim]")
            
            return {
                "success": True,
                "deployment_id": deployment_id,
                "endpoint_url": endpoint_url,
                "status": "running"
            }
            
        except Exception as e:
            console.print(f"\n❌ [red]Modal deployment failed: {e}[/red]")
            console.print("\n[yellow]Troubleshooting:[/yellow]")
            console.print("1. Check Modal authentication: [dim]modal token list[/dim]")
            console.print("2. Check AWS credentials in .env file")
            console.print("3. Run setup: [dim]make setup-modal[/dim]")
            return {"success": False, "error": str(e)}