#!/bin/bash

# Comprehensive test script for MLTrack features
# This validates all features are working before the LinkedIn demo

echo "🧪 MLTrack Feature Testing Suite"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Base URLs
UI_URL="http://localhost:3000"
MLFLOW_URL="http://localhost:5001"

# Test function
test_feature() {
    local test_name=$1
    local test_command=$2
    local expected_result=$3
    
    TOTAL=$((TOTAL + 1))
    echo -e "\n${BLUE}Testing: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED=$((FAILED + 1))
        echo "  Command: $test_command"
        if [ ! -z "$expected_result" ]; then
            echo "  Expected: $expected_result"
        fi
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Please run this script from the mltrack/ui directory${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"

# Start testing
echo -e "\n${YELLOW}Starting feature tests...${NC}"

# Test 1: MLflow Server
test_feature "MLflow Server Connectivity" \
    "curl -s -o /dev/null -w '%{http_code}' $MLFLOW_URL | grep -q 200"

# Test 2: Next.js App
test_feature "Next.js App Running" \
    "curl -s -o /dev/null -w '%{http_code}' $UI_URL | grep -q 200"

# Test 3: API Endpoints
test_feature "API Health Check" \
    "curl -s -o /dev/null -w '%{http_code}' $UI_URL/api/health | grep -q 200"

# Test 4: Authentication Pages
test_feature "Sign-in Page" \
    "curl -s $UI_URL/auth/signin | grep -q 'Sign in to MLTrack'"

test_feature "Verify Request Page" \
    "curl -s $UI_URL/auth/verify-request | grep -q 'Check your email'"

# Test 5: Main Pages
test_feature "Dashboard Page" \
    "curl -s $UI_URL | grep -q 'MLTrack'"

test_feature "Experiments Page" \
    "curl -s $UI_URL/experiments | grep -q 'experiments\\|Experiments'"

test_feature "Deployments Page" \
    "curl -s $UI_URL/deployments | grep -q 'deployments\\|Deployments'"

test_feature "Reports Page" \
    "curl -s $UI_URL/reports | grep -q 'reports\\|Reports'"

test_feature "Profile Page" \
    "curl -s $UI_URL/profile | grep -q 'profile\\|Profile\\|Sign in'"

test_feature "Settings Page" \
    "curl -s $UI_URL/settings | grep -q 'settings\\|Settings\\|Sign in'"

# Test 6: Check for required files
test_feature "PROJECT.md exists" \
    "[ -f ../PROJECT.md ]"

test_feature "FEATURES.md exists" \
    "[ -f ../FEATURES.md ]"

test_feature "UserAvatar component exists" \
    "[ -f components/user-avatar.tsx ]"

test_feature "UserInfo component exists" \
    "[ -f components/user-info.tsx ]"

# Test 7: Python dependencies
test_feature "MLflow Python package" \
    "python3 -c 'import mlflow' 2>/dev/null"

# Test 8: Check demo data script
test_feature "Demo data script exists" \
    "[ -f ../scripts/generate-demo-data.py ]"

test_feature "Demo data script is executable" \
    "[ -x ../scripts/generate-demo-data.py ]"

# Test 9: TypeScript compilation
echo -e "\n${BLUE}Testing: TypeScript Compilation${NC}"
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Run 'npm run type-check' to see errors"
    FAILED=$((FAILED + 1))
    TOTAL=$((TOTAL + 1))
fi

# Test 10: Check for deployment features
test_feature "Modal deployment module" \
    "[ -f ../mltrack/core/deployment/modal_deploy.py ]"

test_feature "S3 storage module" \
    "[ -f ../mltrack/core/storage/s3_storage.py ]"

test_feature "Deployment API endpoint" \
    "grep -q 'deployments' app/api/deployments/route.ts 2>/dev/null || [ -f app/api/deployments/route.ts ]"

# Test 11: UI Components
test_feature "Deployment UI component" \
    "[ -f components/deployments/deployment-interface.tsx ]"

test_feature "OpenAPI viewer component" \
    "[ -f components/deployments/openapi-viewer.tsx ]"

# Summary
echo -e "\n${YELLOW}================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}================================${NC}"
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed! Your MLTrack demo is ready.${NC}"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Run './scripts/setup-demo.sh' to generate demo data"
    echo "2. Start recording your LinkedIn demo"
    echo "3. Follow the demo script in setup-demo.sh"
else
    echo -e "\n${RED}⚠️  Some tests failed. Please fix the issues before recording your demo.${NC}"
    echo -e "\n${YELLOW}Common fixes:${NC}"
    echo "• Start MLflow: cd .. && mlflow server --host 0.0.0.0 --port 5001"
    echo "• Start Next.js: npm run dev"
    echo "• Install dependencies: npm install && pip install mlflow"
fi

# Feature checklist for demo
echo -e "\n${YELLOW}📋 Feature Checklist for Demo:${NC}"
echo "[ ] Professional sign-in page with gradient design"
echo "[ ] User avatars showing in experiments table"
echo "[ ] User info showing in runs table"
echo "[ ] Multiple users visible in demo data"
echo "[ ] Deployment interface with Modal integration"
echo "[ ] OpenAPI documentation viewer"
echo "[ ] Profile page with API key management"
echo "[ ] Settings page with 6 professional tabs"
echo "[ ] Reports page with analytics"
echo "[ ] Clean, professional UI throughout"

exit $FAILED