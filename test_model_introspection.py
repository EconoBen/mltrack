#!/usr/bin/env python
"""Test script for model introspection and enhanced tagging."""

from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.datasets import make_classification, make_regression, make_blobs
import xgboost as xgb
import mlflow

from mltrack import track
from mltrack.model_registry import ModelRegistry
from mltrack.introspection import ModelIntrospector


@track(name="test-classification-model")
def train_classification_model():
    """Train a classification model to test introspection."""
    X, y = make_classification(n_samples=100, n_features=20, n_informative=10, random_state=42)
    
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X, y)
    
    # Log some metrics
    mlflow.log_metric("accuracy", 0.95)
    
    return model


@track(name="test-regression-model")
def train_regression_model():
    """Train a regression model to test introspection."""
    X, y = make_regression(n_samples=100, n_features=20, n_informative=10, random_state=42)
    
    model = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
    model.fit(X, y)
    
    # Log some metrics
    mlflow.log_metric("rmse", 12.5)
    mlflow.log_metric("r2", 0.89)
    
    return model


@track(name="test-clustering-model")
def train_clustering_model():
    """Train a clustering model to test introspection."""
    X, _ = make_blobs(n_samples=100, n_features=10, centers=3, random_state=42)
    
    model = KMeans(n_clusters=3, random_state=42)
    model.fit(X)
    
    # Log some metrics
    mlflow.log_metric("silhouette_score", 0.65)
    
    return model


@track(name="test-xgboost-classifier")
def train_xgboost_model():
    """Train an XGBoost model to test introspection."""
    X, y = make_classification(n_samples=100, n_features=20, n_informative=10, random_state=42)
    
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=3,
        objective="binary:logistic",
        random_state=42
    )
    model.fit(X, y)
    
    # Log some metrics
    mlflow.log_metric("auc", 0.92)
    
    return model


def test_model_registry():
    """Test the model registry with cached loading code."""
    print("\n=== Testing Model Registry ===")
    
    # Train a model
    model = train_classification_model()
    
    # Get the latest run
    runs = mlflow.search_runs(experiment_names=[mlflow.get_experiment(mlflow.get_experiment_by_name("mltrack-experiments").experiment_id).name])
    if not runs.empty:
        latest_run_id = runs.iloc[0]["run_id"]
        
        # Register the model
        registry = ModelRegistry()
        model_info = registry.register_model(
            run_id=latest_run_id,
            model_name="test-rf-classifier",
            model_path="model",
            description="Test Random Forest classifier with enhanced metadata",
            metadata={
                "requirements": ["scikit-learn>=1.0", "numpy>=1.20"],
                "usage_notes": "This model expects 20 features"
            }
        )
        
        print(f"Model registered: {model_info['model_name']} v{model_info['version']}")
        print(f"Model type: {model_info.get('model_type', 'unknown')}")
        print(f"Task type: {model_info.get('task_type', 'unknown')}")
        
        # Generate loading code
        code = registry.generate_loading_code("test-rf-classifier")
        print("\n--- Generated Loading Code ---")
        print(code[:500] + "..." if len(code) > 500 else code)


def test_introspection_standalone():
    """Test the introspection module standalone."""
    print("\n=== Testing Model Introspection ===")
    
    # Test different model types
    models = {
        "RandomForestClassifier": RandomForestClassifier(n_estimators=10),
        "GradientBoostingRegressor": GradientBoostingRegressor(n_estimators=10),
        "KMeans": KMeans(n_clusters=3),
        "XGBoostClassifier": xgb.XGBClassifier(objective="binary:logistic")
    }
    
    for name, model in models.items():
        print(f"\n{name}:")
        
        # Fit with dummy data
        if "Classifier" in name:
            X, y = make_classification(n_samples=50, n_features=10, random_state=42)
            model.fit(X, y)
        elif "Regressor" in name:
            X, y = make_regression(n_samples=50, n_features=10, random_state=42)
            model.fit(X, y)
        else:  # Clustering
            X, _ = make_blobs(n_samples=50, n_features=10, centers=3, random_state=42)
            model.fit(X)
        
        # Test introspection
        type_info = ModelIntrospector.detect_model_type(model)
        task_type = ModelIntrospector.detect_task_type(model)
        metadata = ModelIntrospector.extract_model_metadata(model)
        tags = ModelIntrospector.generate_tags(model)
        
        print(f"  Type Info: {type_info}")
        print(f"  Task Type: {task_type}")
        print(f"  Tags: {tags}")
        print(f"  Features: {metadata.get('n_features_in', 'N/A')}")


if __name__ == "__main__":
    print("Testing MLtrack Model Introspection and Enhanced Tagging\n")
    
    # Set up MLflow
    mlflow.set_experiment("mltrack-introspection-test")
    
    # Run tests
    test_introspection_standalone()
    
    # Train different model types
    print("\n=== Training Models with Enhanced Tracking ===")
    train_classification_model()
    train_regression_model()
    train_clustering_model()
    train_xgboost_model()
    
    # Test model registry
    test_model_registry()
    
    print("\nAll tests completed! Check MLflow UI for tagged runs.")