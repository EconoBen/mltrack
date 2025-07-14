#!/usr/bin/env python
"""Demo of user tracking in MLtrack."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from mltrack import track
from mltrack.user_info import get_current_user, setup_api_key
import mlflow
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

print("🔍 User Tracking Demo\n")

# Show current user
current_user = get_current_user()
print(f"Current user: {current_user.name} ({current_user.email})")
print(f"User ID: {current_user.id}")
if current_user.team:
    print(f"Team: {current_user.team}")
print()

# Option to set up API key for demo
if current_user.id == "anonymous":
    print("You're running as anonymous user.")
    print("To set up a user, run:")
    print("  mltrack user create --email your@email.com --name 'Your Name'")
    print()

# Set tracking URI
mlflow.set_tracking_uri("mlruns")
mlflow.set_experiment("user-tracking-demo")

@track(name="user-demo-model")
def train_model_with_user_tracking():
    """Train a model that tracks user information."""
    
    # Generate data
    X = np.random.rand(100, 5)
    y = (X[:, 0] + X[:, 1] > 1).astype(int)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3)
    
    # Train model
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Log metrics
    accuracy = model.score(X_test, y_test)
    mlflow.log_metric("accuracy", accuracy)
    
    print(f"Model trained with accuracy: {accuracy:.3f}")
    
    # Show tags that were logged
    run = mlflow.active_run()
    if run:
        tags = run.data.tags
        print("\nUser tags logged:")
        for key, value in tags.items():
            if key.startswith("mltrack.user"):
                print(f"  {key}: {value}")
    
    return model

# Run the demo
print("\n🚀 Training model with user tracking...\n")
model = train_model_with_user_tracking()

print("\n✅ Demo complete!")
print("\nTo see the tracked user information:")
print("1. Run: mltrack ui")
print("2. Open the 'user-tracking-demo' experiment")
print("3. Check the run tags for user information")