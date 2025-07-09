"""Unified example showing ML and LLM tracking together."""

import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import mlflow
from mltrack import track, track_context, track_llm, track_llm_context

# Import optional dependencies
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    from anthropic import Anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


@track(name="ml-llm-unified-example")
def train_and_explain_model():
    """Train an ML model and use LLMs to explain the results."""
    print("🚀 Unified ML + LLM Tracking Example\n")
    
    # Phase 1: Traditional ML Model Training
    print("📊 Phase 1: Training ML Model")
    print("-" * 40)
    
    # Generate dataset
    X, y = make_classification(
        n_samples=1000,
        n_features=20,
        n_informative=15,
        n_classes=3,
        random_state=42
    )
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    with track_context("model-training", tags={"phase": "ml"}):
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Log metrics
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_param("n_estimators", 100)
        
        # Get classification report
        report = classification_report(y_test, y_pred)
        mlflow.log_text(report, "classification_report.txt")
        
        print(f"Model trained! Accuracy: {accuracy:.3f}")
        
        # Get feature importance
        feature_importance = model.feature_importances_
        top_features_idx = np.argsort(feature_importance)[-5:][::-1]
        
    # Phase 2: Use LLMs to explain the model
    print(f"\n🤖 Phase 2: LLM Analysis")
    print("-" * 40)
    
    # Prepare context for LLMs
    model_context = f"""
    Model: Random Forest Classifier
    Task: Multi-class classification (3 classes)
    Features: 20 numerical features
    Training samples: {len(X_train)}
    Test accuracy: {accuracy:.3f}
    
    Top 5 most important features (by index):
    {', '.join([f'Feature_{i} (importance: {feature_importance[i]:.3f})' for i in top_features_idx])}
    
    Classification Report:
    {report}
    """
    
    # Use OpenAI to explain the results
    if HAS_OPENAI:
        print("\n📝 OpenAI Analysis:")
        client = OpenAI()
        
        @track_llm(name="openai-model-explanation")
        def explain_with_openai():
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a data science expert who explains ML results clearly."},
                    {"role": "user", "content": f"Please analyze these ML model results and provide insights:\n{model_context}"}
                ],
                temperature=0.7,
                max_tokens=300
            )
            return response
        
        openai_response = explain_with_openai()
        openai_explanation = openai_response.choices[0].message.content
        print(f"GPT says: {openai_explanation[:200]}...")
        mlflow.log_text(openai_explanation, "openai_explanation.txt")
    
    # Use Anthropic to suggest improvements
    if HAS_ANTHROPIC:
        print("\n📝 Anthropic Analysis:")
        client = Anthropic()
        
        @track_llm(name="anthropic-improvement-suggestions")
        def suggest_with_anthropic():
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                system="You are an ML expert who provides actionable improvement suggestions.",
                messages=[
                    {"role": "user", "content": f"Based on these results, suggest 3 specific improvements:\n{model_context}"}
                ],
                max_tokens=300,
                temperature=0.7
            )
            return response
        
        anthropic_response = suggest_with_anthropic()
        anthropic_suggestions = anthropic_response.content[0].text
        print(f"Claude suggests: {anthropic_suggestions[:200]}...")
        mlflow.log_text(anthropic_suggestions, "anthropic_suggestions.txt")
    
    # Phase 3: Generate documentation using LLMs
    print(f"\n📚 Phase 3: Auto-Documentation")
    print("-" * 40)
    
    with track_llm_context("documentation-generation", tags={"phase": "docs"}):
        docs = []
        
        # Generate README section
        if HAS_OPENAI:
            @track_llm(name="generate-readme")
            def generate_readme():
                client = OpenAI()
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You write concise technical documentation."},
                        {"role": "user", "content": f"Write a README section for this ML model:\n{model_context}"}
                    ],
                    temperature=0.5,
                    max_tokens=200
                )
                return response.choices[0].message.content
            
            readme_content = generate_readme()
            docs.append(("README.md", readme_content))
            print("✓ Generated README section")
        
        # Generate code examples
        if HAS_ANTHROPIC:
            @track_llm(name="generate-code-example")
            def generate_code_example():
                client = Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    messages=[
                        {"role": "user", "content": f"Write a Python code example showing how to use this trained model for predictions. Model accuracy: {accuracy:.3f}"}
                    ],
                    max_tokens=200,
                    temperature=0.5
                )
                return response.content[0].text
            
            code_example = generate_code_example()
            docs.append(("usage_example.py", code_example))
            print("✓ Generated code example")
        
        # Save all documentation
        for filename, content in docs:
            mlflow.log_text(content, f"docs/{filename}")
    
    print(f"\n✅ Complete! All phases tracked in MLflow")
    return model, accuracy


def interactive_model_chat():
    """Interactive chat about the trained model using LLMs."""
    if not (HAS_OPENAI or HAS_ANTHROPIC):
        print("⚠️  No LLM providers available for interactive chat")
        return
    
    print("\n💬 Interactive Model Chat")
    print("-" * 40)
    
    # Simulate a conversation about the model
    with track_llm_context("model-qa-session", tags={"type": "interactive"}):
        questions = [
            "What are the key factors affecting model performance?",
            "How can we improve accuracy for class 2?",
            "What visualizations would help understand this model?"
        ]
        
        for i, question in enumerate(questions):
            print(f"\nQ{i+1}: {question}")
            
            if HAS_OPENAI and i % 2 == 0:  # Use OpenAI for even questions
                @track_llm(name=f"qa-openai-{i+1}")
                def answer_with_openai():
                    client = OpenAI()
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are an ML expert answering questions about a Random Forest model."},
                            {"role": "user", "content": question}
                        ],
                        temperature=0.7,
                        max_tokens=150
                    )
                    return response.choices[0].message.content
                
                answer = answer_with_openai()
                print(f"A (GPT): {answer[:150]}...")
                
            elif HAS_ANTHROPIC:  # Use Anthropic for odd questions
                @track_llm(name=f"qa-anthropic-{i+1}")
                def answer_with_anthropic():
                    client = Anthropic()
                    response = client.messages.create(
                        model="claude-3-haiku-20240307",
                        messages=[{"role": "user", "content": question}],
                        max_tokens=150,
                        temperature=0.7
                    )
                    return response.content[0].text
                
                answer = answer_with_anthropic()
                print(f"A (Claude): {answer[:150]}...")


def cost_analysis_example():
    """Demonstrate cost tracking across multiple LLM calls."""
    print("\n💰 Cost Analysis Example")
    print("-" * 40)
    
    with track_llm_context("cost-analysis", tags={"experiment": "cost_comparison"}):
        prompts = [
            "Explain gradient boosting in 50 words",
            "Compare Random Forest vs XGBoost",
            "What is cross-validation?"
        ]
        
        total_cost = 0.0
        
        # Try different models and track costs
        if HAS_OPENAI:
            models = ["gpt-3.5-turbo", "gpt-4"]
            client = OpenAI()
            
            for model in models:
                for prompt in prompts:
                    @track_llm(name=f"cost-test-{model}")
                    def test_model_cost():
                        response = client.chat.completions.create(
                            model=model,
                            messages=[{"role": "user", "content": prompt}],
                            max_tokens=100,
                            temperature=0.5
                        )
                        return response
                    
                    try:
                        response = test_model_cost()
                        tokens = response.usage.total_tokens
                        print(f"{model}: {tokens} tokens for '{prompt[:30]}...'")
                    except Exception as e:
                        print(f"{model}: Error - {str(e)}")
        
        if HAS_ANTHROPIC:
            client = Anthropic()
            
            for prompt in prompts:
                @track_llm(name="cost-test-claude")
                def test_claude_cost():
                    response = client.messages.create(
                        model="claude-3-haiku-20240307",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=100,
                        temperature=0.5
                    )
                    return response
                
                try:
                    response = test_claude_cost()
                    if hasattr(response, 'usage'):
                        tokens = response.usage.input_tokens + response.usage.output_tokens
                        print(f"Claude: {tokens} tokens for '{prompt[:30]}...'")
                except Exception as e:
                    print(f"Claude: Error - {str(e)}")
    
    print("\n💡 Check MLflow UI for detailed cost breakdowns!")


def main():
    """Run the unified example."""
    print("=" * 60)
    print("🎯 MLtrack: Unified ML + LLM Tracking Example")
    print("=" * 60)
    
    # Check dependencies
    if not (HAS_OPENAI or HAS_ANTHROPIC):
        print("\n⚠️  No LLM providers installed!")
        print("For full example, install with:")
        print("  uv add openai anthropic")
        print("\nContinuing with ML-only example...\n")
    
    # Run main example
    model, accuracy = train_and_explain_model()
    
    # Run interactive examples if LLMs available
    if HAS_OPENAI or HAS_ANTHROPIC:
        interactive_model_chat()
        cost_analysis_example()
    
    print("\n" + "=" * 60)
    print("✅ Example Complete!")
    print("\n📊 View your results:")
    print("  1. Run: uv run python -m mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("  3. Explore:")
    print("     - ML model metrics and artifacts")
    print("     - LLM prompts and responses")
    print("     - Token usage and cost estimates")
    print("     - Nested runs showing full workflow")
    print("=" * 60)


if __name__ == "__main__":
    main()