#!/usr/bin/env python3
"""
Generate demo data for MLTrack with multiple users
This creates experiments and runs with proper user identification
"""

import os
import sys
import random
import time
from datetime import datetime, timedelta
import mlflow
from mlflow.tracking import MlflowClient
import numpy as np

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Demo users with different personas
DEMO_USERS = [
    {
        "id": "user_sarah_chen",
        "name": "Sarah Chen",
        "email": "sarah.chen@techcorp.com",
        "team": "ML Platform",
        "focus": ["computer_vision", "deployment"],
        "avatar": "SC"
    },
    {
        "id": "user_alex_kumar", 
        "name": "Alex Kumar",
        "email": "alex.kumar@techcorp.com",
        "team": "NLP Research",
        "focus": ["llm", "nlp"],
        "avatar": "AK"
    },
    {
        "id": "user_maria_garcia",
        "name": "Maria Garcia",
        "email": "maria.garcia@techcorp.com",
        "team": "Data Science",
        "focus": ["tabular", "time_series"],
        "avatar": "MG"
    },
    {
        "id": "user_james_wilson",
        "name": "James Wilson",
        "email": "james.wilson@techcorp.com",
        "team": "ML Infrastructure",
        "focus": ["optimization", "deployment"],
        "avatar": "JW"
    },
    {
        "id": "user_lisa_zhang",
        "name": "Lisa Zhang",
        "email": "lisa.zhang@techcorp.com",
        "team": "AI Research",
        "focus": ["llm", "computer_vision"],
        "avatar": "LZ"
    }
]

# ML Models configuration
ML_MODELS = {
    "computer_vision": [
        {"algorithm": "ResNet50", "framework": "PyTorch", "task": "image-classification"},
        {"algorithm": "YOLOv8", "framework": "PyTorch", "task": "object-detection"},
        {"algorithm": "EfficientNet", "framework": "TensorFlow", "task": "image-classification"},
        {"algorithm": "U-Net", "framework": "PyTorch", "task": "segmentation"}
    ],
    "tabular": [
        {"algorithm": "XGBoost", "framework": "XGBoost", "task": "classification"},
        {"algorithm": "RandomForest", "framework": "scikit-learn", "task": "regression"},
        {"algorithm": "LightGBM", "framework": "LightGBM", "task": "classification"},
        {"algorithm": "CatBoost", "framework": "CatBoost", "task": "regression"}
    ],
    "nlp": [
        {"algorithm": "BERT", "framework": "Transformers", "task": "text-classification"},
        {"algorithm": "RoBERTa", "framework": "Transformers", "task": "sentiment-analysis"},
        {"algorithm": "T5", "framework": "Transformers", "task": "summarization"}
    ],
    "time_series": [
        {"algorithm": "LSTM", "framework": "TensorFlow", "task": "forecasting"},
        {"algorithm": "Prophet", "framework": "Prophet", "task": "forecasting"},
        {"algorithm": "ARIMA", "framework": "statsmodels", "task": "forecasting"}
    ]
}

# LLM Models configuration
LLM_MODELS = [
    {"model": "gpt-4", "provider": "openai", "task": "chat"},
    {"model": "claude-3-opus", "provider": "anthropic", "task": "chat"},
    {"model": "llama-3-70b", "provider": "replicate", "task": "chat"},
    {"model": "mixtral-8x7b", "provider": "groq", "task": "chat"},
    {"model": "gemini-pro", "provider": "google", "task": "chat"}
]

def set_user_context(user):
    """Set user context for tracking"""
    mlflow.set_tags({
        "mltrack.user.id": user["id"],
        "mltrack.user.name": user["name"],
        "mltrack.user.email": user["email"],
        "mltrack.user.team": user["team"],
        "mlflow.user": user["email"],  # For compatibility
        "mlflow.userName": user["name"]
    })

def generate_ml_metrics(model_type, algorithm):
    """Generate realistic ML metrics based on model type"""
    base_metrics = {}
    
    if model_type == "computer_vision":
        base_metrics = {
            "accuracy": random.uniform(0.85, 0.98),
            "loss": random.uniform(0.05, 0.25),
            "val_accuracy": random.uniform(0.82, 0.96),
            "val_loss": random.uniform(0.08, 0.30),
            "precision": random.uniform(0.83, 0.97),
            "recall": random.uniform(0.81, 0.96),
            "f1_score": random.uniform(0.82, 0.96)
        }
        if "YOLO" in algorithm:
            base_metrics["mAP"] = random.uniform(0.75, 0.92)
            base_metrics["inference_time_ms"] = random.uniform(15, 45)
    
    elif model_type == "tabular":
        base_metrics = {
            "accuracy": random.uniform(0.78, 0.95),
            "auc_roc": random.uniform(0.82, 0.98),
            "precision": random.uniform(0.76, 0.94),
            "recall": random.uniform(0.74, 0.93),
            "f1_score": random.uniform(0.75, 0.93)
        }
        if "regression" in algorithm.lower() or "boost" in algorithm:
            base_metrics["rmse"] = random.uniform(0.1, 0.5)
            base_metrics["mae"] = random.uniform(0.08, 0.4)
            base_metrics["r2_score"] = random.uniform(0.75, 0.95)
    
    elif model_type == "nlp":
        base_metrics = {
            "accuracy": random.uniform(0.86, 0.96),
            "loss": random.uniform(0.1, 0.4),
            "perplexity": random.uniform(1.5, 4.0),
            "bleu_score": random.uniform(0.3, 0.7)
        }
    
    elif model_type == "time_series":
        base_metrics = {
            "mae": random.uniform(0.05, 0.25),
            "rmse": random.uniform(0.08, 0.35),
            "mape": random.uniform(0.02, 0.15),
            "r2_score": random.uniform(0.7, 0.95)
        }
    
    # Add training metrics
    base_metrics["training_time_seconds"] = random.uniform(60, 3600)
    base_metrics["peak_memory_mb"] = random.uniform(512, 8192)
    
    return base_metrics

def generate_llm_metrics():
    """Generate realistic LLM metrics"""
    return {
        "tokens_per_second": random.uniform(20, 150),
        "total_tokens": random.randint(500, 5000),
        "prompt_tokens": random.randint(100, 1000),
        "completion_tokens": random.randint(400, 4000),
        "latency_ms": random.uniform(100, 2000),
        "cost_usd": random.uniform(0.01, 0.5),
        "temperature": random.choice([0.7, 0.8, 0.9, 1.0]),
        "top_p": random.choice([0.9, 0.95, 1.0])
    }

def create_ml_experiment(user, experiment_name, model_type):
    """Create an ML experiment with multiple runs"""
    print(f"Creating ML experiment '{experiment_name}' for {user['name']}")
    
    # Create or get experiment
    experiment = mlflow.set_experiment(experiment_name)
    
    # Set experiment tags
    client = MlflowClient()
    client.set_experiment_tag(
        experiment.experiment_id,
        "mltrack.type", 
        "ml"
    )
    client.set_experiment_tag(
        experiment.experiment_id,
        "mltrack.owner",
        user["email"]
    )
    
    # Generate 3-8 runs
    num_runs = random.randint(3, 8)
    models = ML_MODELS.get(model_type, ML_MODELS["tabular"])
    
    for i in range(num_runs):
        model_config = random.choice(models)
        
        with mlflow.start_run(run_name=f"run_{i+1}_{model_config['algorithm'].lower()}"):
            # Set user context
            set_user_context(user)
            
            # Set model tags
            mlflow.set_tags({
                "mltrack.run.type": "ml",
                "mltrack.model.algorithm": model_config["algorithm"],
                "mltrack.model.framework": model_config["framework"],
                "mltrack.model.task": model_config["task"],
                "mltrack.run.category": "ml"
            })
            
            # Log parameters
            mlflow.log_params({
                "algorithm": model_config["algorithm"],
                "framework": model_config["framework"],
                "task": model_config["task"],
                "batch_size": random.choice([16, 32, 64, 128]),
                "learning_rate": random.choice([0.001, 0.01, 0.1]),
                "epochs": random.choice([10, 20, 50, 100]),
                "optimizer": random.choice(["adam", "sgd", "rmsprop"]),
                "seed": 42
            })
            
            # Log metrics
            metrics = generate_ml_metrics(model_type, model_config["algorithm"])
            for metric_name, value in metrics.items():
                mlflow.log_metric(metric_name, value)
            
            # Simulate training progress
            if i % 3 == 0:  # Some runs log step metrics
                epochs = random.randint(10, 30)
                for epoch in range(epochs):
                    mlflow.log_metric("loss", random.uniform(0.5, 2.0) * (1 - epoch/epochs), step=epoch)
                    mlflow.log_metric("accuracy", random.uniform(0.5, 0.95) * (epoch/epochs), step=epoch)
            
            # Log artifacts (simulated)
            mlflow.log_text(f"Model config for {model_config['algorithm']}", "model_config.txt")
            
            # Set run status
            if random.random() > 0.1:  # 90% success rate
                mlflow.set_tag("mlflow.runStatus", "FINISHED")
            else:
                mlflow.set_tag("mlflow.runStatus", "FAILED")
            
            time.sleep(0.1)  # Small delay to simulate real runs

def create_llm_experiment(user, experiment_name):
    """Create an LLM experiment with multiple runs"""
    print(f"Creating LLM experiment '{experiment_name}' for {user['name']}")
    
    # Create or get experiment
    experiment = mlflow.set_experiment(experiment_name)
    
    # Set experiment tags
    client = MlflowClient()
    client.set_experiment_tag(
        experiment.experiment_id,
        "mltrack.type", 
        "llm"
    )
    client.set_experiment_tag(
        experiment.experiment_id,
        "mltrack.owner",
        user["email"]
    )
    
    # Generate 5-10 runs
    num_runs = random.randint(5, 10)
    
    for i in range(num_runs):
        model_config = random.choice(LLM_MODELS)
        
        with mlflow.start_run(run_name=f"chat_{i+1}_{model_config['model']}"):
            # Set user context
            set_user_context(user)
            
            # Set LLM tags
            mlflow.set_tags({
                "mltrack.run.type": "llm",
                "mltrack.llm.model": model_config["model"],
                "mltrack.llm.provider": model_config["provider"],
                "mltrack.llm.task": model_config["task"],
                "mltrack.run.category": "llm"
            })
            
            # Log parameters
            mlflow.log_params({
                "model": model_config["model"],
                "provider": model_config["provider"],
                "temperature": random.choice([0.7, 0.8, 0.9, 1.0]),
                "max_tokens": random.choice([1000, 2000, 4000]),
                "top_p": random.choice([0.9, 0.95, 1.0]),
                "presence_penalty": random.choice([0, 0.1, 0.2]),
                "frequency_penalty": random.choice([0, 0.1, 0.2])
            })
            
            # Log metrics
            metrics = generate_llm_metrics()
            for metric_name, value in metrics.items():
                mlflow.log_metric(metric_name, value)
            
            # Log sample prompts and responses
            sample_prompt = f"Test prompt {i+1} for {model_config['model']}"
            sample_response = f"This is a sample response from {model_config['model']}"
            
            mlflow.log_text(sample_prompt, "prompt.txt")
            mlflow.log_text(sample_response, "response.txt")
            
            # Set run status (LLMs rarely fail)
            if random.random() > 0.05:  # 95% success rate
                mlflow.set_tag("mlflow.runStatus", "FINISHED")
            else:
                mlflow.set_tag("mlflow.runStatus", "FAILED")
            
            time.sleep(0.1)

def create_deployment_records():
    """Create deployment records in database"""
    # This would typically write to your database
    # For now, we'll just create a deployments.json file
    import json
    
    deployments = []
    deployment_id = 1
    
    for user in DEMO_USERS[:3]:  # First 3 users have deployments
        for i in range(random.randint(1, 3)):
            deployment = {
                "id": deployment_id,
                "userId": user["id"],
                "userName": user["name"],
                "modelName": f"{user['name'].split()[0].lower()}-model-v{i+1}",
                "provider": random.choice(["modal", "aws", "gcp"]),
                "status": random.choice(["active", "active", "inactive"]),  # More active
                "endpoint": f"https://api.mltrack.io/v1/models/{deployment_id}",
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                "lastUsed": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat()
            }
            deployments.append(deployment)
            deployment_id += 1
    
    with open("demo_deployments.json", "w") as f:
        json.dump(deployments, f, indent=2)
    
    print(f"Created {len(deployments)} deployment records")

def main():
    # Set MLflow tracking URI
    mlflow.set_tracking_uri("http://localhost:5001")
    
    print("Generating demo data for MLTrack...")
    print(f"Creating data for {len(DEMO_USERS)} users")
    
    # Create experiments for each user
    for user in DEMO_USERS:
        print(f"\n--- Generating data for {user['name']} ---")
        
        # Each user creates 2-4 experiments based on their focus
        num_experiments = random.randint(2, 4)
        
        for i in range(num_experiments):
            focus_area = random.choice(user["focus"])
            
            if focus_area == "llm":
                exp_name = f"{user['name'].replace(' ', '_')}_llm_experiment_{i+1}"
                create_llm_experiment(user, exp_name)
            else:
                exp_name = f"{user['name'].replace(' ', '_')}_{focus_area}_experiment_{i+1}"
                create_ml_experiment(user, exp_name, focus_area)
    
    # Create deployment records
    create_deployment_records()
    
    print("\n✅ Demo data generation complete!")
    print("\nSummary:")
    print(f"- {len(DEMO_USERS)} users created")
    print(f"- Multiple experiments per user")
    print(f"- Mix of ML and LLM experiments")
    print(f"- Deployment records created")
    print("\nYou can now demonstrate:")
    print("1. Different users viewing their own experiments")
    print("2. User avatars and identification")
    print("3. Mix of ML and LLM workloads")
    print("4. Deployment status tracking")

if __name__ == "__main__":
    main()