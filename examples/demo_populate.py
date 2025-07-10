"""Populate mltrack with realistic demo data for showcasing features."""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
import time

# Add mltrack to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from mltrack import track, track_llm_context, ModelRegistry
from sklearn.datasets import make_classification, make_regression, load_digits
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score
import mlflow


def set_random_date():
    """Set a random date in the past for demo purposes."""
    days_ago = random.randint(1, 30)
    hours_ago = random.randint(0, 23)
    past_date = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
    # MLflow doesn't have a direct way to set run date, so we'll simulate with tags
    return past_date.isoformat()


@track(name="customer-churn-rf", tags={"team": "data-science", "project": "retention"})
def train_customer_churn_model():
    """Train a customer churn prediction model."""
    print("🎯 Training Customer Churn Model (Random Forest)")
    
    # Generate synthetic customer data
    X, y = make_classification(
        n_samples=5000,
        n_features=25,
        n_informative=15,
        n_redundant=5,
        n_classes=2,
        weights=[0.7, 0.3],  # 30% churn rate
        random_state=42
    )
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Hyperparameter tuning
    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [10, 20, None],
        'min_samples_split': [2, 5]
    }
    
    rf = RandomForestClassifier(random_state=42)
    grid_search = GridSearchCV(rf, param_grid, cv=3, scoring='f1', n_jobs=-1)
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    
    # Evaluate
    y_pred = best_model.predict(X_test)
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1_score': f1_score(y_test, y_pred),
        'auc_roc': 0.85 + random.random() * 0.1,  # Simulated
        'churn_rate_predicted': y_pred.mean(),
        'churn_rate_actual': y_test.mean()
    }
    
    # Log metrics
    for name, value in metrics.items():
        mlflow.log_metric(name, value)
    
    # Log parameters
    mlflow.log_params(best_model.get_params())
    
    # Log model
    mlflow.sklearn.log_model(best_model, "model")
    
    # Log additional artifacts
    mlflow.log_dict({"feature_importance": dict(enumerate(best_model.feature_importances_))}, "feature_importance.json")
    mlflow.set_tag("model_type", "customer_churn")
    mlflow.set_tag("created_date", set_random_date())
    
    print(f"✅ Model trained - F1 Score: {metrics['f1_score']:.3f}")
    return best_model, metrics


@track(name="revenue-forecast-gbm", tags={"team": "finance", "project": "forecasting"})
def train_revenue_forecast_model():
    """Train a revenue forecasting model."""
    print("📈 Training Revenue Forecast Model (Gradient Boosting)")
    
    # Generate synthetic time series data
    n_samples = 1000
    X = np.random.randn(n_samples, 20)  # 20 features
    # Create target with trend and seasonality
    trend = np.linspace(100, 200, n_samples)
    seasonality = 20 * np.sin(np.linspace(0, 4*np.pi, n_samples))
    noise = 10 * np.random.randn(n_samples)
    y = trend + seasonality + noise + X[:, 0] * 15 + X[:, 1] * 10
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    metrics = {
        'mse': mean_squared_error(y_test, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
        'mae': np.mean(np.abs(y_test - y_pred)),
        'r2_score': r2_score(y_test, y_pred),
        'mape': np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    }
    
    # Log everything
    for name, value in metrics.items():
        mlflow.log_metric(name, value)
    
    mlflow.log_params(model.get_params())
    mlflow.sklearn.log_model(model, "model")
    mlflow.set_tag("model_type", "revenue_forecast")
    mlflow.set_tag("created_date", set_random_date())
    
    print(f"✅ Model trained - R² Score: {metrics['r2_score']:.3f}")
    return model, metrics


@track(name="fraud-detection-ensemble", tags={"team": "security", "project": "fraud"})
def train_fraud_detection_model():
    """Train a fraud detection model."""
    print("🔒 Training Fraud Detection Model (Ensemble)")
    
    # Generate imbalanced fraud data
    X, y = make_classification(
        n_samples=10000,
        n_features=30,
        n_informative=20,
        n_redundant=5,
        n_classes=2,
        weights=[0.98, 0.02],  # 2% fraud rate
        random_state=42
    )
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # Try multiple models
    models = {
        'logistic': LogisticRegression(class_weight='balanced', random_state=42),
        'random_forest': RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42),
        'svm': SVC(class_weight='balanced', probability=True, random_state=42)
    }
    
    best_score = 0
    best_model = None
    best_name = None
    
    for name, model in models.items():
        with mlflow.start_run(nested=True, run_name=f"fraud_{name}"):
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            
            # Focus on recall for fraud detection
            recall = recall_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred)
            
            mlflow.log_metric("recall", recall)
            mlflow.log_metric("precision", precision)
            mlflow.log_metric("f1_score", f1)
            mlflow.log_metric("fraud_caught", y_pred.sum())
            mlflow.log_metric("false_positives", ((y_pred == 1) & (y_test == 0)).sum())
            
            if f1 > best_score:
                best_score = f1
                best_model = model
                best_name = name
    
    # Log best model
    mlflow.sklearn.log_model(best_model, "model")
    mlflow.log_metric("best_f1_score", best_score)
    mlflow.set_tag("best_model", best_name)
    mlflow.set_tag("model_type", "fraud_detection")
    mlflow.set_tag("created_date", set_random_date())
    
    print(f"✅ Best model: {best_name} - F1 Score: {best_score:.3f}")
    return best_model, {"best_model": best_name, "f1_score": best_score}


@track_llm_context(name="customer-support-chatbot", model="gpt-4", provider="openai")
def simulate_llm_customer_support():
    """Simulate customer support chatbot interactions."""
    print("💬 Simulating Customer Support Chatbot")
    
    conversations = [
        ("How do I reset my password?", "To reset your password, please visit..."),
        ("My order hasn't arrived yet", "I apologize for the delay. Let me check..."),
        ("Can I change my subscription plan?", "Yes, you can change your plan by..."),
        ("I need a refund", "I understand your concern. Our refund policy..."),
        ("Technical issue with the app", "I'm sorry you're experiencing issues...")
    ]
    
    total_tokens = 0
    total_cost = 0
    
    for i, (prompt, response) in enumerate(conversations):
        # Simulate token usage
        prompt_tokens = len(prompt.split()) * 1.3  # Rough token estimate
        completion_tokens = len(response.split()) * 1.3
        
        mlflow.log_metric(f"turn_{i}_prompt_tokens", prompt_tokens)
        mlflow.log_metric(f"turn_{i}_completion_tokens", completion_tokens)
        
        total_tokens += prompt_tokens + completion_tokens
        
        # Simulate cost (GPT-4 pricing)
        cost = (prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000
        total_cost += cost
        
        # Simulate response time
        response_time = 0.5 + random.random() * 1.5
        mlflow.log_metric(f"turn_{i}_response_time", response_time)
        
        time.sleep(0.1)  # Small delay for realism
    
    # Log aggregate metrics
    mlflow.log_metric("total_turns", len(conversations))
    mlflow.log_metric("total_tokens", total_tokens)
    mlflow.log_metric("total_cost", total_cost)
    mlflow.log_metric("avg_response_time", 1.2)
    mlflow.log_metric("customer_satisfaction", 0.85 + random.random() * 0.1)
    
    mlflow.set_tag("chatbot_version", "v2.1.0")
    mlflow.set_tag("deployment", "production")
    mlflow.set_tag("created_date", set_random_date())
    
    print(f"✅ Simulated {len(conversations)} conversations - Total cost: ${total_cost:.2f}")
    return {"conversations": len(conversations), "total_cost": total_cost}


@track_llm_context(name="code-review-assistant", model="claude-3-opus", provider="anthropic")
def simulate_code_review_llm():
    """Simulate AI code review assistant."""
    print("🔍 Simulating Code Review Assistant")
    
    reviews = [
        {"files": 5, "issues": 3, "suggestions": 7},
        {"files": 12, "issues": 8, "suggestions": 15},
        {"files": 3, "issues": 1, "suggestions": 4},
        {"files": 8, "issues": 5, "suggestions": 12},
    ]
    
    total_tokens = 0
    total_issues = 0
    
    for i, review in enumerate(reviews):
        # Simulate token usage based on file complexity
        tokens = review["files"] * 500 + review["issues"] * 200
        total_tokens += tokens
        total_issues += review["issues"]
        
        mlflow.log_metric(f"review_{i}_files", review["files"])
        mlflow.log_metric(f"review_{i}_issues", review["issues"])
        mlflow.log_metric(f"review_{i}_suggestions", review["suggestions"])
        mlflow.log_metric(f"review_{i}_tokens", tokens)
        
        # Simulate cost (Claude pricing)
        cost = tokens * 0.015 / 1000
        mlflow.log_metric(f"review_{i}_cost", cost)
    
    # Aggregate metrics
    mlflow.log_metric("total_reviews", len(reviews))
    mlflow.log_metric("total_files_reviewed", sum(r["files"] for r in reviews))
    mlflow.log_metric("total_issues_found", total_issues)
    mlflow.log_metric("total_tokens", total_tokens)
    mlflow.log_metric("avg_issues_per_file", total_issues / sum(r["files"] for r in reviews))
    
    mlflow.set_tag("model_version", "claude-3-opus-20240229")
    mlflow.set_tag("integration", "github")
    mlflow.set_tag("created_date", set_random_date())
    
    print(f"✅ Reviewed {sum(r['files'] for r in reviews)} files - Found {total_issues} issues")
    return {"total_files": sum(r["files"] for r in reviews), "total_issues": total_issues}


def register_best_models():
    """Register the best models to the model registry."""
    print("\n📦 Registering Models to Registry")
    
    # Get recent runs
    import mlflow.tracking
    client = mlflow.tracking.MlflowClient()
    
    # Find experiments
    experiments = client.search_experiments()
    
    registry = ModelRegistry()
    
    # Register models from different experiments
    model_configs = [
        {
            "name": "customer-churn-predictor",
            "metric": "f1_score",
            "threshold": 0.7,
            "stage": "production",
            "description": "Random Forest model for predicting customer churn with 85% accuracy"
        },
        {
            "name": "revenue-forecast-model",
            "metric": "r2_score",
            "threshold": 0.8,
            "stage": "staging",
            "description": "Gradient Boosting model for quarterly revenue forecasting"
        },
        {
            "name": "fraud-detection-ensemble",
            "metric": "recall",
            "threshold": 0.85,
            "stage": "production",
            "description": "Ensemble model optimized for high recall in fraud detection"
        }
    ]
    
    for config in model_configs:
        # Find best run for this model type
        for exp in experiments:
            if config["name"].replace("-", "_") in exp.name:
                runs = client.search_runs(
                    experiment_ids=[exp.experiment_id],
                    order_by=[f"metrics.{config['metric']} DESC"],
                    max_results=1
                )
                
                if runs:
                    run = runs[0]
                    if run.data.metrics.get(config["metric"], 0) >= config["threshold"]:
                        try:
                            model_info = registry.register_model(
                                run_id=run.info.run_id,
                                model_name=config["name"],
                                model_path="model",
                                stage=config["stage"],
                                description=config["description"]
                            )
                            print(f"✅ Registered {config['name']} (version: {model_info['version']})")
                        except Exception as e:
                            print(f"⚠️  Could not register {config['name']}: {e}")


def main():
    """Run all demo data generation."""
    print("🎯 MLtrack Demo Data Generator")
    print("=" * 50)
    
    # Set MLflow tracking URI
    mlflow.set_tracking_uri("mlruns")
    
    # Create experiments
    experiments = [
        ("customer-retention", "Customer churn prediction models"),
        ("revenue-forecasting", "Revenue and sales forecasting models"),
        ("fraud-detection", "Fraud detection and anomaly detection"),
        ("llm-customer-support", "LLM-powered customer support"),
        ("llm-code-review", "AI code review assistant")
    ]
    
    for exp_name, description in experiments:
        try:
            exp_id = mlflow.create_experiment(exp_name, tags={"description": description})
        except:
            exp_id = mlflow.get_experiment_by_name(exp_name).experiment_id
    
    # Run traditional ML experiments
    mlflow.set_experiment("customer-retention")
    for i in range(3):
        print(f"\nRun {i+1}/3 - Customer Churn")
        train_customer_churn_model()
        time.sleep(0.5)
    
    mlflow.set_experiment("revenue-forecasting")
    for i in range(2):
        print(f"\nRun {i+1}/2 - Revenue Forecast")
        train_revenue_forecast_model()
        time.sleep(0.5)
    
    mlflow.set_experiment("fraud-detection")
    for i in range(2):
        print(f"\nRun {i+1}/2 - Fraud Detection")
        train_fraud_detection_model()
        time.sleep(0.5)
    
    # Run LLM experiments
    mlflow.set_experiment("llm-customer-support")
    for i in range(4):
        print(f"\nRun {i+1}/4 - Customer Support Chatbot")
        simulate_llm_customer_support()
        time.sleep(0.5)
    
    mlflow.set_experiment("llm-code-review")
    for i in range(3):
        print(f"\nRun {i+1}/3 - Code Review Assistant")
        simulate_code_review_llm()
        time.sleep(0.5)
    
    # Register best models
    print("\n" + "=" * 50)
    register_best_models()
    
    print("\n✅ Demo data generation complete!")
    print("\n🚀 To view the results:")
    print("   1. Traditional UI: mltrack ui")
    print("   2. Modern UI: mltrack ui --modern")
    print("   3. List models: mltrack models list")
    print("\n📊 Generated:")
    print("   - 5 experiments")
    print("   - 14 runs total")
    print("   - 3 registered models")
    print("   - Mix of ML and LLM workloads")


if __name__ == "__main__":
    main()