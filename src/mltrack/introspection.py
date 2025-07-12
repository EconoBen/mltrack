"""Model introspection for automatic type and task detection."""

from typing import Dict, Any, Optional, Tuple, List
import inspect
import importlib


class ModelIntrospector:
    """Introspect models to detect their type, task, and other metadata."""
    
    # Sklearn classifier and regressor base classes
    SKLEARN_CLASSIFIERS = {
        "LogisticRegression", "RandomForestClassifier", "GradientBoostingClassifier",
        "SVC", "KNeighborsClassifier", "DecisionTreeClassifier", "GaussianNB",
        "MultinomialNB", "BernoulliNB", "AdaBoostClassifier", "ExtraTreesClassifier",
        "MLPClassifier", "RidgeClassifier", "SGDClassifier", "PassiveAggressiveClassifier",
        "Perceptron", "LinearSVC", "NuSVC", "HistGradientBoostingClassifier"
    }
    
    SKLEARN_REGRESSORS = {
        "LinearRegression", "Ridge", "Lasso", "ElasticNet", "RandomForestRegressor",
        "GradientBoostingRegressor", "SVR", "KNeighborsRegressor", "DecisionTreeRegressor",
        "AdaBoostRegressor", "ExtraTreesRegressor", "MLPRegressor", "SGDRegressor",
        "PassiveAggressiveRegressor", "HuberRegressor", "LinearSVR", "NuSVR",
        "HistGradientBoostingRegressor", "BayesianRidge", "ARDRegression"
    }
    
    SKLEARN_CLUSTERERS = {
        "KMeans", "DBSCAN", "AgglomerativeClustering", "SpectralClustering",
        "Birch", "MeanShift", "AffinityPropagation", "OPTICS", "MiniBatchKMeans"
    }
    
    # XGBoost/LightGBM/CatBoost objectives
    CLASSIFICATION_OBJECTIVES = {
        # XGBoost
        "binary:logistic", "multi:softmax", "multi:softprob",
        # LightGBM
        "binary", "multiclass", "multiclassova",
        # CatBoost
        "Logloss", "MultiClass", "MultiClassOneVsAll"
    }
    
    REGRESSION_OBJECTIVES = {
        # XGBoost
        "reg:squarederror", "reg:squaredlogerror", "reg:logistic", "reg:gamma",
        "reg:tweedie", "reg:absoluteerror", "reg:quantileerror",
        # LightGBM
        "regression", "regression_l1", "huber", "fair", "poisson", "quantile",
        "mape", "gamma", "tweedie",
        # CatBoost
        "RMSE", "MAE", "Quantile", "LogLinQuantile", "Poisson", "MAPE", "Tweedie"
    }
    
    @classmethod
    def detect_model_type(cls, model: Any) -> Dict[str, str]:
        """Detect the model type and algorithm.
        
        Args:
            model: The model object to introspect
            
        Returns:
            Dictionary with model_type and algorithm
        """
        model_class_name = model.__class__.__name__
        module_name = model.__class__.__module__
        
        # Extract algorithm name
        algorithm = model_class_name.lower()
        
        # Detect framework
        framework = cls._detect_framework(module_name, model)
        
        return {
            "algorithm": algorithm,
            "model_type": model_class_name,
            "framework": framework
        }
    
    @classmethod
    def detect_task_type(cls, model: Any) -> str:
        """Detect the task type (classification, regression, clustering, etc.).
        
        Args:
            model: The model object to introspect
            
        Returns:
            Task type string
        """
        model_class_name = model.__class__.__name__
        
        # Check sklearn models
        if hasattr(model, '_sklearn_fitted'):
            if model_class_name in cls.SKLEARN_CLASSIFIERS:
                return "classification"
            elif model_class_name in cls.SKLEARN_REGRESSORS:
                return "regression"
            elif model_class_name in cls.SKLEARN_CLUSTERERS:
                return "clustering"
            
            # Check by base class
            if hasattr(model, 'predict_proba') and hasattr(model, 'classes_'):
                return "classification"
            elif hasattr(model, 'predict') and not hasattr(model, 'predict_proba'):
                return "regression"
            elif hasattr(model, 'fit_predict') or hasattr(model, 'labels_'):
                return "clustering"
        
        # Check XGBoost
        if hasattr(model, 'objective'):
            objective = str(model.objective) if hasattr(model.objective, '__call__') else model.objective
            if objective in cls.CLASSIFICATION_OBJECTIVES:
                return "classification"
            elif objective in cls.REGRESSION_OBJECTIVES:
                return "regression"
        
        # Check LightGBM
        if hasattr(model, 'params'):
            objective = model.params.get('objective', '')
            if objective in cls.CLASSIFICATION_OBJECTIVES:
                return "classification"
            elif objective in cls.REGRESSION_OBJECTIVES:
                return "regression"
        
        # Check CatBoost
        if hasattr(model, 'get_params'):
            params = model.get_params()
            loss_function = params.get('loss_function', '')
            if loss_function in cls.CLASSIFICATION_OBJECTIVES:
                return "classification"
            elif loss_function in cls.REGRESSION_OBJECTIVES:
                return "regression"
        
        # Check PyTorch models
        if hasattr(model, 'forward'):
            # This is a simple heuristic - could be enhanced
            if hasattr(model, 'num_classes'):
                return "classification"
            return "deep_learning"
        
        # Check for LLM models
        if hasattr(model, 'generate') or hasattr(model, 'chat'):
            return "llm"
        
        return "unknown"
    
    @classmethod
    def extract_model_metadata(cls, model: Any) -> Dict[str, Any]:
        """Extract comprehensive metadata from a model.
        
        Args:
            model: The model object to introspect
            
        Returns:
            Dictionary with model metadata
        """
        metadata = {}
        
        # Get basic type information
        type_info = cls.detect_model_type(model)
        task_type = cls.detect_task_type(model)
        
        metadata.update(type_info)
        metadata["task_type"] = task_type
        
        # Extract model-specific metadata
        if hasattr(model, 'get_params'):
            # Sklearn-style models
            try:
                metadata["parameters"] = model.get_params()
            except:
                pass
        
        # Extract feature information
        if hasattr(model, 'n_features_in_'):
            metadata["n_features_in"] = model.n_features_in_
        if hasattr(model, 'feature_names_in_'):
            metadata["feature_names_in"] = list(model.feature_names_in_)
        
        # Extract class information for classifiers
        if hasattr(model, 'classes_'):
            metadata["classes"] = list(model.classes_)
            metadata["n_classes"] = len(model.classes_)
        
        # Extract tree information
        if hasattr(model, 'n_estimators'):
            metadata["n_estimators"] = model.n_estimators
        if hasattr(model, 'max_depth'):
            metadata["max_depth"] = model.max_depth
        
        # Extract neural network information
        if hasattr(model, 'layers'):
            metadata["n_layers"] = len(model.layers)
        if hasattr(model, 'hidden_layer_sizes'):
            metadata["hidden_layer_sizes"] = model.hidden_layer_sizes
        
        # Extract feature importance if available
        if hasattr(model, 'feature_importances_'):
            metadata["has_feature_importance"] = True
        
        return metadata
    
    @classmethod
    def _detect_framework(cls, module_name: str, model: Any) -> str:
        """Detect the ML framework used.
        
        Args:
            module_name: Module name of the model class
            model: The model object
            
        Returns:
            Framework name
        """
        if 'sklearn' in module_name:
            return 'sklearn'
        elif 'xgboost' in module_name:
            return 'xgboost'
        elif 'lightgbm' in module_name:
            return 'lightgbm'
        elif 'catboost' in module_name:
            return 'catboost'
        elif 'torch' in module_name or hasattr(model, 'forward'):
            return 'pytorch'
        elif 'tensorflow' in module_name or 'keras' in module_name:
            return 'tensorflow'
        elif 'transformers' in module_name:
            return 'transformers'
        elif hasattr(model, '_client') and 'openai' in str(type(model._client)):
            return 'openai'
        elif hasattr(model, '_client') and 'anthropic' in str(type(model._client)):
            return 'anthropic'
        elif 'langchain' in module_name:
            return 'langchain'
        else:
            return 'unknown'
    
    @classmethod
    def generate_tags(cls, model: Any) -> Dict[str, str]:
        """Generate MLtrack tags for a model.
        
        Args:
            model: The model object
            
        Returns:
            Dictionary of tags
        """
        metadata = cls.extract_model_metadata(model)
        
        tags = {
            "mltrack.algorithm": metadata.get("algorithm", "unknown"),
            "mltrack.model_type": metadata.get("model_type", "unknown"),
            "mltrack.task": metadata.get("task_type", "unknown"),
            "mltrack.framework": metadata.get("framework", "unknown")
        }
        
        # Add category tag (ml vs llm)
        if metadata.get("task_type") == "llm":
            tags["mltrack.category"] = "llm"
        else:
            tags["mltrack.category"] = "ml"
        
        # Add additional metadata as tags
        if metadata.get("n_features_in"):
            tags["mltrack.n_features"] = str(metadata["n_features_in"])
        if metadata.get("n_classes"):
            tags["mltrack.n_classes"] = str(metadata["n_classes"])
        if metadata.get("n_estimators"):
            tags["mltrack.n_estimators"] = str(metadata["n_estimators"])
        
        return tags