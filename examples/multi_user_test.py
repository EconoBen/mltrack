#!/usr/bin/env python
"""Test script to create runs from different users."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from mltrack import track
import mlflow
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

# Set tracking URI and experiment
import mltrack
mlflow.set_tracking_uri("mlruns")

# Override the default experiment for this test
original_exp = os.environ.get('MLFLOW_EXPERIMENT_NAME')
os.environ['MLFLOW_EXPERIMENT_NAME'] = 'multi-user-test'

# Generate data once
X = np.random.rand(100, 5)
y = (X[:, 0] + X[:, 1] > 1).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

print("🧪 Multi-User Test\n")

# Run 1: Ben's run (current user)
@track(name="ben-random-forest")
def train_ben_model():
    """Train a model as Ben."""
    model = RandomForestClassifier(n_estimators=20, random_state=42)
    model.fit(X_train, y_train)
    accuracy = model.score(X_test, y_test)
    mlflow.log_metric("accuracy", accuracy)
    print(f"Ben's model accuracy: {accuracy:.3f}")
    return model

# Run 2: Alice's run (simulating a different user)
def train_alice_model():
    """Train a model as Alice."""
    # Temporarily set Alice's API key
    original_key = os.environ.get('MLTRACK_API_KEY')
    os.environ['MLTRACK_API_KEY'] = 'mltrack_EO1MsllVJmY8_wY20vVq8_ct9FQjqR_FgV1hkZv6ZjY'
    
    @track(name="alice-logistic-regression")
    def _train():
        model = LogisticRegression(random_state=42)
        model.fit(X_train, y_train)
        accuracy = model.score(X_test, y_test)
        mlflow.log_metric("accuracy", accuracy)
        print(f"Alice's model accuracy: {accuracy:.3f}")
        return model
    
    result = _train()
    
    # Restore original key
    if original_key:
        os.environ['MLTRACK_API_KEY'] = original_key
    else:
        os.environ.pop('MLTRACK_API_KEY', None)
    
    return result

# Run both models
print("Training Ben's model...")
ben_model = train_ben_model()

print("\nTraining Alice's model...")
alice_model = train_alice_model()

print("\n✅ Test complete!")
print("\nTo test user filtering:")
print("1. Run: mltrack ui --modern")
print("2. Navigate to the experiments page")
print("3. Use the Users filter dropdown to filter by:")
print("   - Individual users (Ben or Alice)")
print("   - Teams (Research)")
print("   - 'My Runs Only' option")

# Restore original experiment
if original_exp:
    os.environ['MLFLOW_EXPERIMENT_NAME'] = original_exp
else:
    os.environ.pop('MLFLOW_EXPERIMENT_NAME', None)