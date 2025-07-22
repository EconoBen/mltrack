"""Example demonstrating data lineage tracking with MLTrack."""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

from mltrack import track, track_input, track_output, track_transformation
from mltrack import DataSourceType, TransformationType, add_parent_run
import mlflow


@track(name="data-preprocessing")
def preprocess_data(input_file: str) -> tuple:
    """Load and preprocess data with lineage tracking."""
    # Track input data source
    track_input(
        input_file, 
        source_type=DataSourceType.FILE,
        format="csv",
        description="Raw customer data"
    )
    
    # Load data
    df = pd.read_csv(input_file)
    mlflow.log_metric("raw_samples", len(df))
    
    # Track transformation: cleaning
    track_transformation(
        name="clean_missing_values",
        transform_type=TransformationType.PREPROCESSING,
        description="Remove rows with missing values",
        parameters={"strategy": "drop_na"}
    )
    df_clean = df.dropna()
    mlflow.log_metric("cleaned_samples", len(df_clean))
    
    # Track transformation: feature engineering
    track_transformation(
        name="create_features",
        transform_type=TransformationType.FEATURE_ENGINEERING,
        description="Create derived features",
        parameters={"features": ["age_group", "income_bracket"]}
    )
    
    # Simple feature engineering
    df_clean['age_group'] = pd.cut(df_clean['age'], bins=[0, 30, 50, 100])
    df_clean['income_bracket'] = pd.qcut(df_clean['income'], q=4)
    
    # Prepare features and target
    feature_cols = ['feature1', 'feature2', 'feature3']
    X = df_clean[feature_cols].values
    y = df_clean['target'].values
    
    # Track output
    output_path = "data/preprocessed_data.npz"
    track_output(
        output_path,
        source_type=DataSourceType.FILE,
        format="npz",
        description="Preprocessed feature matrix and labels"
    )
    
    # Save preprocessed data
    np.savez(output_path, X=X, y=y)
    
    return X, y, mlflow.active_run().info.run_id


@track(name="model-training")
def train_model(X, y, preprocessing_run_id: str):
    """Train a model with lineage tracking."""
    # Add parent run relationship
    add_parent_run(preprocessing_run_id)
    
    # Track input from previous step
    track_input(
        "data/preprocessed_data.npz",
        source_type=DataSourceType.FILE,
        format="npz",
        description="Preprocessed data from previous step"
    )
    
    # Split data
    track_transformation(
        name="train_test_split",
        transform_type=TransformationType.SPLITTING,
        parameters={"test_size": 0.2, "random_state": 42}
    )
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    track_transformation(
        name="standard_scaling",
        transform_type=TransformationType.NORMALIZATION,
        description="Standardize features to zero mean and unit variance"
    )
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    train_acc = accuracy_score(y_train, model.predict(X_train_scaled))
    test_acc = accuracy_score(y_test, model.predict(X_test_scaled))
    
    mlflow.log_metric("train_accuracy", train_acc)
    mlflow.log_metric("test_accuracy", test_acc)
    
    # Track model output
    model_path = "models/random_forest.pkl"
    track_output(
        model_path,
        source_type=DataSourceType.FILE,
        format="pkl",
        description="Trained Random Forest model"
    )
    
    return model, test_acc, mlflow.active_run().info.run_id


@track(name="model-evaluation")
def evaluate_model(model_run_id: str, test_data_path: str):
    """Evaluate model on new test data."""
    # Add parent relationship to model training run
    add_parent_run(model_run_id)
    
    # Track new test data input
    track_input(
        test_data_path,
        source_type=DataSourceType.FILE,
        format="csv",
        description="New test dataset for evaluation"
    )
    
    # Load and preprocess test data
    df_test = pd.read_csv(test_data_path)
    
    # Apply same transformations
    track_transformation(
        name="apply_preprocessing",
        transform_type=TransformationType.PREPROCESSING,
        description="Apply same preprocessing as training"
    )
    
    # ... evaluation logic ...
    
    # Track evaluation results
    results_path = "results/evaluation_report.json"
    track_output(
        results_path,
        source_type=DataSourceType.FILE,
        format="json",
        description="Model evaluation results"
    )
    
    return {"accuracy": 0.95, "f1_score": 0.93}


def demonstrate_lineage_tracking():
    """Demonstrate complete lineage tracking workflow."""
    print("Starting MLTrack lineage tracking demonstration...")
    
    # Create sample data
    print("Creating sample data...")
    np.random.seed(42)
    n_samples = 1000
    
    # Generate synthetic data
    data = pd.DataFrame({
        'age': np.random.randint(18, 80, n_samples),
        'income': np.random.exponential(50000, n_samples),
        'feature1': np.random.randn(n_samples),
        'feature2': np.random.randn(n_samples),
        'feature3': np.random.randn(n_samples),
        'target': np.random.randint(0, 2, n_samples)
    })
    
    # Save raw data
    data.to_csv("data/raw_data.csv", index=False)
    
    # Step 1: Preprocess data
    print("\nStep 1: Preprocessing data...")
    X, y, prep_run_id = preprocess_data("data/raw_data.csv")
    print(f"Preprocessing complete. Run ID: {prep_run_id}")
    
    # Step 2: Train model
    print("\nStep 2: Training model...")
    model, accuracy, train_run_id = train_model(X, y, prep_run_id)
    print(f"Model training complete. Accuracy: {accuracy:.3f}, Run ID: {train_run_id}")
    
    # Step 3: Evaluate on new data
    print("\nStep 3: Evaluating model on new data...")
    # Create new test data
    test_data = pd.DataFrame({
        'age': np.random.randint(18, 80, 200),
        'income': np.random.exponential(50000, 200),
        'feature1': np.random.randn(200),
        'feature2': np.random.randn(200),
        'feature3': np.random.randn(200),
        'target': np.random.randint(0, 2, 200)
    })
    test_data.to_csv("data/new_test_data.csv", index=False)
    
    results = evaluate_model(train_run_id, "data/new_test_data.csv")
    print(f"Evaluation complete. Results: {results}")
    
    print("\n✅ Lineage tracking demonstration complete!")
    print("\nTo view the lineage:")
    print("1. Open MLflow UI: mlflow ui")
    print("2. Navigate to any of the runs")
    print("3. Check the 'Artifacts' tab for lineage/lineage.json")
    print("4. Check tags starting with 'mltrack.lineage' for quick stats")


if __name__ == "__main__":
    # Create data directory
    import os
    os.makedirs("data", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    demonstrate_lineage_tracking()