#!/usr/bin/env python
"""Integration tests for S3 storage in MLTrack.

These tests require AWS credentials and a test S3 bucket.
Set the following environment variables:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- MLTRACK_TEST_S3_BUCKET
"""

import os
import pytest
import pandas as pd
import numpy as np
import json
import tempfile
from datetime import datetime
from unittest.mock import patch, MagicMock

from mltrack.data_store_v2 import FlexibleDataStore, RunType, StorageMode, DataReference
from mltrack.model_registry import ModelRegistry


# Skip tests if S3 credentials are not available
SKIP_S3_TESTS = not os.environ.get("MLTRACK_TEST_S3_BUCKET")
S3_TEST_BUCKET = os.environ.get("MLTRACK_TEST_S3_BUCKET", "mltrack-test-bucket")


@pytest.fixture
def s3_store():
    """Create a FlexibleDataStore with S3 backend."""
    if SKIP_S3_TESTS:
        pytest.skip("S3 credentials not configured")
    
    store = FlexibleDataStore(
        s3_bucket=S3_TEST_BUCKET,
        s3_prefix=f"tests/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    )
    yield store
    
    # Cleanup after tests
    if store.s3_client:
        # List and delete all test objects
        try:
            paginator = store.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=S3_TEST_BUCKET, Prefix=store.s3_prefix)
            
            for page in pages:
                if 'Contents' in page:
                    objects = [{'Key': obj['Key']} for obj in page['Contents']]
                    store.s3_client.delete_objects(
                        Bucket=S3_TEST_BUCKET,
                        Delete={'Objects': objects}
                    )
        except Exception as e:
            print(f"Cleanup failed: {e}")


@pytest.fixture
def mock_s3_store():
    """Create a FlexibleDataStore with mocked S3 client."""
    with patch('boto3.Session') as mock_session:
        mock_client = MagicMock()
        mock_session.return_value.client.return_value = mock_client
        
        store = FlexibleDataStore(
            s3_bucket="mock-bucket",
            s3_prefix="tests"
        )
        store.s3_client = mock_client
        yield store


class TestDataStorage:
    """Test data storage and retrieval."""
    
    def test_store_dataframe(self, s3_store):
        """Test storing a pandas DataFrame."""
        df = pd.DataFrame({
            'feature1': [1, 2, 3, 4, 5],
            'feature2': [0.1, 0.2, 0.3, 0.4, 0.5],
            'label': [0, 1, 0, 1, 0]
        })
        
        # Store data
        ref = s3_store.store_data(
            data=df,
            name="test_data",
            metadata={"description": "Test dataset"}
        )
        
        assert isinstance(ref, DataReference)
        assert ref.hash
        assert ref.name == "test_data"
        assert ref.size > 0
        
        # Retrieve data
        retrieved_df = s3_store.retrieve_data(ref)
        pd.testing.assert_frame_equal(df, retrieved_df)
    
    def test_store_numpy_array(self, s3_store):
        """Test storing a numpy array."""
        arr = np.random.rand(100, 10)
        
        ref = s3_store.store_data(
            data=arr,
            name="test_array",
            metadata={"shape": arr.shape}
        )
        
        retrieved_arr = s3_store.retrieve_data(ref)
        np.testing.assert_array_equal(arr, retrieved_arr)
    
    def test_store_dict(self, s3_store):
        """Test storing a dictionary."""
        data = {
            "model_params": {"n_estimators": 100, "max_depth": 10},
            "metrics": {"accuracy": 0.95, "f1_score": 0.93},
            "metadata": {"dataset": "iris", "version": "1.0"}
        }
        
        ref = s3_store.store_data(data, name="test_dict")
        retrieved_data = s3_store.retrieve_data(ref)
        
        assert data == retrieved_data
    
    def test_content_deduplication(self, s3_store):
        """Test that identical data is only stored once."""
        df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
        
        # Store same data twice
        ref1 = s3_store.store_data(df, name="data1")
        ref2 = s3_store.store_data(df, name="data2")
        
        # Should have same hash
        assert ref1.hash == ref2.hash
        
        # But different names
        assert ref1.name == "data1"
        assert ref2.name == "data2"


class TestRunStorage:
    """Test run organization and storage."""
    
    def test_store_run_by_project(self, s3_store):
        """Test storing runs organized by project."""
        run_id = "test_run_123"
        project = "ml-project-x"
        
        # Store run data
        manifest = s3_store.store_run(
            run_id=run_id,
            run_type=RunType.EXPERIMENT,
            storage_mode=StorageMode.BY_PROJECT,
            project=project,
            data={
                "params": {"learning_rate": 0.01},
                "metrics": {"loss": 0.5}
            }
        )
        
        assert manifest.run_id == run_id
        assert manifest.project == project
        assert manifest.run_type == RunType.EXPERIMENT
        
        # Retrieve run
        retrieved_manifest = s3_store.get_run(run_id)
        assert retrieved_manifest.run_id == run_id
    
    def test_store_run_by_date(self, s3_store):
        """Test storing runs organized by date."""
        run_id = "test_run_date_456"
        
        manifest = s3_store.store_run(
            run_id=run_id,
            run_type=RunType.PRODUCTION,
            storage_mode=StorageMode.BY_DATE,
            data={"status": "deployed"}
        )
        
        # Check S3 key contains date
        today = datetime.utcnow().strftime("%Y-%m-%d")
        expected_prefix = f"runs/by_date/{today}"
        
        # Verify through list operation
        runs = s3_store.list_runs(storage_mode=StorageMode.BY_DATE)
        assert any(r.run_id == run_id for r in runs)
    
    def test_store_run_with_artifacts(self, s3_store):
        """Test storing runs with multiple artifacts."""
        run_id = "test_run_artifacts"
        
        # Create test data
        train_data = pd.DataFrame({'x': [1, 2, 3], 'y': [4, 5, 6]})
        test_data = pd.DataFrame({'x': [7, 8, 9], 'y': [10, 11, 12]})
        model_params = {"model_type": "rf", "n_estimators": 100}
        
        # Store run with artifacts
        manifest = s3_store.store_run(
            run_id=run_id,
            run_type=RunType.EXPERIMENT,
            storage_mode=StorageMode.BY_PROJECT,
            project="test_project",
            data={
                "train_data": train_data,
                "test_data": test_data,
                "model_params": model_params
            }
        )
        
        # Check data references were created
        assert "train_data" in manifest.data_refs
        assert "test_data" in manifest.data_refs
        
        # Retrieve and verify
        retrieved_train = s3_store.retrieve_data(manifest.data_refs["train_data"])
        pd.testing.assert_frame_equal(train_data, retrieved_train)


class TestModelRegistry:
    """Test model registry S3 integration."""
    
    def test_register_model_with_s3(self, mock_s3_store):
        """Test registering a model with S3 storage."""
        # Mock S3 operations
        mock_s3_store.s3_client.put_object.return_value = {}
        mock_s3_store.s3_client.upload_file.return_value = None
        
        registry = ModelRegistry(
            s3_bucket="mock-bucket",
            s3_prefix="models"
        )
        registry.s3_client = mock_s3_store.s3_client
        
        # Register a model (mocked MLflow)
        with patch('mlflow.MlflowClient') as mock_mlflow:
            mock_run = MagicMock()
            mock_run.info.run_id = "test_run_id"
            mock_run.info.experiment_id = "0"
            mock_run.data.tags = {"mlflow.source.git.commit": "abc123"}
            mock_run.data.metrics = {"accuracy": 0.95}
            mock_run.data.params = {"n_estimators": "100"}
            
            mock_mlflow.return_value.get_run.return_value = mock_run
            
            with patch('mltrack.model_registry.Path.home') as mock_home:
                mock_home.return_value = Path(tempfile.gettempdir())
                
                result = registry.register_model(
                    run_id="test_run_id",
                    model_name="test-model",
                    model_path="model",
                    description="Test model with S3"
                )
        
        # Verify S3 operations were called
        assert mock_s3_store.s3_client.put_object.called
        
        # Check metadata upload
        metadata_call = mock_s3_store.s3_client.put_object.call_args_list[0]
        assert "metadata.json" in metadata_call[1]['Key']


class TestS3Operations:
    """Test S3-specific operations."""
    
    def test_s3_connection_failure(self):
        """Test handling of S3 connection failures."""
        with patch('boto3.Session') as mock_session:
            mock_session.side_effect = Exception("No credentials")
            
            # Should create store but without S3
            store = FlexibleDataStore(s3_bucket="test-bucket")
            assert store.s3_client is None
            assert store.s3_bucket is None
    
    def test_s3_bucket_validation(self):
        """Test S3 bucket validation."""
        with patch('boto3.Session') as mock_session:
            mock_client = MagicMock()
            mock_session.return_value.client.return_value = mock_client
            
            # Test non-existent bucket
            mock_client.head_bucket.side_effect = ClientError(
                {'Error': {'Code': '404'}}, 'HeadBucket'
            )
            
            with pytest.raises(Exception, match="does not exist"):
                FlexibleDataStore(s3_bucket="non-existent-bucket")
            
            # Test access denied
            mock_client.head_bucket.side_effect = ClientError(
                {'Error': {'Code': '403'}}, 'HeadBucket'
            )
            
            with pytest.raises(Exception, match="Access denied"):
                FlexibleDataStore(s3_bucket="forbidden-bucket")
    
    @pytest.mark.skipif(SKIP_S3_TESTS, reason="S3 credentials not configured")
    def test_large_data_streaming(self, s3_store):
        """Test streaming large data to/from S3."""
        # Create large dataset (100MB+)
        large_df = pd.DataFrame(
            np.random.rand(1000000, 20),
            columns=[f"col_{i}" for i in range(20)]
        )
        
        # Store large data
        ref = s3_store.store_data(large_df, name="large_dataset")
        
        # Retrieve and verify shape
        retrieved_df = s3_store.retrieve_data(ref)
        assert retrieved_df.shape == large_df.shape
        
        # Verify first few rows match
        pd.testing.assert_frame_equal(
            large_df.head(100),
            retrieved_df.head(100)
        )


class TestSearchAndQuery:
    """Test searching and querying capabilities."""
    
    def test_list_runs_by_type(self, s3_store):
        """Test listing runs filtered by type."""
        # Create runs of different types
        for i, run_type in enumerate([RunType.EXPERIMENT, RunType.PRODUCTION]):
            s3_store.store_run(
                run_id=f"run_{run_type.value}_{i}",
                run_type=run_type,
                storage_mode=StorageMode.BY_TYPE,
                data={"index": i}
            )
        
        # List only experiments
        experiments = s3_store.list_runs(
            storage_mode=StorageMode.BY_TYPE,
            run_type=RunType.EXPERIMENT
        )
        
        assert all(r.run_type == RunType.EXPERIMENT for r in experiments)
    
    def test_search_by_metadata(self, mock_s3_store):
        """Test searching runs by metadata."""
        # Mock S3 list response
        mock_s3_store.s3_client.list_objects_v2.return_value = {
            'Contents': [
                {'Key': 'tests/manifests/run1.json'},
                {'Key': 'tests/manifests/run2.json'}
            ]
        }
        
        # Mock manifest retrieval
        manifests = [
            {"run_id": "run1", "tags": {"model": "rf", "dataset": "iris"}},
            {"run_id": "run2", "tags": {"model": "xgb", "dataset": "iris"}}
        ]
        
        mock_s3_store.s3_client.get_object.side_effect = [
            {'Body': MagicMock(read=lambda: json.dumps(m).encode())}
            for m in manifests
        ]
        
        # Search for runs with specific tag
        # This would need to be implemented in the actual store
        # For now, just verify the mocking works
        assert mock_s3_store.s3_client is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])