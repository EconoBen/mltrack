#!/usr/bin/env python3
"""Generate test data for MLTrack demo."""

import os
import sys
import subprocess

# Get mltrack directory relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
mltrack_dir = os.path.dirname(os.path.dirname(script_dir))
os.chdir(mltrack_dir)

# Add src to path
sys.path.insert(0, os.path.join(mltrack_dir, 'src'))

print("🚀 Generating test data for MLTrack demo...")

# First, ensure MLflow server is running
print("\n1️⃣ Checking if MLflow is accessible...")
try:
    import requests
    response = requests.get("http://localhost:5001/api/2.0/mlflow/experiments/list", timeout=2)
    print("✅ MLflow server is running")
except:
    print("⚠️  MLflow server not running. Please start it with:")
    print("    uv run mlflow server --host 0.0.0.0 --port 5001")
    print("\n   Or use the start_demo.py script to start everything")
    sys.exit(1)

# Run the test script
print("\n2️⃣ Running test script...")
try:
    # Import and run directly
    import numpy as np
    from mltrack import track, track_input, track_output, track_transformation
    from mltrack import DataSourceType, TransformationType
    import mlflow

    # Create data directory
    os.makedirs("data", exist_ok=True)
    
    # Create a dummy input file
    with open("data/test_input.csv", "w") as f:
        f.write("col1,col2,col3\n1,2,3\n4,5,6\n")

    @track(name="demo-lineage-test")
    def test_function():
        """A demo function with lineage tracking."""
        print("   - Tracking input...")
        track_input("data/test_input.csv", source_type=DataSourceType.FILE, 
                   format="csv", description="Sample input data")
        
        print("   - Tracking transformation...")
        track_transformation(
            name="normalize_data",
            transform_type=TransformationType.NORMALIZATION,
            description="Normalize values to 0-1 range",
            parameters={"method": "min-max"}
        )
        
        # Simulate some work
        data = np.random.rand(100, 10)
        result = (data - data.min()) / (data.max() - data.min())
        
        print("   - Tracking output...")
        track_output("data/test_output.npy", source_type=DataSourceType.FILE,
                    format="numpy", description="Normalized data")
        
        # Log metrics
        mlflow.log_metric("accuracy", 0.95)
        mlflow.log_metric("loss", 0.05)
        mlflow.log_metric("f1_score", 0.93)
        
        # Log for cost analysis (LLM-style metrics)
        mlflow.log_metric("llm.cost_usd", 0.125)
        mlflow.log_metric("llm.total_tokens", 1500)
        
        return result

    # Run multiple times to generate more data
    print("\n3️⃣ Generating multiple runs for better insights...")
    for i in range(5):
        print(f"   Run {i+1}/5...")
        result = test_function()
        
    print("\n✅ Test data generated successfully!")
    
    # Also run the full lineage example
    print("\n4️⃣ Running full lineage pipeline example...")
    subprocess.run([sys.executable, "examples/lineage_example.py"], 
                   capture_output=True, text=True)
    print("✅ Pipeline example completed!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n🎉 Demo data generation complete!")
print("\n📊 To view the results:")
print("   1. Open MLTrack UI: http://localhost:3001")
print("   2. Navigate to Analytics → Reports tab")
print("   3. You should now see:")
print("      - Dynamic insights based on the generated runs")
print("      - Export options for reports")
print("   4. Click on Experiments, then click on a run")
print("   5. Look for the Lineage tab to see the data flow visualization")
print("\n💡 The more runs you have, the better the insights will be!")