#!/usr/bin/env python
"""Demonstration of S3 integration with MLTrack.

This example shows how to:
1. Store experiment data in S3
2. Use content-addressable storage for deduplication
3. Organize runs by different patterns
4. Register models with S3 backing
"""

import pandas as pd
import numpy as np
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from mltrack import track
from mltrack.data_store_v2 import FlexibleDataStore, RunType, StorageMode
from mltrack.model_registry import ModelRegistry


def demo_basic_s3_storage():
    """Demonstrate basic S3 storage functionality."""
    print("🚀 S3 Storage Demo\n")
    
    # Initialize data store with S3
    # Replace with your bucket name
    store = FlexibleDataStore(
        s3_bucket="your-mltrack-bucket",  # Change this!
        s3_prefix="demo"
    )
    
    if not store.s3_client:
        print("⚠️  S3 not configured. Using local storage only.")
        print("   Set AWS credentials and bucket name to enable S3.")
        return
    
    print(f"✅ Connected to S3 bucket: {store.s3_bucket}\n")
    
    # 1. Store some experiment data
    print("1️⃣ Storing experiment data...")
    
    # Create sample data
    experiment_data = {
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 10,
            "min_samples_split": 2
        },
        "environment": {
            "python_version": "3.9.0",
            "sklearn_version": "1.0.0",
            "hardware": "GPU"
        }
    }
    
    # Store data - automatically deduplicated
    data_ref = store.store_data(
        data=experiment_data,
        name="experiment_config",
        metadata={"experiment": "rf_iris_classification"}
    )
    
    print(f"   Stored with hash: {data_ref.hash[:16]}...")
    print(f"   Size: {data_ref.size} bytes\n")
    
    # 2. Store a pandas DataFrame
    print("2️⃣ Storing training data...")
    
    iris = load_iris()
    df = pd.DataFrame(iris.data, columns=iris.feature_names)
    df['target'] = iris.target
    
    data_ref = store.store_data(
        data=df,
        name="iris_dataset",
        metadata={"rows": len(df), "features": len(iris.feature_names)}
    )
    
    print(f"   Stored DataFrame with {len(df)} rows")
    print(f"   Hash: {data_ref.hash[:16]}...\n")
    
    # 3. Demonstrate deduplication
    print("3️⃣ Testing deduplication...")
    
    # Store the same data again
    data_ref2 = store.store_data(
        data=df,
        name="iris_dataset_copy"
    )
    
    print(f"   Original hash: {data_ref.hash[:16]}...")
    print(f"   Copy hash:     {data_ref2.hash[:16]}...")
    print(f"   ♻️  Data deduplicated! (hashes match: {data_ref.hash == data_ref2.hash})\n")
    
    # 4. Store a complete run
    print("4️⃣ Storing a complete ML run...")
    
    run_manifest = store.store_run(
        run_id="demo_run_001",
        run_type=RunType.EXPERIMENT,
        storage_mode=StorageMode.BY_PROJECT,
        project="iris_classification",
        data={
            "config": experiment_data,
            "train_data": df,
            "metrics": {"accuracy": 0.95, "f1_score": 0.94}
        },
        tags={"framework": "sklearn", "dataset": "iris"}
    )
    
    print(f"   Run ID: {run_manifest.run_id}")
    print(f"   Project: {run_manifest.project}")
    print(f"   Data artifacts: {list(run_manifest.data_refs.keys())}\n")
    
    # 5. List runs
    print("5️⃣ Listing stored runs...")
    
    runs = store.list_runs(storage_mode=StorageMode.BY_PROJECT)
    for run in runs[:5]:  # Show first 5
        print(f"   - {run.run_id} ({run.run_type.value})")
    
    print(f"\n✅ S3 integration demo complete!")
    print(f"   Data stored in: s3://{store.s3_bucket}/{store.s3_prefix}/")


@track(name="iris-classifier-s3-demo")
def train_with_s3_storage():
    """Train a model with automatic S3 storage."""
    print("\n🤖 Training Model with S3 Storage\n")
    
    # Load data
    iris = load_iris()
    X_train, X_test, y_train, y_test = train_test_split(
        iris.data, iris.target, test_size=0.2, random_state=42
    )
    
    # Initialize S3-backed data store
    store = FlexibleDataStore(
        s3_bucket="your-mltrack-bucket",  # Change this!
        s3_prefix="models"
    )
    
    # Store training data
    if store.s3_client:
        print("📤 Uploading training data to S3...")
        
        train_df = pd.DataFrame(X_train, columns=iris.feature_names)
        train_df['target'] = y_train
        
        train_ref = store.store_data(
            data=train_df,
            name="iris_train_data",
            metadata={"split": "train", "size": len(train_df)}
        )
        
        print(f"   Stored training data: {train_ref.hash[:16]}...")
    
    # Train model
    print("\n🎯 Training RandomForest classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"   Accuracy: {accuracy:.3f}")
    
    # Store evaluation results
    if store.s3_client:
        eval_results = {
            "accuracy": accuracy,
            "classification_report": classification_report(y_test, y_pred),
            "predictions": y_pred.tolist(),
            "true_labels": y_test.tolist()
        }
        
        eval_ref = store.store_data(
            data=eval_results,
            name="evaluation_results",
            metadata={"model": "RandomForestClassifier", "dataset": "iris"}
        )
        
        print(f"   Stored evaluation results: {eval_ref.hash[:16]}...")
    
    return model


def demo_model_registry_s3():
    """Demonstrate model registry with S3 backing."""
    print("\n📦 Model Registry S3 Demo\n")
    
    # Initialize registry with S3
    registry = ModelRegistry(
        s3_bucket="your-mltrack-bucket",  # Change this!
        s3_prefix="model-registry"
    )
    
    if not registry.s3_client:
        print("⚠️  S3 not configured for model registry.")
        return
    
    print(f"✅ Model registry using S3: {registry.s3_bucket}\n")
    
    # List models (would show S3-backed models)
    print("📋 Models in registry:")
    models = registry.list_models()
    
    for model in models[:5]:
        print(f"   - {model['model_name']} v{model['version']}")
        if model.get('s3_location'):
            print(f"     S3: {model['s3_location']}")
    
    print(f"\n✅ Models are stored in S3 for durability and sharing!")


def main():
    """Run all demonstrations."""
    print("=" * 60)
    print("MLTrack S3 Integration Demo")
    print("=" * 60)
    
    # Basic S3 storage
    demo_basic_s3_storage()
    
    print("\n" + "=" * 60)
    
    # Training with S3
    model = train_with_s3_storage()
    
    print("\n" + "=" * 60)
    
    # Model registry
    demo_model_registry_s3()
    
    print("\n" + "=" * 60)
    print("✨ Demo complete! Check your S3 bucket for stored artifacts.")
    print("=" * 60)


if __name__ == "__main__":
    main()