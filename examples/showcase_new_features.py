#!/usr/bin/env python
"""Comprehensive showcase of MLtrack's new model introspection and tagging features."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mlflow
from mltrack import track, track_llm, track_context
from mltrack.model_registry import ModelRegistry
from mltrack.introspection import ModelIntrospector

# Import various ML frameworks
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor, IsolationForest
from sklearn.linear_model import LogisticRegression, Lasso
from sklearn.cluster import KMeans, DBSCAN
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.datasets import make_classification, make_regression, make_blobs
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error, silhouette_score

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False

import numpy as np
import pandas as pd
from datetime import datetime


def print_model_tags(model_name: str):
    """Helper to print the tags that were automatically added."""
    runs = mlflow.search_runs(order_by=["start_time DESC"], max_results=1)
    if not runs.empty:
        tags = runs.iloc[0].to_dict()
        print(f"\n  🏷️  Auto-detected tags for {model_name}:")
        for key, value in tags.items():
            if key.startswith("tags.mltrack."):
                tag_name = key.replace("tags.mltrack.", "")
                print(f"     - mltrack.{tag_name}: {value}")


@track(name="showcase-sklearn-classifiers")
def showcase_sklearn_classifiers():
    """Showcase various sklearn classifiers with automatic type detection."""
    print("\n🎯 Showcasing Sklearn Classifiers")
    print("=" * 50)
    
    # Generate data
    X, y = make_classification(n_samples=500, n_features=20, n_informative=15, 
                              n_classes=2, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    classifiers = {
        "RandomForest": RandomForestClassifier(n_estimators=50, random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "SVM": SVC(kernel='rbf', random_state=42),
        "NaiveBayes": GaussianNB()
    }
    
    for name, clf in classifiers.items():
        with track_context(f"classifier-{name}"):
            print(f"\n  Training {name}...")
            clf.fit(X_train, y_train)
            accuracy = accuracy_score(y_test, clf.predict(X_test))
            mlflow.log_metric("accuracy", accuracy)
            print(f"  ✅ Accuracy: {accuracy:.3f}")
            
            # Show introspected metadata
            metadata = ModelIntrospector.extract_model_metadata(clf)
            print(f"  📊 Auto-detected: {metadata.get('task_type', 'unknown')} task")
            print(f"  🔧 Algorithm: {metadata.get('algorithm', 'unknown')}")


@track(name="showcase-sklearn-regressors")
def showcase_sklearn_regressors():
    """Showcase various sklearn regressors with automatic type detection."""
    print("\n📈 Showcasing Sklearn Regressors")
    print("=" * 50)
    
    # Generate data
    X, y = make_regression(n_samples=500, n_features=10, noise=0.1, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    regressors = {
        "GradientBoosting": GradientBoostingRegressor(n_estimators=50, random_state=42),
        "Lasso": Lasso(alpha=0.1, random_state=42)
    }
    
    for name, reg in regressors.items():
        with track_context(f"regressor-{name}"):
            print(f"\n  Training {name}...")
            reg.fit(X_train, y_train)
            rmse = np.sqrt(mean_squared_error(y_test, reg.predict(X_test)))
            mlflow.log_metric("rmse", rmse)
            print(f"  ✅ RMSE: {rmse:.3f}")
            print_model_tags(name)


@track(name="showcase-clustering")
def showcase_clustering():
    """Showcase clustering algorithms with automatic type detection."""
    print("\n🔮 Showcasing Clustering Algorithms")
    print("=" * 50)
    
    # Generate data
    X, y_true = make_blobs(n_samples=300, n_features=4, centers=3, random_state=42)
    
    clusterers = {
        "KMeans": KMeans(n_clusters=3, random_state=42),
        "DBSCAN": DBSCAN(eps=1.5, min_samples=5)
    }
    
    for name, clusterer in clusterers.items():
        with track_context(f"clustering-{name}"):
            print(f"\n  Training {name}...")
            labels = clusterer.fit_predict(X)
            
            # Calculate metrics if valid clustering
            n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
            if n_clusters > 1:
                score = silhouette_score(X, labels)
                mlflow.log_metric("silhouette_score", score)
                print(f"  ✅ Silhouette Score: {score:.3f}")
            
            mlflow.log_metric("n_clusters_found", n_clusters)
            print(f"  📊 Clusters found: {n_clusters}")
            print_model_tags(name)


@track(name="showcase-xgboost-lightgbm")
def showcase_gradient_boosting():
    """Showcase XGBoost and LightGBM with automatic objective detection."""
    print("\n🚀 Showcasing Gradient Boosting Libraries")
    print("=" * 50)
    
    if HAS_XGBOOST:
        print("\n  XGBoost Classification:")
        X, y = make_classification(n_samples=500, n_features=20, random_state=42)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # XGBoost will be detected as classification due to objective
        xgb_clf = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=3,
            objective="binary:logistic",
            random_state=42
        )
        xgb_clf.fit(X_train, y_train)
        accuracy = accuracy_score(y_test, xgb_clf.predict(X_test))
        mlflow.log_metric("accuracy", accuracy)
        print(f"  ✅ Accuracy: {accuracy:.3f}")
        print_model_tags("XGBoost")
    
    if HAS_LIGHTGBM:
        print("\n  LightGBM Regression:")
        X, y = make_regression(n_samples=500, n_features=10, random_state=42)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # LightGBM will be detected as regression due to objective
        lgb_reg = lgb.LGBMRegressor(
            n_estimators=100,
            objective="regression",
            random_state=42
        )
        lgb_reg.fit(X_train, y_train)
        rmse = np.sqrt(mean_squared_error(y_test, lgb_reg.predict(X_test)))
        mlflow.log_metric("rmse", rmse)
        print(f"  ✅ RMSE: {rmse:.3f}")
        print_model_tags("LightGBM")


@track_llm(name="showcase-llm-gpt4")
def simulate_gpt4_call(prompt: str, temperature: float = 0.7):
    """Showcase GPT-4 tracking with enhanced tags."""
    # Simulate API call
    mlflow.log_metric("llm.tokens.prompt_tokens", len(prompt.split()) * 2)
    mlflow.log_metric("llm.tokens.completion_tokens", 200)
    mlflow.log_metric("llm.cost_usd", 0.08)
    mlflow.log_param("llm.model", "gpt-4")
    mlflow.log_param("llm.temperature", temperature)
    
    return f"GPT-4 response to: {prompt[:50]}..."


@track_llm(name="showcase-llm-claude")
def simulate_claude_call(prompt: str, max_tokens: int = 1000):
    """Showcase Claude tracking with enhanced tags."""
    # Simulate API call
    mlflow.log_metric("llm.tokens.prompt_tokens", len(prompt.split()) * 1.5)
    mlflow.log_metric("llm.tokens.completion_tokens", 150)
    mlflow.log_metric("llm.cost_usd", 0.05)
    mlflow.log_param("llm.model", "claude-3-opus")
    mlflow.log_param("llm.max_tokens", max_tokens)
    
    return f"Claude response to: {prompt[:50]}..."


def showcase_llm_tracking():
    """Showcase LLM tracking with provider detection."""
    print("\n💬 Showcasing LLM Tracking")
    print("=" * 50)
    
    # GPT-4 example
    print("\n  Simulating GPT-4 call...")
    response1 = simulate_gpt4_call("Explain gradient boosting in simple terms")
    print("  ✅ GPT-4 call tracked")
    print_model_tags("GPT-4")
    
    # Claude example
    print("\n  Simulating Claude call...")
    response2 = simulate_claude_call("Compare random forests and gradient boosting")
    print("  ✅ Claude call tracked")
    print_model_tags("Claude")


def showcase_model_registry():
    """Showcase the enhanced model registry with cached loading code."""
    print("\n📦 Showcasing Model Registry")
    print("=" * 50)
    
    # Train a model
    X, y = make_classification(n_samples=200, n_features=10, random_state=42)
    model = RandomForestClassifier(n_estimators=30, random_state=42)
    model.fit(X, y)
    
    # Get the run
    runs = mlflow.search_runs(order_by=["start_time DESC"], max_results=1)
    if not runs.empty:
        run_id = runs.iloc[0]["run_id"]
        
        registry = ModelRegistry()
        
        # Register model
        print("\n  Registering model...")
        model_info = registry.register_model(
            run_id=run_id,
            model_name="showcase-rf-model",
            model_path="model",
            description="Random Forest with comprehensive metadata",
            stage="staging",
            metadata={
                "requirements": ["scikit-learn>=1.0", "numpy>=1.20"],
                "dataset": "synthetic classification",
                "performance_notes": "Optimized for balanced datasets"
            }
        )
        
        print(f"  ✅ Model registered: {model_info['model_name']} v{model_info['version']}")
        print(f"  📊 Model type: {model_info.get('model_type', 'unknown')}")
        print(f"  🏷️  Task type: {model_info.get('task_type', 'unknown')}")
        print("  ⚡ Loading code cached at registration time!")
        
        # Show loading code generation performance
        import time
        
        # First call (uses cache)
        start = time.time()
        code1 = registry.generate_loading_code("showcase-rf-model")
        time1 = time.time() - start
        
        # Second call (definitely cached)
        start = time.time()
        code2 = registry.generate_loading_code("showcase-rf-model")
        time2 = time.time() - start
        
        print(f"\n  ⏱️  Loading code generation performance:")
        print(f"     First call: {time1*1000:.2f}ms")
        print(f"     Second call: {time2*1000:.2f}ms (cached)")
        print(f"     Speedup: {time1/time2:.1f}x faster!")
        
        # Show a snippet of the generated code
        print("\n  📄 Generated loading code preview:")
        lines = code1.split('\n')[:20]
        for line in lines:
            print(f"     {line}")
        print("     ...")


def main():
    """Run the comprehensive showcase."""
    print("🚀 MLtrack New Features Showcase")
    print("================================")
    print("\nThis showcase demonstrates:")
    print("  ✨ Automatic model type detection")
    print("  🏷️  Hierarchical tagging system")
    print("  📊 Framework-specific introspection")
    print("  ⚡ Cached loading code generation")
    print("  💬 Enhanced LLM tracking")
    
    # Set up MLflow
    mlflow.set_tracking_uri("mlruns")
    mlflow.set_experiment("feature-showcase")
    
    # Run showcases
    showcase_sklearn_classifiers()
    showcase_sklearn_regressors()
    showcase_clustering()
    showcase_gradient_boosting()
    showcase_llm_tracking()
    
    # Model registry must be last to register a model
    with track(name="showcase-registry-demo"):
        showcase_model_registry()
    
    print("\n" + "="*60)
    print("✅ Showcase Complete!")
    print("\n📋 Summary of demonstrated features:")
    print("  1. Models automatically tagged with:")
    print("     - mltrack.category (ml/llm)")
    print("     - mltrack.framework (sklearn/xgboost/openai/etc)")
    print("     - mltrack.task (classification/regression/clustering/generation)")
    print("     - mltrack.algorithm (specific model name)")
    print("  2. Model introspection extracts:")
    print("     - Number of features")
    print("     - Number of classes (for classifiers)")
    print("     - Model parameters")
    print("  3. Loading code is:")
    print("     - Task-specific (different for classification vs regression)")
    print("     - Cached for instant access")
    print("     - Includes usage examples")
    print("\n🔍 To explore the results:")
    print("  1. Run: mltrack ui")
    print("  2. Open the 'feature-showcase' experiment")
    print("  3. Click on runs to see the rich metadata")
    print("  4. Check the model registry for cached code")


if __name__ == "__main__":
    main()