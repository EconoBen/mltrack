#!/bin/bash

# Script to clear all MLflow data and start fresh

echo "🧹 Clearing MLflow Data"
echo "====================="

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will delete all MLflow experiments, runs, and models!${NC}"
read -p "Are you sure you want to continue? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Find MLflow directory
MLFLOW_DIR="${MLRUNS_DIR:-./mlruns}"
MLFLOW_BACKEND_STORE="${MLFLOW_BACKEND_STORE_URI:-./mlflow.db}"

echo "Clearing MLflow data..."

# Stop MLflow server if running
if pgrep -f "mlflow server" > /dev/null; then
    echo "Stopping MLflow server..."
    pkill -f "mlflow server"
    sleep 2
fi

# Clear MLflow data
if [ -d "$MLFLOW_DIR" ]; then
    echo "Removing $MLFLOW_DIR..."
    rm -rf "$MLFLOW_DIR"
    echo -e "${GREEN}✓ Removed MLflow runs directory${NC}"
fi

if [ -f "$MLFLOW_BACKEND_STORE" ]; then
    echo "Removing $MLFLOW_BACKEND_STORE..."
    rm -f "$MLFLOW_BACKEND_STORE"
    echo -e "${GREEN}✓ Removed MLflow database${NC}"
fi

# Clear any model registry
if [ -d "./models" ]; then
    echo "Removing ./models..."
    rm -rf "./models"
    echo -e "${GREEN}✓ Removed models directory${NC}"
fi

# Clear deployment records
if [ -f "./demo_deployments.json" ]; then
    rm -f "./demo_deployments.json"
    echo -e "${GREEN}✓ Removed deployment records${NC}"
fi

echo -e "\n${GREEN}✅ MLflow data cleared successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Start MLflow server: mlflow server --host 0.0.0.0 --port 5001"
echo "2. Run the model training script: python train-model-demo.py"