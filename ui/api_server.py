"""Simple API server for mltrack UI to interact with model registry."""

import os
import sys
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add mltrack to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from mltrack.model_registry import ModelRegistry
from mltrack.config import MLTrackConfig

app = Flask(__name__)
CORS(app)


@app.route('/api/models/list', methods=['GET'])
def list_models():
    """List all models in the registry."""
    try:
        stage = request.args.get('stage')
        registry = ModelRegistry()
        models = registry.list_models(stage=stage)
        return jsonify({'models': models})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/models/info/<model_name>', methods=['GET'])
def model_info(model_name):
    """Get model information."""
    try:
        version = request.args.get('version')
        registry = ModelRegistry()
        model = registry.get_model(model_name, version)
        return jsonify(model)
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@app.route('/api/models/code/<model_name>', methods=['GET'])
def model_code(model_name):
    """Get model loading code."""
    try:
        version = request.args.get('version')
        registry = ModelRegistry()
        code = registry.generate_loading_code(model_name, version)
        return jsonify({'code': code})
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@app.route('/api/models/register', methods=['POST'])
def register_model():
    """Register a new model."""
    try:
        data = request.json
        registry = ModelRegistry(s3_bucket=data.get('s3Bucket'))
        
        model_info = registry.register_model(
            run_id=data['runId'],
            model_name=data['name'],
            model_path=data.get('path', 'model'),
            stage=data.get('stage', 'staging'),
            description=data.get('description'),
            tags=data.get('tags'),
            metadata=data.get('metadata')
        )
        
        return jsonify(model_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/models/transition', methods=['POST'])
def transition_model():
    """Transition model stage."""
    try:
        data = request.json
        registry = ModelRegistry()
        
        updated = registry.transition_model_stage(
            model_name=data['modelName'],
            version=data['version'],
            stage=data['stage'],
            archive_existing=data.get('archiveExisting', True)
        )
        
        return jsonify(updated)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Run on a different port than MLflow
    port = int(os.environ.get('MLTRACK_API_PORT', '5001'))
    app.run(debug=True, port=port)