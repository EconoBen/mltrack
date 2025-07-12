"""LLM-specific tracking functionality for mltrack."""

import time
import json
from typing import Dict, Any, Optional, Callable, List, Union, TypeVar
from functools import wraps
from contextlib import contextmanager
import logging
from dataclasses import dataclass, asdict

import mlflow

from mltrack.introspection import ModelIntrospector

logger = logging.getLogger(__name__)

# Type variable for generic function types
F = TypeVar('F', bound=Callable[..., Any])


@dataclass
class LLMMetrics:
    """Container for LLM-specific metrics."""
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[float] = None
    cost: Optional[float] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    stream: Optional[bool] = None
    

@dataclass
class LLMResponse:
    """Container for LLM response data."""
    content: str
    role: Optional[str] = None
    function_call: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: Optional[str] = None
    

@dataclass
class LLMRequest:
    """Container for LLM request data."""
    messages: Optional[List[Dict[str, str]]] = None
    prompt: Optional[str] = None
    system: Optional[str] = None
    functions: Optional[List[Dict[str, Any]]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    

def calculate_cost(tokens: Dict[str, int], model: str, provider: str) -> float:
    """Calculate cost based on token usage and model pricing."""
    # Simplified pricing - in production, this would be more comprehensive
    pricing = {
        "openai": {
            "gpt-4": {"input": 0.03, "output": 0.06},  # per 1K tokens
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
            "gpt-4o": {"input": 0.005, "output": 0.015},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        },
        "anthropic": {
            "claude-3-opus": {"input": 0.015, "output": 0.075},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
            "claude-3.5-sonnet": {"input": 0.003, "output": 0.015},
        }
    }
    
    provider_pricing = pricing.get(provider.lower(), {})
    model_pricing = provider_pricing.get(model.lower(), {"input": 0, "output": 0})
    
    input_cost = (tokens.get("prompt_tokens", 0) / 1000) * model_pricing["input"]
    output_cost = (tokens.get("completion_tokens", 0) / 1000) * model_pricing["output"]
    
    return round(input_cost + output_cost, 6)


def track_llm(
    func: Optional[F] = None,
    *,
    name: Optional[str] = None,
    tags: Optional[Dict[str, str]] = None,
    log_inputs: bool = True,
    log_outputs: bool = True,
    log_model_params: bool = True,
    track_tokens: bool = True,
    track_cost: bool = True,
) -> Union[F, Callable[[F], F]]:
    """
    Decorator for tracking LLM API calls.
    
    Args:
        func: Function to wrap
        name: Custom name for the run
        tags: Additional tags to log
        log_inputs: Whether to log input prompts/messages
        log_outputs: Whether to log output responses
        log_model_params: Whether to log model parameters
        track_tokens: Whether to track token usage
        track_cost: Whether to estimate and track cost
        
    Returns:
        Wrapped function with LLM tracking
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Determine run name
            run_name = name or f"llm-{func.__name__}"
            
            # Prepare tags with hierarchical structure
            run_tags = {
                "mltrack.type": "llm",  # Backward compatibility
                "mltrack.category": "llm",
                "mltrack.task": "generation"
            }
            if tags:
                run_tags.update(tags)
            
            # Check if we're already in an active run
            active_run = mlflow.active_run()
            nested = active_run is not None
            
            with mlflow.start_run(run_name=run_name, tags=run_tags, nested=nested):
                start_time = time.time()
                
                try:
                    # Extract LLM-specific parameters from kwargs
                    llm_params = extract_llm_params(kwargs)
                    if log_model_params and llm_params:
                        for key, value in llm_params.items():
                            if value is not None:
                                mlflow.log_param(f"llm.{key}", value)
                    
                    # Detect provider and set framework tags
                    provider = detect_provider(func, args, kwargs)
                    if provider:
                        mlflow.set_tag("mltrack.framework", provider)
                        mlflow.set_tag("mltrack.provider", provider)
                    
                    # Set model algorithm tag if available
                    if llm_params.get("model"):
                        mlflow.set_tag("mltrack.algorithm", llm_params["model"])
                    
                    # Log inputs
                    if log_inputs:
                        inputs = extract_llm_inputs(args, kwargs)
                        if inputs:
                            # Log as artifact due to size limitations
                            mlflow.log_text(
                                json.dumps(inputs, indent=2),
                                "llm_inputs.json"
                            )
                    
                    # Execute function
                    result = func(*args, **kwargs)
                    
                    # Calculate latency
                    latency_ms = (time.time() - start_time) * 1000
                    mlflow.log_metric("llm.latency_ms", latency_ms)
                    
                    # Extract and log outputs
                    if log_outputs and result:
                        outputs = extract_llm_outputs(result)
                        if outputs:
                            mlflow.log_text(
                                json.dumps(outputs, indent=2),
                                "llm_outputs.json"
                            )
                    
                    # Track tokens if available
                    if track_tokens and result:
                        tokens = extract_token_usage(result)
                        if tokens:
                            for key, value in tokens.items():
                                mlflow.log_metric(f"llm.tokens.{key}", value)
                            
                            # Calculate and log cost
                            if track_cost:
                                model = llm_params.get("model", "unknown")
                                provider = detect_provider(func, args, kwargs)
                                if provider and model != "unknown":
                                    cost = calculate_cost(tokens, model, provider)
                                    mlflow.log_metric("llm.cost_usd", cost)
                    
                    return result
                    
                except Exception as e:
                    mlflow.log_param("llm.error", str(e))
                    raise
                    
        return wrapper
    
    if func is None:
        return decorator
    else:
        return decorator(func)


def extract_llm_params(kwargs: Dict[str, Any]) -> Dict[str, Any]:
    """Extract common LLM parameters from function kwargs."""
    llm_params = {}
    
    # Common parameters across providers
    param_names = [
        "model", "temperature", "max_tokens", "top_p", 
        "frequency_penalty", "presence_penalty", "stream",
        "n", "stop", "seed", "response_format", "tool_choice",
        "top_k", "max_output_tokens", "stop_sequences"
    ]
    
    for param in param_names:
        if param in kwargs:
            llm_params[param] = kwargs[param]
    
    return llm_params


def extract_llm_inputs(args: tuple, kwargs: Dict[str, Any]) -> Dict[str, Any]:
    """Extract input prompts/messages from function arguments."""
    inputs = {}
    
    # Check for common input patterns
    if "messages" in kwargs:
        inputs["messages"] = kwargs["messages"]
    elif "prompt" in kwargs:
        inputs["prompt"] = kwargs["prompt"]
    elif len(args) > 0:
        # Try to detect if first arg is messages or prompt
        first_arg = args[0]
        if isinstance(first_arg, str):
            inputs["prompt"] = first_arg
        elif isinstance(first_arg, list):
            inputs["messages"] = first_arg
    
    # Check for system prompts
    if "system" in kwargs:
        inputs["system"] = kwargs["system"]
    
    # Check for function/tool definitions
    if "functions" in kwargs:
        inputs["functions"] = kwargs["functions"]
    if "tools" in kwargs:
        inputs["tools"] = kwargs["tools"]
    
    return inputs


def extract_llm_outputs(result: Any) -> Dict[str, Any]:
    """Extract outputs from LLM response."""
    outputs = {}
    
    # Handle different response formats
    if hasattr(result, "choices"):  # OpenAI format
        outputs["choices"] = []
        for choice in result.choices:
            choice_data = {
                "index": getattr(choice, "index", 0),
                "message": {},
                "finish_reason": getattr(choice, "finish_reason", None)
            }
            
            if hasattr(choice, "message"):
                msg = choice.message
                choice_data["message"] = {
                    "role": getattr(msg, "role", None),
                    "content": getattr(msg, "content", None)
                }
                if hasattr(msg, "function_call") and msg.function_call:
                    # Convert function call to dict
                    func_call = msg.function_call
                    choice_data["message"]["function_call"] = {
                        "name": getattr(func_call, "name", None),
                        "arguments": getattr(func_call, "arguments", None)
                    }
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    # Convert tool calls to list of dicts
                    choice_data["message"]["tool_calls"] = [
                        {
                            "id": getattr(tc, "id", None),
                            "type": getattr(tc, "type", None),
                            "function": {
                                "name": getattr(tc.function, "name", None),
                                "arguments": getattr(tc.function, "arguments", None)
                            } if hasattr(tc, "function") else None
                        }
                        for tc in msg.tool_calls
                    ]
            
            outputs["choices"].append(choice_data)
    
    elif hasattr(result, "content") and not hasattr(result, "choices"):  # Anthropic format
        outputs["content"] = result.content
        if hasattr(result, "role"):
            outputs["role"] = result.role
        if hasattr(result, "stop_reason"):
            outputs["stop_reason"] = result.stop_reason
    
    elif isinstance(result, str):  # Simple string response
        outputs["content"] = result
    
    elif isinstance(result, dict):  # Generic dict response
        outputs = result
    
    return outputs


def extract_token_usage(result: Any) -> Dict[str, int]:
    """Extract token usage from LLM response."""
    tokens = {}
    
    # OpenAI format
    if hasattr(result, "usage"):
        usage = result.usage
        if hasattr(usage, "prompt_tokens"):
            tokens["prompt_tokens"] = usage.prompt_tokens
        if hasattr(usage, "completion_tokens"):
            tokens["completion_tokens"] = usage.completion_tokens
        if hasattr(usage, "total_tokens"):
            tokens["total_tokens"] = usage.total_tokens
    
    # Anthropic format (in response metadata)
    elif hasattr(result, "usage"):
        if isinstance(result.usage, dict):
            tokens.update(result.usage)
    
    # LangChain format (might have token counts in metadata)
    elif hasattr(result, "llm_output") and isinstance(result.llm_output, dict):
        token_data = result.llm_output.get("token_usage", {})
        tokens.update(token_data)
    
    return tokens


def detect_provider(func: Callable, args: tuple, kwargs: Dict[str, Any]) -> Optional[str]:
    """Detect the LLM provider from function context."""
    # Check function module
    module = getattr(func, "__module__", "")
    
    if "openai" in module:
        return "openai"
    elif "anthropic" in module:
        return "anthropic"
    elif "langchain" in module:
        # Try to detect actual provider from model name
        model = kwargs.get("model", "")
        if "gpt" in model.lower():
            return "openai"
        elif "claude" in model.lower():
            return "anthropic"
        return "langchain"
    elif "litellm" in module:
        # LiteLLM can use multiple providers
        model = kwargs.get("model", "")
        if "gpt" in model.lower() or "openai" in model.lower():
            return "openai"
        elif "claude" in model.lower() or "anthropic" in model.lower():
            return "anthropic"
        return "litellm"
    
    # Check if the function is a method of a client object
    if args and hasattr(args[0], "__class__"):
        class_name = args[0].__class__.__name__.lower()
        if "openai" in class_name:
            return "openai"
        elif "anthropic" in class_name:
            return "anthropic"
    
    return None


@contextmanager
def track_llm_context(
    name: str,
    tags: Optional[Dict[str, str]] = None,
    log_aggregated_metrics: bool = True
):
    """
    Context manager for tracking multiple LLM calls.
    
    Useful for tracking conversations or chains of LLM calls.
    """
    run_tags = {"mltrack.type": "llm_conversation"}
    if tags:
        run_tags.update(tags)
    
    # Track aggregated metrics
    metrics_accumulator = {
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_tokens": 0,
        "total_cost": 0.0,
        "num_calls": 0,
        "total_latency_ms": 0.0,
    }
    
    # Check if we're already in an active run
    active_run = mlflow.active_run()
    nested = active_run is not None
    
    with mlflow.start_run(run_name=name, tags=run_tags, nested=nested) as run:
        # Store accumulator in run context for nested tracking
        run_id = run.info.run_id
        _context_accumulators[run_id] = metrics_accumulator
        
        try:
            yield run
        finally:
            # Log aggregated metrics
            if log_aggregated_metrics:
                for metric_name, value in metrics_accumulator.items():
                    if value > 0:
                        mlflow.log_metric(f"llm.conversation.{metric_name}", value)
            
            # Clean up
            _context_accumulators.pop(run_id, None)


# Global storage for context accumulators
_context_accumulators: Dict[str, Dict[str, Union[int, float]]] = {}


def get_current_accumulator() -> Optional[Dict[str, Union[int, float]]]:
    """Get the current context accumulator if in a tracked context."""
    active_run = mlflow.active_run()
    if active_run:
        return _context_accumulators.get(active_run.info.run_id)
    return None


class LLMTracker:
    """LLM tracking functionality for MLTracker."""
    
    def __init__(self, config):
        """Initialize LLM tracker with config."""
        self.config = config
        self.enabled = getattr(config, 'llm_tracking_enabled', True)
        
    def is_enabled(self) -> bool:
        """Check if LLM tracking is enabled."""
        return self.enabled