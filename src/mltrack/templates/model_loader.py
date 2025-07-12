"""Template system for generating model loading code."""

from typing import Dict, Any, Optional, List
from string import Template
import json


class ModelLoaderTemplate:
    """Template system for generating efficient model loading code."""
    
    # Base template for all models
    BASE_TEMPLATE = Template('''"""
Auto-generated code to load and use model: ${model_name}
Version: ${version}
Registered: ${registered_at}
Model Type: ${model_type}
Task: ${task_type}
Framework: ${framework}
"""

import mlflow
from mltrack.model_registry import ModelRegistry
${additional_imports}

# Initialize registry
registry = ModelRegistry()

# Load model
model = registry.load_model(
    model_name="${model_name}",
    version="${version}"
)

# Model information
MODEL_INFO = {
    "name": "${model_name}",
    "version": "${version}",
    "stage": "${stage}",
    "framework": "${framework}",
    "model_type": "${model_type}",
    "task_type": "${task_type}",
    "metrics": ${metrics_json},
    "params": ${params_json}
}

${prediction_function}

${usage_examples}

${requirements_section}
''')

    # Framework-specific imports
    FRAMEWORK_IMPORTS = {
        "sklearn": "import numpy as np\nimport pandas as pd",
        "xgboost": "import numpy as np\nimport pandas as pd\nimport xgboost as xgb",
        "lightgbm": "import numpy as np\nimport pandas as pd\nimport lightgbm as lgb",
        "catboost": "import numpy as np\nimport pandas as pd\nimport catboost as cb",
        "pytorch": "import torch\nimport numpy as np",
        "tensorflow": "import tensorflow as tf\nimport numpy as np",
        "transformers": "from transformers import pipeline",
        "openai": "import openai",
        "anthropic": "import anthropic",
        "langchain": "from langchain.chains import LLMChain"
    }

    # Task-specific prediction functions
    PREDICTION_FUNCTIONS = {
        "classification": Template('''def predict(data):
    """Make predictions with the loaded model.
    
    Args:
        data: Input features as numpy array or pandas DataFrame
        
    Returns:
        Predicted classes
    """
    return model.predict(data)

def predict_proba(data):
    """Get prediction probabilities.
    
    Args:
        data: Input features as numpy array or pandas DataFrame
        
    Returns:
        Class probabilities
    """
    if hasattr(model, 'predict_proba'):
        return model.predict_proba(data)
    else:
        raise NotImplementedError("Model does not support probability predictions")
'''),
        
        "regression": Template('''def predict(data):
    """Make predictions with the loaded model.
    
    Args:
        data: Input features as numpy array or pandas DataFrame
        
    Returns:
        Predicted values
    """
    return model.predict(data)

def predict_with_uncertainty(data, n_iterations=100):
    """Get predictions with uncertainty estimates (if supported).
    
    Args:
        data: Input features
        n_iterations: Number of iterations for uncertainty estimation
        
    Returns:
        tuple: (predictions, uncertainties)
    """
    if hasattr(model, 'predict_dist'):
        return model.predict_dist(data)
    else:
        # Fallback to point predictions
        preds = model.predict(data)
        return preds, np.zeros_like(preds)
'''),
        
        "llm": Template('''def generate(prompt, **kwargs):
    """Generate text using the language model.
    
    Args:
        prompt: Input prompt text
        **kwargs: Additional generation parameters (temperature, max_tokens, etc.)
        
    Returns:
        Generated text or response object
    """
    return model.generate(prompt, **kwargs)

def chat(messages, **kwargs):
    """Chat with the model using a message history.
    
    Args:
        messages: List of message dictionaries with 'role' and 'content'
        **kwargs: Additional generation parameters
        
    Returns:
        Model response
    """
    if hasattr(model, 'chat'):
        return model.chat(messages, **kwargs)
    else:
        # Fallback to single generation
        prompt = messages[-1]['content'] if messages else ""
        return generate(prompt, **kwargs)
'''),
        
        "clustering": Template('''def predict(data):
    """Assign cluster labels to data points.
    
    Args:
        data: Input features as numpy array or pandas DataFrame
        
    Returns:
        Cluster labels
    """
    return model.predict(data)

def transform(data):
    """Transform data to cluster distance space.
    
    Args:
        data: Input features
        
    Returns:
        Distances to cluster centers
    """
    if hasattr(model, 'transform'):
        return model.transform(data)
    else:
        raise NotImplementedError("Model does not support transform")
''')
    }

    # Usage examples by task type
    USAGE_EXAMPLES = {
        "classification": '''# Example usage for classification
import numpy as np

# Single prediction
sample_data = np.array([[1.0, 2.0, 3.0, 4.0]])  # Adjust features as needed
prediction = predict(sample_data)
print(f"Predicted class: {prediction}")

# Probability predictions
try:
    probabilities = predict_proba(sample_data)
    print(f"Class probabilities: {probabilities}")
except NotImplementedError:
    print("Probability predictions not available for this model")
''',
        
        "regression": '''# Example usage for regression
import numpy as np

# Single prediction
sample_data = np.array([[1.0, 2.0, 3.0, 4.0]])  # Adjust features as needed
prediction = predict(sample_data)
print(f"Predicted value: {prediction}")

# With uncertainty (if supported)
try:
    pred, uncertainty = predict_with_uncertainty(sample_data)
    print(f"Prediction: {pred} ± {uncertainty}")
except:
    print("Uncertainty estimation not available")
''',
        
        "llm": '''# Example usage for language model
# Text generation
response = generate("Explain machine learning in simple terms", 
                   temperature=0.7, 
                   max_tokens=150)
print(response)

# Chat interface
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is the weather like?"}
]
chat_response = chat(messages, temperature=0.7)
print(chat_response)
''',
        
        "clustering": '''# Example usage for clustering
import numpy as np

# Predict cluster for new data
sample_data = np.array([[1.0, 2.0, 3.0, 4.0]])  # Adjust features as needed
cluster = predict(sample_data)
print(f"Assigned to cluster: {cluster}")

# Get distances to clusters
try:
    distances = transform(sample_data)
    print(f"Distances to clusters: {distances}")
except NotImplementedError:
    print("Transform not available for this model")
'''
    }

    @classmethod
    def generate_code(
        cls,
        model_info: Dict[str, Any],
        include_requirements: bool = True
    ) -> str:
        """Generate model loading code from metadata.
        
        Args:
            model_info: Model metadata dictionary
            include_requirements: Include pip requirements section
            
        Returns:
            Generated Python code
        """
        # Extract model type and task information
        model_type = model_info.get("model_type", "unknown")
        task_type = model_info.get("task_type", "unknown")
        framework = model_info.get("framework", "unknown")
        
        # Get framework-specific imports
        additional_imports = cls.FRAMEWORK_IMPORTS.get(framework, "")
        
        # Get task-specific prediction function
        pred_func_template = cls.PREDICTION_FUNCTIONS.get(
            task_type, 
            cls.PREDICTION_FUNCTIONS["regression"]  # Default fallback
        )
        prediction_function = pred_func_template.substitute()
        
        # Get usage examples
        usage_examples = cls.USAGE_EXAMPLES.get(
            task_type,
            cls.USAGE_EXAMPLES["regression"]  # Default fallback
        )
        
        # Prepare requirements section
        requirements_section = ""
        if include_requirements:
            requirements = model_info.get("custom_metadata", {}).get("requirements", [])
            if requirements:
                requirements_section = f'# Requirements:\n# pip install {" ".join(requirements)}'
        
        # Prepare template variables
        template_vars = {
            "model_name": model_info.get("model_name", "unknown"),
            "version": model_info.get("version", "unknown"),
            "registered_at": model_info.get("registered_at", "unknown"),
            "stage": model_info.get("stage", "unknown"),
            "framework": framework,
            "model_type": model_type,
            "task_type": task_type,
            "metrics_json": json.dumps(model_info.get("metrics", {}), indent=8),
            "params_json": json.dumps(model_info.get("params", {}), indent=8),
            "additional_imports": additional_imports,
            "prediction_function": prediction_function,
            "usage_examples": usage_examples,
            "requirements_section": requirements_section
        }
        
        # Generate code
        return cls.BASE_TEMPLATE.substitute(**template_vars)

    @classmethod
    def get_cached_template_key(cls, model_info: Dict[str, Any]) -> str:
        """Generate a cache key for the template.
        
        Args:
            model_info: Model metadata
            
        Returns:
            Cache key string
        """
        return f"{model_info.get('model_name')}:{model_info.get('version')}:{model_info.get('model_type')}:{model_info.get('task_type')}"