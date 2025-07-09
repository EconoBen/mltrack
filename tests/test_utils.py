"""Tests for utility functions."""

import os
import sys
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest
import toml
import yaml

from mltrack.utils import (
    is_uv_environment,
    get_uv_info,
    get_pip_requirements,
    get_pyproject_toml,
    get_conda_environment,
    format_metrics_table,
    format_params_table,
    send_slack_notification,
    parse_experiment_name
)


class TestUVEnvironment:
    """Test UV environment detection and info."""
    
    def test_is_uv_environment_with_uv_marker(self, monkeypatch):
        """Test UV detection with UV environment variable."""
        monkeypatch.setenv("UV_PROJECT_ROOT", "/path/to/project")
        assert is_uv_environment() is True
    
    def test_is_uv_environment_with_virtual_env_marker(self, monkeypatch):
        """Test UV detection with VIRTUAL_ENV containing .uv."""
        monkeypatch.setenv("VIRTUAL_ENV", "/path/to/project/.venv")
        monkeypatch.setenv("UV_PROJECT_ROOT", "/path/to/project")
        assert is_uv_environment() is True
    
    def test_is_uv_environment_pyproject_toml(self, monkeypatch):
        """Test UV detection via pyproject.toml."""
        with tempfile.TemporaryDirectory() as tmpdir:
            monkeypatch.chdir(tmpdir)
            
            # Create pyproject.toml with UV config
            pyproject = Path("pyproject.toml")
            pyproject.write_text("""
[tool.uv]
dev-dependencies = ["pytest"]
""")
            
            assert is_uv_environment() is True
    
    def test_is_uv_environment_no_markers(self, monkeypatch):
        """Test UV detection with no UV markers."""
        monkeypatch.delenv("UV_PROJECT_ROOT", raising=False)
        monkeypatch.delenv("VIRTUAL_ENV", raising=False)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            monkeypatch.chdir(tmpdir)
            assert is_uv_environment() is False
    
    @patch('mltrack.utils.subprocess.run')
    def test_get_uv_info_with_uv(self, mock_run, monkeypatch):
        """Test get_uv_info when UV is available."""
        monkeypatch.setenv("UV_PROJECT_ROOT", "/path/to/project")
        
        # Mock uv --version
        mock_run.return_value = Mock(
            returncode=0,
            stdout="uv 0.1.0\n",
            stderr=""
        )
        
        info = get_uv_info()
        
        assert info["available"] is True
        assert info["version"] == "0.1.0"
        assert info["project_root"] == "/path/to/project"
        assert info["in_project"] is True
    
    @patch('mltrack.utils.subprocess.run')
    def test_get_uv_info_no_uv(self, mock_run):
        """Test get_uv_info when UV is not available."""
        mock_run.side_effect = FileNotFoundError()
        
        info = get_uv_info()
        
        assert info["available"] is False
        assert info["version"] is None
        assert info["in_project"] is False


class TestRequirements:
    """Test requirements extraction."""
    
    @patch('mltrack.utils.subprocess.run')
    def test_get_pip_requirements(self, mock_run):
        """Test get_pip_requirements."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="numpy==1.24.0\npandas==2.0.0\nscikit-learn==1.3.0\n",
            stderr=""
        )
        
        requirements = get_pip_requirements()
        
        assert "numpy==1.24.0" in requirements
        assert "pandas==2.0.0" in requirements
        assert "scikit-learn==1.3.0" in requirements
    
    @patch('mltrack.utils.subprocess.run')
    def test_get_pip_requirements_error(self, mock_run):
        """Test get_pip_requirements with error."""
        mock_run.side_effect = Exception("pip error")
        
        requirements = get_pip_requirements()
        
        assert requirements == ""
    
    def test_get_pyproject_toml(self, monkeypatch):
        """Test get_pyproject_toml."""
        with tempfile.TemporaryDirectory() as tmpdir:
            monkeypatch.chdir(tmpdir)
            
            # Create pyproject.toml
            pyproject = Path("pyproject.toml")
            content = {
                "project": {
                    "name": "test-project",
                    "version": "0.1.0",
                    "dependencies": ["numpy", "pandas"]
                },
                "tool": {
                    "uv": {
                        "dev-dependencies": ["pytest", "black"]
                    }
                }
            }
            pyproject.write_text(toml.dumps(content))
            
            result = get_pyproject_toml()
            
            assert result is not None
            assert result["project"]["name"] == "test-project"
            assert "numpy" in result["project"]["dependencies"]
            assert "pytest" in result["tool"]["uv"]["dev-dependencies"]
    
    def test_get_pyproject_toml_not_found(self, monkeypatch):
        """Test get_pyproject_toml when file doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            monkeypatch.chdir(tmpdir)
            
            result = get_pyproject_toml()
            assert result is None
    
    def test_get_conda_environment(self, monkeypatch):
        """Test get_conda_environment."""
        with tempfile.TemporaryDirectory() as tmpdir:
            monkeypatch.chdir(tmpdir)
            
            # Create environment.yml
            env_file = Path("environment.yml")
            env_content = """
name: test-env
dependencies:
  - python=3.9
  - numpy=1.24
  - pandas
  - pip:
    - scikit-learn==1.3.0
"""
            env_file.write_text(env_content)
            
            result = get_conda_environment()
            
            assert result == env_content
    
    def test_get_conda_environment_not_found(self, monkeypatch):
        """Test get_conda_environment when no conda files exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            monkeypatch.chdir(tmpdir)
            
            result = get_conda_environment()
            assert result is None


class TestFormatting:
    """Test formatting functions."""
    
    def test_format_metrics_table(self):
        """Test format_metrics_table."""
        metrics = {
            "accuracy": 0.95,
            "precision": 0.92,
            "recall": 0.88,
            "f1_score": 0.8995
        }
        
        table = format_metrics_table(metrics)
        
        assert "accuracy" in table
        assert "0.9500" in table
        assert "precision" in table
        assert "0.9200" in table
        assert "f1_score" in table
        assert "0.8995" in table
    
    def test_format_metrics_table_empty(self):
        """Test format_metrics_table with empty metrics."""
        table = format_metrics_table({})
        assert "No metrics" in table
    
    def test_format_params_table(self):
        """Test format_params_table."""
        params = {
            "model": "RandomForest",
            "n_estimators": 100,
            "max_depth": 10,
            "learning_rate": 0.01,
            "use_gpu": True
        }
        
        table = format_params_table(params)
        
        assert "model" in table
        assert "RandomForest" in table
        assert "n_estimators" in table
        assert "100" in table
        assert "use_gpu" in table
        assert "True" in table
    
    def test_format_params_table_nested(self):
        """Test format_params_table with nested parameters."""
        params = {
            "model": "XGBoost",
            "hyperparameters": {
                "learning_rate": 0.1,
                "max_depth": 6
            }
        }
        
        table = format_params_table(params)
        
        assert "model" in table
        assert "hyperparameters" in table
        # Nested dict should be JSON formatted
        assert "learning_rate" in table
    
    def test_format_params_table_empty(self):
        """Test format_params_table with empty params."""
        table = format_params_table({})
        assert "No parameters" in table


class TestSlackNotification:
    """Test Slack notification functionality."""
    
    @patch('mltrack.utils.requests.post')
    def test_send_slack_notification_success(self, mock_post):
        """Test successful Slack notification."""
        mock_post.return_value = Mock(status_code=200)
        
        result = send_slack_notification(
            webhook_url="https://hooks.slack.com/services/XXX",
            experiment_name="test-exp",
            run_id="abc123",
            metrics={"accuracy": 0.95},
            status="completed"
        )
        
        assert result is True
        
        # Check the call
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        # Check webhook URL
        assert call_args[0][0] == "https://hooks.slack.com/services/XXX"
        
        # Check payload
        payload = json.loads(call_args[1]["data"])
        assert "test-exp" in payload["text"]
        assert "completed" in payload["text"]
    
    @patch('mltrack.utils.requests.post')
    def test_send_slack_notification_with_url(self, mock_post):
        """Test Slack notification with tracking URL."""
        mock_post.return_value = Mock(status_code=200)
        
        result = send_slack_notification(
            webhook_url="https://hooks.slack.com/services/XXX",
            experiment_name="test-exp",
            run_id="abc123",
            metrics={"accuracy": 0.95},
            status="completed",
            tracking_uri="http://mlflow.local:5000"
        )
        
        assert result is True
        
        payload = json.loads(mock_post.call_args[1]["data"])
        # Should include link to MLflow UI
        assert "http://mlflow.local:5000" in str(payload)
    
    @patch('mltrack.utils.requests.post')
    def test_send_slack_notification_failure(self, mock_post):
        """Test failed Slack notification."""
        mock_post.return_value = Mock(status_code=400)
        
        result = send_slack_notification(
            webhook_url="https://hooks.slack.com/services/XXX",
            experiment_name="test-exp",
            run_id="abc123"
        )
        
        assert result is False
    
    @patch('mltrack.utils.requests.post')
    def test_send_slack_notification_exception(self, mock_post):
        """Test Slack notification with exception."""
        mock_post.side_effect = Exception("Network error")
        
        result = send_slack_notification(
            webhook_url="https://hooks.slack.com/services/XXX",
            experiment_name="test-exp",
            run_id="abc123"
        )
        
        assert result is False


class TestParseExperimentName:
    """Test experiment name parsing."""
    
    def test_parse_experiment_name_with_team(self):
        """Test parsing experiment name with team prefix."""
        parsed = parse_experiment_name("ml-team/image-classification/v1")
        
        assert parsed["team"] == "ml-team"
        assert parsed["project"] == "image-classification"
        assert parsed["variant"] == "v1"
        assert parsed["full"] == "ml-team/image-classification/v1"
    
    def test_parse_experiment_name_no_team(self):
        """Test parsing experiment name without team."""
        parsed = parse_experiment_name("image-classification/v1")
        
        assert parsed["team"] is None
        assert parsed["project"] == "image-classification"
        assert parsed["variant"] == "v1"
        assert parsed["full"] == "image-classification/v1"
    
    def test_parse_experiment_name_simple(self):
        """Test parsing simple experiment name."""
        parsed = parse_experiment_name("test-experiment")
        
        assert parsed["team"] is None
        assert parsed["project"] == "test-experiment"
        assert parsed["variant"] is None
        assert parsed["full"] == "test-experiment"
    
    def test_parse_experiment_name_complex(self):
        """Test parsing complex experiment name."""
        parsed = parse_experiment_name("research/nlp/bert-finetune/2024-01")
        
        assert parsed["team"] == "research"
        assert parsed["project"] == "nlp/bert-finetune"
        assert parsed["variant"] == "2024-01"
    
    def test_parse_experiment_name_empty(self):
        """Test parsing empty experiment name."""
        parsed = parse_experiment_name("")
        
        assert parsed["team"] is None
        assert parsed["project"] == ""
        assert parsed["variant"] is None
        assert parsed["full"] == ""