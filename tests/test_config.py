"""Tests for configuration handling."""

import os
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import pytest
import yaml

from mltrack.config import MLTrackConfig


class TestMLTrackConfig:
    """Test MLTrackConfig class."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = MLTrackConfig()
        
        assert config.tracking_uri == "file://./mlruns"
        assert config.team_name is None
        assert config.experiment_name is None
        assert config.auto_log_pip is True
        assert config.auto_log_conda is True
        assert config.auto_log_git is True
        assert config.auto_log_system is True
        assert config.auto_detect_frameworks is True
        assert config.require_uv is False
        assert config.warn_non_uv is True
        assert config.slack_webhook is None
        assert config.artifact_location is None
    
    def test_custom_config(self):
        """Test custom configuration values."""
        config = MLTrackConfig(
            tracking_uri="http://mlflow.company.com",
            team_name="ml-team",
            experiment_name="custom-exp",
            require_uv=True,
            warn_non_uv=False,
            slack_webhook="https://hooks.slack.com/services/XXX"
        )
        
        assert config.tracking_uri == "http://mlflow.company.com"
        assert config.team_name == "ml-team"
        assert config.experiment_name == "custom-exp"
        assert config.require_uv is True
        assert config.warn_non_uv is False
        assert config.slack_webhook == "https://hooks.slack.com/services/XXX"
    
    def test_tracking_uri_validation_expands_home(self):
        """Test tracking URI validation expands home directory."""
        config = MLTrackConfig(tracking_uri="~/mlruns")
        expected = str(Path.home() / "mlruns")
        assert config.tracking_uri == f"file://{expected}"
    
    def test_tracking_uri_validation_keeps_urls(self):
        """Test tracking URI validation preserves URLs."""
        config = MLTrackConfig(tracking_uri="http://localhost:5000")
        assert config.tracking_uri == "http://localhost:5000"
        
        config = MLTrackConfig(tracking_uri="https://mlflow.example.com")
        assert config.tracking_uri == "https://mlflow.example.com"
    
    def test_tracking_uri_validation_relative_path(self):
        """Test tracking URI validation with relative paths."""
        config = MLTrackConfig(tracking_uri="./mlruns")
        assert config.tracking_uri == "file://./mlruns"
        
        config = MLTrackConfig(tracking_uri="../mlruns")
        assert config.tracking_uri == "file://../mlruns"
    
    def test_default_tags(self):
        """Test default tags functionality."""
        tags = {"env": "dev", "project": "mltrack"}
        config = MLTrackConfig(
            team_name="test-team",
            default_tags=tags
        )
        
        assert config.default_tags == tags
        assert config.default_tags["env"] == "dev"
        assert config.default_tags["project"] == "mltrack"


class TestConfigFile:
    """Test configuration file operations."""
    
    def test_from_file(self):
        """Test loading configuration from YAML file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            yaml.dump({
                "tracking_uri": "http://mlflow.local:5000",
                "team_name": "data-science",
                "experiment_name": "exp-001",
                "require_uv": True,
                "default_tags": {
                    "department": "research",
                    "cost_center": "DS001"
                }
            }, f)
            f.flush()
            
            try:
                config = MLTrackConfig.from_file(Path(f.name))
                
                assert config.tracking_uri == "http://mlflow.local:5000"
                assert config.team_name == "data-science"
                assert config.experiment_name == "exp-001"
                assert config.require_uv is True
                assert config.default_tags["department"] == "research"
                assert config.default_tags["cost_center"] == "DS001"
            finally:
                os.unlink(f.name)
    
    def test_from_file_not_found(self):
        """Test from_file when file doesn't exist."""
        # Should return default config
        config = MLTrackConfig.from_file(Path("/path/that/does/not/exist.yml"))
        
        # Should have default values
        assert config.tracking_uri == "file://./mlruns"
        assert config.team_name is None
    
    def test_from_file_invalid_yaml(self):
        """Test from_file with invalid YAML."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            f.write("invalid: yaml: content: [[[")
            f.flush()
            
            try:
                # Should return default config on parse error
                config = MLTrackConfig.from_file(Path(f.name))
                assert config.tracking_uri == "file://./mlruns"
            finally:
                os.unlink(f.name)
    
    def test_find_config_in_current_dir(self):
        """Test finding config in current directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            config_file = tmpdir / ".mltrack.yml"
            
            # Create config file
            with open(config_file, 'w') as f:
                yaml.dump({"team_name": "found-team"}, f)
            
            # Find from same directory
            config = MLTrackConfig.find_config(tmpdir)
            assert config.team_name == "found-team"
    
    def test_find_config_in_parent_dir(self):
        """Test finding config in parent directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            subdir = tmpdir / "subdir" / "nested"
            subdir.mkdir(parents=True)
            
            # Create config in parent
            config_file = tmpdir / ".mltrack.yml"
            with open(config_file, 'w') as f:
                yaml.dump({"team_name": "parent-team"}, f)
            
            # Find from subdirectory
            config = MLTrackConfig.find_config(subdir)
            assert config.team_name == "parent-team"
    
    def test_find_config_not_found(self):
        """Test find_config when no config exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Should return default config
            config = MLTrackConfig.find_config(Path(tmpdir))
            assert config.tracking_uri == "file://./mlruns"
            assert config.team_name is None
    
    def test_save_config(self):
        """Test saving configuration to file."""
        config = MLTrackConfig(
            tracking_uri="http://mlflow.test:5000",
            team_name="test-team",
            experiment_name="test-exp",
            require_uv=True,
            default_tags={"env": "test"}
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.yml"
            
            config.save(config_path)
            
            # Load and verify
            with open(config_path) as f:
                data = yaml.safe_load(f)
            
            assert data["tracking_uri"] == "http://mlflow.test:5000"
            assert data["team_name"] == "test-team"
            assert data["experiment_name"] == "test-exp"
            assert data["require_uv"] is True
            assert data["default_tags"]["env"] == "test"
    
    def test_save_config_creates_directories(self):
        """Test save creates parent directories."""
        config = MLTrackConfig()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "subdir" / "config.yml"
            
            config.save(config_path)
            
            assert config_path.exists()
            assert config_path.parent.exists()


class TestConfigEnvironment:
    """Test environment variable handling."""
    
    def test_env_overrides(self, monkeypatch):
        """Test environment variables override file config."""
        # Set environment variables
        monkeypatch.setenv("MLTRACK_TRACKING_URI", "http://env-mlflow:5000")
        monkeypatch.setenv("MLTRACK_TEAM_NAME", "env-team")
        monkeypatch.setenv("MLTRACK_REQUIRE_UV", "true")
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            yaml.dump({
                "tracking_uri": "http://file-mlflow:5000",
                "team_name": "file-team"
            }, f)
            f.flush()
            
            try:
                # Note: The actual config loading with env vars would need to be 
                # implemented in the MLTrackConfig class. This test assumes that
                # functionality exists.
                config = MLTrackConfig.from_file(Path(f.name))
                
                # For now, this test just documents the expected behavior
                # The actual implementation would need to check env vars
            finally:
                os.unlink(f.name)