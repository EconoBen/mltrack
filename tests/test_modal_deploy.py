"""Tests for Modal deployment functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock, mock_open
import tempfile
import json
from pathlib import Path

from mltrack.deploy.modal_deploy import (
    create_modal_app,
    deploy_to_modal,
    _generate_modal_script,
    _write_deployment_files,
    _run_modal_deploy
)


class TestModalDeployment:
    """Test Modal deployment functions."""
    
    def test_generate_modal_script(self):
        """Test generating Modal deployment script."""
        script = _generate_modal_script(
            model_name="test-model",
            model_version="1",
            model_type="sklearn"
        )
        
        # Verify script contains key elements
        assert "import modal" in script
        assert "test-model" in script
        assert "@app.function" in script
        assert "def predict" in script
        assert "mlflow" in script
        
    def test_generate_modal_script_pytorch(self):
        """Test generating Modal script for PyTorch."""
        script = _generate_modal_script(
            model_name="pytorch-model",
            model_version="2",
            model_type="pytorch"
        )
        
        assert "torch" in script
        assert "cuda" in script
        
    @patch('builtins.open', new_callable=mock_open)
    def test_write_deployment_files(self, mock_file):
        """Test writing deployment files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            deploy_dir = Path(tmpdir) / "deploy"
            
            _write_deployment_files(
                deploy_dir,
                model_name="test-model",
                model_version="1",
                model_type="sklearn"
            )
            
            # Verify files were written
            assert mock_file.call_count >= 2  # modal_app.py and requirements.txt
            
    @patch('mltrack.deploy.modal_deploy.subprocess.run')
    def test_run_modal_deploy_success(self, mock_subprocess):
        """Test running Modal deployment successfully."""
        mock_subprocess.return_value = Mock(
            returncode=0,
            stdout="Deployment successful\nURL: https://example.modal.run"
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _run_modal_deploy(Path(tmpdir))
            
            assert result["success"] is True
            assert result["url"] == "https://example.modal.run"
            assert "error" not in result
            
    @patch('mltrack.deploy.modal_deploy.subprocess.run')
    def test_run_modal_deploy_failure(self, mock_subprocess):
        """Test Modal deployment failure."""
        mock_subprocess.return_value = Mock(
            returncode=1,
            stdout="",
            stderr="Error: Authentication failed"
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _run_modal_deploy(Path(tmpdir))
            
            assert result["success"] is False
            assert "Authentication failed" in result["error"]
            
    @patch('mltrack.deploy.modal_deploy.mlflow')
    def test_create_modal_app(self, mock_mlflow):
        """Test creating Modal app."""
        # Mock MLflow model info
        mock_model = Mock()
        mock_model.flavors = {"sklearn": {"sklearn_version": "1.0.0"}}
        mock_mlflow.models.get_model_info.return_value = mock_model
        
        with tempfile.TemporaryDirectory() as tmpdir:
            app_dir = create_modal_app(
                model_uri="models:/test-model/1",
                app_name="test-app"
            )
            
            # Verify directory structure
            assert app_dir.exists()
            
    @patch('mltrack.deploy.modal_deploy._run_modal_deploy')
    @patch('mltrack.deploy.modal_deploy.create_modal_app')
    @patch('mltrack.deploy.modal_deploy.mlflow')
    def test_deploy_to_modal_full(self, mock_mlflow, mock_create_app, mock_run_deploy):
        """Test full deployment to Modal."""
        # Setup mocks
        mock_app_dir = Path("/tmp/modal-app")
        mock_create_app.return_value = mock_app_dir
        mock_run_deploy.return_value = {
            "success": True,
            "url": "https://test.modal.run",
            "app_id": "app-123"
        }
        
        # Mock MLflow client
        mock_client = Mock()
        mock_mlflow.tracking.MlflowClient.return_value = mock_client
        
        # Deploy
        result = deploy_to_modal(
            model_name="test-model",
            model_version="latest",
            app_name="test-app"
        )
        
        # Verify
        assert result["success"] is True
        assert result["url"] == "https://test.modal.run"
        assert mock_create_app.called
        assert mock_run_deploy.called
        
        # Verify MLflow tags were set
        mock_client.set_model_version_tag.assert_called()
        
    def test_modal_script_inference_endpoint(self):
        """Test Modal script has proper inference endpoint."""
        script = _generate_modal_script(
            model_name="api-model",
            model_version="1",
            model_type="sklearn"
        )
        
        # Check for FastAPI endpoint
        assert "@app.function" in script
        assert "def predict" in script
        assert "return" in script
        
    def test_modal_script_error_handling(self):
        """Test Modal script includes error handling."""
        script = _generate_modal_script(
            model_name="safe-model",
            model_version="1",
            model_type="sklearn"
        )
        
        # Should have try/except blocks
        assert "try:" in script
        assert "except" in script
        
    @patch('mltrack.deploy.modal_deploy.shutil.rmtree')
    @patch('mltrack.deploy.modal_deploy._run_modal_deploy')
    @patch('mltrack.deploy.modal_deploy.create_modal_app')
    def test_deploy_cleanup(self, mock_create_app, mock_run_deploy, mock_rmtree):
        """Test deployment cleanup on failure."""
        # Setup mocks
        mock_app_dir = Path("/tmp/modal-app")
        mock_create_app.return_value = mock_app_dir
        mock_run_deploy.side_effect = Exception("Deploy failed")
        
        # Deploy should not raise but return error
        with patch('mltrack.deploy.modal_deploy.mlflow'):
            result = deploy_to_modal("test-model", "1")
            
        # Verify cleanup
        assert result["success"] is False
        mock_rmtree.assert_called_with(mock_app_dir)