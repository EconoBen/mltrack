"""Basic usage example for mltrack."""

from mltrack import track, track_context
import mlflow
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


@track(name="feature-engineering")
def create_features(n_samples=1000, n_features=20):
    """Create synthetic features for demonstration."""
    X, y = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=15,
        n_redundant=5,
        random_state=42
    )
    return X, y


@track
def train_model(X_train, y_train, X_test, y_test, **params):
    """Train a Random Forest model with hyperparameters."""
    # Model will be auto-logged by MLflow sklearn integration
    model = RandomForestClassifier(**params, random_state=42)
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred = model.predict(X_test)
    
    # Log additional metrics
    mlflow.log_metrics({
        "test_accuracy": accuracy_score(y_test, y_pred),
        "test_precision": precision_score(y_test, y_pred, average='weighted'),
        "test_recall": recall_score(y_test, y_pred, average='weighted'),
        "test_f1": f1_score(y_test, y_pred, average='weighted'),
    })
    
    return model


def main():
    """Run the example."""
    print("🚀 mltrack Basic Usage Example\n")
    
    # Create features (tracked automatically)
    print("Creating features...")
    X, y = create_features(n_samples=2000)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Try different hyperparameters with context manager
    hyperparameter_sets = [
        {"n_estimators": 50, "max_depth": 10},
        {"n_estimators": 100, "max_depth": 15},
        {"n_estimators": 200, "max_depth": 20},
    ]
    
    models = []
    for i, params in enumerate(hyperparameter_sets):
        print(f"\nTraining model {i+1}/{len(hyperparameter_sets)}: {params}")
        
        # Using context manager for additional control
        with track_context(f"hyperparameter-search-{i+1}", tags={"stage": "tuning"}):
            # Log the hyperparameters we're trying
            mlflow.log_params(params)
            
            # Train model (also tracked via decorator)
            model = train_model(
                X_train, y_train, X_test, y_test,
                **params
            )
            models.append(model)
    
    print("\n✅ Example complete!")
    print("\nTo view results:")
    print("1. Run: mlflow ui")
    print("2. Open: http://localhost:5000")
    print("3. Compare the different runs")


if __name__ == "__main__":
    main()