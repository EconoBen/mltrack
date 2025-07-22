#!/bin/bash

# Complete MLTrack Demo: Train → View → Deploy → Inference
# This script demonstrates the full ML workflow

echo "🚀 MLTrack Complete Demo Workflow"
echo "================================="
echo ""
echo "This demo will:"
echo "1. Clear existing MLflow data"
echo "2. Train ML models with tracking"
echo "3. Show models in the UI"
echo "4. Deploy a model as REST API"
echo "5. Test inference endpoint"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check directory
if [ ! -f "../ui/package.json" ]; then
    echo -e "${RED}Error: Please run this script from the mltrack/scripts directory${NC}"
    exit 1
fi

# Function to wait for service
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $service"
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

# Step 1: Clear existing data
echo -e "\n${BLUE}Step 1: Clearing existing MLflow data${NC}"
echo "-------------------------------------"
./clear-mlflow-data.sh <<< "yes"

# Step 2: Start MLflow server
echo -e "\n${BLUE}Step 2: Starting MLflow server${NC}"
echo "------------------------------"
cd ..
nohup mlflow server --host 0.0.0.0 --port 5001 > mlflow.log 2>&1 &
MLFLOW_PID=$!
cd scripts

if wait_for_service "MLflow" "http://localhost:5001"; then
    echo -e "${GREEN}✓ MLflow server started (PID: $MLFLOW_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start MLflow server${NC}"
    exit 1
fi

# Step 3: Start Next.js UI
echo -e "\n${BLUE}Step 3: Starting MLTrack UI${NC}"
echo "---------------------------"
cd ../ui
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "Stopping existing Next.js server..."
    kill -9 $(lsof -ti:3000) 2>/dev/null
    sleep 2
fi

npm run build > /dev/null 2>&1
nohup npm run start > ../scripts/nextjs.log 2>&1 &
NEXTJS_PID=$!
cd ../scripts

if wait_for_service "MLTrack UI" "http://localhost:3000"; then
    echo -e "${GREEN}✓ MLTrack UI started (PID: $NEXTJS_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start MLTrack UI${NC}"
    exit 1
fi

# Step 4: Train models
echo -e "\n${BLUE}Step 4: Training ML models${NC}"
echo "--------------------------"
python3 train-model-demo.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Models trained successfully${NC}"
else
    echo -e "${RED}✗ Model training failed${NC}"
    exit 1
fi

# Step 5: Show UI
echo -e "\n${BLUE}Step 5: View models in UI${NC}"
echo "-------------------------"
echo -e "${YELLOW}📊 Open your browser to view the models:${NC}"
echo "   • MLTrack UI: http://localhost:3000"
echo "   • MLflow UI: http://localhost:5001"
echo ""
echo "Navigate to:"
echo "1. Experiments tab - See your trained models"
echo "2. Click on 'Demo_Model_Training' experiment"
echo "3. View the runs and metrics"
echo ""
read -p "Press Enter when you've viewed the models in the UI..."

# Step 6: Deploy model
echo -e "\n${BLUE}Step 6: Deploying model as API${NC}"
echo "------------------------------"
echo "Starting model deployment server..."
echo "(This will run in the foreground - press Ctrl+C to continue after testing)"
echo ""

# Create a deployment script that runs in background
cat > deploy-bg.sh << 'EOF'
#!/bin/bash
python3 deploy-model-demo.py > deployment.log 2>&1 &
echo $! > deploy.pid
EOF
chmod +x deploy-bg.sh

./deploy-bg.sh
DEPLOY_PID=$(cat deploy.pid)
rm deploy-bg.sh deploy.pid

# Wait for deployment to start
if wait_for_service "Model API" "http://localhost:8000/health"; then
    echo -e "${GREEN}✓ Model API deployed (PID: $DEPLOY_PID)${NC}"
else
    echo -e "${RED}✗ Failed to deploy model API${NC}"
    exit 1
fi

# Step 7: Test inference
echo -e "\n${BLUE}Step 7: Testing model inference${NC}"
echo "-------------------------------"
python3 test-inference-demo.py

# Step 8: Interactive demo
echo -e "\n${BLUE}Step 8: Interactive Demo${NC}"
echo "------------------------"
echo -e "${YELLOW}🎯 Your model is now deployed and ready!${NC}"
echo ""
echo "Try these commands to test the API:"
echo ""
echo -e "${GREEN}# Check API health:${NC}"
echo "curl http://localhost:8000/health"
echo ""
echo -e "${GREEN}# Get model info:${NC}"
echo "curl http://localhost:8000/v1/models/wine_quality_classifier/info"
echo ""
echo -e "${GREEN}# Make a prediction:${NC}"
echo 'curl -X POST http://localhost:8000/v1/models/wine_quality_classifier/predict \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"features": [[14.23, 1.71, 2.43, 15.6, 127.0, 2.8, 3.06, 0.28, 2.29, 5.64, 1.04, 3.92, 1065.0]], "return_proba": true}'"'"''
echo ""
echo -e "${YELLOW}📚 API Documentation: http://localhost:8000/docs${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${BLUE}Cleaning up...${NC}"
    
    # Kill processes
    [ ! -z "$DEPLOY_PID" ] && kill $DEPLOY_PID 2>/dev/null
    [ ! -z "$MLFLOW_PID" ] && kill $MLFLOW_PID 2>/dev/null
    [ ! -z "$NEXTJS_PID" ] && kill $NEXTJS_PID 2>/dev/null
    
    # Clean up files
    rm -f deployment.log nextjs.log mlflow.log
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Set trap for cleanup
trap cleanup EXIT

echo -e "\n${GREEN}✅ Demo setup complete!${NC}"
echo ""
echo "Services running:"
echo "  • MLflow: http://localhost:5001 (PID: $MLFLOW_PID)"
echo "  • MLTrack UI: http://localhost:3000 (PID: $NEXTJS_PID)"
echo "  • Model API: http://localhost:8000 (PID: $DEPLOY_PID)"
echo ""
echo "Press Ctrl+C to stop all services and exit"

# Keep script running
while true; do
    sleep 1
done