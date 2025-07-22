# S3 Integration Guide

MLTrack provides comprehensive S3 integration for storing models, data, and experiment artifacts. This guide covers setup, usage, and best practices.

## Features

### Content-Addressable Storage
- **Automatic deduplication** - Same data is only stored once
- **Hash-based retrieval** - Fast lookups using SHA256 hashes
- **Efficient storage** - Reduces S3 costs by avoiding duplicates

### Flexible Organization
- **By Project** - Group runs by project/experiment
- **By Date** - Chronological organization
- **By Type** - Separate production, experimental, evaluation runs
- **By Model** - Organize by model name/version

### Model Registry Integration
- **Automatic S3 upload** when registering models
- **Versioned storage** with metadata
- **Cross-region replication** support

## Setup

### 1. AWS Credentials

Configure AWS credentials using one of these methods:

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1

# Option 2: AWS CLI
aws configure

# Option 3: IAM role (for EC2/ECS/Lambda)
# Automatic - no configuration needed
```

### 2. S3 Bucket Setup

Create an S3 bucket for MLTrack:

```bash
# Create bucket
aws s3 mb s3://your-mltrack-bucket

# Set lifecycle policy for cost optimization (optional)
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-mltrack-bucket \
  --lifecycle-configuration file://lifecycle.json
```

Example lifecycle policy (`lifecycle.json`):
```json
{
  "Rules": [{
    "Id": "Archive old experiments",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 90,
      "StorageClass": "GLACIER"
    }],
    "NoncurrentVersionTransitions": [{
      "NoncurrentDays": 30,
      "StorageClass": "STANDARD_IA"
    }]
  }]
}
```

### 3. Configure MLTrack

Set S3 configuration in your environment or config file:

```python
# In your code
from mltrack.data_store_v2 import FlexibleDataStore

store = FlexibleDataStore(
    s3_bucket="your-mltrack-bucket",
    s3_prefix="mltrack"  # Optional prefix
)

# Or via environment
export MLTRACK_S3_BUCKET=your-mltrack-bucket
export MLTRACK_S3_PREFIX=mltrack
```

## Usage Examples

### Basic Data Storage

```python
import pandas as pd
from mltrack.data_store_v2 import FlexibleDataStore

# Initialize with S3
store = FlexibleDataStore(s3_bucket="your-mltrack-bucket")

# Store a DataFrame
df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
ref = store.store_data(
    data=df,
    name="experiment_results",
    metadata={"experiment": "baseline", "date": "2024-01-15"}
)

# Retrieve later using reference
df_retrieved = store.retrieve_data(ref)
```

### Storing ML Runs

```python
from mltrack.data_store_v2 import FlexibleDataStore, RunType, StorageMode

store = FlexibleDataStore(s3_bucket="your-mltrack-bucket")

# Store a complete ML run
manifest = store.store_run(
    run_id="exp_20240115_001",
    run_type=RunType.EXPERIMENT,
    storage_mode=StorageMode.BY_PROJECT,
    project="customer_churn",
    data={
        "train_data": train_df,
        "test_data": test_df,
        "model_params": {"n_estimators": 100, "max_depth": 10},
        "metrics": {"accuracy": 0.89, "f1": 0.87}
    },
    tags={"author": "data-science-team", "version": "1.0"}
)
```

### Model Registry with S3

```python
from mltrack.model_registry import ModelRegistry

# Initialize registry with S3 backing
registry = ModelRegistry(
    s3_bucket="your-mltrack-bucket",
    s3_prefix="models"
)

# Register model - automatically uploads to S3
result = registry.register_model(
    run_id="your_mlflow_run_id",
    model_name="customer-churn-predictor",
    model_path="model",
    description="Random Forest model for churn prediction",
    s3_bucket="your-mltrack-bucket"  # Override default bucket
)

print(f"Model stored at: {result['s3_location']}")
```

### Content Deduplication

```python
# Same data stored multiple times only uploads once
data = pd.DataFrame({'x': range(1000), 'y': range(1000)})

# First upload
ref1 = store.store_data(data, name="dataset_v1")
print(f"Uploaded: {ref1.hash}")

# Second upload - detects duplicate
ref2 = store.store_data(data, name="dataset_v2")  
print(f"Deduplicated: {ref2.hash}")

# Both references point to same S3 object
assert ref1.hash == ref2.hash
```

## S3 Storage Structure

MLTrack organizes S3 storage as follows:

```
s3://your-bucket/mltrack/
├── data/                      # Content-addressable storage
│   ├── ab/                   # First 2 chars of hash
│   │   └── abcd1234.../     # Full hash
│   │       ├── data.parquet # Actual data
│   │       └── metadata.json
├── models/                    # Model registry
│   ├── registry/             # Production models
│   │   └── churn-predictor/
│   │       └── v20240115_a1b2c3/
│   └── development/          # Dev models
├── runs/                      # Run organization
│   ├── by_project/
│   │   └── customer_churn/
│   ├── by_date/
│   │   └── 2024-01-15/
│   └── by_type/
│       └── experiment/
└── manifests/                 # Run manifests
    └── exp_20240115_001.json
```

## Best Practices

### 1. Bucket Configuration

- **Enable versioning** for data protection
- **Set up lifecycle rules** to archive old data
- **Use bucket policies** for access control
- **Enable CloudTrail** for audit logging

### 2. Cost Optimization

- **Use S3 Intelligent-Tiering** for automatic cost optimization
- **Set expiration for temporary experiments**
- **Compress large datasets** before storage
- **Use S3 Select** for querying without downloading

### 3. Security

```python
# Use IAM roles instead of keys when possible
store = FlexibleDataStore(
    s3_bucket="your-bucket",
    # AWS SDK automatically uses IAM role
)

# Encrypt sensitive data
store = FlexibleDataStore(
    s3_bucket="your-bucket",
    s3_extra_args={'ServerSideEncryption': 'AES256'}
)
```

### 4. Performance

- **Use multipart uploads** for large files (automatic)
- **Enable S3 Transfer Acceleration** for global teams
- **Cache frequently accessed data** locally
- **Use appropriate storage classes**

## Testing S3 Integration

Run integration tests:

```bash
# Set test credentials
export AWS_ACCESS_KEY_ID=test_key
export AWS_SECRET_ACCESS_KEY=test_secret
export MLTRACK_TEST_S3_BUCKET=mltrack-test

# Run S3 tests
pytest tests/test_s3_integration.py -v
```

## Troubleshooting

### Common Issues

1. **Access Denied**
   ```python
   # Check bucket permissions
   aws s3api get-bucket-acl --bucket your-bucket
   
   # Verify IAM permissions include:
   # - s3:GetObject
   # - s3:PutObject
   # - s3:ListBucket
   ```

2. **Bucket Not Found**
   ```python
   # Verify bucket exists and region
   aws s3 ls s3://your-bucket
   
   # Specify region if needed
   store = FlexibleDataStore(
       s3_bucket="your-bucket",
       aws_region="us-west-2"
   )
   ```

3. **Slow Uploads**
   ```python
   # Enable transfer acceleration
   aws s3api put-bucket-accelerate-configuration \
     --bucket your-bucket \
     --accelerate-configuration Status=Enabled
   ```

## Advanced Features

### Cross-Region Replication

```bash
# Set up replication for disaster recovery
aws s3api put-bucket-replication \
  --bucket your-bucket \
  --replication-configuration file://replication.json
```

### S3 Event Notifications

```python
# Trigger processing when new data arrives
aws s3api put-bucket-notification-configuration \
  --bucket your-bucket \
  --notification-configuration file://notifications.json
```

### Query with S3 Select

```python
# Query S3 data without downloading
response = s3_client.select_object_content(
    Bucket='your-bucket',
    Key='data/ab/abcd1234.../data.parquet',
    ExpressionType='SQL',
    Expression="SELECT * FROM s3object WHERE accuracy > 0.9",
    InputSerialization={'Parquet': {}},
    OutputSerialization={'JSON': {}}
)
```

## Migration Guide

### From Local to S3

```python
# Migrate existing local data to S3
from mltrack.migration import migrate_to_s3

migrate_to_s3(
    local_path="./mlruns",
    s3_bucket="your-bucket",
    s3_prefix="migrated",
    delete_after_upload=False  # Keep local copy
)
```

### From S3 to Local

```python
# Download S3 data for offline work
from mltrack.migration import download_from_s3

download_from_s3(
    s3_bucket="your-bucket",
    s3_prefix="mltrack",
    local_path="./mltrack_backup",
    run_ids=["exp_001", "exp_002"]  # Optional filter
)
```

## Cost Estimation

Estimate S3 costs for MLTrack:

| Usage Pattern | Monthly Data | Estimated Cost |
|--------------|--------------|----------------|
| Small team (5 users) | 100 GB | ~$2.30 |
| Medium team (20 users) | 1 TB | ~$23 |
| Large team (100+ users) | 10 TB | ~$230 |

*Costs based on S3 Standard pricing in us-east-1*

## Next Steps

1. Set up your S3 bucket
2. Configure AWS credentials
3. Run the example: `python examples/s3_integration_demo.py`
4. Check stored data in S3 console
5. Set up lifecycle policies for cost optimization