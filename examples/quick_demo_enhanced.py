#!/usr/bin/env python
"""Quick demo showcasing enhanced model introspection and tagging."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
from sklearn.datasets import make_classification, make_regression, make_blobs
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error, silhouette_score
import numpy as np
import mlflow

from mltrack import track, track_llm
from mltrack.model_registry import ModelRegistry

# Mock LLM function for demonstration
@track_llm(name="enhanced-chatbot-demo")
def simulate_enhanced_chatbot(prompt: str, model: str = "gpt-4", temperature: float = 0.7):
    """Simulate an LLM call with enhanced tagging."""
    # In a real scenario, this would call OpenAI/Anthropic
    # For demo, we'll just simulate the response
    
    # Log some metrics
    mlflow.log_metric("llm.tokens.prompt_tokens", len(prompt.split()) * 2)
    mlflow.log_metric("llm.tokens.completion_tokens", 150)
    mlflow.log_metric("llm.tokens.total_tokens", len(prompt.split()) * 2 + 150)
    mlflow.log_metric("llm.cost_usd", 0.05)
    mlflow.log_metric("llm.latency_ms", 1234)
    
    # The decorator automatically adds:
    # - mltrack.category: llm
    # - mltrack.task: generation
    # - mltrack.framework: openai (detected from function)
    # - mltrack.algorithm: gpt-4
    
    return f"This is a simulated response to: {prompt}"


@track(name="enhanced-ml-classification")
def train_classification_with_introspection():
    """Train a classification model showcasing automatic type detection."""
    print("🎯 Training Random Forest Classifier")
    
    # Generate data
    X, y = make_classification(n_samples=500, n_features=20, n_informative=15, 
                              n_classes=3, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    
    # The introspection system automatically adds:
    # - mltrack.category: ml
    # - mltrack.task: classification
    # - mltrack.framework: sklearn
    # - mltrack.algorithm: randomforestclassifier
    # - mltrack.n_features: 20
    # - mltrack.n_classes: 3
    
    print(f"  ✅ Accuracy: {accuracy:.3f}")
    print("  📊 Tags automatically added via introspection!")
    
    return model


@track(name="enhanced-ml-regression")
def train_regression_with_introspection():
    """Train a regression model showcasing automatic type detection."""
    print("📈 Training Gradient Boosting Regressor")
    
    # Generate data
    X, y = make_regression(n_samples=500, n_features=10, noise=0.1, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    mse = mean_squared_error(y_test, model.predict(X_test))
    rmse = np.sqrt(mse)
    mlflow.log_metric("rmse", rmse)
    
    # Automatic tags added
    print(f"  ✅ RMSE: {rmse:.3f}")
    print("  📊 Task type: regression (auto-detected)")
    
    return model


@track(name="enhanced-ml-clustering")
def train_clustering_with_introspection():
    """Train a clustering model showcasing automatic type detection."""
    print("🔮 Training KMeans Clustering")
    
    # Generate data
    X, _ = make_blobs(n_samples=300, n_features=4, centers=3, random_state=42)
    
    # Train model
    model = KMeans(n_clusters=3, random_state=42)
    labels = model.fit_predict(X)
    
    # Evaluate
    score = silhouette_score(X, labels)
    mlflow.log_metric("silhouette_score", score)
    
    # Automatic tags added
    print(f"  ✅ Silhouette Score: {score:.3f}")
    print("  📊 Task type: clustering (auto-detected)")
    
    return model


def main():
    """Run enhanced demo."""
    print("🚀 MLtrack Enhanced Tagging Demo\n")
    print("This demo showcases:")
    print("  - Automatic model type detection")
    print("  - Hierarchical tagging system")
    print("  - Enhanced LLM tracking")
    print("  - Cached loading code generation\n")
    
    # Set up MLflow
    mlflow.set_tracking_uri("mlruns")
    mlflow.set_experiment("enhanced-tagging-demo")
    
    # Run ML examples
    classification_model = train_classification_with_introspection()
    print()
    
    regression_model = train_regression_with_introspection()
    print()
    
    clustering_model = train_clustering_with_introspection()
    print()
    
    # Run LLM example
    print("💬 Simulating Enhanced Chatbot")
    response = simulate_enhanced_chatbot(
        "Explain the benefits of MLtrack's new tagging system",
        model="gpt-4",
        temperature=0.7
    )
    print("  ✅ LLM call tracked with provider and model info")
    print()
    
    # Register a model to show cached loading code
    print("📦 Registering Model with Cached Loading Code")
    runs = mlflow.search_runs(order_by=["start_time DESC"], max_results=1)
    if not runs.empty:
        run_id = runs.iloc[0]["run_id"]
        
        registry = ModelRegistry()
        model_info = registry.register_model(
            run_id=run_id,
            model_name="enhanced-demo-model",
            model_path="model",
            description="Model with enhanced metadata and cached loading code"
        )
        
        print(f"  ✅ Model registered: {model_info['model_name']}")
        print(f"  📊 Model type: {model_info.get('model_type', 'unknown')}")
        print(f"  🏷️  Task type: {model_info.get('task_type', 'unknown')}")
        print("  ⚡ Loading code cached for instant access!")
    
    print("\n✨ Demo Complete!")
    print("\nTo see the results:")
    print("  1. Run: mltrack ui")
    print("  2. Look for the 'enhanced-tagging-demo' experiment")
    print("  3. Check run tags for hierarchical structure:")
    print("     - mltrack.category (ml/llm)")
    print("     - mltrack.framework (sklearn/openai/etc)")
    print("     - mltrack.task (classification/regression/generation)")
    print("     - mltrack.algorithm (specific model name)")


if __name__ == "__main__":
    main()