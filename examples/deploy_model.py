#!/usr/bin/env python3
"""
Example script for deploying ML models to Modal using MLTrack.

This script demonstrates how to:
1. Train a simple model with MLflow
2. Deploy it to Modal for API serving
3. Test the deployed endpoint
"""

import mlflow
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import requests
import time
import sys
import os

# Add the parent directory to the path so we can import mltrack
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mltrack.deploy import (
    deploy_to_modal,
    DeploymentConfig,
    get_deployment_status,
    DeploymentStatus
)

def train_example_model():
    """Train a simple model and log it with MLflow."""
    print("📊 Training example model...")
    
    # Load iris dataset
    iris = load_iris()
    X, y = iris.data, iris.target
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Start MLflow run
    with mlflow.start_run(run_name="iris-classifier-deployment-example") as run:
        # Train model
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Log metrics
        accuracy = model.score(X_test, y_test)
        mlflow.log_metric("accuracy", accuracy)
        
        # Log model
        mlflow.sklearn.log_model(
            model, 
            "model",
            signature=mlflow.models.infer_signature(X_train, y_train)
        )
        
        # Log parameters
        mlflow.log_param("n_estimators", 100)
        mlflow.log_param("dataset", "iris")
        
        print(f"✅ Model trained with accuracy: {accuracy:.3f}")
        print(f"🏃 Run ID: {run.info.run_id}")
        
        return run.info.run_id

def deploy_model(run_id: str):
    """Deploy the model to Modal."""
    print("\n🚀 Deploying model to Modal...")
    
    # Configure deployment
    config = DeploymentConfig(
        app_name="iris-classifier-example",
        model_name="Iris Classifier",
        model_version="1.0.0",
        cpu=0.5,
        memory=256,
        min_replicas=1,
        max_replicas=3,
        requirements=["scikit-learn", "numpy", "pandas"],
        environment_vars={"LOG_LEVEL": "INFO"}
    )
    
    # Deploy to Modal
    deployment_info = deploy_to_modal(run_id, config)
    
    print(f"📦 Deployment ID: {deployment_info['deployment_id']}")
    print(f"⏳ Status: {deployment_info['status']}")
    
    return deployment_info

def wait_for_deployment(deployment_id: str, timeout: int = 300):
    """Wait for deployment to be ready."""
    print("\n⏳ Waiting for deployment to be ready...")
    
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        deployment = get_deployment_status(deployment_id)
        
        if not deployment:
            print("❌ Deployment not found")
            return None
            
        status = deployment['status']
        print(f"📊 Current status: {status}")
        
        if status == DeploymentStatus.RUNNING.value:
            print("✅ Deployment is ready!")
            return deployment
        elif status == DeploymentStatus.FAILED.value:
            print(f"❌ Deployment failed: {deployment.get('error', 'Unknown error')}")
            return None
            
        time.sleep(10)
    
    print("❌ Deployment timed out")
    return None

def test_endpoint(endpoint_url: str):
    """Test the deployed model endpoint."""
    print(f"\n🧪 Testing endpoint: {endpoint_url}")
    
    # Test data (iris setosa characteristics)
    test_data = {
        "data": [[5.1, 3.5, 1.4, 0.2]],
        "return_proba": True
    }
    
    try:
        # Health check
        health_response = requests.get(f"{endpoint_url}/health")
        print(f"❤️  Health check: {health_response.json()}")
        
        # Model info
        info_response = requests.get(f"{endpoint_url}/info")
        print(f"ℹ️  Model info: {info_response.json()}")
        
        # Prediction
        predict_response = requests.post(
            f"{endpoint_url}/predict",
            json=test_data
        )
        
        if predict_response.status_code == 200:
            result = predict_response.json()
            print(f"🎯 Prediction result:")
            print(f"   - Predicted class: {result['predictions']}")
            print(f"   - Probabilities: {result['probabilities']}")
            print(f"   - Model: {result['model_name']} v{result['model_version']}")
        else:
            print(f"❌ Prediction failed: {predict_response.text}")
            
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")

def main():
    """Main deployment workflow."""
    print("🌟 MLTrack Model Deployment Example")
    print("=" * 50)
    
    # Step 1: Train model
    run_id = train_example_model()
    
    # Step 2: Deploy model
    deployment_info = deploy_model(run_id)
    
    if deployment_info:
        # Step 3: Wait for deployment
        deployment = wait_for_deployment(deployment_info['deployment_id'])
        
        if deployment and deployment.get('endpoint_url'):
            # Step 4: Test endpoint
            test_endpoint(deployment['endpoint_url'])
            
            print("\n🎉 Deployment successful!")
            print(f"🌐 Your model is live at: {deployment['endpoint_url']}")
            print(f"📚 API docs available at: {deployment['endpoint_url']}/docs")
            print("\nTo stop the deployment, run:")
            print(f"  python -c \"from mltrack.deploy import stop_deployment; stop_deployment('{deployment_info['deployment_id']}')\"")
        else:
            print("\n❌ Deployment failed or timed out")
    else:
        print("\n❌ Failed to initiate deployment")

if __name__ == "__main__":
    # Set MLflow tracking URI if needed
    mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5001"))
    
    main()