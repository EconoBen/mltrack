#!/usr/bin/env python
"""Quick demo to generate runs with new model type tags for UI testing."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import mlflow

from mltrack import track, track_llm

# Generate some data
X, y = make_classification(n_samples=200, n_features=20, n_informative=15, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Set up MLflow
mlflow.set_tracking_uri("mlruns")
mlflow.set_experiment("ui-demo-experiment")

print("🚀 Generating demo runs for UI...")

# ML Run 1: Random Forest
@track(name="random-forest-demo")
def train_random_forest():
    print("Training Random Forest...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", 0.89)
    mlflow.log_metric("precision", 0.91)
    mlflow.log_metric("recall", 0.87)
    print(f"✅ Random Forest trained - Accuracy: {accuracy:.3f}")
    return model

# ML Run 2: Logistic Regression
@track(name="logistic-regression-demo")
def train_logistic_regression():
    print("Training Logistic Regression...")
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", 0.85)
    mlflow.log_metric("precision", 0.88)
    mlflow.log_metric("recall", 0.82)
    print(f"✅ Logistic Regression trained - Accuracy: {accuracy:.3f}")
    return model

# LLM Run 1: GPT-4
@track_llm(name="gpt4-analysis")
def analyze_with_gpt4():
    print("Simulating GPT-4 analysis...")
    mlflow.log_param("llm.model", "gpt-4")
    mlflow.log_param("llm.temperature", 0.7)
    mlflow.log_param("llm.max_tokens", 1000)
    mlflow.log_metric("llm.tokens.prompt_tokens", 523)
    mlflow.log_metric("llm.tokens.completion_tokens", 287)
    mlflow.log_metric("llm.tokens.total_tokens", 810)
    mlflow.log_metric("llm.cost_usd", 0.0243)
    mlflow.log_metric("llm.latency_ms", 1832)
    print("✅ GPT-4 analysis completed")
    return "Analysis results..."

# LLM Run 2: Claude
@track_llm(name="claude-summary")
def summarize_with_claude():
    print("Simulating Claude summary...")
    mlflow.log_param("llm.model", "claude-3-opus")
    mlflow.log_param("llm.temperature", 0.5)
    mlflow.log_param("llm.max_tokens", 2000)
    mlflow.log_metric("llm.tokens.prompt_tokens", 1205)
    mlflow.log_metric("llm.tokens.completion_tokens", 456)
    mlflow.log_metric("llm.tokens.total_tokens", 1661)
    mlflow.log_metric("llm.cost_usd", 0.0415)
    mlflow.log_metric("llm.latency_ms", 2341)
    print("✅ Claude summary completed")
    return "Summary results..."

# Run all demos
if __name__ == "__main__":
    train_random_forest()
    train_logistic_regression()
    analyze_with_gpt4()
    summarize_with_claude()
    
    print("\n✨ Demo runs created!")
    print("🌐 Visit http://localhost:3003 to see the UI with new model type information")
    print("📊 Look for:")
    print("   - Type badges (ML/LLM) in experiments table")
    print("   - Model badges (randomforestclassifier, logisticregression) in runs table")
    print("   - Framework and task information in the runs table")