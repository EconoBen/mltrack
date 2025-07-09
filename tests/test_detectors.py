"""Tests for ML framework detectors."""

import sys
from unittest.mock import Mock, patch, MagicMock
import pytest

from mltrack.detectors import FrameworkDetector, FrameworkInfo, get_model_info


class TestFrameworkDetector:
    """Test FrameworkDetector class."""
    
    @pytest.fixture
    def detector(self):
        """Create a FrameworkDetector instance."""
        return FrameworkDetector()
    
    def test_detect_all_no_frameworks(self, detector):
        """Test detect_all when no frameworks are installed."""
        with patch.object(detector, '_is_framework_available', return_value=False):
            frameworks = detector.detect_all()
            assert frameworks == []
    
    def test_detect_all_sklearn(self, detector):
        """Test detect_all with sklearn installed."""
        with patch.object(detector, '_is_framework_available') as mock_available:
            with patch.object(detector, '_get_framework_version') as mock_version:
                # Only sklearn is available
                def is_available(name):
                    return name == 'sklearn'
                
                mock_available.side_effect = is_available
                mock_version.return_value = "1.3.0"
                
                frameworks = detector.detect_all()
                
                assert len(frameworks) == 1
                assert frameworks[0].name == "scikit-learn"
                assert frameworks[0].import_name == "sklearn"
                assert frameworks[0].version == "1.3.0"
    
    def test_detect_all_multiple_frameworks(self, detector):
        """Test detect_all with multiple frameworks installed."""
        with patch.object(detector, '_is_framework_available') as mock_available:
            with patch.object(detector, '_get_framework_version') as mock_version:
                # sklearn and pytorch are available
                def is_available(name):
                    return name in ['sklearn', 'torch']
                
                def get_version(name):
                    versions = {
                        'sklearn': '1.3.0',
                        'torch': '2.0.1'
                    }
                    return versions.get(name, 'unknown')
                
                mock_available.side_effect = is_available
                mock_version.side_effect = get_version
                
                frameworks = detector.detect_all()
                
                assert len(frameworks) == 2
                framework_names = [f.name for f in frameworks]
                assert "scikit-learn" in framework_names
                assert "PyTorch" in framework_names
    
    def test_is_framework_available_true(self, detector):
        """Test _is_framework_available when module exists."""
        mock_module = Mock()
        with patch.dict(sys.modules, {'test_module': mock_module}):
            assert detector._is_framework_available('test_module') is True
    
    def test_is_framework_available_false(self, detector):
        """Test _is_framework_available when module doesn't exist."""
        with patch('builtins.__import__', side_effect=ImportError):
            assert detector._is_framework_available('nonexistent_module') is False
    
    def test_get_framework_version_with_version(self, detector):
        """Test _get_framework_version with __version__ attribute."""
        mock_module = Mock()
        mock_module.__version__ = "1.2.3"
        
        with patch.dict(sys.modules, {'test_module': mock_module}):
            version = detector._get_framework_version('test_module')
            assert version == "1.2.3"
    
    def test_get_framework_version_no_version(self, detector):
        """Test _get_framework_version without __version__ attribute."""
        mock_module = Mock(spec=[])  # No __version__ attribute
        
        with patch.dict(sys.modules, {'test_module': mock_module}):
            version = detector._get_framework_version('test_module')
            assert version == "unknown"
    
    def test_get_framework_version_import_error(self, detector):
        """Test _get_framework_version with import error."""
        with patch('builtins.__import__', side_effect=ImportError):
            version = detector._get_framework_version('nonexistent_module')
            assert version == "unknown"
    
    def test_setup_auto_logging_no_frameworks(self, detector):
        """Test setup_auto_logging with no frameworks."""
        with patch.object(detector, 'detect_all', return_value=[]):
            results = detector.setup_auto_logging()
            assert results == {}
    
    @patch('mltrack.detectors.mlflow')
    def test_setup_auto_logging_sklearn(self, mock_mlflow, detector):
        """Test setup_auto_logging with sklearn."""
        sklearn_info = FrameworkInfo(name="scikit-learn", import_name="sklearn", version="1.3.0")
        
        with patch.object(detector, 'detect_all', return_value=[sklearn_info]):
            results = detector.setup_auto_logging()
            
            assert results["scikit-learn"] is True
            mock_mlflow.sklearn.autolog.assert_called_once()
    
    @patch('mltrack.detectors.mlflow')
    def test_setup_auto_logging_multiple(self, mock_mlflow, detector):
        """Test setup_auto_logging with multiple frameworks."""
        frameworks = [
            FrameworkInfo(name="scikit-learn", import_name="sklearn", version="1.3.0"),
            FrameworkInfo(name="PyTorch", import_name="torch", version="2.0.1"),
            FrameworkInfo(name="XGBoost", import_name="xgboost", version="1.7.5")
        ]
        
        with patch.object(detector, 'detect_all', return_value=frameworks):
            results = detector.setup_auto_logging()
            
            assert results["scikit-learn"] is True
            assert results["PyTorch"] is True
            assert results["XGBoost"] is True
            
            mock_mlflow.sklearn.autolog.assert_called_once()
            mock_mlflow.pytorch.autolog.assert_called_once()
            mock_mlflow.xgboost.autolog.assert_called_once()
    
    @patch('mltrack.detectors.mlflow')
    def test_setup_auto_logging_error_handling(self, mock_mlflow, detector):
        """Test setup_auto_logging handles errors gracefully."""
        frameworks = [
            FrameworkInfo(name="scikit-learn", import_name="sklearn", version="1.3.0"),
            FrameworkInfo(name="PyTorch", import_name="torch", version="2.0.1")
        ]
        
        # Make sklearn autolog raise an exception
        mock_mlflow.sklearn.autolog.side_effect = Exception("Autolog error")
        
        with patch.object(detector, 'detect_all', return_value=frameworks):
            results = detector.setup_auto_logging()
            
            # sklearn should be False due to error
            assert results["scikit-learn"] is False
            # pytorch should still be True
            assert results["PyTorch"] is True
            
            mock_mlflow.sklearn.autolog.assert_called_once()
            mock_mlflow.pytorch.autolog.assert_called_once()
    
    @patch('mltrack.detectors.mlflow')
    def test_setup_auto_logging_unsupported_framework(self, mock_mlflow, detector):
        """Test setup_auto_logging with framework that has no autolog support."""
        # JAX doesn't have autolog support yet
        frameworks = [
            FrameworkInfo(name="JAX", import_name="jax", version="0.4.13")
        ]
        
        with patch.object(detector, 'detect_all', return_value=frameworks):
            results = detector.setup_auto_logging()
            
            # JAX should be False as it's not supported
            assert results["JAX"] is False


class TestGetModelInfo:
    """Test get_model_info function."""
    
    def test_get_model_info_sklearn(self):
        """Test get_model_info with sklearn model."""
        # Mock sklearn model
        mock_model = Mock()
        mock_model.__class__.__module__ = "sklearn.ensemble"
        mock_model.__class__.__name__ = "RandomForestClassifier"
        mock_model.get_params.return_value = {
            "n_estimators": 100,
            "max_depth": 10
        }
        
        info = get_model_info(mock_model)
        
        assert info["framework"] == "sklearn"
        assert info["model_type"] == "RandomForestClassifier"
        assert info["parameters"]["n_estimators"] == 100
        assert info["parameters"]["max_depth"] == 10
    
    def test_get_model_info_pytorch(self):
        """Test get_model_info with PyTorch model."""
        # Mock PyTorch model
        mock_model = Mock()
        mock_model.__class__.__module__ = "torch.nn.modules.container"
        mock_model.__class__.__name__ = "Sequential"
        
        # Mock named_parameters
        mock_params = [
            ("layer1.weight", Mock(numel=Mock(return_value=1000))),
            ("layer1.bias", Mock(numel=Mock(return_value=10))),
            ("layer2.weight", Mock(numel=Mock(return_value=100))),
            ("layer2.bias", Mock(numel=Mock(return_value=1)))
        ]
        mock_model.named_parameters.return_value = mock_params
        
        info = get_model_info(mock_model)
        
        assert info["framework"] == "torch"
        assert info["model_type"] == "Sequential"
        assert info["total_params"] == 1111
        assert "layer_params" in info
    
    def test_get_model_info_tensorflow(self):
        """Test get_model_info with TensorFlow model."""
        # Mock TensorFlow model
        mock_model = Mock()
        mock_model.__class__.__module__ = "tensorflow.python.keras.engine.sequential"
        mock_model.__class__.__name__ = "Sequential"
        mock_model.count_params.return_value = 5000
        
        # Mock model config
        mock_model.get_config.return_value = {
            "name": "sequential_1",
            "layers": [
                {"class_name": "Dense", "config": {"units": 128}},
                {"class_name": "Dense", "config": {"units": 10}}
            ]
        }
        
        info = get_model_info(mock_model)
        
        assert info["framework"] == "tensorflow"
        assert info["model_type"] == "Sequential"
        assert info["total_params"] == 5000
        assert "config" in info
    
    def test_get_model_info_unknown_model(self):
        """Test get_model_info with unknown model type."""
        # Mock unknown model
        mock_model = Mock()
        mock_model.__class__.__module__ = "custom.models"
        mock_model.__class__.__name__ = "CustomModel"
        
        info = get_model_info(mock_model)
        
        assert info["framework"] == "unknown"
        assert info["model_type"] == "CustomModel"
        assert info["module"] == "custom.models"
    
    def test_get_model_info_none(self):
        """Test get_model_info with None."""
        info = get_model_info(None)
        
        assert info["framework"] == "unknown"
        assert info["model_type"] == "NoneType"
        assert info["error"] is None