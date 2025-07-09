"""Tests for CLI commands."""

import os
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest
from click.testing import CliRunner

from mltrack.cli import cli, init, run, doctor, demo


@pytest.fixture
def runner():
    """Create a CLI runner."""
    return CliRunner()


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class TestCLIMain:
    """Test main CLI entry point."""
    
    def test_main_help(self, runner):
        """Test main help command."""
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "ML tracking tool for teams" in result.output
        assert "init" in result.output
        assert "run" in result.output
        assert "doctor" in result.output
        assert "demo" in result.output
    
    def test_main_version(self, runner):
        """Test version command."""
        result = runner.invoke(cli, ["--version"])
        assert result.exit_code == 0
        assert "version" in result.output.lower()


class TestInitCommand:
    """Test init command."""
    
    def test_init_creates_config(self, runner, temp_dir):
        """Test init creates config file."""
        with runner.isolated_filesystem():
            result = runner.invoke(init, ["--team-name", "test-team"])
            assert result.exit_code == 0
            
            # Check config file was created
            config_file = Path(".mltrack.yml")
            assert config_file.exists()
            
            # Check content
            content = config_file.read_text()
            assert "test-team" in content
            assert "tracking_uri" in content
    
    def test_init_with_custom_tracking_uri(self, runner, temp_dir):
        """Test init with custom tracking URI."""
        with runner.isolated_filesystem(temp=True):
            result = runner.invoke(init, [
                "--team-name", "test-team",
                "--tracking-uri", "http://localhost:5000"
            ])
            assert result.exit_code == 0
            
            config_file = Path(".mltrack.yml")
            content = config_file.read_text()
            assert "http://localhost:5000" in content
    
    def test_init_force_overwrites(self, runner):
        """Test init --force overwrites existing config."""
        with runner.isolated_filesystem(temp=True):
            # Create initial config
            runner.invoke(init, ["--team-name", "team1"])
            
            # Overwrite with force
            result = runner.invoke(init, [
                "--team-name", "team2",
                "--force"
            ])
            assert result.exit_code == 0
            
            config_file = Path(".mltrack.yml")
            content = config_file.read_text()
            assert "team2" in content
            assert "team1" not in content
    
    def test_init_without_force_fails(self, runner):
        """Test init without force fails if config exists."""
        with runner.isolated_filesystem(temp=True):
            # Create initial config
            runner.invoke(init, ["--team-name", "team1"])
            
            # Try to overwrite without force
            result = runner.invoke(init, ["--team-name", "team2"])
            assert result.exit_code != 0
            assert "already exists" in result.output


class TestRunCommand:
    """Test run command."""
    
    @patch("mltrack.cli.subprocess.run")
    @patch("mltrack.cli.MLTracker")
    def test_run_basic_command(self, mock_tracker, mock_subprocess, runner):
        """Test running a basic command."""
        # Mock subprocess to simulate successful command
        mock_subprocess.return_value = Mock(returncode=0)
        
        # Mock tracker
        mock_instance = MagicMock()
        mock_tracker.return_value = mock_instance
        
        result = runner.invoke(run, ["echo", "hello"])
        assert result.exit_code == 0
        
        # Check subprocess was called correctly
        mock_subprocess.assert_called_once()
        call_args = mock_subprocess.call_args[0][0]
        assert call_args == ["echo", "hello"]
    
    @patch("mltrack.cli.subprocess.run")
    @patch("mltrack.cli.MLTracker")
    def test_run_with_custom_name(self, mock_tracker, mock_subprocess, runner):
        """Test run with custom name."""
        mock_subprocess.return_value = Mock(returncode=0)
        mock_instance = MagicMock()
        mock_tracker.return_value = mock_instance
        
        result = runner.invoke(run, [
            "--name", "my-experiment",
            "python", "train.py"
        ])
        assert result.exit_code == 0
        
        # Check tracking was called with custom name
        mock_instance.track_context.assert_called_once()
        call_args = mock_instance.track_context.call_args[0]
        assert call_args[0] == "my-experiment"
    
    @patch("mltrack.cli.subprocess.run")
    @patch("mltrack.cli.MLTracker")  
    def test_run_with_tags(self, mock_tracker, mock_subprocess, runner):
        """Test run with tags."""
        mock_subprocess.return_value = Mock(returncode=0)
        mock_instance = MagicMock()
        mock_tracker.return_value = mock_instance
        
        result = runner.invoke(run, [
            "--tag", "version=1.0",
            "--tag", "model=bert",
            "python", "train.py"
        ])
        assert result.exit_code == 0
        
        # Check tags were passed
        call_kwargs = mock_instance.track_context.call_args[1]
        assert "tags" in call_kwargs
        assert call_kwargs["tags"]["version"] == "1.0"
        assert call_kwargs["tags"]["model"] == "bert"
    
    @patch("mltrack.cli.subprocess.run")
    @patch("mltrack.cli.MLTracker")
    def test_run_command_failure(self, mock_tracker, mock_subprocess, runner):
        """Test run handles command failure."""
        # Mock subprocess to simulate failed command
        mock_subprocess.return_value = Mock(returncode=1)
        mock_instance = MagicMock()
        mock_tracker.return_value = mock_instance
        
        result = runner.invoke(run, ["false"])
        assert result.exit_code == 1


class TestDoctorCommand:
    """Test doctor command."""
    
    @patch("mltrack.cli.check_environment")
    def test_doctor_all_checks_pass(self, mock_check_env, runner):
        """Test doctor when all checks pass."""
        # Mock successful environment check
        mock_check_env.return_value = {
            "uv_available": True,
            "uv_project": True,
            "mlflow_available": True,
            "git_available": True,
            "git_repo": True,
            "config_exists": True,
            "tracking_uri_accessible": True,
            "warnings": []
        }
        
        result = runner.invoke(doctor)
        assert result.exit_code == 0
        assert "All checks passed" in result.output
    
    @patch("mltrack.cli.check_environment") 
    def test_doctor_with_warnings(self, mock_check_env, runner):
        """Test doctor with warnings."""
        mock_check_env.return_value = {
            "uv_available": True,
            "uv_project": False,
            "mlflow_available": True,
            "git_available": True,
            "git_repo": True,
            "config_exists": True,
            "tracking_uri_accessible": True,
            "warnings": ["Not using UV for environment management"]
        }
        
        result = runner.invoke(doctor)
        assert result.exit_code == 0
        assert "Not using UV" in result.output
    
    @patch("mltrack.cli.check_environment")
    def test_doctor_with_errors(self, mock_check_env, runner):
        """Test doctor with errors."""
        mock_check_env.return_value = {
            "uv_available": False,
            "uv_project": False,
            "mlflow_available": False,
            "git_available": True,
            "git_repo": True,
            "config_exists": False,
            "tracking_uri_accessible": False,
            "warnings": []
        }
        
        result = runner.invoke(doctor)
        assert result.exit_code == 1
        assert "issues found" in result.output


class TestDemoCommand:
    """Test demo command."""
    
    @patch("mltrack.cli.create_demo")
    def test_demo_default_output(self, mock_create_demo, runner):
        """Test demo creates default file."""
        mock_create_demo.return_value = True
        
        result = runner.invoke(demo)
        assert result.exit_code == 0
        
        # Check default output file
        mock_create_demo.assert_called_once_with("mltrack_demo.py")
    
    @patch("mltrack.cli.create_demo")
    def test_demo_custom_output(self, mock_create_demo, runner):
        """Test demo with custom output file."""
        mock_create_demo.return_value = True
        
        result = runner.invoke(demo, ["--output", "my_demo.py"])
        assert result.exit_code == 0
        
        # Check custom output file
        mock_create_demo.assert_called_once_with("my_demo.py")
    
    @patch("mltrack.cli.create_demo")
    def test_demo_creation_failure(self, mock_create_demo, runner):
        """Test demo handles creation failure."""
        mock_create_demo.side_effect = Exception("Failed to create demo")
        
        result = runner.invoke(demo)
        assert result.exit_code == 1
        assert "Failed to create demo" in result.output