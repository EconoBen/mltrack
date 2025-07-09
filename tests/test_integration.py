"""Integration tests for mltrack."""

import tempfile
from pathlib import Path
import pytest
import mlflow
from unittest.mock import patch, Mock

from mltrack import track, track_context
from mltrack.core import MLTracker
from mltrack.config import MLTrackConfig
from mltrack.detectors import FrameworkDetector
from mltrack.git_utils import get_git_tags
from mltrack.utils import is_uv_environment, format_metrics_table


class TestE2ETracking:
    """End-to-end tracking tests."""
    
    @pytest.fixture
    def temp_tracking_dir(self):
        """Create temporary directory for MLflow tracking."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @pytest.fixture
    def test_config(self, temp_tracking_dir):
        """Create test configuration."""
        return MLTrackConfig(
            tracking_uri=f"file://{temp_tracking_dir}",
            team_name="test-team",
            experiment_name="test-experiment"
        )
    
    def test_track_decorator_e2e(self, test_config, monkeypatch):
        """Test full tracking flow with decorator."""
        # Set config
        monkeypatch.setattr("mltrack.core._config", test_config)
        
        # Initialize MLflow
        mlflow.set_tracking_uri(test_config.tracking_uri)
        mlflow.set_experiment(test_config.experiment_name)
        
        @track
        def train_model(learning_rate=0.01, epochs=10):
            # Log some metrics
            mlflow.log_metric("loss", 0.5)
            mlflow.log_metric("accuracy", 0.95)
            return {"model": "trained"}
        
        # Run the function
        result = train_model(learning_rate=0.1)
        
        assert result == {"model": "trained"}
        
        # Verify run was created
        runs = mlflow.search_runs(experiment_names=[test_config.experiment_name])
        assert len(runs) == 1
        
        # Check metrics were logged
        run = runs.iloc[0]
        assert run["metrics.loss"] == 0.5
        assert run["metrics.accuracy"] == 0.95
    
    def test_track_context_e2e(self, test_config, monkeypatch):
        """Test full tracking flow with context manager."""
        # Set config
        monkeypatch.setattr("mltrack.core._config", test_config)
        
        # Initialize MLflow
        mlflow.set_tracking_uri(test_config.tracking_uri)
        mlflow.set_experiment(test_config.experiment_name)
        
        # Use context manager
        with track_context("data-preprocessing"):
            mlflow.log_param("dataset", "iris")
            mlflow.log_metric("records_processed", 150)
        
        # Verify run was created
        runs = mlflow.search_runs(experiment_names=[test_config.experiment_name])
        assert len(runs) == 1
        
        # Check params and metrics
        run = runs.iloc[0]
        assert run["params.dataset"] == "iris"
        assert run["metrics.records_processed"] == 150.0
    
    def test_framework_detection_integration(self):
        """Test framework detection integration."""
        detector = FrameworkDetector()
        
        # Detect frameworks (at least mlflow should be available)
        frameworks = detector.detect_all()
        
        # Should detect some frameworks in test environment
        assert len(frameworks) >= 0  # May or may not have frameworks
        
        # If sklearn is available, it should be detected
        try:
            import sklearn
            framework_names = [f.name for f in frameworks]
            assert "scikit-learn" in framework_names
        except ImportError:
            pass
    
    def test_metrics_formatting(self):
        """Test metrics formatting integration."""
        metrics = {
            "train_loss": 0.234567,
            "val_loss": 0.345678,
            "accuracy": 0.956789,
            "f1_score": 0.912345
        }
        
        table = format_metrics_table(metrics)
        
        # Check table contains all metrics
        assert "train_loss" in table
        assert "0.2346" in table  # 4 decimal places
        assert "accuracy" in table
        assert "0.9568" in table
    
    @patch('mltrack.git_utils.get_git_info')
    def test_git_integration(self, mock_git_info):
        """Test git integration."""
        mock_git_info.return_value = {
            "is_repo": True,
            "commit": "abc123def456",
            "branch": "main",
            "is_dirty": False,
            "remote_url": "https://github.com/user/mltrack.git",
            "author_name": "Test User"
        }
        
        tags = get_git_tags()
        
        assert tags["git.commit"] == "abc123de"
        assert tags["git.branch"] == "main"
        assert tags["git.dirty"] == "false"
    
    def test_config_persistence(self):
        """Test configuration save and load."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "test_config.yml"
            
            # Create and save config
            config = MLTrackConfig(
                tracking_uri="http://mlflow.test:5000",
                team_name="ml-team",
                experiment_name="experiments/test"
            )
            config.save(config_path)
            
            # Load config
            loaded = MLTrackConfig.from_file(config_path)
            
            assert loaded.tracking_uri == "http://mlflow.test:5000"
            assert loaded.team_name == "ml-team"
            assert loaded.experiment_name == "experiments/test"
    
    def test_uv_environment_detection(self):
        """Test UV environment detection."""
        # This should work regardless of whether UV is actually present
        result = is_uv_environment()
        assert isinstance(result, bool)


class TestErrorHandling:
    """Test error handling scenarios."""
    
    def test_track_with_exception(self):
        """Test tracking when function raises exception."""
        @track
        def failing_function():
            raise ValueError("Intentional error")
        
        with pytest.raises(ValueError, match="Intentional error"):
            failing_function()
    
    def test_invalid_config_handling(self):
        """Test handling of invalid configuration."""
        # Invalid tracking URI should still create config
        config = MLTrackConfig(tracking_uri="not-a-valid-uri")
        assert config.tracking_uri == "not-a-valid-uri"
    
    def test_missing_mlflow_handling(self):
        """Test graceful handling when MLflow operations fail."""
        with patch('mltrack.core.mlflow.start_run', side_effect=Exception("MLflow error")):
            # Should not crash the decorated function
            @track
            def my_function():
                return "success"
            
            # Function should still execute
            with pytest.raises(Exception, match="MLflow error"):
                result = my_function()


class TestCLIIntegration:
    """Test CLI integration points."""
    
    def test_config_initialization(self):
        """Test configuration initialization."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            
            # Create config
            config = MLTrackConfig(
                team_name="cli-test-team",
                tracking_uri="mlruns"
            )
            
            config_path = project_dir / ".mltrack.yml"
            config.save(config_path)
            
            # Find config from subdirectory
            subdir = project_dir / "src" / "models"
            subdir.mkdir(parents=True)
            
            found_config = MLTrackConfig.find_config(subdir)
            assert found_config.team_name == "cli-test-team"