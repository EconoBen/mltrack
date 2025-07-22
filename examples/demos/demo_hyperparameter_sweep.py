#!/usr/bin/env python3
"""
Hyperparameter Sweep Demo
Shows how mltrack tracks multiple experiments automatically
"""

import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from mltrack import track, track_context
import warnings
warnings.filterwarnings('ignore')

print("🔬 MLtrack Hyperparameter Sweep Demo")
print("=" * 60)

# Generate dataset once
X, y = make_classification(
    n_samples=1000,
    n_features=20,
    n_informative=15,
    n_classes=2,
    random_state=42
)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("\nRunning hyperparameter sweep across multiple models...\n")

# 1. Random Forest sweep
print("🌲 Random Forest Experiments:")
with track_context("random-forest-sweep", tags={"model_type": "ensemble"}):
    for n_estimators in [50, 100, 200]:
        for max_depth in [None, 5, 10, 20]:
            @track(name=f"rf-n{n_estimators}-d{max_depth}")
            def train_rf():
                model = RandomForestClassifier(
                    n_estimators=n_estimators,
                    max_depth=max_depth,
                    random_state=42
                )
                model.fit(X_train, y_train)
                accuracy = model.score(X_test, y_test)
                return model, accuracy
            
            model, acc = train_rf()
            print(f"  RF(n={n_estimators}, depth={max_depth}): {acc:.3f}")

# 2. SVM sweep
print("\n🎯 SVM Experiments:")
with track_context("svm-sweep", tags={"model_type": "svm"}):
    for C in [0.1, 1.0, 10.0]:
        for kernel in ['linear', 'rbf']:
            @track(name=f"svm-C{C}-{kernel}")
            def train_svm():
                model = SVC(C=C, kernel=kernel, random_state=42)
                model.fit(X_train, y_train)
                accuracy = model.score(X_test, y_test)
                return model, accuracy
            
            model, acc = train_svm()
            print(f"  SVM(C={C}, kernel={kernel}): {acc:.3f}")

# 3. Logistic Regression sweep
print("\n📈 Logistic Regression Experiments:")
with track_context("logreg-sweep", tags={"model_type": "linear"}):
    for penalty in ['l1', 'l2']:
        for C in [0.01, 0.1, 1.0, 10.0]:
            @track(name=f"logreg-{penalty}-C{C}")
            def train_logreg():
                solver = 'liblinear' if penalty == 'l1' else 'lbfgs'
                model = LogisticRegression(
                    penalty=penalty,
                    C=C,
                    solver=solver,
                    random_state=42,
                    max_iter=1000
                )
                model.fit(X_train, y_train)
                accuracy = model.score(X_test, y_test)
                return model, accuracy
            
            model, acc = train_logreg()
            print(f"  LogReg(penalty={penalty}, C={C}): {acc:.3f}")

print("\n" + "=" * 60)
print("✅ Hyperparameter sweep complete!")
print("\n📊 View results in the UI:")
print("  1. Run: mltrack ui")
print("  2. Compare experiments side-by-side")
print("  3. Find the best hyperparameters")
print("  4. Visualize parameter impact on performance")