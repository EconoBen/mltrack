#!/bin/bash

# Cleanup script for MLTrack demo

echo "🧹 MLTrack Demo Cleanup"
echo "======================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for saved PIDs
if [ -f ".demo_mlflow_pid" ]; then
    MLFLOW_PID=$(cat .demo_mlflow_pid)
    if kill -0 $MLFLOW_PID 2>/dev/null; then
        echo "Stopping MLflow server (PID: $MLFLOW_PID)..."
        kill $MLFLOW_PID
        echo -e "${GREEN}✓ MLflow server stopped${NC}"
    else
        echo -e "${YELLOW}MLflow server not running${NC}"
    fi
    rm .demo_mlflow_pid
else
    # Try to find MLflow process
    if pgrep -f "mlflow server" > /dev/null; then
        echo "Stopping MLflow server..."
        pkill -f "mlflow server"
        echo -e "${GREEN}✓ MLflow server stopped${NC}"
    fi
fi

if [ -f ".demo_nextjs_pid" ]; then
    NEXTJS_PID=$(cat .demo_nextjs_pid)
    if kill -0 $NEXTJS_PID 2>/dev/null; then
        echo "Stopping Next.js server (PID: $NEXTJS_PID)..."
        kill $NEXTJS_PID
        echo -e "${GREEN}✓ Next.js server stopped${NC}"
    else
        echo -e "${YELLOW}Next.js server not running${NC}"
    fi
    rm .demo_nextjs_pid
else
    # Try to find Next.js process on port 3000
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "Stopping Next.js server..."
        kill -9 $(lsof -ti:3000) 2>/dev/null
        echo -e "${GREEN}✓ Next.js server stopped${NC}"
    fi
fi

# Clean up log files
if [ -f "mlflow.log" ]; then
    rm mlflow.log
    echo -e "${GREEN}✓ Removed mlflow.log${NC}"
fi

if [ -f "nextjs.log" ]; then
    rm nextjs.log
    echo -e "${GREEN}✓ Removed nextjs.log${NC}"
fi

if [ -f "../demo_deployments.json" ]; then
    echo -e "${YELLOW}Demo deployments file found at ../demo_deployments.json${NC}"
    read -p "Do you want to remove it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm ../demo_deployments.json
        echo -e "${GREEN}✓ Removed demo_deployments.json${NC}"
    fi
fi

echo -e "\n${GREEN}✅ Demo cleanup complete!${NC}"