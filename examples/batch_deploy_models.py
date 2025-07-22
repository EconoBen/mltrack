#!/usr/bin/env python3
"""
Example script for batch deploying multiple models to Modal.

This script demonstrates how to:
1. Find multiple trained models in MLflow
2. Deploy them all to Modal with different configurations
3. Monitor their deployment status
"""

import mlflow
import sys
import os
import time
from typing import List, Dict, Any

# Add the parent directory to the path so we can import mltrack
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mltrack.deploy import (
    deploy_to_modal,
    DeploymentConfig,
    list_deployments,
    get_deployment_status,
    DeploymentStatus
)

def find_deployable_models(experiment_name: str = None, max_models: int = 5) -> List[Dict[str, Any]]:
    """Find models that are ready for deployment."""
    print("🔍 Searching for deployable models...")
    
    client = mlflow.tracking.MlflowClient()
    
    # Get experiments
    if experiment_name:
        experiments = [client.get_experiment_by_name(experiment_name)]
    else:
        experiments = client.search_experiments()
    
    deployable_models = []
    
    for experiment in experiments:
        if experiment is None:
            continue
            
        # Search for successful runs with logged models
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            filter_string="status = 'FINISHED'",
            order_by=["metrics.accuracy DESC", "start_time DESC"],
            max_results=max_models
        )
        
        for run in runs:
            # Check if model was logged
            artifacts = client.list_artifacts(run.info.run_id)
            has_model = any(artifact.path == "model" for artifact in artifacts)
            
            if has_model:
                # Get model info
                model_info = {
                    "run_id": run.info.run_id,
                    "run_name": run.data.tags.get("mlflow.runName", run.info.run_id[:8]),
                    "experiment_name": experiment.name,
                    "metrics": dict(run.data.metrics),
                    "params": dict(run.data.params),
                    "tags": dict(run.data.tags)
                }
                deployable_models.append(model_info)
                
                if len(deployable_models) >= max_models:
                    break
    
    print(f"✅ Found {len(deployable_models)} deployable models")
    return deployable_models[:max_models]

def generate_deployment_config(model_info: Dict[str, Any]) -> DeploymentConfig:
    """Generate deployment configuration based on model characteristics."""
    
    # Base configuration
    base_config = {
        "app_name": f"model-{model_info['run_id'][:8]}",
        "model_name": model_info['run_name'],
        "model_version": "1.0.0",
        "python_version": "3.11"
    }
    
    # Determine resource allocation based on model type
    tags = model_info.get('tags', {})
    params = model_info.get('params', {})
    
    # Check if it's a deep learning model
    is_deep_learning = any(
        framework in str(tags.get('mlflow.log-model.history', ''))
        for framework in ['pytorch', 'tensorflow', 'keras']
    )
    
    if is_deep_learning:
        # Deep learning models need more resources
        base_config.update({
            "cpu": 2.0,
            "memory": 4096,
            "gpu": "T4",  # Use GPU for deep learning
            "min_replicas": 1,
            "max_replicas": 3,
            "requirements": ["torch", "tensorflow", "numpy", "pillow"]
        })
    else:
        # Traditional ML models
        base_config.update({
            "cpu": 1.0,
            "memory": 1024,
            "min_replicas": 1,
            "max_replicas": 5,
            "requirements": ["scikit-learn", "numpy", "pandas", "xgboost"]
        })
    
    # Add environment variables
    base_config["environment_vars"] = {
        "MODEL_TYPE": "deep_learning" if is_deep_learning else "traditional_ml",
        "RUN_ID": model_info['run_id'],
        "LOG_LEVEL": "INFO"
    }
    
    return DeploymentConfig(**base_config)

def deploy_models_batch(models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deploy multiple models in batch."""
    print(f"\n🚀 Deploying {len(models)} models to Modal...")
    
    deployments = []
    
    for i, model in enumerate(models, 1):
        print(f"\n📦 Deploying model {i}/{len(models)}: {model['run_name']}")
        print(f"   Run ID: {model['run_id']}")
        print(f"   Metrics: {model.get('metrics', {})}")
        
        try:
            # Generate deployment configuration
            config = generate_deployment_config(model)
            
            print(f"   Resources: CPU={config.cpu}, Memory={config.memory}MB")
            if config.gpu:
                print(f"   GPU: {config.gpu}")
            
            # Deploy model
            deployment_info = deploy_to_modal(model['run_id'], config)
            
            deployments.append({
                "model_info": model,
                "deployment": deployment_info,
                "config": config.to_dict()
            })
            
            print(f"   ✅ Deployment initiated: {deployment_info['deployment_id']}")
            
        except Exception as e:
            print(f"   ❌ Failed to deploy: {e}")
            deployments.append({
                "model_info": model,
                "deployment": None,
                "error": str(e)
            })
        
        # Small delay between deployments
        if i < len(models):
            time.sleep(5)
    
    return deployments

def monitor_deployments(deployments: List[Dict[str, Any]], timeout: int = 600):
    """Monitor the status of multiple deployments."""
    print(f"\n📊 Monitoring {len(deployments)} deployments...")
    
    active_deployments = [d for d in deployments if d.get('deployment')]
    completed = []
    failed = []
    
    start_time = time.time()
    
    while active_deployments and time.time() - start_time < timeout:
        print(f"\n⏳ Active deployments: {len(active_deployments)}")
        
        for deployment in active_deployments[:]:
            deployment_id = deployment['deployment']['deployment_id']
            status_info = get_deployment_status(deployment_id)
            
            if not status_info:
                continue
                
            status = status_info['status']
            model_name = deployment['model_info']['run_name']
            
            print(f"   {model_name}: {status}")
            
            if status == DeploymentStatus.RUNNING.value:
                print(f"   ✅ {model_name} is now running!")
                print(f"      Endpoint: {status_info.get('endpoint_url', 'N/A')}")
                completed.append(deployment)
                active_deployments.remove(deployment)
                
            elif status == DeploymentStatus.FAILED.value:
                print(f"   ❌ {model_name} failed: {status_info.get('error', 'Unknown error')}")
                failed.append(deployment)
                active_deployments.remove(deployment)
        
        if active_deployments:
            time.sleep(15)
    
    # Summary
    print("\n📋 Deployment Summary:")
    print(f"   ✅ Successful: {len(completed)}")
    print(f"   ❌ Failed: {len(failed)}")
    print(f"   ⏳ Still deploying: {len(active_deployments)}")
    
    return completed, failed, active_deployments

def print_deployment_summary(completed: List[Dict[str, Any]]):
    """Print a summary of successful deployments."""
    if not completed:
        return
        
    print("\n🎉 Successfully Deployed Models:")
    print("=" * 80)
    
    for deployment in completed:
        model_info = deployment['model_info']
        deployment_info = deployment['deployment']
        config = deployment['config']
        
        print(f"\n📦 {model_info['run_name']}")
        print(f"   Run ID: {model_info['run_id']}")
        print(f"   Deployment ID: {deployment_info['deployment_id']}")
        print(f"   Endpoint: {deployment_info.get('endpoint_url', 'N/A')}")
        print(f"   Resources: CPU={config['cpu']}, Memory={config['memory']}MB")
        if config.get('gpu'):
            print(f"   GPU: {config['gpu']}")
        print(f"   API Docs: {deployment_info.get('endpoint_url', 'N/A')}/docs")

def main():
    """Main batch deployment workflow."""
    print("🌟 MLTrack Batch Model Deployment Example")
    print("=" * 50)
    
    # Step 1: Find deployable models
    models = find_deployable_models(max_models=3)
    
    if not models:
        print("❌ No deployable models found")
        print("💡 Tip: Train some models first using the MLflow examples")
        return
    
    # Step 2: Deploy models in batch
    deployments = deploy_models_batch(models)
    
    # Step 3: Monitor deployments
    completed, failed, active = monitor_deployments(deployments)
    
    # Step 4: Print summary
    print_deployment_summary(completed)
    
    # List all current deployments
    print("\n📋 All Current Deployments:")
    all_deployments = list_deployments()
    for d in all_deployments:
        if d['status'] == 'running':
            print(f"   • {d['config']['model_name']} - {d['endpoint_url']}")

if __name__ == "__main__":
    # Set MLflow tracking URI if needed
    mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5001"))
    
    main()