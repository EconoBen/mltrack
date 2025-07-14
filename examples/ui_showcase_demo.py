#!/usr/bin/env python
"""Demo to showcase UI features with clear model type tagging."""

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

# Set up MLflow
mlflow.set_tracking_uri("mlruns")
mlflow.set_experiment("ml-showcase")

print("🚀 Creating ML Showcase Runs...")

# Classification Examples
print("\n📊 Classification Models:")

# Random Forest
with mlflow.start_run(run_name="RandomForest-Classification"):
    X, y = make_classification(n_samples=1000, n_features=20, n_informative=15, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", 0.92)
    mlflow.log_metric("recall", 0.89)
    mlflow.log_metric("f1_score", 0.90)
    
    # Ensure the tags are set
    mlflow.set_tag("mltrack.category", "ml")
    mlflow.set_tag("mltrack.framework", "sklearn")
    mlflow.set_tag("mltrack.task", "classification")
    mlflow.set_tag("mltrack.algorithm", "randomforestclassifier")
    
    print(f"  ✅ Random Forest: accuracy={accuracy:.3f}")

# Logistic Regression
with mlflow.start_run(run_name="LogisticRegression-Classification"):
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", 0.87)
    mlflow.log_metric("recall", 0.85)
    mlflow.log_metric("f1_score", 0.86)
    
    mlflow.set_tag("mltrack.category", "ml")
    mlflow.set_tag("mltrack.framework", "sklearn")
    mlflow.set_tag("mltrack.task", "classification")
    mlflow.set_tag("mltrack.algorithm", "logisticregression")
    
    print(f"  ✅ Logistic Regression: accuracy={accuracy:.3f}")

# Regression Examples
print("\n📈 Regression Models:")

# Gradient Boosting Regressor
with mlflow.start_run(run_name="GradientBoosting-Regression"):
    X, y = make_regression(n_samples=1000, n_features=10, noise=0.1, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
    model.fit(X_train, y_train)
    
    mse = mean_squared_error(y_test, model.predict(X_test))
    rmse = np.sqrt(mse)
    mlflow.log_metric("rmse", rmse)
    mlflow.log_metric("mse", mse)
    mlflow.log_metric("mae", 45.2)
    mlflow.log_metric("r2", 0.89)
    
    mlflow.set_tag("mltrack.category", "ml")
    mlflow.set_tag("mltrack.framework", "sklearn")
    mlflow.set_tag("mltrack.task", "regression")
    mlflow.set_tag("mltrack.algorithm", "gradientboostingregressor")
    
    print(f"  ✅ Gradient Boosting: rmse={rmse:.3f}")

# Clustering Example
print("\n🔮 Clustering Models:")

with mlflow.start_run(run_name="KMeans-Clustering"):
    X, _ = make_blobs(n_samples=500, n_features=4, centers=3, random_state=42)
    
    model = KMeans(n_clusters=3, random_state=42)
    labels = model.fit_predict(X)
    
    score = silhouette_score(X, labels)
    mlflow.log_metric("silhouette_score", score)
    mlflow.log_metric("n_clusters", 3)
    mlflow.log_metric("inertia", model.inertia_)
    
    mlflow.set_tag("mltrack.category", "ml")
    mlflow.set_tag("mltrack.framework", "sklearn")
    mlflow.set_tag("mltrack.task", "clustering")
    mlflow.set_tag("mltrack.algorithm", "kmeans")
    
    print(f"  ✅ KMeans: silhouette_score={score:.3f}")

# Set up LLM experiment
mlflow.set_experiment("llm-showcase")

# LLM Examples
print("\n💬 LLM Models:")

# GPT-4
with mlflow.start_run(run_name="GPT4-TextGeneration"):
    mlflow.log_param("llm.model", "gpt-4")
    mlflow.log_param("llm.provider", "openai")
    mlflow.log_param("llm.temperature", 0.7)
    mlflow.log_param("llm.max_tokens", 2000)
    
    mlflow.log_metric("llm.tokens.prompt_tokens", 1523)
    mlflow.log_metric("llm.tokens.completion_tokens", 687)
    mlflow.log_metric("llm.tokens.total_tokens", 2210)
    mlflow.log_metric("llm.cost_usd", 0.0663)
    mlflow.log_metric("llm.latency_ms", 3421)
    
    mlflow.set_tag("mltrack.category", "llm")
    mlflow.set_tag("mltrack.framework", "openai")
    mlflow.set_tag("mltrack.task", "generation")
    mlflow.set_tag("mltrack.algorithm", "gpt-4")
    mlflow.set_tag("mltrack.type", "llm")  # backward compatibility
    
    print(f"  ✅ GPT-4: cost=$0.0663, tokens=2210")

# Claude
with mlflow.start_run(run_name="Claude-Analysis"):
    mlflow.log_param("llm.model", "claude-3-opus")
    mlflow.log_param("llm.provider", "anthropic")
    mlflow.log_param("llm.temperature", 0.5)
    mlflow.log_param("llm.max_tokens", 4000)
    
    mlflow.log_metric("llm.tokens.prompt_tokens", 2856)
    mlflow.log_metric("llm.tokens.completion_tokens", 1234)
    mlflow.log_metric("llm.tokens.total_tokens", 4090)
    mlflow.log_metric("llm.cost_usd", 0.1023)
    mlflow.log_metric("llm.latency_ms", 4567)
    
    mlflow.set_tag("mltrack.category", "llm")
    mlflow.set_tag("mltrack.framework", "anthropic")
    mlflow.set_tag("mltrack.task", "generation")
    mlflow.set_tag("mltrack.algorithm", "claude-3-opus")
    mlflow.set_tag("mltrack.type", "llm")
    
    print(f"  ✅ Claude-3-Opus: cost=$0.1023, tokens=4090")

# Mixed experiment
mlflow.set_experiment("mixed-ml-llm")

print("\n🎯 Mixed ML/LLM Workflow:")

# ML model
with mlflow.start_run(run_name="FeatureExtraction-ML"):
    X, y = make_classification(n_samples=500, n_features=30, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train, y_train)
    
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    
    mlflow.set_tag("mltrack.category", "ml")
    mlflow.set_tag("mltrack.framework", "sklearn")
    mlflow.set_tag("mltrack.task", "classification")
    mlflow.set_tag("mltrack.algorithm", "randomforestclassifier")
    
    print(f"  ✅ Feature Extraction (RF): accuracy={accuracy:.3f}")

# LLM analysis
with mlflow.start_run(run_name="ResultInterpretation-LLM"):
    mlflow.log_param("llm.model", "gpt-4")
    mlflow.log_param("llm.provider", "openai")
    
    mlflow.log_metric("llm.tokens.total_tokens", 1250)
    mlflow.log_metric("llm.cost_usd", 0.0375)
    
    mlflow.set_tag("mltrack.category", "llm")
    mlflow.set_tag("mltrack.framework", "openai")
    mlflow.set_tag("mltrack.task", "generation")
    mlflow.set_tag("mltrack.algorithm", "gpt-4")
    mlflow.set_tag("mltrack.type", "llm")
    
    print(f"  ✅ Result Interpretation (GPT-4): cost=$0.0375")

print("\n✨ All showcase runs created!")
print("\n🌐 Visit http://localhost:3003 to see:")
print("   1. Experiments table with ML/LLM type badges")
print("   2. Models column showing algorithms used")
print("   3. Runs table with Type and Model columns")
print("   4. Filter button for advanced filtering")
print("\n📊 Created experiments:")
print("   - ml-showcase (ML only)")
print("   - llm-showcase (LLM only)")
print("   - mixed-ml-llm (Both types)")