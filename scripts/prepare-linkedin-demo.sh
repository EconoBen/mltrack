#!/bin/bash

# MLTrack LinkedIn Demo Preparation Script
# This script prepares everything for recording your LinkedIn demo

echo "🎬 MLTrack LinkedIn Demo Preparation"
echo "===================================="
echo "This script will help you prepare for recording your LinkedIn demo"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Helper functions
print_step() {
    echo -e "\n${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the mltrack/ui directory"
    exit 1
fi

# Step 1: Pre-flight checks
print_step "Step 1: Running pre-flight checks..."

# Check Node version
NODE_VERSION=$(node -v)
print_info "Node.js version: $NODE_VERSION"

# Check Python version
PYTHON_VERSION=$(python3 --version)
print_info "Python version: $PYTHON_VERSION"

# Check if all dependencies are installed
if [ -d "node_modules" ]; then
    print_success "Node modules installed"
else
    print_warning "Node modules not found. Installing..."
    npm install
fi

# Step 2: Clean up and prepare environment
print_step "Step 2: Cleaning up environment..."

# Kill any existing MLflow processes
if pgrep -f "mlflow server" > /dev/null; then
    print_warning "Stopping existing MLflow server..."
    pkill -f "mlflow server"
    sleep 2
fi

# Kill any existing Next.js dev server
if lsof -ti:3000 > /dev/null 2>&1; then
    print_warning "Stopping existing Next.js server..."
    kill -9 $(lsof -ti:3000) 2>/dev/null
    sleep 2
fi

print_success "Environment cleaned"

# Step 3: Start services
print_step "Step 3: Starting services..."

# Start MLflow server
echo "Starting MLflow server..."
cd ..
nohup mlflow server --host 0.0.0.0 --port 5001 > mlflow.log 2>&1 &
MLFLOW_PID=$!
cd ui

# Wait for MLflow to start
echo -n "Waiting for MLflow to start"
for i in {1..30}; do
    if curl -s http://localhost:5001 > /dev/null 2>&1; then
        echo ""
        print_success "MLflow server started (PID: $MLFLOW_PID)"
        break
    fi
    echo -n "."
    sleep 1
done

# Start Next.js in production mode for better performance
echo "Building Next.js app for production..."
npm run build

echo "Starting Next.js server..."
nohup npm run start > nextjs.log 2>&1 &
NEXTJS_PID=$!

# Wait for Next.js to start
echo -n "Waiting for Next.js to start"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo ""
        print_success "Next.js server started (PID: $NEXTJS_PID)"
        break
    fi
    echo -n "."
    sleep 1
done

# Step 4: Generate fresh demo data
print_step "Step 4: Generating fresh demo data..."

read -p "Do you want to generate fresh demo data? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    python3 ../scripts/generate-demo-data.py
    if [ $? -eq 0 ]; then
        print_success "Demo data generated successfully"
    else
        print_error "Failed to generate demo data"
    fi
else
    print_info "Skipping demo data generation"
fi

# Step 5: Run feature tests
print_step "Step 5: Running feature tests..."
./scripts/test-all-features.sh

# Step 6: Demo recording checklist
print_step "Step 6: Demo Recording Checklist"

echo -e "\n${YELLOW}📋 Pre-Recording Checklist:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${CYAN}Browser Setup:${NC}"
echo "□ Use Chrome or Firefox in incognito/private mode"
echo "□ Set browser zoom to 100%"
echo "□ Close unnecessary tabs"
echo "□ Disable browser extensions that might interfere"

echo -e "\n${CYAN}Screen Recording:${NC}"
echo "□ Use Loom, OBS, or QuickTime"
echo "□ Record at 1920x1080 or higher"
echo "□ Check audio levels"
echo "□ Hide desktop icons and notifications"

echo -e "\n${CYAN}Demo Environment:${NC}"
echo "□ MLflow UI: http://localhost:5001"
echo "□ MLTrack UI: http://localhost:3000"
echo "□ Sign in page: http://localhost:3000/auth/signin"

# Step 7: Demo script
print_step "Step 7: Demo Script (10-15 minutes)"

echo -e "\n${YELLOW}🎬 Suggested Demo Flow:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${CYAN}1. Introduction (1 minute)${NC}"
echo "   • \"Hi, I'm excited to share MLTrack, a comprehensive ML experiment tracking platform\""
echo "   • \"Built with Next.js 15, TypeScript, and MLflow integration\""
echo "   • \"Features zero-config tracking, beautiful analytics, and one-click deployment\""

echo -e "\n${CYAN}2. Sign-in Experience (1 minute)${NC}"
echo "   • Show professional sign-in page"
echo "   • Highlight GitHub OAuth and magic link options"
echo "   • Point out the feature showcase on the right"

echo -e "\n${CYAN}3. Dashboard Overview (1 minute)${NC}"
echo "   • Show main dashboard with stats"
echo "   • Highlight recent activity"
echo "   • Show professional navigation"

echo -e "\n${CYAN}4. Experiments & User Context (3 minutes)${NC}"
echo "   • Navigate to Experiments tab"
echo "   • Show multiple users (Sarah Chen, Alex Kumar, etc.)"
echo "   • Click on an experiment"
echo "   • Show user avatars in runs table"
echo "   • Highlight ML vs LLM experiments"
echo "   • Show metrics and model information"

echo -e "\n${CYAN}5. Deployment Features (2 minutes)${NC}"
echo "   • Navigate to Deployments tab"
echo "   • Show deployment interface"
echo "   • Click \"Deploy Model\" button"
echo "   • Show Modal.com integration"
echo "   • Show OpenAPI documentation viewer"

echo -e "\n${CYAN}6. Reports & Analytics (1 minute)${NC}"
echo "   • Navigate to Reports tab"
echo "   • Show data lineage tracking"
echo "   • Highlight analytics capabilities"

echo -e "\n${CYAN}7. User Profile & Settings (2 minutes)${NC}"
echo "   • Click profile icon"
echo "   • Show API key management"
echo "   • Navigate to Settings"
echo "   • Show all 6 tabs briefly"
echo "   • Highlight team features"

echo -e "\n${CYAN}8. Technical Highlights (1 minute)${NC}"
echo "   • \"Built with Next.js 15 App Router\""
echo "   • \"TypeScript for type safety\""
echo "   • \"Tailwind CSS with shadcn/ui\""
echo "   • \"Real-time data with React Query\""
echo "   • \"Deployed on Vercel\""

echo -e "\n${CYAN}9. Closing (30 seconds)${NC}"
echo "   • \"MLTrack transforms how teams manage ML experiments\""
echo "   • \"Available on GitHub\""
echo "   • \"Thank you for watching!\""

# Step 8: Post-recording
print_step "Step 8: Post-Recording Tasks"

echo -e "\n${YELLOW}📝 After Recording:${NC}"
echo "━━━━━━━━━━━━━━━━━━"
echo "1. Edit video to 10-15 minutes"
echo "2. Add captions for accessibility"
echo "3. Create engaging thumbnail"
echo "4. Write LinkedIn post with:"
echo "   • Brief description"
echo "   • Key features"
echo "   • Tech stack"
echo "   • Link to GitHub"
echo "   • Relevant hashtags: #MachineLearning #MLOps #NextJS #TypeScript"

# Step 9: Cleanup commands
print_step "Step 9: Cleanup Commands"

echo -e "\n${YELLOW}When you're done recording, run these commands:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "kill $MLFLOW_PID    # Stop MLflow"
echo "kill $NEXTJS_PID    # Stop Next.js"

# Save PIDs for later cleanup
echo "$MLFLOW_PID" > .demo_mlflow_pid
echo "$NEXTJS_PID" > .demo_nextjs_pid

echo -e "\n${GREEN}✅ Demo preparation complete!${NC}"
echo -e "${GREEN}🎬 You're ready to record your LinkedIn demo!${NC}"
echo ""
echo -e "${CYAN}Quick links:${NC}"
echo "• MLTrack UI: http://localhost:3000"
echo "• Sign in: http://localhost:3000/auth/signin"
echo "• MLflow: http://localhost:5001"

# Final tips
echo -e "\n${YELLOW}💡 Pro Tips:${NC}"
echo "• Speak clearly and enthusiastically"
echo "• Keep mouse movements smooth"
echo "• Pause briefly on important features"
echo "• Smile - it comes through in your voice!"

echo -e "\n${GREEN}Good luck with your demo! 🚀${NC}"