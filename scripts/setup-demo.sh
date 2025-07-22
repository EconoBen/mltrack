#!/bin/bash

# Setup demo data for MLTrack LinkedIn presentation

echo "🚀 MLTrack Demo Setup"
echo "===================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if MLflow is running
check_mlflow() {
    if curl -s http://localhost:5001 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $service to start"
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}Error: Please run this script from the mltrack/ui directory${NC}"
    exit 1
fi

# Step 1: Check if MLflow is running
echo -e "\n${YELLOW}Step 1: Checking MLflow server...${NC}"
if check_mlflow; then
    echo -e "${GREEN}✓ MLflow is already running${NC}"
else
    echo "MLflow is not running. Starting it now..."
    # Start MLflow in background
    cd ..
    nohup mlflow server --host 0.0.0.0 --port 5001 > mlflow.log 2>&1 &
    cd ui
    
    # Wait for MLflow to start
    if wait_for_service "MLflow" "http://localhost:5001"; then
        echo -e "${GREEN}✓ MLflow server started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start MLflow server${NC}"
        echo "Please check mlflow.log for errors"
        exit 1
    fi
fi

# Step 2: Check if Next.js app is running
echo -e "\n${YELLOW}Step 2: Checking Next.js app...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Next.js app is already running${NC}"
else
    echo -e "${YELLOW}! Next.js app is not running${NC}"
    echo "You can start it with: npm run dev"
fi

# Step 3: Install Python dependencies if needed
echo -e "\n${YELLOW}Step 3: Checking Python dependencies...${NC}"
if python3 -c "import mlflow" 2>/dev/null; then
    echo -e "${GREEN}✓ MLflow Python package is installed${NC}"
else
    echo "Installing MLflow Python package..."
    pip install mlflow
fi

# Step 4: Generate demo data
echo -e "\n${YELLOW}Step 4: Generating demo data...${NC}"
echo "This will create:"
echo "  • 5 demo users (Sarah Chen, Alex Kumar, Maria Garcia, James Wilson, Lisa Zhang)"
echo "  • Multiple experiments per user"
echo "  • Mix of ML and LLM experiments"
echo "  • Realistic metrics and parameters"
echo "  • Deployment records"
echo ""

read -p "Do you want to proceed? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    python3 ../scripts/generate-demo-data.py
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Demo data generated successfully!${NC}"
        
        echo -e "\n${YELLOW}📋 Demo Checklist:${NC}"
        echo "1. MLflow server: http://localhost:5001"
        echo "2. MLTrack UI: http://localhost:3000"
        echo "3. Sign in page: http://localhost:3000/auth/signin"
        echo ""
        echo -e "${YELLOW}🎥 Demo Script:${NC}"
        echo "1. Show professional sign-in page"
        echo "2. Navigate to experiments - show multiple users"
        echo "3. Click on an experiment - show user avatars in runs"
        echo "4. Navigate to Deployments tab"
        echo "5. Show Reports and Analytics"
        echo "6. Open Profile page - show API key management"
        echo "7. Open Settings - show all professional tabs"
        echo ""
        echo -e "${GREEN}Ready for your LinkedIn demo! 🚀${NC}"
    else
        echo -e "${RED}✗ Failed to generate demo data${NC}"
        exit 1
    fi
else
    echo "Demo setup cancelled"
fi