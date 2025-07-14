#!/usr/bin/env python
"""Demo of flexible data storage with deduplication and multiple organization patterns."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import mlflow

from mltrack import track
from mltrack.data_store_v2 import (
    FlexibleDataStore, 
    RunType, 
    StorageMode,
    capture_flexible_data
)


def demonstrate_data_deduplication():
    """Show how the same data is stored only once."""
    print("\n🔄 Demonstrating Data Deduplication")
    print("=" * 50)
    
    # Create a dataset
    X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
    df = pd.DataFrame(X, columns=[f"feature_{i}" for i in range(20)])
    df['target'] = y
    
    store = FlexibleDataStore()
    
    # Store the same data multiple times
    print("\nStoring the same dataset 3 times...")
    
    ref1 = store.store_data(df, "training_data_v1")
    print(f"First storage: {ref1.hash[:8]}... (size: {ref1.size_bytes:,} bytes)")
    
    ref2 = store.store_data(df, "training_data_v2")
    print(f"Second storage: {ref2.hash[:8]}... (size: {ref2.size_bytes:,} bytes)")
    
    ref3 = store.store_data(df, "training_data_v3")
    print(f"Third storage: {ref3.hash[:8]}... (size: {ref3.size_bytes:,} bytes)")
    
    print(f"\n✅ All three references point to the same data!")
    print(f"   Storage saved: {ref1.size_bytes * 2:,} bytes")


def demonstrate_run_types():
    """Show different types of runs with appropriate organization."""
    print("\n📁 Demonstrating Different Run Types")
    print("=" * 50)
    
    store = FlexibleDataStore()
    
    # 1. Development run
    print("\n1️⃣ Development Run:")
    dev_manifest = store.create_run(
        run_id="dev_run_001",
        run_type=RunType.DEVELOPMENT,
        project="feature_engineering",
        storage_modes=[StorageMode.BY_PROJECT, StorageMode.BY_DATE]
    )
    print(f"   Type: {dev_manifest.run_type.value}")
    print(f"   Stored in: {len(dev_manifest.storage_locations)} locations")
    for loc in dev_manifest.storage_locations:
        print(f"   - {loc}")
    
    # 2. Production run
    print("\n2️⃣ Production Run:")
    prod_manifest = store.create_run(
        run_id="prod_run_001",
        run_type=RunType.PRODUCTION,
        project="customer_churn_model",
        storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_MODEL],
        tags={"model_version": "v1.2.3", "environment": "production"}
    )
    print(f"   Type: {prod_manifest.run_type.value}")
    print(f"   Tags: {prod_manifest.tags}")
    
    # 3. Evaluation run
    print("\n3️⃣ Evaluation Run:")
    eval_manifest = store.create_run(
        run_id="eval_run_001",
        run_type=RunType.EVALUATION,
        project="model_benchmarks",
        storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_PROJECT],
        tags={"dataset": "test_set_2024", "benchmark": "accuracy"}
    )
    print(f"   Type: {eval_manifest.run_type.value}")
    print(f"   Purpose: Benchmarking models on standard dataset")


@track(name="experiment-with-shared-data")
def experiment_with_shared_data(X_train, y_train, X_test, y_test, experiment_num: int):
    """Simulate an experiment that reuses the same data."""
    # Train model with different parameters
    model = RandomForestClassifier(
        n_estimators=50 + experiment_num * 10,
        max_depth=5 + experiment_num,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)
    
    return model, accuracy


@capture_flexible_data(
    store_inputs=True,
    store_outputs=True,
    run_type=RunType.PRODUCTION,
    storage_modes=[StorageMode.BY_TYPE, StorageMode.BY_DATE],
    project="customer_churn"
)
def production_model_run(customer_data: pd.DataFrame, model_version: str):
    """Simulate a production model run."""
    # In production, we might process customer data and return predictions
    predictions = pd.DataFrame({
        'customer_id': range(len(customer_data)),
        'churn_probability': np.random.random(len(customer_data)),
        'risk_segment': np.random.choice(['low', 'medium', 'high'], len(customer_data))
    })
    
    mlflow.log_param("model_version", model_version)
    mlflow.log_metric("customers_processed", len(customer_data))
    
    return predictions


def demonstrate_shared_data_experiments():
    """Show how multiple experiments can share the same data."""
    print("\n🧪 Multiple Experiments with Shared Data")
    print("=" * 50)
    
    # Create dataset once
    X, y = make_classification(n_samples=5000, n_features=30, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Convert to DataFrames
    train_df = pd.DataFrame(X_train, columns=[f"feature_{i}" for i in range(30)])
    train_df['target'] = y_train
    test_df = pd.DataFrame(X_test, columns=[f"feature_{i}" for i in range(30)])
    test_df['target'] = y_test
    
    store = FlexibleDataStore()
    
    # Store data once
    print("\nStoring training and test data...")
    train_ref = store.store_data(train_df, "training_data")
    test_ref = store.store_data(test_df, "test_data")
    print(f"Training data: {train_ref.hash[:8]}... ({train_ref.size_bytes:,} bytes)")
    print(f"Test data: {test_ref.hash[:8]}... ({test_ref.size_bytes:,} bytes)")
    
    # Run multiple experiments with the same data
    print("\nRunning 3 experiments with the same data...")
    for i in range(3):
        with mlflow.start_run(run_name=f"shared_data_exp_{i}"):
            # Create manifest for this experiment
            manifest = store.create_run(
                run_id=mlflow.active_run().info.run_id,
                run_type=RunType.EXPERIMENT,
                project="hyperparameter_search",
                storage_modes=[StorageMode.BY_PROJECT]
            )
            
            # Add references to the shared data
            store.add_run_input(manifest, "training_data", train_df)
            store.add_run_input(manifest, "test_data", test_df)
            
            # Run experiment
            model, accuracy = experiment_with_shared_data(
                X_train, y_train, X_test, y_test, i
            )
            
            # Store outputs
            predictions = model.predict_proba(X_test)
            pred_df = pd.DataFrame(predictions, columns=['class_0_prob', 'class_1_prob'])
            store.add_run_output(manifest, "predictions", pred_df)
            
            # Save manifest
            store.save_manifest(manifest)
            
            print(f"   Experiment {i}: accuracy={accuracy:.3f}, data reused!")
    
    print("\n✅ All experiments used references to the same data!")
    print("   No data duplication occurred!")


def demonstrate_flexible_organization():
    """Show how runs can be organized in multiple ways."""
    print("\n🗂️  Flexible Run Organization")
    print("=" * 50)
    
    store = FlexibleDataStore()
    
    # Create a run that appears in multiple places
    print("\nCreating a model evaluation run...")
    manifest = store.create_run(
        run_id="multi_org_run_001",
        run_type=RunType.EVALUATION,
        project="model_comparison",
        storage_modes=[
            StorageMode.BY_PROJECT,  # For project tracking
            StorageMode.BY_DATE,     # For time-based analysis
            StorageMode.BY_TYPE      # For evaluation-specific views
        ],
        tags={
            "model_a": "random_forest_v2",
            "model_b": "xgboost_v1", 
            "dataset": "q4_2024_holdout"
        }
    )
    
    print(f"\nThis run is organized in {len(manifest.storage_locations)} ways:")
    print("1. By Project: Easy to find all model_comparison runs")
    print("2. By Date: See what was evaluated today")
    print("3. By Type: Find all evaluation runs across projects")
    print("\nUsers can access the same run through different organizational lenses!")


def main():
    """Run all demonstrations."""
    print("🚀 MLtrack Flexible Data Storage Demo")
    print("====================================")
    print("\nThis demo shows:")
    print("✨ Content-addressable storage with deduplication")
    print("🎯 Different run types (experiment/production/evaluation)")
    print("📊 Flexible organization patterns")
    print("💾 Efficient data reuse across runs")
    
    # Set up MLflow
    mlflow.set_tracking_uri("mlruns")
    mlflow.set_experiment("flexible-storage-demo")
    
    # Run demonstrations
    demonstrate_data_deduplication()
    demonstrate_run_types()
    demonstrate_shared_data_experiments()
    demonstrate_flexible_organization()
    
    # Show usage stats
    print("\n📈 Data Storage Statistics")
    print("=" * 50)
    store = FlexibleDataStore()
    stats = store.get_data_usage_stats()
    print(f"Unique datasets stored: {stats['unique_datasets']}")
    print(f"Space saved through deduplication: ~{stats['space_saved_bytes']:,} bytes")
    
    print("\n✅ Demo Complete!")
    print("\nKey Benefits:")
    print("1. Same data stored only once (content-addressable)")
    print("2. Runs organized by project/date/type as needed")
    print("3. Production runs separate from experiments")
    print("4. Evaluation runs have their own patterns")
    print("5. Flexible enough for any workflow!")


if __name__ == "__main__":
    main()