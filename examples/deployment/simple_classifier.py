"""Simple classifier example demonstrating the new deployment workflow."""

from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from mltrack import track


@track(name="iris-classifier")
def train_iris_classifier():
    """Train a simple classifier on the Iris dataset."""
    # Load data
    iris = load_iris()
    X, y = iris.data, iris.target
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    
    print(f"Accuracy: {accuracy:.2f}")
    
    # The model is automatically tracked by MLTrack
    return model


if __name__ == "__main__":
    # Train the model
    print("🎯 Training Iris classifier...")
    model = train_iris_classifier()
    
    print("\n✅ Model trained and tracked!")
    print("\n📦 Next steps:")
    print("   1. Save:  ml save iris-classifier")
    print("   2. Ship:  ml ship iris-classifier")
    print("   3. Serve: ml serve iris-classifier")
    print("   4. Try:   ml try iris-classifier")