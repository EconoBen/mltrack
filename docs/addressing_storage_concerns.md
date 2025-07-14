# How the New Design Addresses Your Concerns

## Your Feedback

> "I actually don't like that data structure. Here's why. We often use the same inputs as data. I don't want to save it for each run. I also think that many runs are experiments, but many aren't. I'm not sure if we should be thinking about this all as experiments?"

## Our Solution

### 1. Data Deduplication ✅
**Your concern**: "We often use the same inputs as data. I don't want to save it for each run."

**Solution**: Content-addressable storage with SHA256 hashing
```python
# First experiment with dataset
ref1 = store.store_data(training_df, "experiment_1_data")
# Hash: a3f5c8d2... → Stored once

# Second experiment with SAME dataset  
ref2 = store.store_data(training_df, "experiment_2_data")
# Hash: a3f5c8d2... → Just creates a reference, no duplicate storage!

# 100 experiments with same 1GB dataset = 1GB stored (not 100GB)
```

### 2. Not Everything is an Experiment ✅
**Your concern**: "Many runs are experiments, but many aren't."

**Solution**: Multiple run types with appropriate organization
```python
class RunType(Enum):
    EXPERIMENT = "experiment"      # Traditional ML experiments
    PRODUCTION = "production"      # Production model runs
    EVALUATION = "evaluation"      # Model evaluation/benchmarking
    DEVELOPMENT = "development"    # Development/debugging runs
    ANALYSIS = "analysis"         # One-off analysis runs
```

Example usage:
```python
# Production run - not an experiment!
prod_manifest = store.create_run(
    run_id="prod_2024_01_15_001",
    run_type=RunType.PRODUCTION,
    project="fraud_detection",
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_DATE]
)

# Evaluation run - benchmarking, not experimenting
eval_manifest = store.create_run(
    run_id="benchmark_q4_2024",
    run_type=RunType.EVALUATION,
    project="model_benchmarks",
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_PROJECT]
)
```

### 3. Flexible Organization ✅
**Your concern**: "Should be an option to choose how you store and think about models and model runs"

**Solution**: Multiple storage modes - same run can be organized different ways
```python
# A production run organized THREE ways
manifest = store.create_run(
    run_id="multi_view_run",
    run_type=RunType.PRODUCTION,
    storage_modes=[
        StorageMode.BY_DATE,      # Find by when it ran
        StorageMode.BY_TYPE,      # Find all production runs
        StorageMode.BY_MODEL      # Find by model name
    ]
)

# Access the same run through different lenses:
# - "Show me all production runs from today" → BY_DATE
# - "Show me all production runs" → BY_TYPE  
# - "Show me all runs of model X" → BY_MODEL
```

## Storage Structure Comparison

### Old (Experiment-Centric) ❌
```
mltrack/
└── experiments/              # Everything forced into experiments
    └── {experiment_id}/
        └── runs/
            └── {run_id}/
                ├── inputs/   # Data duplicated for EVERY run
                ├── outputs/
                └── models/
```

### New (Flexible) ✅
```
mltrack/
├── data/                    # Shared data pool (deduplicated)
│   └── {hash}/             # Content-addressable
├── runs/                    # Multiple organization patterns
│   ├── by_type/            
│   │   ├── production/     # Production separate from experiments
│   │   ├── evaluation/     
│   │   └── experiment/     
│   ├── by_date/            # Chronological view
│   └── by_project/         # Project-based view
└── manifests/              # Lightweight run metadata
```

## Real-World Example

```python
# Scenario: Daily production model runs on customer data
# Same input data format, different customers

# Day 1: Process customer batch
customer_data_1 = load_customer_batch("2024-01-15")
with mlflow.start_run():
    manifest = store.create_run(
        run_id=mlflow.active_run().info.run_id,
        run_type=RunType.PRODUCTION,  # NOT an experiment
        storage_modes=[StorageMode.BY_DATE, StorageMode.BY_TYPE]
    )
    
    # Store input (creates new entry)
    store.add_run_input(manifest, "customers", customer_data_1)
    
    # Process and store results
    predictions = model.predict(customer_data_1)
    store.add_run_output(manifest, "predictions", predictions)

# Day 2: Same model, different customers  
customer_data_2 = load_customer_batch("2024-01-16")
# ... similar code, different data stored

# Day 3: Oops, need to rerun Day 1 due to an issue
customer_data_1_rerun = load_customer_batch("2024-01-15")  # Same as Day 1
with mlflow.start_run():
    manifest = store.create_run(
        run_id=mlflow.active_run().info.run_id,
        run_type=RunType.PRODUCTION,
        tags={"rerun": "true", "original_date": "2024-01-15"}
    )
    
    # This will NOT duplicate the data! Just reference existing
    store.add_run_input(manifest, "customers", customer_data_1_rerun)
    # Day 1 data already stored, just creates reference
```

## Benefits of This Approach

1. **Storage Efficiency**: No data duplication - same data stored once
2. **Semantic Clarity**: Production runs are production, not "experiments"
3. **Flexible Access**: Find runs by date, type, project, or custom patterns
4. **Audit Trail**: Clear lineage of what data was used where
5. **Scalability**: Grows efficiently with your usage patterns

## Migration Path

You don't need to change everything at once:
```python
# Continue using experiment pattern where it makes sense
manifest = store.create_run(
    run_type=RunType.EXPERIMENT,  # Traditional experiment
    storage_modes=[StorageMode.BY_PROJECT]  # Organized by project
)

# Use new patterns where they fit better
manifest = store.create_run(
    run_type=RunType.PRODUCTION,  # Production run
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_DATE]
)
```

## Summary

Your feedback highlighted real issues with the experiment-centric approach:
- ✅ Data duplication → Solved with content-addressable storage
- ✅ Everything as experiments → Solved with multiple run types  
- ✅ Inflexible organization → Solved with multiple storage modes

The new system adapts to YOUR workflow, not the other way around.