"""Tests for MLTrack deployment functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import tempfile
import json
from pathlib import Path

from mltrack.deployment.cli_shortcuts import (
    _prepare_model_files,
    _ship_to_modal,
    _try_model_modal,
    ship,
    try_model,
    save
)


class TestDeploymentShortcuts:
    """Test deployment CLI shortcuts."""
    
    @patch('mltrack.deployment.cli_shortcuts.mlflow')
    def test_save_model(self, mock_mlflow):
        """Test saving a model."""
        # Setup mock
        mock_run = Mock()
        mock_run.info.run_id = "test-run-123"
        mock_mlflow.active_run.return_value = mock_run
        
        # Test save
        result = save("test-model")
        
        # Verify
        assert result == "test-run-123"
        mock_mlflow.register_model.assert_called_once()
        
    @patch('mltrack.deployment.cli_shortcuts.mlflow')
    def test_save_model_no_active_run(self, mock_mlflow):
        """Test saving when no active run."""
        mock_mlflow.active_run.return_value = None
        
        with pytest.raises(RuntimeError, match="No active MLflow run"):
            save("test-model")
    
    def test_prepare_model_files(self):
        """Test preparing model files for deployment."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create mock model files
            model_dir = Path(tmpdir) / "model"
            model_dir.mkdir()
            
            # Create a fake model file
            model_file = model_dir / "model.pkl"
            model_file.write_text("fake model data")
            
            # Create requirements
            req_file = model_dir / "requirements.txt"
            req_file.write_text("mlflow==2.0.0\nnumpy==1.20.0")
            
            # Test prepare
            files = _prepare_model_files(str(model_dir))
            
            # Verify
            assert "model.pkl" in files
            assert files["model.pkl"] == "fake model data"
            assert "requirements.txt" in files
    
    @patch('mltrack.deployment.cli_shortcuts.subprocess.run')
    @patch('mltrack.deployment.cli_shortcuts._prepare_model_files')
    @patch('mltrack.deployment.cli_shortcuts.mlflow')
    def test_ship_to_modal(self, mock_mlflow, mock_prepare, mock_subprocess):
        """Test shipping to Modal."""
        # Setup mocks
        mock_prepare.return_value = {
            "model.pkl": "fake model",
            "requirements.txt": "mlflow==2.0.0"
        }
        mock_subprocess.return_value = Mock(returncode=0, stdout="Deployed!")
        
        # Mock MLflow client
        mock_client = Mock()
        mock_mlflow.tracking.MlflowClient.return_value = mock_client
        mock_mv = Mock()
        mock_mv.source = "models:/test-model/1"
        mock_client.get_model_version.return_value = mock_mv
        
        # Test ship
        result = _ship_to_modal("test-model", "latest")
        
        # Verify
        assert result is True
        mock_subprocess.assert_called_once()
        
    @patch('mltrack.deployment.cli_shortcuts.requests')
    def test_try_model_modal(self, mock_requests):
        """Test trying a deployed model."""
        # Setup mock response
        mock_response = Mock()
        mock_response.json.return_value = {"prediction": [1, 2, 3]}
        mock_response.raise_for_status = Mock()
        mock_requests.post.return_value = mock_response
        
        # Test data
        test_data = {"features": [[1.0, 2.0, 3.0]]}
        
        # Test try
        result = _try_model_modal("test-model", test_data)
        
        # Verify
        assert result == {"prediction": [1, 2, 3]}
        mock_requests.post.assert_called_once()
    
    @patch('mltrack.deployment.cli_shortcuts._ship_to_modal')
    def test_ship_command(self, mock_ship):
        """Test ship command."""
        mock_ship.return_value = True
        
        # Test
        ship("test-model", platform="modal")
        
        # Verify
        mock_ship.assert_called_once_with("test-model", "latest")
    
    def test_ship_unsupported_platform(self):
        """Test shipping to unsupported platform."""
        with pytest.raises(ValueError, match="Unsupported platform"):
            ship("test-model", platform="unsupported")
    
    @patch('mltrack.deployment.cli_shortcuts._try_model_modal')
    def test_try_command(self, mock_try):
        """Test try command."""
        mock_try.return_value = {"result": "success"}
        
        # Test
        result = try_model("test-model", {"data": [1, 2, 3]}, platform="modal")
        
        # Verify
        assert result == {"result": "success"}
        mock_try.assert_called_once()


class TestModalDeployment:
    """Test Modal-specific deployment."""
    
    @patch('mltrack.deployment.cli_shortcuts.mlflow')
    def test_get_model_artifacts(self, mock_mlflow):
        """Test retrieving model artifacts."""
        # This would test the internal logic of getting model files
        # from MLflow for deployment
        pass
    
    def test_create_modal_app(self):
        """Test creating Modal app code."""
        # This would test the Modal app generation logic
        pass