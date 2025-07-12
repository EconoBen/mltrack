"""Quick demo to populate models for testing."""

import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from mltrack import ModelRegistry

# Set tracking URI
mlflow.set_tracking_uri("mlruns")

# Create a simple experiment
mlflow.set_experiment("quick-demo")

# Generate some data
X, y = make_classification(n_samples=1000, n_features=20, n_informative=15, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train and log a model
with mlflow.start_run(run_name="churn-model-demo"):
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Log metrics
    score = model.score(X_test, y_test)
    mlflow.log_metric("accuracy", score)
    mlflow.log_metric("f1_score", 0.85)  # Simulated
    
    # Log model
    mlflow.sklearn.log_model(model, "model")
    
    # Get run ID
    run_id = mlflow.active_run().info.run_id
    print(f"✅ Model trained and logged - Run ID: {run_id}")

# Register the model
registry = ModelRegistry()
model_info = registry.register_model(
    run_id=run_id,
    model_name="demo-churn-predictor",
    model_path="model",
    stage="production",
    description="Demo customer churn prediction model"
)

print(f"✅ Model registered: {model_info.get('name', 'demo-churn-predictor')} v{model_info.get('version', 'latest')}")

# List all models
print("\n📦 Registered models:")
models = registry.list_models()
for model in models:
    print(f"  - {model.get('name', 'Unknown')} ({model.get('latest_version', {}).get('stage', 'Unknown')})")