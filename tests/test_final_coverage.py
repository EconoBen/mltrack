"""Final comprehensive tests to achieve >80% coverage."""

import os
import sys
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, PropertyMock
import pytest
import mlflow
from click.testing import CliRunner

# Test all imports work
from mltrack import track, track_context
from mltrack.core import MLTracker, _get_tracker
from mltrack.config import MLTrackConfig
from mltrack.detectors import FrameworkDetector, FrameworkInfo, get_model_info
from mltrack.git_utils import get_git_info, get_git_tags, create_git_commit_url
from mltrack.utils import (
    is_uv_environment, get_uv_info, get_pip_requirements,
    get_pyproject_toml, get_conda_environment,
    format_metrics_table, format_params_table,
    send_slack_notification, parse_experiment_name
)
from mltrack.cli import cli, main


class TestComprehensiveCoverage:
    """Comprehensive tests to maximize coverage."""
    
    def test_mltracker_singleton_pattern(self):
        """Test MLTracker singleton behavior."""
        tracker1 = _get_tracker()
        tracker2 = _get_tracker()
        assert tracker1 is tracker2
    
    @patch('mltrack.core.mlflow')
    def test_track_decorator_with_all_features(self, mock_mlflow):
        """Test track decorator with all features enabled."""
        # Mock context manager
        mock_run = MagicMock()
        mock_run.__enter__ = MagicMock(return_value=mock_run)
        mock_run.__exit__ = MagicMock(return_value=None)
        mock_mlflow.start_run.return_value = mock_run
        
        @track(name="custom-run", tags={"version": "1.0", "env": "test"})
        def complex_function(param1=10, param2="test"):
            # Log metrics
            mock_mlflow.log_metric("score", 0.95)
            return {"result": param1 * 2}
        
        result = complex_function(param1=20, param2="prod")
        
        assert result == {"result": 40}
        mock_mlflow.start_run.assert_called_once()
        mock_mlflow.log_param.assert_any_call("param1", 20)
        mock_mlflow.log_param.assert_any_call("param2", "prod")
    
    def test_framework_detector_all_frameworks(self):
        """Test detecting all supported frameworks."""
        detector = FrameworkDetector()
        
        # Test framework list
        with patch.object(detector, '_is_framework_available') as mock_available:
            with patch.object(detector, '_get_framework_version') as mock_version:
                # Make all frameworks available
                mock_available.return_value = True
                mock_version.return_value = "1.0.0"
                
                frameworks = detector.detect_all()
                
                # Should detect multiple frameworks
                assert len(frameworks) >= 8  # We support many frameworks
                framework_names = [f.name for f in frameworks]
                assert "scikit-learn" in framework_names
                assert "PyTorch" in framework_names
                assert "TensorFlow" in framework_names
    
    def test_get_model_info_all_types(self):
        """Test model info extraction for all types."""
        # Test with None
        info = get_model_info(None)
        assert "model_type" in info
        
        # Test with sklearn model
        model = Mock()
        model.__class__.__module__ = "sklearn.linear_model"
        model.__class__.__name__ = "LogisticRegression"
        model.get_params = Mock(return_value={"C": 1.0})
        
        info = get_model_info(model)
        assert info["framework"] == "sklearn"
        assert info["model_type"] == "LogisticRegression"
        
        # Test with exception in get_params
        model.get_params.side_effect = Exception("Error")
        info = get_model_info(model)
        assert info["framework"] == "sklearn"
    
    @patch('mltrack.utils.subprocess.run')
    def test_utils_comprehensive(self, mock_run):
        """Test all utils functions comprehensively."""
        # Test UV info with error
        mock_run.side_effect = Exception("UV not found")
        info = get_uv_info()
        assert info["available"] is False
        
        # Test pip requirements with UV
        mock_run.side_effect = None
        mock_run.return_value = Mock(returncode=0, stdout="numpy==1.0\n")
        
        with patch('mltrack.utils.is_uv_environment', return_value=True):
            reqs = get_pip_requirements()
            assert "numpy" in reqs
        
        # Test pyproject.toml reading
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch('os.getcwd', return_value=tmpdir):
                pyproject_path = Path(tmpdir) / "pyproject.toml"
                pyproject_path.write_text('[project]\nname = "test"')
                
                data = get_pyproject_toml()
                assert data is not None
                assert data["project"]["name"] == "test"
        
        # Test conda environment
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch('os.getcwd', return_value=tmpdir):
                env_path = Path(tmpdir) / "environment.yml"
                env_path.write_text("name: test\ndependencies:\n  - numpy")
                
                env = get_conda_environment()
                assert env is not None
                assert "numpy" in env
    
    def test_git_utils_comprehensive(self):
        """Test all git utilities comprehensively."""
        # Test git info with no repo
        with patch('mltrack.git_utils.git.Repo') as mock_repo_class:
            mock_repo_class.side_effect = Exception("Not a git repo")
            
            info = get_git_info()
            assert info is not None
            assert not info.get("is_repo", True)
        
        # Test git tags generation
        with patch('mltrack.git_utils.get_git_info') as mock_info:
            mock_info.return_value = {
                "is_repo": True,
                "commit": "abcdef123456",
                "branch": "feature/test",
                "is_dirty": True,
                "remote_url": "git@github.com:user/repo.git",
                "author_name": "Test User"
            }
            
            tags = get_git_tags()
            assert tags["git.commit"] == "abcdef12"
            assert tags["git.branch"] == "feature/test"
            assert tags["git.dirty"] == "true"
            assert tags["git.remote"] == "git@github.com:user/repo.git"
        
        # Test URL creation edge cases
        url = create_git_commit_url("ssh://git@custom.com:2222/user/repo.git", "abc123")
        # Should handle or return None
    
    def test_config_comprehensive(self):
        """Test config module comprehensively."""
        # Test with all fields
        config = MLTrackConfig(
            tracking_uri="s3://bucket/path",
            team_name="ml-team",
            experiment_name="exp-001",
            default_tags={"env": "prod"},
            auto_log_pip=False,
            auto_log_conda=False,
            auto_log_git=False,
            auto_log_system=False,
            auto_detect_frameworks=False,
            slack_webhook="https://slack.com/webhook",
            require_uv=True,
            warn_non_uv=False,
            artifact_location="s3://artifacts"
        )
        
        assert config.tracking_uri == "s3://bucket/path"
        assert config.slack_webhook == "https://slack.com/webhook"
        
        # Test validator with different inputs
        config2 = MLTrackConfig(tracking_uri="mlruns")
        assert "file://" in config2.tracking_uri
    
    def test_cli_comprehensive(self):
        """Test CLI comprehensively."""
        runner = CliRunner()
        
        # Test help for all commands
        for cmd in ['init', 'run', 'doctor', 'demo', 'config']:
            result = runner.invoke(cli, [cmd, '--help'])
            assert result.exit_code == 0
        
        # Test main function
        with patch('mltrack.cli.cli') as mock_cli:
            main()
            mock_cli.assert_called_once()
    
    def test_parse_experiment_name_all_cases(self):
        """Test experiment name parsing comprehensively."""
        # Test various formats
        cases = [
            ("simple", {"project": "simple", "team": None, "variant": None}),
            ("team/project", {"project": "project", "team": "team", "variant": None}),
            ("team/project/v1", {"project": "project", "team": "team", "variant": "v1"}),
            ("a/b/c/d", {"project": "b/c", "team": "a", "variant": "d"}),
            ("", {"project": "", "team": None, "variant": None}),
        ]
        
        for name, expected in cases:
            result = parse_experiment_name(name)
            assert result["project"] == expected["project"]
            if "team" in expected:
                assert result.get("team") == expected["team"]
            if "variant" in expected:
                assert result.get("variant") == expected["variant"]
    
    @patch('mltrack.utils.requests')
    def test_slack_notification_all_cases(self, mock_requests):
        """Test Slack notification comprehensively."""
        # Success case
        mock_requests.post.return_value = Mock(status_code=200)
        
        result = send_slack_notification(
            webhook_url="https://hooks.slack.com/xxx",
            experiment_name="test-exp",
            run_id="run123",
            metrics={"accuracy": 0.95, "loss": 0.05},
            status="completed",
            tracking_uri="http://mlflow:5000"
        )
        
        assert result is True
        
        # Check payload
        call_args = mock_requests.post.call_args
        payload = json.loads(call_args[1]["data"])
        assert "test-exp" in payload["text"]
        assert "completed" in payload["text"]
        
        # Failure case
        mock_requests.post.return_value = Mock(status_code=500)
        result = send_slack_notification(
            webhook_url="https://hooks.slack.com/xxx",
            experiment_name="test",
            run_id="123"
        )
        assert result is False
    
    def test_format_tables_edge_cases(self):
        """Test table formatting edge cases."""
        # Empty inputs
        assert "No metrics" in format_metrics_table({})
        assert "No parameters" in format_params_table({})
        
        # Various types
        metrics = {
            "float": 0.123456789,
            "int": 42,
            "large": 1e10,
            "small": 1e-10,
            "zero": 0.0
        }
        table = format_metrics_table(metrics)
        assert "float" in table
        assert "42" in table or "42.0" in table
        
        params = {
            "string": "value",
            "int": 123,
            "float": 45.67,
            "bool": True,
            "none": None,
            "list": [1, 2, 3],
            "dict": {"a": 1, "b": 2}
        }
        table = format_params_table(params)
        assert "string" in table
        assert "True" in table
        assert "[1, 2, 3]" in table or "1, 2, 3" in table