"""Tests for core mltrack functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import mlflow

from mltrack import track, track_context
from mltrack.core import MLTracker
from mltrack.config import MLTrackConfig


@pytest.fixture
def mock_mlflow(monkeypatch):
    """Mock MLflow to avoid actual tracking during tests."""
    mock = Mock()
    
    # Mock start_run as a context manager
    mock_run = MagicMock()
    mock_run.__enter__ = MagicMock(return_value=mock_run)
    mock_run.__exit__ = MagicMock(return_value=None)
    mock.start_run.return_value = mock_run
    
    monkeypatch.setattr("mltrack.core.mlflow", mock)
    return mock


@pytest.fixture
def config():
    """Test configuration."""
    return MLTrackConfig(
        tracking_uri="file:///tmp/mlruns",
        team_name="test-team",
        warn_non_uv=False,  # Disable warnings in tests
    )


class TestTrackDecorator:
    """Test the @track decorator."""
    
    def test_basic_function_tracking(self, mock_mlflow):
        """Test basic function decoration."""
        @track
        def dummy_function(x, y):
            return x + y
        
        # Call function
        result = dummy_function(1, 2)
        
        # Check result
        assert result == 3
        
        # Check MLflow was called
        mock_mlflow.start_run.assert_called_once()
        mock_mlflow.log_param.assert_any_call("function_name", "dummy_function")
    
    def test_function_with_exception(self, mock_mlflow):
        """Test function that raises exception."""
        @track
        def failing_function():
            raise ValueError("Test error")
        
        # Should propagate exception
        with pytest.raises(ValueError, match="Test error"):
            failing_function()
        
        # Should still log the error
        mock_mlflow.set_tag.assert_any_call("status", "failed")
        mock_mlflow.set_tag.assert_any_call("error", "Test error")
    
    def test_custom_name_and_tags(self, mock_mlflow):
        """Test custom run name and tags."""
        @track(name="custom-run", tags={"version": "1.0"})
        def dummy_function():
            return "result"
        
        # Call function
        result = dummy_function()
        
        # Check custom name was used
        mock_mlflow.start_run.assert_called_once()
        args, kwargs = mock_mlflow.start_run.call_args
        assert kwargs["run_name"] == "custom-run"
        assert "version" in kwargs["tags"]
        assert kwargs["tags"]["version"] == "1.0"


class TestTrackContext:
    """Test the track_context context manager."""
    
    def test_basic_context_tracking(self, mock_mlflow):
        """Test basic context manager usage."""
        with track_context("test-context"):
            # Should be in a run
            pass
        
        # Check MLflow was called
        mock_mlflow.start_run.assert_called_once()
        args, kwargs = mock_mlflow.start_run.call_args
        assert kwargs["run_name"] == "test-context"
    
    def test_context_with_exception(self, mock_mlflow):
        """Test context manager with exception."""
        with pytest.raises(ValueError):
            with track_context("test-context"):
                raise ValueError("Test error")
        
        # Should still set failed status
        mock_mlflow.set_tag.assert_any_call("status", "failed")


class TestMLTracker:
    """Test the MLTracker class."""
    
    def test_initialization(self, config):
        """Test tracker initialization."""
        tracker = MLTracker(config)
        assert tracker.config.team_name == "test-team"
        assert tracker.config.tracking_uri == "file:///tmp/mlruns"
    
    @patch("mltrack.core.get_git_tags")
    def test_prepare_tags(self, mock_git_tags, config):
        """Test tag preparation."""
        mock_git_tags.return_value = {
            "git.commit": "abc123",
            "git.branch": "main"
        }
        
        tracker = MLTracker(config)
        tags = tracker._prepare_tags({"custom": "tag"})
        
        assert tags["team"] == "test-team"
        assert tags["custom"] == "tag"
        assert tags["git.commit"] == "abc123"
        assert tags["git.branch"] == "main"


class TestConfiguration:
    """Test configuration handling."""
    
    def test_config_from_dict(self):
        """Test creating config from dictionary."""
        config = MLTrackConfig(
            tracking_uri="http://localhost:5000",
            team_name="ml-team",
            require_uv=True
        )
        
        assert config.tracking_uri == "http://localhost:5000"
        assert config.team_name == "ml-team"
        assert config.require_uv is True
    
    def test_config_defaults(self):
        """Test default configuration values."""
        config = MLTrackConfig()
        
        assert config.auto_log_pip is True
        assert config.auto_log_git is True
        assert config.auto_detect_frameworks is True
        assert config.warn_non_uv is True
        assert config.require_uv is False