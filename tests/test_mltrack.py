#!/usr/bin/env python3
"""Simple test to verify MLTrack is working with lineage tracking."""

import os
import sys
import numpy as np

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from mltrack import track, track_input, track_output, track_transformation
from mltrack import DataSourceType, TransformationType

print("Testing MLTrack with lineage tracking...")

@track(name="simple-test")
def test_function():
    """A simple test function with lineage tracking."""
    print("Starting test function...")
    
    # Track input
    track_input("data/test_input.csv", source_type=DataSourceType.FILE)
    print("✓ Tracked input")
    
    # Track transformation
    track_transformation(
        name="normalize_data",
        transform_type=TransformationType.NORMALIZATION,
        description="Normalize values to 0-1 range"
    )
    print("✓ Tracked transformation")
    
    # Simulate some work
    data = np.random.rand(100, 10)
    result = (data - data.min()) / (data.max() - data.min())
    
    # Track output
    track_output("data/test_output.npy", source_type=DataSourceType.FILE)
    print("✓ Tracked output")
    
    # Log some metrics
    import mlflow
    mlflow.log_metric("accuracy", 0.95)
    mlflow.log_metric("loss", 0.05)
    print("✓ Logged metrics")
    
    return result

if __name__ == "__main__":
    # Create data directory
    os.makedirs("data", exist_ok=True)
    
    # Create a dummy input file
    with open("data/test_input.csv", "w") as f:
        f.write("col1,col2,col3\n1,2,3\n4,5,6\n")
    
    print("\nRunning test...")
    try:
        result = test_function()
        print("\n✅ Test completed successfully!")
        print(f"Result shape: {result.shape}")
        
        print("\nTo view the results:")
        print("1. Start MLflow UI: mlflow ui")
        print("2. Open http://localhost:5000")
        print("3. Look for the 'simple-test' run")
        print("4. Check the Artifacts tab for lineage/lineage.json")
        print("5. Check tags starting with 'mltrack.lineage' for stats")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()