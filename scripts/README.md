# MLTrack Demo Scripts

This directory contains scripts to help prepare and run demos of MLTrack, particularly for the LinkedIn presentation.

## 📁 Script Overview

### 1. **generate-demo-data.py**
Generates realistic demo data with multiple users, experiments, and runs.

**Features:**
- Creates 5 demo users (Sarah Chen, Alex Kumar, Maria Garcia, James Wilson, Lisa Zhang)
- Generates ML and LLM experiments based on user specialties
- Adds realistic metrics, parameters, and tags
- Creates deployment records
- Properly tags all runs with user information

**Usage:**
```bash
python generate-demo-data.py
```

### 2. **setup-demo.sh**
Interactive setup script that ensures everything is ready for demo data generation.

**Features:**
- Checks if MLflow server is running (starts if needed)
- Verifies Next.js app status
- Installs Python dependencies
- Runs the demo data generation
- Provides demo checklist

**Usage:**
```bash
./setup-demo.sh
```

### 3. **test-all-features.sh**
Comprehensive test suite that validates all features are working.

**Tests:**
- Server connectivity (MLflow & Next.js)
- API endpoints
- Page accessibility
- Required files existence
- TypeScript compilation
- Python dependencies

**Usage:**
```bash
./test-all-features.sh
```

### 4. **prepare-linkedin-demo.sh**
Complete preparation script for recording your LinkedIn demo.

**Features:**
- Pre-flight checks
- Starts services in production mode
- Provides recording checklist
- Includes detailed demo script
- Offers post-recording guidance

**Usage:**
```bash
./prepare-linkedin-demo.sh
```

### 5. **cleanup-demo.sh**
Cleans up after demo recording.

**Features:**
- Stops MLflow and Next.js servers
- Removes log files
- Optionally removes demo data files

**Usage:**
```bash
./cleanup-demo.sh
```

## 🎬 Demo Recording Workflow

1. **Prepare Environment**
   ```bash
   cd mltrack/ui
   ./scripts/prepare-linkedin-demo.sh
   ```

2. **Follow Demo Script**
   The preparation script provides a detailed 10-15 minute demo flow covering:
   - Sign-in experience
   - Dashboard overview
   - Experiments with user context
   - Deployment features
   - Reports & Analytics
   - User Profile & Settings
   - Technical highlights

3. **Key Demo Points**
   - Show multiple users (avatars and names)
   - Demonstrate ML vs LLM experiment separation
   - Click through deployment interface
   - Show OpenAPI documentation
   - Navigate all professional UI pages

4. **Clean Up**
   ```bash
   ./scripts/cleanup-demo.sh
   ```

## 📋 Quick Commands

```bash
# Full demo setup from scratch
cd mltrack/ui
npm install
./scripts/prepare-linkedin-demo.sh

# Just generate new demo data
python ../scripts/generate-demo-data.py

# Test everything is working
./scripts/test-all-features.sh

# Clean up after demo
./scripts/cleanup-demo.sh
```

## 🎯 Demo Tips

1. **Browser Setup**
   - Use incognito/private mode
   - Set zoom to 100%
   - Hide bookmarks bar
   - Close other tabs

2. **Recording**
   - Use Loom, OBS, or QuickTime
   - Record at 1920x1080 minimum
   - Check audio levels first
   - Keep videos to 10-15 minutes

3. **Presentation**
   - Start with enthusiasm
   - Keep mouse movements smooth
   - Pause on important features
   - Explain technical choices briefly

4. **LinkedIn Post**
   - Include video thumbnail
   - List key features
   - Mention tech stack
   - Add relevant hashtags
   - Link to GitHub repo

## 🐛 Troubleshooting

**MLflow won't start:**
```bash
# Check if port 5001 is in use
lsof -i :5001
# Kill existing process if needed
kill -9 $(lsof -ti:5001)
```

**Next.js build fails:**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

**Demo data generation fails:**
```bash
# Ensure MLflow is running
mlflow server --host 0.0.0.0 --port 5001
# Install Python dependencies
pip install mlflow numpy
```

## 📝 Notes

- All scripts should be run from the `mltrack/ui` directory
- Demo data is stored in MLflow's default location
- Services run on: MLflow (5001), Next.js (3000)
- Scripts are designed to be idempotent and safe to run multiple times