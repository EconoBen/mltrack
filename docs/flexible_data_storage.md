# Flexible Data Storage System

## Overview

MLtrack's flexible data storage system addresses common pain points in ML experimentation and production:

- **Data Deduplication**: Same inputs stored only once using content-addressable storage
- **Flexible Organization**: Not everything is an "experiment" - support for production runs, evaluations, etc.
- **Multiple Views**: Same run can be organized by project, date, type, or custom patterns
- **Efficient Storage**: SHA256 hashing ensures data integrity while minimizing duplication

## Key Concepts

### 1. Content-Addressable Storage
```python
# Data is stored based on its content hash
# Same data → Same hash → Stored only once
data_hash = sha256(data_content)
storage_path = f"data/{hash[:2]}/{hash}/data.{format}"
```

### 2. Run Types
```python
class RunType(Enum):
    EXPERIMENT = "experiment"      # Traditional ML experiments
    PRODUCTION = "production"      # Production model runs
    EVALUATION = "evaluation"      # Model evaluation/benchmarking
    DEVELOPMENT = "development"    # Development/debugging runs
    ANALYSIS = "analysis"         # One-off analysis runs
```

### 3. Storage Modes
```python
class StorageMode(Enum):
    BY_PROJECT = "by_project"      # Group by project/experiment
    BY_DATE = "by_date"           # Chronological organization
    BY_TYPE = "by_type"           # Group by run type
    BY_MODEL = "by_model"         # Group by model name
    FLAT = "flat"                 # No organization
```

## Usage Examples

### Basic Data Storage with Deduplication
```python
from mltrack.data_store_v2 import FlexibleDataStore

store = FlexibleDataStore(s3_bucket="my-mltrack-bucket")

# First time storing this data
ref1 = store.store_data(training_df, "training_data")
print(f"Stored: {ref1.hash[:8]}...")  # "Stored: a3f5c8d2..."

# Second time with same data (different name)
ref2 = store.store_data(training_df, "experiment_42_data") 
print(f"Stored: {ref2.hash[:8]}...")  # "Stored: a3f5c8d2..." (same hash!)
```

### Different Run Types
```python
# Development run - organized by project and date
dev_manifest = store.create_run(
    run_id="dev_001",
    run_type=RunType.DEVELOPMENT,
    project="new_features",
    storage_modes=[StorageMode.BY_PROJECT, StorageMode.BY_DATE]
)

# Production run - organized by type and model
prod_manifest = store.create_run(
    run_id="prod_001", 
    run_type=RunType.PRODUCTION,
    project="customer_churn",
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_MODEL]
)

# Evaluation run - for benchmarking
eval_manifest = store.create_run(
    run_id="eval_001",
    run_type=RunType.EVALUATION,
    project="q4_benchmarks",
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_PROJECT]
)
```

### Using the Decorator
```python
from mltrack.data_store_v2 import capture_flexible_data, RunType, StorageMode

@capture_flexible_data(
    store_inputs=True,
    store_outputs=True,
    run_type=RunType.PRODUCTION,
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_DATE],
    project="fraud_detection"
)
def process_transactions(transaction_df: pd.DataFrame, model_version: str):
    # Your production model code
    predictions = model.predict(transaction_df)
    return predictions
```

### Shared Data Across Experiments
```python
# Store dataset once
data_ref = store.store_data(large_dataset, "benchmark_data")

# Multiple experiments reference the same data
for config in hyperparameter_configs:
    with mlflow.start_run():
        manifest = store.create_run(
            run_id=mlflow.active_run().info.run_id,
            run_type=RunType.EXPERIMENT,
            project="hyperparam_search"
        )
        
        # Add reference to shared data (not a copy!)
        store.add_run_input(manifest, "training_data", large_dataset)
        
        # Run experiment...
        model = train_model(large_dataset, config)
        
        # Store unique outputs
        store.add_run_output(manifest, "model_predictions", predictions)
```

## S3 Structure

```
mltrack/
├── data/                          # Content-addressable storage
│   ├── a3/                       # First 2 chars of hash
│   │   └── a3f5c8d2.../         # Full hash
│   │       ├── data.parquet      # Actual data
│   │       └── metadata.json     # Data metadata
│   ├── b7/
│   │   └── b7e9f4c1.../
│   └── ...
├── runs/                         # Flexible run organization
│   ├── by_project/
│   │   └── customer_churn/
│   │       └── run_abc123/
│   ├── by_date/
│   │   └── 2024-01-15/
│   │       └── run_abc123/
│   └── by_type/
│       ├── production/
│       │   └── run_xyz789/
│       └── evaluation/
│           └── run_def456/
└── manifests/
    ├── run_abc123.json          # Lightweight run metadata
    ├── run_xyz789.json
    └── run_def456.json
```

## Migration from Experiment-Centric Storage

### Old Way (Everything is an Experiment)
```python
# Old structure forced everything into experiments
store.store_inputs(data, experiment_id, run_id)  # Stored under experiments/
```

### New Way (Flexible Organization)
```python
# Choose how to organize based on your needs
manifest = store.create_run(
    run_id=run_id,
    run_type=RunType.PRODUCTION,  # or EXPERIMENT, EVALUATION, etc.
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_DATE]
)
```

## Benefits

1. **Storage Efficiency**: 10 experiments with the same 1GB dataset = 1GB stored (not 10GB)
2. **Organizational Flexibility**: Find runs by project, date, type, or custom patterns
3. **Production-Ready**: Clear distinction between experiments and production runs
4. **Audit Trail**: Manifests track what data each run used without duplication
5. **Fast Retrieval**: Content-addressable storage enables quick lookups

## Best Practices

1. **Choose Appropriate Run Types**
   - Use `EXPERIMENT` for hyperparameter searches and model development
   - Use `PRODUCTION` for deployed model runs
   - Use `EVALUATION` for standardized benchmarks
   - Use `DEVELOPMENT` for quick iterations and debugging

2. **Select Storage Modes Based on Access Patterns**
   - `BY_PROJECT`: When you need all runs for a specific project
   - `BY_DATE`: For time-based analysis and debugging
   - `BY_TYPE`: To separate production from experimentation
   - Multiple modes: When you need different views of the same data

3. **Leverage Data Deduplication**
   - Store large datasets once and reference them
   - Use consistent data preprocessing to maximize deduplication
   - Check data hashes before assuming you need new storage

## Configuration

Set environment variables:
```bash
export MLTRACK_S3_BUCKET=my-mltrack-bucket
export MLTRACK_DEFAULT_RUN_TYPE=experiment
export MLTRACK_DEFAULT_STORAGE_MODE=by_project
```

Or configure programmatically:
```python
store = FlexibleDataStore(
    s3_bucket="my-bucket",
    default_run_type=RunType.PRODUCTION,
    default_storage_mode=StorageMode.BY_TYPE
)
```

## FAQ

**Q: What happens if I store the same data with different names?**
A: The data is stored only once. Different names create different references to the same underlying data.

**Q: Can I change a run's organization after creation?**
A: Yes, manifests can be updated to add new storage locations.

**Q: How do I find all runs using a specific dataset?**
A: Use `store.find_runs_by_data(data_hash)` to find all runs referencing that data.

**Q: Is the old experiment-centric approach still supported?**
A: Yes, just use `RunType.EXPERIMENT` and `StorageMode.BY_PROJECT` for backward compatibility.