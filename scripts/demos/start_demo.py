#!/usr/bin/env python3
"""Start the MLTrack demo with all components."""

import subprocess
import time
import os
import sys

def run_command(cmd, cwd=None, background=False):
    """Run a command and optionally keep it in background."""
    print(f"\n{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    if background:
        process = subprocess.Popen(cmd, cwd=cwd)
        return process
    else:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result

def main():
    # Get the mltrack directory relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mltrack_dir = os.path.dirname(os.path.dirname(script_dir))
    ui_dir = os.path.join(mltrack_dir, "ui")
    
    print("🚀 Starting MLTrack Demo")
    
    # Step 1: Start MLflow server
    print("\n1️⃣ Starting MLflow server on port 5001...")
    mlflow_process = run_command(
        ["uv", "run", "mlflow", "server", "--host", "0.0.0.0", "--port", "5001"],
        cwd=mltrack_dir,
        background=True
    )
    time.sleep(3)  # Give it time to start
    
    # Step 2: Install UI dependencies
    print("\n2️⃣ Installing UI dependencies...")
    run_command(["npm", "install"], cwd=ui_dir)
    
    # Step 3: Start UI development server
    print("\n3️⃣ Starting UI development server on port 3001...")
    ui_process = run_command(
        ["npm", "run", "dev"],
        cwd=ui_dir,
        background=True
    )
    time.sleep(5)  # Give it time to start
    
    # Step 4: Run the test script
    print("\n4️⃣ Running test script to generate data...")
    result = run_command(
        ["uv", "run", "python", "test_mltrack.py"],
        cwd=mltrack_dir
    )
    
    print("\n✅ Demo is running!")
    print("\n📊 Access the applications:")
    print("   - MLflow UI: http://localhost:5001")
    print("   - MLTrack UI: http://localhost:3001")
    print("\n🔍 To see the results:")
    print("   1. Go to MLTrack UI: http://localhost:3001")
    print("   2. Navigate to Analytics → Reports tab")
    print("   3. Click on Experiments and open a run to see the Lineage tab")
    print("\n⚠️  Press Ctrl+C to stop all services")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping services...")
        mlflow_process.terminate()
        ui_process.terminate()
        print("✅ All services stopped")

if __name__ == "__main__":
    main()