"""Examples of using mltrack with LLMs."""

import os
from typing import List, Dict

from mltrack import (
    track, 
    track_llm_context,
    LLMTracker,
    openai_prompt_extractor,
    openai_response_extractor,
    openai_token_extractor,
    anthropic_prompt_extractor,
    anthropic_response_extractor,
    anthropic_token_extractor,
)


def example_openai_basic():
    """Basic example of tracking OpenAI API calls."""
    # Note: Requires OPENAI_API_KEY environment variable
    try:
        import openai
    except ImportError:
        print("OpenAI not installed. Run: pip install openai")
        return
    
    # Initialize OpenAI client
    client = openai.OpenAI()
    
    # Use the LLM tracking context
    with track_llm_context("openai-chat-example", model="gpt-4o-mini", provider="openai") as tracker:
        # Make API call
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "What is machine learning in one sentence?"}
            ],
            temperature=0.7,
            max_tokens=100
        )
        
        # Manually log the interaction (auto-logging would handle this with mlflow.openai.autolog())
        tracker.log_prompt_response(
            prompt=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "What is machine learning in one sentence?"}
            ],
            response=response.choices[0].message.content,
            model="gpt-4o-mini",
            provider="openai",
            token_usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
            parameters={
                "temperature": 0.7,
                "max_tokens": 100,
            }
        )
        
        print(f"Response: {response.choices[0].message.content}")
        print(f"Tokens used: {response.usage.total_tokens}")


def example_anthropic_basic():
    """Basic example of tracking Anthropic API calls."""
    try:
        import anthropic
    except ImportError:
        print("Anthropic not installed. Run: pip install anthropic")
        return
    
    # Initialize Anthropic client
    client = anthropic.Anthropic()
    
    # Use the LLM tracking context
    with track_llm_context("anthropic-chat-example", model="claude-3-haiku-20240307", provider="anthropic") as tracker:
        # Make API call
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            temperature=0.7,
            messages=[
                {"role": "user", "content": "What is deep learning in one sentence?"}
            ]
        )
        
        # Extract response text
        response_text = message.content[0].text if message.content else ""
        
        # Manually log the interaction
        tracker.log_prompt_response(
            prompt=[{"role": "user", "content": "What is deep learning in one sentence?"}],
            response=response_text,
            model="claude-3-haiku-20240307",
            provider="anthropic",
            token_usage={
                "prompt_tokens": message.usage.input_tokens,
                "completion_tokens": message.usage.output_tokens,
                "total_tokens": message.usage.input_tokens + message.usage.output_tokens,
            },
            parameters={
                "temperature": 0.7,
                "max_tokens": 100,
            }
        )
        
        print(f"Response: {response_text}")
        print(f"Tokens used: {message.usage.input_tokens + message.usage.output_tokens}")


@track(tags={"example": "llm-decorator"})
def example_decorated_llm_function(prompt: str, model: str = "gpt-4o-mini") -> str:
    """Example of using the @track decorator with LLM calls."""
    try:
        import openai
        import mlflow
    except ImportError:
        print("OpenAI or MLflow not installed")
        return ""
    
    client = openai.OpenAI()
    
    # Create an LLM tracker instance
    llm_tracker = LLMTracker()
    
    # Make the API call
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.5
    )
    
    # Log the LLM interaction
    llm_tracker.log_prompt_response(
        prompt=prompt,
        response=response.choices[0].message.content,
        model=model,
        provider="openai",
        token_usage={
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        },
        parameters={"temperature": 0.5}
    )
    
    # Also log as MLflow metrics
    mlflow.log_metric("llm.tokens.total", response.usage.total_tokens)
    
    return response.choices[0].message.content


def example_multi_turn_conversation():
    """Example of tracking a multi-turn conversation."""
    try:
        import openai
    except ImportError:
        print("OpenAI not installed. Run: pip install openai")
        return
    
    client = openai.OpenAI()
    
    with track_llm_context("multi-turn-chat", model="gpt-4o-mini", provider="openai") as tracker:
        # Conversation history
        messages = [
            {"role": "system", "content": "You are a helpful ML teacher."}
        ]
        
        # Questions to ask
        questions = [
            "What is supervised learning?",
            "Can you give me an example?",
            "How is it different from unsupervised learning?"
        ]
        
        for i, question in enumerate(questions):
            # Add user message
            messages.append({"role": "user", "content": question})
            
            # Get response
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=150
            )
            
            # Extract response
            assistant_message = response.choices[0].message.content
            messages.append({"role": "assistant", "content": assistant_message})
            
            # Log this turn
            tracker.log_prompt_response(
                prompt=messages,  # Log full conversation context
                response=assistant_message,
                model="gpt-4o-mini",
                provider="openai",
                token_usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
                metadata={
                    "turn": i + 1,
                    "question": question,
                }
            )
            
            print(f"\nQ{i+1}: {question}")
            print(f"A{i+1}: {assistant_message}")
        
        # The conversation history will be automatically logged at the end


def example_with_langchain():
    """Example of tracking LangChain LLM calls."""
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage, SystemMessage
    except ImportError:
        print("LangChain not installed. Run: pip install langchain langchain-openai")
        return
    
    # Use the track decorator with the function
    @track(tags={"framework": "langchain", "chain_type": "simple"})
    def run_langchain_example():
        # Initialize LLM
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        
        # Create messages
        messages = [
            SystemMessage(content="You are a helpful AI assistant."),
            HumanMessage(content="Explain neural networks in simple terms.")
        ]
        
        # Get response
        response = llm.invoke(messages)
        
        # Note: With mlflow.langchain.autolog() enabled, this would be tracked automatically
        # For manual tracking, you would extract and log the details
        
        return response.content
    
    # Run the tracked function
    result = run_langchain_example()
    print(f"LangChain response: {result}")


def example_cost_tracking():
    """Example showing cost tracking for LLM calls."""
    try:
        import openai
        import mlflow
    except ImportError:
        print("OpenAI or MLflow not installed")
        return
    
    client = openai.OpenAI()
    
    with track_llm_context("cost-tracking-example", model="gpt-4", provider="openai") as tracker:
        # Simulate multiple API calls with different models
        models_to_test = [
            ("gpt-4o-mini", "What is AI?"),
            ("gpt-4o", "Explain quantum computing."),
            ("gpt-3.5-turbo", "What is machine learning?"),
        ]
        
        total_cost = 0.0
        
        for model, prompt in models_to_test:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=50
                )
                
                # Log the interaction
                tracker.log_prompt_response(
                    prompt=prompt,
                    response=response.choices[0].message.content,
                    model=model,
                    provider="openai",
                    token_usage={
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens,
                    }
                )
                
                print(f"\nModel: {model}")
                print(f"Prompt: {prompt}")
                print(f"Response: {response.choices[0].message.content}")
                print(f"Tokens: {response.usage.total_tokens}")
                
            except Exception as e:
                print(f"Error with model {model}: {e}")
        
        # Cost information is automatically tracked in the LLMTracker


def example_custom_extractor():
    """Example of using custom extractors for a hypothetical LLM library."""
    
    # Define custom extractors for a hypothetical LLM
    def custom_prompt_extractor(args, kwargs):
        # Extract prompt from custom format
        return kwargs.get("query", args[0] if args else "")
    
    def custom_response_extractor(response):
        # Extract text from custom response format
        return response.get("text", str(response))
    
    def custom_token_extractor(response):
        # Extract token usage from custom format
        return {
            "prompt_tokens": response.get("input_tokens", 0),
            "completion_tokens": response.get("output_tokens", 0),
            "total_tokens": response.get("total_tokens", 0),
        }
    
    # Create a tracker
    llm_tracker = LLMTracker()
    
    # Decorate a function that calls the hypothetical LLM
    @llm_tracker.track_llm_call(
        model="custom-llm-v1",
        provider="custom",
        extract_prompt=custom_prompt_extractor,
        extract_response=custom_response_extractor,
        extract_token_usage=custom_token_extractor,
    )
    def call_custom_llm(query: str) -> Dict:
        # Simulate calling a custom LLM
        return {
            "text": f"Response to: {query}",
            "input_tokens": len(query.split()),
            "output_tokens": 10,
            "total_tokens": len(query.split()) + 10,
        }
    
    # Use the tracked function
    with track_llm_context("custom-llm-example", model="custom-llm-v1", provider="custom"):
        result = call_custom_llm("What is artificial intelligence?")
        print(f"Custom LLM response: {result['text']}")


def main():
    """Run all examples."""
    print("🚀 MLtrack LLM Examples\n")
    
    examples = [
        ("OpenAI Basic", example_openai_basic),
        ("Anthropic Basic", example_anthropic_basic),
        ("Decorated Function", example_decorated_llm_function),
        ("Multi-turn Conversation", example_multi_turn_conversation),
        ("LangChain Integration", example_with_langchain),
        ("Cost Tracking", example_cost_tracking),
        ("Custom Extractor", example_custom_extractor),
    ]
    
    for name, example_func in examples:
        print(f"\n{'='*60}")
        print(f"Running: {name}")
        print(f"{'='*60}")
        try:
            example_func()
        except Exception as e:
            print(f"Error in {name}: {e}")
    
    print("\n✅ Examples complete! Check ./mlruns for tracking data.")


if __name__ == "__main__":
    main()