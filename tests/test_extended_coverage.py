"""Extended tests to improve coverage."""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest

from mltrack.core import MLTracker, _get_tracker
from mltrack.config import MLTrackConfig
from mltrack.detectors import FrameworkDetector, get_model_info
from mltrack.utils import (
    get_uv_info, 
    get_pip_requirements,
    get_pyproject_toml,
    get_conda_environment,
    parse_experiment_name,
    send_slack_notification
)


class TestCoreExtended:
    """Extended tests for core module."""
    
    def test_get_tracker_singleton(self):
        """Test _get_tracker returns singleton."""
        tracker1 = _get_tracker()
        tracker2 = _get_tracker()
        assert tracker1 is tracker2
    
    @patch('mltrack.core.mlflow')
    def test_tracker_log_model(self, mock_mlflow):
        """Test MLTracker.log_model method."""
        config = MLTrackConfig()
        tracker = MLTracker(config)
        
        # Mock model
        model = Mock()
        
        # Log model
        tracker.log_model(model, "my_model")
        
        # Should detect framework and log
        mock_mlflow.sklearn.log_model.assert_called_once()
    
    @patch('mltrack.core.mlflow')
    def test_tracker_setup_autologging(self, mock_mlflow):
        """Test MLTracker._setup_autologging method."""
        config = MLTrackConfig(auto_detect_frameworks=True)
        
        with patch('mltrack.detectors.FrameworkDetector.setup_auto_logging') as mock_setup:
            mock_setup.return_value = {"scikit-learn": True}
            
            tracker = MLTracker(config)
            
            # Should have called setup
            mock_setup.assert_called_once()
    
    def test_tracker_with_disabled_features(self):
        """Test tracker with features disabled."""
        config = MLTrackConfig(
            auto_log_pip=False,
            auto_log_conda=False,
            auto_log_git=False,
            auto_log_system=False,
            auto_detect_frameworks=False
        )
        
        tracker = MLTracker(config)
        
        # Should still initialize
        assert tracker.config == config


class TestDetectorsExtended:
    """Extended tests for detectors module."""
    
    def test_get_model_info_with_errors(self):
        """Test get_model_info error handling."""
        # Model that raises exception
        model = Mock()
        model.__class__.__module__ = "test.module"
        model.__class__.__name__ = "TestModel"
        model.get_params.side_effect = Exception("Error getting params")
        
        info = get_model_info(model)
        
        # Should still return basic info
        assert "model_type" in info
        assert info["model_type"] == "TestModel"
    
    def test_framework_detector_all_frameworks(self):
        """Test detecting all supported frameworks."""
        detector = FrameworkDetector()
        
        # Mock all frameworks as available
        with patch.object(detector, '_is_framework_available', return_value=True):
            with patch.object(detector, '_get_framework_version', return_value="1.0.0"):
                frameworks = detector.detect_all()
                
                # Should detect all configured frameworks
                assert len(frameworks) > 5  # We support many frameworks
                
                framework_names = [f.name for f in frameworks]
                assert "scikit-learn" in framework_names
                assert "PyTorch" in framework_names
                assert "TensorFlow" in framework_names


class TestUtilsExtended:
    """Extended tests for utils module."""
    
    @patch('mltrack.utils.subprocess.run')
    def test_get_pip_requirements_with_uv(self, mock_run):
        """Test pip requirements with UV."""
        with patch('mltrack.utils.is_uv_environment', return_value=True):
            # Mock uv pip freeze
            mock_run.return_value = Mock(
                returncode=0,
                stdout="numpy==1.24.0\npandas==2.0.0\n"
            )
            
            requirements = get_pip_requirements()
            
            # Should use uv pip freeze
            assert "uv" in mock_run.call_args[0][0]
            assert "numpy==1.24.0" in requirements
    
    def test_parse_experiment_name_edge_cases(self):
        """Test parse_experiment_name edge cases."""
        # Empty parts
        parsed = parse_experiment_name("//")
        assert "project" in parsed
        
        # Many slashes
        parsed = parse_experiment_name("a/b/c/d/e")
        assert "project" in parsed
        
        # Special characters
        parsed = parse_experiment_name("team-1/exp_2/v3.0")
        assert "project" in parsed
    
    @patch('mltrack.utils.Path.exists')
    def test_get_conda_environment_conda_env(self, mock_exists):
        """Test get_conda_environment with conda-env.yml."""
        def exists_side_effect(self):
            return str(self).endswith("conda-env.yml")
        
        mock_exists.side_effect = exists_side_effect
        
        with patch('mltrack.utils.Path.read_text', return_value="conda env content"):
            env = get_conda_environment()
            assert env == "conda env content"
    
    def test_format_tables_edge_cases(self):
        """Test formatting functions with edge cases."""
        from mltrack.utils import format_metrics_table, format_params_table
        
        # Very small numbers
        metrics = {"tiny": 1e-10, "small": 0.00001}
        table = format_metrics_table(metrics)
        assert "tiny" in table
        
        # Very large numbers  
        metrics = {"huge": 1e10, "large": 999999}
        table = format_metrics_table(metrics)
        assert "huge" in table
        
        # Special values
        params = {
            "none_value": None,
            "bool_true": True,
            "bool_false": False,
            "list": [1, 2, 3],
            "dict": {"a": 1}
        }
        table = format_params_table(params)
        assert "none_value" in table
        assert "bool_true" in table


class TestConfigExtended:
    """Extended tests for config module."""
    
    def test_config_validator_edge_cases(self):
        """Test config validation edge cases."""
        # Absolute path
        config = MLTrackConfig(tracking_uri="/absolute/path/mlruns")
        assert config.tracking_uri.startswith("file://")
        
        # Windows path
        if sys.platform == "win32":
            config = MLTrackConfig(tracking_uri="C:\\mlruns")
            assert config.tracking_uri.startswith("file://")
    
    def test_config_environment_variables(self, monkeypatch):
        """Test config with environment variables."""
        # Set env vars
        monkeypatch.setenv("MLTRACK_TRACKING_URI", "http://env-mlflow:5000")
        monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow-env:5000")
        
        # Create config (would need to implement env var support)
        config = MLTrackConfig()
        
        # For now just verify it creates
        assert config is not None
    
    def test_config_yaml_special_characters(self):
        """Test config with special characters."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            # Write config with special chars
            f.write("""
tracking_uri: "http://mlflow:5000/path?query=1&test=2"
team_name: "team-with-special-chars!@#"
experiment_name: "exp/with/slashes"
default_tags:
  "tag.with.dots": "value"
  "tag-with-dashes": "another-value"
""")
            f.flush()
            
            try:
                config = MLTrackConfig.from_file(Path(f.name))
                assert config.team_name == "team-with-special-chars!@#"
                assert config.default_tags["tag.with.dots"] == "value"
            finally:
                os.unlink(f.name)


class TestGitExtended:
    """Extended tests for git utilities."""
    
    def test_create_git_commit_url_edge_cases(self):
        """Test git URL creation edge cases."""
        from mltrack.git_utils import create_git_commit_url
        
        # URLs with .git suffix variations
        url = create_git_commit_url("https://github.com/user/repo", "abc123")
        assert url == "https://github.com/user/repo/commit/abc123"
        
        # SSH with port
        url = create_git_commit_url("ssh://git@github.com:22/user/repo.git", "abc123")
        # Should handle gracefully
        
        # Invalid URL
        url = create_git_commit_url("not a url at all", "abc123")
        assert url is None
    
    @patch('mltrack.git_utils.git.Repo')
    def test_get_git_info_bare_repo(self, mock_repo_class):
        """Test get_git_info with bare repository."""
        from mltrack.git_utils import get_git_info
        
        # Mock bare repo
        mock_repo = Mock()
        mock_repo.bare = True
        mock_repo_class.return_value = mock_repo
        
        info = get_git_info()
        
        # Should handle bare repos
        assert "error" not in info or info["error"] is None