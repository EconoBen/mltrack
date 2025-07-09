#!/usr/bin/env python3
"""
MLtrack Demo Script - Showcase ML and LLM Tracking
Run this to demonstrate mltrack capabilities
"""

import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import os
from mltrack import track, track_llm, track_llm_context
import time

# Check for API keys
HAS_OPENAI = os.getenv("OPENAI_API_KEY") is not None
HAS_ANTHROPIC = os.getenv("ANTHROPIC_API_KEY") is not None

if HAS_OPENAI:
    from openai import OpenAI
    openai_client = OpenAI()

if HAS_ANTHROPIC:
    from anthropic import Anthropic
    anthropic_client = Anthropic()

print("🚀 MLtrack Demo - ML and LLM Tracking Showcase")
print("=" * 60)

# 1. Traditional ML Model Tracking
print("\n📊 Demo 1: Traditional ML Model Tracking")
print("-" * 40)

@track(name="demo-random-forest")
def train_random_forest_model(n_estimators=100, max_depth=None):
    """Train a Random Forest with automatic tracking"""
    print(f"Training Random Forest (n_estimators={n_estimators}, max_depth={max_depth})")
    
    # Generate synthetic data
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
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    
    start_time = time.time()
    model.fit(X_train, y_train)
    training_time = time.time() - start_time
    
    # Make predictions
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"✅ Model trained! Accuracy: {accuracy:.3f}, Time: {training_time:.2f}s")
    return model, accuracy

# Run experiments with different hyperparameters
print("\nRunning ML experiments with different hyperparameters...")
for n_est in [50, 100, 200]:
    for max_d in [None, 5, 10]:
        model, acc = train_random_forest_model(n_estimators=n_est, max_depth=max_d)
        print(f"  Experiment: n_estimators={n_est}, max_depth={max_d} → accuracy={acc:.3f}")

# 2. LLM Cost Tracking Demo
if HAS_OPENAI or HAS_ANTHROPIC:
    print("\n\n💡 Demo 2: LLM Cost Tracking")
    print("-" * 40)
    
    # Sample texts for classification
    sample_texts = [
        "I absolutely love this product! Best purchase ever!",
        "This is terrible. Complete waste of money.",
        "It's okay, nothing special but does the job.",
        "Amazing quality and fast shipping. Highly recommend!",
        "Disappointed. Broke after one week of use."
    ]
    
    if HAS_OPENAI:
        print("\n🤖 OpenAI GPT-3.5 Classification:")
        
        @track_llm(name="sentiment-classification-gpt")
        def classify_sentiment_gpt(text):
            """Classify sentiment using GPT-3.5"""
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a sentiment classifier. Respond with only: positive, negative, or neutral."},
                    {"role": "user", "content": f"Classify the sentiment: {text}"}
                ],
                max_tokens=10,
                temperature=0
            )
            return response.choices[0].message.content.strip().lower()
        
        # Track entire pipeline
        with track_llm_context("openai-sentiment-pipeline"):
            for i, text in enumerate(sample_texts):
                sentiment = classify_sentiment_gpt(text)
                print(f"  Text {i+1}: '{text[:50]}...' → {sentiment}")
    
    if HAS_ANTHROPIC:
        print("\n🤖 Anthropic Claude Classification:")
        
        @track_llm(name="sentiment-classification-claude")
        def classify_sentiment_claude(text):
            """Classify sentiment using Claude"""
            response = anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                messages=[
                    {"role": "user", "content": f"Classify this text as positive, negative, or neutral. Respond with only one word: {text}"}
                ],
                max_tokens=10,
                temperature=0
            )
            return response.content[0].text.strip().lower()
        
        # Track entire pipeline
        with track_llm_context("anthropic-sentiment-pipeline"):
            for i, text in enumerate(sample_texts):
                sentiment = classify_sentiment_claude(text)
                print(f"  Text {i+1}: '{text[:50]}...' → {sentiment}")

# 3. Combined ML + LLM Workflow
if HAS_OPENAI or HAS_ANTHROPIC:
    print("\n\n🔗 Demo 3: Combined ML + LLM Workflow")
    print("-" * 40)
    
    @track(name="ml-llm-combined-workflow")
    def analyze_model_performance():
        """Train model and use LLM to explain results"""
        # Train a simple model
        print("Training model...")
        model, accuracy = train_random_forest_model(n_estimators=100)
        
        # Use LLM to explain the results
        if HAS_OPENAI:
            @track_llm(name="explain-model-results")
            def explain_results():
                prompt = f"""
                I trained a Random Forest model with:
                - 100 trees
                - 20 features
                - Binary classification task
                - Achieved {accuracy:.3f} accuracy
                
                In 2-3 sentences, explain if this is good performance and what might improve it.
                """
                
                response = openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150,
                    temperature=0.7
                )
                return response.choices[0].message.content
            
            explanation = explain_results()
            print(f"\n📝 LLM Analysis:\n{explanation}")
        
        return model, accuracy
    
    # Run the combined workflow
    analyze_model_performance()

# 4. Cost Analysis Demo
if HAS_OPENAI:
    print("\n\n💰 Demo 4: LLM Cost Comparison")
    print("-" * 40)
    
    test_prompt = "Explain machine learning in exactly 50 words."
    
    models_to_test = ["gpt-3.5-turbo", "gpt-4"]
    
    with track_llm_context("cost-comparison"):
        for model_name in models_to_test:
            try:
                @track_llm(name=f"test-{model_name}")
                def test_model():
                    response = openai_client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "user", "content": test_prompt}],
                        max_tokens=100,
                        temperature=0.5
                    )
                    return response
                
                response = test_model()
                tokens_used = response.usage.total_tokens
                print(f"  {model_name}: {tokens_used} tokens used")
            except Exception as e:
                print(f"  {model_name}: Error - {str(e)}")

print("\n\n" + "=" * 60)
print("✅ Demo Complete!")
print("\n📊 View your results:")
print("  1. Run: mltrack ui")
print("  2. Open: http://localhost:43800 (Aim) or http://localhost:5000 (MLflow)")
print("  3. Explore:")
print("     - ML experiments with different hyperparameters")
print("     - LLM token usage and costs")
print("     - Combined ML+LLM workflows")
print("=" * 60)