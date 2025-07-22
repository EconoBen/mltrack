"""Integration tests for MLTrack core functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock, mock_open
import os
import tempfile
import shutil
from pathlib import Path

import mlflow
from mltrack import track, track_context, MLTrackConfig


class TestMLTrackIntegration:
    """Integration tests for MLTrack."""
    
    @pytest.fixture
    def temp_tracking_dir(self):
        """Create temporary tracking directory."""
        tmpdir = tempfile.mkdtemp()
        yield tmpdir
        shutil.rmtree(tmpdir)
    
    @pytest.fixture
    def mock_mlflow(self):
        """Mock MLflow for testing."""
        with patch('mltrack.core.mlflow') as mock:
            yield mock
    
    def test_track_decorator_basic(self, temp_tracking_dir, mock_mlflow):
        """Test basic track decorator functionality."""
        # Configure mock
        mock_run = Mock()
        mock_run.info.run_id = "test-run-123"
        mock_mlflow.start_run.return_value.__enter__.return_value = mock_run
        
        @track(name="test-function")
        def my_function(x, y):
            return x + y
        
        # Execute
        result = my_function(2, 3)
        
        # Verify
        assert result == 5
        mock_mlflow.start_run.assert_called_once()
        mock_mlflow.log_param.assert_any_call("x", 2)
        mock_mlflow.log_param.assert_any_call("y", 3)
        
    def test_track_context_basic(self, temp_tracking_dir, mock_mlflow):
        """Test track context manager."""
        mock_run = Mock()
        mock_run.info.run_id = "test-run-456"
        mock_mlflow.start_run.return_value.__enter__.return_value = mock_run
        
        with track_context(name="test-context") as run:
            # Log some metrics
            mlflow.log_metric("accuracy", 0.95)
            mlflow.log_param("model_type", "sklearn")
        
        # Verify
        mock_mlflow.start_run.assert_called_once()
        mock_mlflow.log_metric.assert_called_with("accuracy", 0.95)
        mock_mlflow.log_param.assert_called_with("model_type", "sklearn")
        
    def test_mltrack_config(self):
        """Test MLTrackConfig functionality."""
        config = MLTrackConfig(
            tracking_uri="./mlruns",
            experiment_name="test-experiment",
            auto_log=True,
            log_system_info=True,
            tags={"team": "ml-team", "project": "test"}
        )
        
        assert config.tracking_uri.endswith("mlruns")
        assert config.experiment_name == "test-experiment"
        assert config.auto_log is True
        assert config.log_system_info is True
        assert config.tags["team"] == "ml-team"
        
    def test_track_with_custom_config(self, temp_tracking_dir, mock_mlflow):
        """Test track decorator with custom config."""
        config = MLTrackConfig(
            tracking_uri=temp_tracking_dir,
            experiment_name="custom-exp",
            tags={"version": "1.0"}
        )
        
        mock_run = Mock()
        mock_run.info.run_id = "test-run-789"
        mock_mlflow.start_run.return_value.__enter__.return_value = mock_run
        
        @track(name="custom-function", config=config)
        def process_data(data):
            return len(data)
        
        # Execute
        result = process_data([1, 2, 3, 4, 5])
        
        # Verify
        assert result == 5
        mock_mlflow.set_tracking_uri.assert_called_with(temp_tracking_dir)
        mock_mlflow.set_experiment.assert_called_with("custom-exp")
        
    def test_track_with_error_handling(self, mock_mlflow):
        """Test track decorator handles errors properly."""
        mock_mlflow.start_run.side_effect = Exception("MLflow error")
        
        @track(name="error-function")
        def failing_function():
            return 42
        
        # Should still execute function even if tracking fails
        result = failing_function()
        assert result == 42
        
    def test_nested_tracking(self, mock_mlflow):
        """Test nested tracking contexts."""
        mock_run1 = Mock()
        mock_run1.info.run_id = "parent-run"
        mock_run2 = Mock()
        mock_run2.info.run_id = "child-run"
        
        mock_mlflow.start_run.side_effect = [
            MagicMock(__enter__=lambda self: mock_run1, __exit__=lambda *args: None),
            MagicMock(__enter__=lambda self: mock_run2, __exit__=lambda *args: None)
        ]
        
        with track_context(name="parent"):
            mlflow.log_param("level", "parent")
            
            with track_context(name="child", nested=True):
                mlflow.log_param("level", "child")
        
        # Verify nested runs were created
        assert mock_mlflow.start_run.call_count == 2
        
    @patch('mltrack.core.os.path.exists')
    @patch('mltrack.core.yaml.safe_load')
    @patch('builtins.open', new_callable=mock_open)
    def test_config_from_file(self, mock_file, mock_yaml, mock_exists):
        """Test loading config from file."""
        mock_exists.return_value = True
        mock_yaml.return_value = {
            'tracking_uri': './tracking',
            'experiment_name': 'file-exp',
            'auto_log': False
        }
        
        # This would test config loading
        # Implementation depends on actual config loading mechanism
        
    def test_track_with_git_info(self, mock_mlflow):
        """Test tracking with git information."""
        with patch('mltrack.core.get_git_info') as mock_git:
            mock_git.return_value = {
                'commit': 'abc123',
                'branch': 'main',
                'repo': 'mltrack'
            }
            
            mock_run = Mock()
            mock_run.info.run_id = "git-run"
            mock_mlflow.start_run.return_value.__enter__.return_value = mock_run
            
            @track(name="git-function", log_git_info=True)
            def process():
                return "done"
            
            result = process()
            
            # Verify git info was logged
            assert result == "done"
            mock_mlflow.set_tag.assert_any_call("git.commit", "abc123")
            mock_mlflow.set_tag.assert_any_call("git.branch", "main")