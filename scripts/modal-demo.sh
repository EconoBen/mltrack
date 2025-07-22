#!/bin/bash

# End-to-end MLTrack Modal deployment demo
# This script demonstrates the complete workflow:
# 1. Clear MLflow data
# 2. Train a model
# 3. View in UI
# 4. Deploy to Modal
# 5. Test inference API

set -e  # Exit on error

echo "🚀 MLTrack Modal Deployment Demo"
echo "================================"
echo ""

# Check if Modal is configured
if ! modal token list &> /dev/null; then
    echo "❌ Error: Modal is not authenticated"
    echo "Please run: make setup-modal"
    exit 1
fi

# Step 1: Clear MLflow data
echo "Step 1: Clearing MLflow data..."
echo "-------------------------------"
read -p "This will delete all existing experiments and models. Continue? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf mlruns mlflow.db models
    echo "✅ MLflow data cleared"
else
    echo "⏭️  Skipping data clear"
fi
echo ""

# Step 2: Start MLflow server in background
echo "Step 2: Starting MLflow server..."
echo "---------------------------------"
# Kill any existing MLflow server
pkill -f "mlflow server" || true
sleep 2

# Start MLflow server
mlflow server --host 0.0.0.0 --port 5001 &
MLFLOW_PID=$!
echo "✅ MLflow server started (PID: $MLFLOW_PID)"
sleep 3
echo ""

# Step 3: Train a model
echo "Step 3: Training demonstration model..."
echo "---------------------------------------"
cd examples

# Create a simple training script inline
cat > train_demo_model.py << 'EOF'
import mlflow
import mlflow.sklearn
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score
import time

# Set MLflow tracking URI
mlflow.set_tracking_uri("http://localhost:5001")

# Create experiment
experiment_name = "Modal Deployment Demo"
mlflow.create_experiment(experiment_name, exist_ok=True)
mlflow.set_experiment(experiment_name)

print("🌸 Training Iris classifier model...")

# Load data
iris = load_iris()
X, y = iris.data, iris.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Start MLflow run
with mlflow.start_run(run_name="iris-modal-demo") as run:
    # Log parameters
    n_estimators = 100
    max_depth = 5
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("dataset", "iris")
    mlflow.log_param("train_size", len(X_train))
    mlflow.log_param("test_size", len(X_test))
    
    # Train model
    print("Training Random Forest classifier...")
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    
    start_time = time.time()
    model.fit(X_train, y_train)
    training_time = time.time() - start_time
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='macro')
    recall = recall_score(y_test, y_pred, average='macro')
    
    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", precision)
    mlflow.log_metric("recall", recall)
    mlflow.log_metric("training_time", training_time)
    
    # Log model
    signature = mlflow.models.infer_signature(X_train, y_train)
    mlflow.sklearn.log_model(
        model, 
        "model",
        signature=signature,
        input_example=X_train[:1]
    )
    
    # Log feature importance
    feature_importance = model.feature_importances_
    for i, importance in enumerate(feature_importance):
        mlflow.log_metric(f"feature_{iris.feature_names[i]}_importance", importance)
    
    print(f"✅ Model trained successfully!")
    print(f"   Accuracy: {accuracy:.3f}")
    print(f"   Precision: {precision:.3f}")
    print(f"   Recall: {recall:.3f}")
    print(f"   Run ID: {run.info.run_id}")
    
    # Save run ID for deployment
    with open("last_run_id.txt", "w") as f:
        f.write(run.info.run_id)
EOF

python train_demo_model.py
RUN_ID=$(cat last_run_id.txt)
echo "✅ Model trained with Run ID: $RUN_ID"
echo ""

# Step 4: Start UI in background
echo "Step 4: Starting MLTrack UI..."
echo "------------------------------"
cd ../ui
# Kill any existing UI server
pkill -f "next dev" || true
sleep 2

# Start UI
npm run dev &
UI_PID=$!
echo "✅ UI started (PID: $UI_PID)"
echo "   Access at: http://localhost:3000"
sleep 5
echo ""

# Step 5: Deploy to Modal
echo "Step 5: Deploying model to Modal..."
echo "-----------------------------------"
cd ../examples

cat > deploy_demo_model.py << EOF
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mltrack.deploy import deploy_to_modal, DeploymentConfig, get_deployment_status
import mlflow
import time
import json

mlflow.set_tracking_uri("http://localhost:5001")

# Read run ID
with open("last_run_id.txt", "r") as f:
    run_id = f.read().strip()

print(f"Deploying model from run: {run_id}")

# Configure deployment
config = DeploymentConfig(
    app_name="iris-demo-modal",
    model_name="Iris Classifier Demo",
    model_version="1.0.0",
    cpu=0.5,
    memory=256,
    min_replicas=1,
    max_replicas=3,
    requirements=["scikit-learn", "numpy", "pandas"],
    environment_vars={"LOG_LEVEL": "INFO"},
    python_version="3.11"
)

# Deploy to Modal
print("🚀 Initiating deployment...")
deployment_info = deploy_to_modal(run_id, config)
deployment_id = deployment_info['deployment_id']

print(f"📦 Deployment ID: {deployment_id}")
print("⏳ Waiting for deployment to be ready...")

# Wait for deployment
timeout = 300  # 5 minutes
start_time = time.time()
while time.time() - start_time < timeout:
    status = get_deployment_status(deployment_id)
    if status and status['status'] == 'running':
        print(f"✅ Deployment is ready!")
        print(f"🌐 Endpoint URL: {status['endpoint_url']}")
        with open("deployment_info.json", "w") as f:
            json.dump(status, f, indent=2)
        break
    elif status and status['status'] == 'failed':
        print(f"❌ Deployment failed: {status.get('error', 'Unknown error')}")
        sys.exit(1)
    time.sleep(10)
else:
    print("❌ Deployment timed out")
    sys.exit(1)
EOF

python deploy_demo_model.py
echo ""

# Step 6: Test the deployment
echo "Step 6: Testing deployed model API..."
echo "-------------------------------------"
if [ -f deployment_info.json ]; then
    ENDPOINT_URL=$(python -c "import json; print(json.load(open('deployment_info.json'))['endpoint_url'])")
    
    echo "Testing health endpoint..."
    curl -s ${ENDPOINT_URL}/health | jq
    echo ""
    
    echo "Testing model info endpoint..."
    curl -s ${ENDPOINT_URL}/info | jq
    echo ""
    
    echo "Testing prediction endpoint..."
    curl -s -X POST ${ENDPOINT_URL}/predict \
        -H "Content-Type: application/json" \
        -d '{
            "data": [[5.1, 3.5, 1.4, 0.2]],
            "return_proba": true
        }' | jq
    echo ""
    
    echo "✅ API tests completed!"
    echo ""
    
    # Show deployment info
    echo "📋 Deployment Summary"
    echo "===================="
    echo "Model: Iris Classifier Demo"
    echo "Endpoint: ${ENDPOINT_URL}"
    echo "API Docs: ${ENDPOINT_URL}/docs"
    echo ""
    echo "View in UI: http://localhost:3000/deployments"
    echo ""
else
    echo "❌ Deployment info not found"
fi

# Step 7: Cleanup prompt
echo "Demo Complete!"
echo "=============="
echo ""
echo "The model is now deployed and accessible via API."
echo ""
echo "To stop the demo:"
echo "1. Press Ctrl+C to stop this script"
echo "2. Run: make modal-clean  # Stop Modal deployment"
echo "3. Run: make demo-clean   # Clean up demo data"
echo ""
echo "Press Enter to keep services running, or Ctrl+C to exit..."
read

# Cleanup
echo "Cleaning up..."
kill $MLFLOW_PID 2>/dev/null || true
kill $UI_PID 2>/dev/null || true
rm -f last_run_id.txt deployment_info.json train_demo_model.py deploy_demo_model.py
echo "✅ Demo completed"