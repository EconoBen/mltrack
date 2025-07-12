"""Test model registration directly."""

import json
from mltrack.model_registry import ModelRegistry

# Test registration with a known run ID
registry = ModelRegistry(s3_bucket=None)

# Use a run ID from our quick demo
run_id = "eb2c2a44a253450b9fbb1f747e7c4edc"  # From quick-demo experiment

try:
    model_info = registry.register_model(
        run_id=run_id,
        model_name="test-ui-model",
        model_path="model",
        stage="staging",
        description="Test model from UI"
    )
    print("Success! Model registered:")
    print(json.dumps(model_info, indent=2))
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()