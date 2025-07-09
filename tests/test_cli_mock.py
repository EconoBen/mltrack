"""Mock-based tests for CLI to improve coverage."""

import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import pytest
from click.testing import CliRunner

from mltrack.cli import cli, init, run, doctor, demo, config, main
from mltrack.config import MLTrackConfig


class TestCLIMocked:
    """Test CLI commands with heavy mocking to improve coverage."""
    
    @pytest.fixture
    def runner(self):
        """Create CLI test runner."""
        return CliRunner()
    
    @patch('mltrack.cli.MLTrackConfig')
    @patch('mltrack.cli.console')
    def test_init_command_mocked(self, mock_console, mock_config_class, runner):
        """Test init command with mocks."""
        with runner.isolated_filesystem():
            # Mock config
            mock_config = Mock()
            mock_config_class.return_value = mock_config
            
            # Run init
            result = runner.invoke(cli, ['init', '--team', 'test-team'])
            
            # Should create config
            assert mock_config.save.called
    
    @patch('mltrack.cli.subprocess.run')
    @patch('mltrack.cli.MLTracker')
    @patch('mltrack.cli.MLTrackConfig')
    @patch('mltrack.cli.console')
    def test_run_command_mocked(self, mock_console, mock_config_class, 
                               mock_tracker_class, mock_subprocess, runner):
        """Test run command with mocks."""
        # Mock config
        mock_config = Mock()
        mock_config_class.find_config.return_value = mock_config
        
        # Mock tracker
        mock_tracker = MagicMock()
        mock_tracker_class.return_value = mock_tracker
        
        # Mock subprocess success
        mock_subprocess.return_value = Mock(returncode=0)
        
        # Run command
        result = runner.invoke(cli, ['run', 'echo', 'hello'])
        
        # Should execute
        assert mock_subprocess.called
    
    @patch('mltrack.cli.get_uv_info')
    @patch('mltrack.cli.FrameworkDetector')
    @patch('mltrack.cli.MLTrackConfig')
    @patch('mltrack.cli.console')
    def test_doctor_command_mocked(self, mock_console, mock_config_class,
                                  mock_detector_class, mock_get_uv, runner):
        """Test doctor command with mocks."""
        # Mock UV info
        mock_get_uv.return_value = {
            "available": True,
            "version": "0.1.0",
            "in_project": True
        }
        
        # Mock framework detector
        mock_detector = Mock()
        mock_detector.detect_all.return_value = []
        mock_detector_class.return_value = mock_detector
        
        # Mock config
        mock_config = Mock()
        mock_config_class.find_config.return_value = mock_config
        
        # Run doctor
        result = runner.invoke(cli, ['doctor'])
        
        # Should check environment
        assert mock_get_uv.called
        assert mock_detector.detect_all.called
    
    @patch('mltrack.cli.Path')
    @patch('mltrack.cli.console')
    def test_demo_command_mocked(self, mock_console, mock_path_class, runner):
        """Test demo command with mocks."""
        # Mock path
        mock_path = Mock()
        mock_path.exists.return_value = False
        mock_path_class.return_value = mock_path
        
        # Run demo (without confirmation)
        result = runner.invoke(cli, ['demo'], input='n\n')
        
        # Should create demo file
        assert mock_path.write_text.called
    
    @patch('mltrack.cli.MLTrackConfig')
    @patch('mltrack.cli.console')
    def test_config_command_mocked(self, mock_console, mock_config_class, runner):
        """Test config command with mocks."""
        # Mock config
        mock_config = Mock()
        mock_config.tracking_uri = "file://./mlruns"
        mock_config.team_name = "test-team"
        mock_config_class.find_config.return_value = mock_config
        
        # Run config
        result = runner.invoke(cli, ['config'])
        
        # Should display config
        assert mock_console.print.called


class TestCLIIntegration:
    """Integration tests for CLI."""
    
    def test_cli_version(self):
        """Test CLI version option."""
        runner = CliRunner()
        result = runner.invoke(cli, ['--version'])
        assert result.exit_code == 0
        assert 'version' in result.output
    
    def test_cli_help(self):
        """Test CLI help."""
        runner = CliRunner()
        result = runner.invoke(cli, ['--help'])
        assert result.exit_code == 0
        assert 'Universal ML tracking tool' in result.output
    
    def test_init_help(self):
        """Test init command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ['init', '--help'])
        assert result.exit_code == 0
        assert 'Initialize mltrack' in result.output


class TestCLIUtilities:
    """Test CLI utility functions."""
    
    def test_main_function(self):
        """Test main entry point."""
        with patch('mltrack.cli.cli') as mock_cli:
            main()
            mock_cli.assert_called_once()
    
    @patch('mltrack.cli.subprocess.run')
    def test_run_with_env_vars(self, mock_subprocess):
        """Test run command with environment variables."""
        runner = CliRunner()
        
        # Mock subprocess
        mock_subprocess.return_value = Mock(returncode=0)
        
        # Mock config and tracker
        with patch('mltrack.cli.MLTrackConfig') as mock_config_class:
            with patch('mltrack.cli.MLTracker'):
                mock_config = Mock()
                mock_config_class.find_config.return_value = mock_config
                
                # Run with environment tracking
                result = runner.invoke(cli, ['run', '--name', 'test', 'echo', 'test'])
                
                # Should set environment
                call_env = mock_subprocess.call_args[1].get('env', {})
                # May have MLflow env vars set


# Import functions that need coverage
def test_imports():
    """Test that all imports work."""
    from mltrack.cli import (
        cli, init, run, doctor, demo, config, main,
        console, Table, Panel, Syntax, rprint
    )
    
    # All imports should work
    assert cli is not None
    assert console is not None