"""OpenAI tracking example for mltrack."""

import asyncio
import os
from typing import List

from dotenv import load_dotenv

from mltrack import track_llm, track_llm_context

# Load environment variables from .env file
load_dotenv()

# Try to import OpenAI
try:
    from openai import AsyncOpenAI, OpenAI

    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("⚠️  OpenAI not installed. Install with: uv add openai")


def basic_completion_example():
    """Basic OpenAI completion with tracking."""
    if not HAS_OPENAI:
        print("Skipping OpenAI example (not installed)")
        return

    print("\n🤖 Basic OpenAI Completion")

    # Initialize client
    client = OpenAI()

    @track_llm(name="openai-basic-completion")
    def generate_text(prompt: str, model: str = "gpt-3.5-turbo", **kwargs):
        """Generate text using OpenAI."""
        response = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": prompt}], **kwargs
        )
        return response

    # Generate text
    response = generate_text(
        prompt="Write a haiku about machine learning", temperature=0.7, max_tokens=100
    )

    print(f"Response: {response.choices[0].message.content}")
    print(f"Tokens used: {response.usage.total_tokens}")


def conversation_example():
    """Multi-turn conversation with context tracking."""
    if not HAS_OPENAI:
        return

    print("\n💬 Multi-turn Conversation")

    client = OpenAI()

    # Track entire conversation
    with track_llm_context("openai-conversation", tags={"type": "chat"}):
        messages = [{"role": "system", "content": "You are a helpful ML assistant."}]

        # First turn
        @track_llm(name="turn-1")
        def first_turn():
            messages.append({"role": "user", "content": "What is gradient descent?"})
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", messages=messages, temperature=0.5
            )
            messages.append({"role": "assistant", "content": response.choices[0].message.content})
            return response

        response1 = first_turn()
        print(f"Turn 1 response preview: {response1.choices[0].message.content[:100]}...")

        # Second turn
        @track_llm(name="turn-2")
        def second_turn():
            messages.append({"role": "user", "content": "Can you provide a simple example?"})
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", messages=messages, temperature=0.5
            )
            return response

        response2 = second_turn()
        print(f"Turn 2 response preview: {response2.choices[0].message.content[:100]}...")


def function_calling_example():
    """Example with function calling."""
    if not HAS_OPENAI:
        return

    print("\n🔧 Function Calling Example")

    client = OpenAI()

    # Define functions
    functions = [
        {
            "name": "get_weather",
            "description": "Get the current weather in a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        }
    ]

    @track_llm(name="openai-function-calling", tags={"feature": "functions"})
    def call_with_functions(query: str):
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": query}],
            functions=functions,
            function_call="auto",
        )
        return response

    response = call_with_functions("What's the weather like in New York?")

    if response.choices[0].message.function_call:
        print(f"Function called: {response.choices[0].message.function_call.name}")
        print(f"Arguments: {response.choices[0].message.function_call.arguments}")
    else:
        print(f"Response: {response.choices[0].message.content}")


def streaming_example():
    """Example with streaming responses."""
    if not HAS_OPENAI:
        return

    print("\n🌊 Streaming Response Example")

    client = OpenAI()

    @track_llm(name="openai-streaming", tags={"feature": "streaming"})
    def stream_response(prompt: str):
        # Note: Streaming responses may not capture token usage automatically
        stream = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            temperature=0.7,
        )

        # Collect the full response
        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                full_response += content
                print(content, end="", flush=True)

        print()  # New line after streaming

        # Return collected response for tracking
        return {"content": full_response, "stream": True}

    stream_response("Tell me a short story about a robot learning to paint.")


async def async_example():
    """Async OpenAI API calls."""
    if not HAS_OPENAI:
        return

    print("\n⚡ Async API Example")

    client = AsyncOpenAI()

    @track_llm(name="openai-async")
    async def async_generate(prompts: List[str]):
        """Generate multiple responses concurrently."""
        tasks = []
        for i, prompt in enumerate(prompts):
            task = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            tasks.append(task)

        responses = await asyncio.gather(*tasks)
        return responses

    prompts = [
        "Define machine learning in one sentence.",
        "What is the difference between AI and ML?",
        "Give an example of unsupervised learning.",
    ]

    responses = await async_generate(prompts)

    for i, response in enumerate(responses):
        print(f"\nPrompt {i+1}: {prompts[i]}")
        print(f"Response: {response.choices[0].message.content}")


def compare_models_example():
    """Compare different OpenAI models."""
    if not HAS_OPENAI:
        return

    print("\n📊 Model Comparison")

    client = OpenAI()
    prompt = "Explain quantum computing to a 10-year-old"

    models = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"]

    with track_llm_context("model-comparison", tags={"experiment": "compare"}):
        for model in models:
            try:

                @track_llm(name=f"test-{model}", tags={"model": model})
                def test_model():
                    response = client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.7,
                        max_tokens=150,
                    )
                    return response

                response = test_model()
                print(f"\n{model}:")
                print(f"  Response preview: {response.choices[0].message.content[:100]}...")
                print(f"  Tokens: {response.usage.total_tokens}")

            except Exception as e:
                print(f"\n{model}: Error - {str(e)}")


def vision_example():
    """Example with GPT-4 Vision."""
    if not HAS_OPENAI:
        return

    print("\n👁️ Vision Model Example")

    client = OpenAI()

    @track_llm(name="openai-vision", tags={"feature": "vision"})
    def analyze_image(image_url: str, prompt: str):
        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            max_tokens=300,
        )
        return response

    # Example with a public image
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"

    try:
        response = analyze_image(image_url, "Describe this image in detail. What can you see?")
        print(f"Vision response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"Vision example error: {str(e)}")


def main():
    """Run all OpenAI examples."""
    if not HAS_OPENAI:
        print("\n⚠️  OpenAI package not installed.")
        print("Install with: uv add openai")
        print("Also set your OPENAI_API_KEY environment variable")
        return

    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("\n⚠️  OPENAI_API_KEY not set")
        print("Set it with: export OPENAI_API_KEY='your-key-here'")
        return

    print("🚀 MLtrack OpenAI Integration Examples\n")
    print("=" * 50)

    # Run examples
    basic_completion_example()
    conversation_example()
    function_calling_example()
    streaming_example()
    compare_models_example()
    vision_example()

    # Run async example
    asyncio.run(async_example())

    print("\n" + "=" * 50)
    print("✅ All examples completed!")
    print("\nTo view results:")
    print("  1. Run: uv run python -m mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("  3. Look for runs tagged with 'mltrack.type': 'llm'")


if __name__ == "__main__":
    main()
