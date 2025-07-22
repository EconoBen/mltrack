"""Configuration for S3 integration tests.

To run S3 tests, set these environment variables:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY  
- AWS_DEFAULT_REGION (optional, defaults to us-east-1)
- MLTRACK_TEST_S3_BUCKET (your test bucket name)

Or create a .env.test file with:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
MLTRACK_TEST_S3_BUCKET=mltrack-test-bucket
```
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load test environment variables
test_env_file = Path(__file__).parent / ".env.test"
if test_env_file.exists():
    load_dotenv(test_env_file)

# S3 test configuration
S3_TEST_CONFIG = {
    "bucket": os.environ.get("MLTRACK_TEST_S3_BUCKET"),
    "region": os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
    "prefix": "integration-tests",
    "cleanup": True  # Clean up test data after runs
}

# Check if S3 tests should be skipped
SKIP_S3_TESTS = not all([
    os.environ.get("AWS_ACCESS_KEY_ID"),
    os.environ.get("AWS_SECRET_ACCESS_KEY"),
    S3_TEST_CONFIG["bucket"]
])

if SKIP_S3_TESTS:
    SKIP_REASON = "S3 credentials not configured. See test_s3_config.py for setup instructions."
else:
    SKIP_REASON = None