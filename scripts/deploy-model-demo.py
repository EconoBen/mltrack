#!/usr/bin/env python3
"""
Deploy trained model as REST API endpoint
Simulates deployment to Modal/AWS but runs locally for demo
"""

import os
import sys
import json
import time
import subprocess
import mlflow
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import pandas as pd
from typing import List, Dict, Any
import asyncio
import signal

# Configuration
MLFLOW_TRACKING_URI = "http://localhost:5001"
API_PORT = 8000
MODEL_NAME = "wine_quality_classifier"

class PredictionRequest(BaseModel):
    """Request model for predictions"""
    features: List[List[float]]
    return_proba: bool = False

class PredictionResponse(BaseModel):
    """Response model for predictions"""
    predictions: List[int]
    probabilities: List[List[float]] = None
    model_version: str
    inference_time_ms: float

class ModelServer:
    """Model serving class"""
    def __init__(self, model_name: str, version: str = "latest"):
        self.model_name = model_name
        self.version = version
        self.model = None
        self.model_info = None
        self.load_model()
    
    def load_model(self):
        """Load model from MLflow"""
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        client = mlflow.tracking.MlflowClient()
        
        # Get latest version
        if self.version == "latest":
            versions = client.search_model_versions(f"name='{self.model_name}'")
            if not versions:
                raise ValueError(f"No versions found for model {self.model_name}")
            latest_version = max(versions, key=lambda x: int(x.version))
            self.version = latest_version.version
        
        # Load model
        model_uri = f"models:/{self.model_name}/{self.version}"
        self.model = mlflow.sklearn.load_model(model_uri)
        
        # Get model info
        self.model_info = {
            "name": self.model_name,
            "version": self.version,
            "uri": model_uri,
            "loaded_at": datetime.now().isoformat()
        }
        
        print(f"✓ Loaded model: {self.model_name} v{self.version}")
    
    def predict(self, features: List[List[float]], return_proba: bool = False):
        """Make predictions"""
        start_time = time.time()
        
        # Convert to numpy array
        X = np.array(features)
        
        # Make predictions
        predictions = self.model.predict(X).tolist()
        
        probabilities = None
        if return_proba and hasattr(self.model, 'predict_proba'):
            probabilities = self.model.predict_proba(X).tolist()
        
        inference_time = (time.time() - start_time) * 1000  # ms
        
        return {
            "predictions": predictions,
            "probabilities": probabilities,
            "model_version": self.version,
            "inference_time_ms": round(inference_time, 2)
        }

# Create FastAPI app
app = FastAPI(
    title="MLTrack Model API",
    description="REST API for ML model inference",
    version="1.0.0"
)

# Global model server instance
model_server = None

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    global model_server
    try:
        model_server = ModelServer(MODEL_NAME)
    except Exception as e:
        print(f"Error loading model: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "MLTrack Model API",
        "model": MODEL_NAME,
        "version": model_server.version if model_server else "not loaded",
        "status": "healthy" if model_server else "error",
        "endpoints": {
            "health": "/health",
            "predict": f"/v1/models/{MODEL_NAME}/predict",
            "model_info": f"/v1/models/{MODEL_NAME}/info"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if model_server else "unhealthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get(f"/v1/models/{MODEL_NAME}/info")
async def model_info():
    """Get model information"""
    if not model_server:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_name": model_server.model_name,
        "model_version": model_server.version,
        "model_info": model_server.model_info,
        "input_schema": {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": "number"},
                "minItems": 13,
                "maxItems": 13
            }
        },
        "output_schema": {
            "predictions": {
                "type": "array",
                "items": {"type": "integer"}
            },
            "probabilities": {
                "type": "array",
                "items": {
                    "type": "array",
                    "items": {"type": "number"}
                }
            }
        }
    }

@app.post(f"/v1/models/{MODEL_NAME}/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions"""
    if not model_server:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        result = model_server.predict(request.features, request.return_proba)
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def update_deployment_status(status: str, endpoint: str = None):
    """Update deployment status in records"""
    if os.path.exists("deployments.json"):
        with open("deployments.json", "r") as f:
            deployments = json.load(f)
        
        # Update latest deployment
        if deployments:
            deployments[-1]["status"] = status
            deployments[-1]["updated_at"] = datetime.now().isoformat()
            if endpoint:
                deployments[-1]["endpoint"] = endpoint
            
            with open("deployments.json", "w") as f:
                json.dump(deployments, f, indent=2)

def create_deployment_info():
    """Create deployment info file"""
    deployment_info = {
        "model_name": MODEL_NAME,
        "api_port": API_PORT,
        "base_url": f"http://localhost:{API_PORT}",
        "endpoints": {
            "health": f"http://localhost:{API_PORT}/health",
            "predict": f"http://localhost:{API_PORT}/v1/models/{MODEL_NAME}/predict",
            "info": f"http://localhost:{API_PORT}/v1/models/{MODEL_NAME}/info",
            "docs": f"http://localhost:{API_PORT}/docs"
        },
        "example_request": {
            "features": [[7.4, 0.7, 0.0, 1.9, 0.076, 11.0, 34.0, 0.9978, 3.51, 0.56, 9.4, 5.0, 0.0]],
            "return_proba": True
        },
        "deployed_at": datetime.now().isoformat()
    }
    
    with open("deployment_info.json", "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    return deployment_info

def main():
    print("🚀 MLTrack Model Deployment")
    print("===========================\n")
    
    # Check if model exists
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    client = mlflow.tracking.MlflowClient()
    
    try:
        versions = client.search_model_versions(f"name='{MODEL_NAME}'")
        if not versions:
            print(f"❌ Model '{MODEL_NAME}' not found!")
            print("Please run train-model-demo.py first.")
            return
    except Exception as e:
        print(f"❌ Error connecting to MLflow: {e}")
        return
    
    # Update deployment status
    update_deployment_status("deploying")
    
    # Create deployment info
    deployment_info = create_deployment_info()
    
    print(f"📦 Deploying model: {MODEL_NAME}")
    print(f"🌐 API Port: {API_PORT}")
    print(f"📍 Base URL: http://localhost:{API_PORT}")
    print("\n" + "="*50)
    
    # Start server
    print("\n🚀 Starting API server...")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server\n")
    
    # Update deployment status
    update_deployment_status("active", f"http://localhost:{API_PORT}")
    
    try:
        # Run the server
        uvicorn.run(app, host="0.0.0.0", port=API_PORT, log_level="info")
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping server...")
        update_deployment_status("stopped")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        update_deployment_status("failed")

if __name__ == "__main__":
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        print("\n\nShutting down gracefully...")
        update_deployment_status("stopped")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    main()