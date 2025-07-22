#!/usr/bin/env python3
"""
Quick Start Demo - Minimal MLtrack Example
Shows the simplicity of mltrack in < 20 lines
"""

from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from mltrack import track

@track
def train_model():
    # Generate data
    X, y = make_classification(n_samples=1000, n_features=20, n_classes=2)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    # Train model - everything is automatically tracked!
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"Model accuracy: {accuracy:.3f}")
    return model

if __name__ == "__main__":
    print("🚀 MLtrack Quick Start Demo")
    print("This shows how simple tracking can be!\n")
    
    model = train_model()
    
    print("\n✅ Done! Run 'mltrack ui' to see your tracked experiment")