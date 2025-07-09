#!/usr/bin/env python3
"""
Unified ML + LLM Workflow Demo
Shows how to combine traditional ML with LLM insights
"""

import os
import numpy as np
from sklearn.datasets import load_iris, load_wine
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from mltrack import track, track_llm, track_context
import json

# Check for LLM availability
HAS_OPENAI = os.getenv("OPENAI_API_KEY") is not None

if HAS_OPENAI:
    from openai import OpenAI
    client = OpenAI()

print("🔗 MLtrack Unified ML + LLM Workflow Demo")
print("=" * 60)

@track(name="unified-ml-llm-workflow")
def analyze_dataset(dataset_name="iris"):
    """Complete ML pipeline with LLM-powered insights"""
    
    print(f"\n📊 Analyzing {dataset_name} dataset...")
    
    # Load dataset
    if dataset_name == "iris":
        data = load_iris()
    else:
        data = load_wine()
    
    X, y = data.data, data.target
    feature_names = data.feature_names
    target_names = data.target_names
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )
    
    # Train model
    with track_context("model-training", tags={"dataset": dataset_name}):
        print("🤖 Training Random Forest...")
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Get predictions and metrics
        y_pred = model.predict(X_test)
        accuracy = model.score(X_test, y_test)
        report = classification_report(y_test, y_pred, target_names=target_names)
        
        # Feature importance
        feature_importance = dict(zip(feature_names, model.feature_importances_))
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        
        print(f"✅ Model accuracy: {accuracy:.3f}")
        print("\n📊 Top features:")
        for feat, imp in sorted_features[:3]:
            print(f"   - {feat}: {imp:.3f}")
    
    # Use LLM for insights
    if HAS_OPENAI:
        with track_context("llm-analysis", tags={"dataset": dataset_name}):
            print("\n🧠 Getting LLM insights...")
            
            # 1. Explain feature importance
            @track_llm(name="explain-features")
            def explain_features():
                prompt = f"""
                A Random Forest model was trained on the {dataset_name} dataset.
                The top 3 most important features are:
                {json.dumps(sorted_features[:3], indent=2)}
                
                In 2-3 sentences, explain why these features might be important for classification.
                """
                
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150,
                    temperature=0.7
                )
                return response.choices[0].message.content
            
            # 2. Suggest improvements
            @track_llm(name="suggest-improvements")
            def suggest_improvements():
                prompt = f"""
                Model performance:
                - Dataset: {dataset_name}
                - Accuracy: {accuracy:.3f}
                - Model: Random Forest with 100 trees
                
                Suggest 3 specific ways to potentially improve this model's performance.
                """
                
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200,
                    temperature=0.7
                )
                return response.choices[0].message.content
            
            # 3. Generate documentation
            @track_llm(name="generate-docs")
            def generate_documentation():
                prompt = f"""
                Write a brief technical summary (3-4 sentences) for this ML experiment:
                - Dataset: {dataset_name} ({len(target_names)} classes)
                - Model: Random Forest
                - Accuracy: {accuracy:.3f}
                - Purpose: Multiclass classification
                """
                
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150,
                    temperature=0.5
                )
                return response.choices[0].message.content
            
            # Execute LLM analyses
            feature_explanation = explain_features()
            improvements = suggest_improvements()
            documentation = generate_documentation()
            
            print("\n📝 LLM Insights:")
            print(f"\nFeature Importance Explanation:\n{feature_explanation}")
            print(f"\nSuggested Improvements:\n{improvements}")
            print(f"\nAuto-generated Documentation:\n{documentation}")
    
    return model, accuracy

# Run analysis on multiple datasets
datasets = ["iris", "wine"]

for dataset in datasets:
    model, acc = analyze_dataset(dataset)
    print(f"\n{'='*60}")

print("\n✅ Unified workflow complete!")
print("\n📊 What you can explore in the UI:")
print("  - ML experiments for each dataset")
print("  - LLM token usage and costs")
print("  - Feature importance visualizations")
print("  - Auto-generated insights and documentation")
print("\nRun 'mltrack ui' to explore the results!")