"""LLM-specific tracking functionality for mltrack."""

import time
import json
import inspect
from typing import Dict, Any, Optional, Callable, Union, TypeVar
from functools import wraps
from contextlib import contextmanager
from collections.abc import Iterator, AsyncIterator
import logging

import mlflow

from .pricing import calculate_cost

logger = logging.getLogger(__name__)

# Type variable for generic function types
F = TypeVar('F', bound=Callable[..., Any])

_STREAM_EXCLUDE_TYPES = (str, bytes, dict, list, tuple)


def _is_streaming_result(result: Any) -> bool:
    if result is None:
        return False
    if inspect.isgenerator(result):
        return True
    if isinstance(result, Iterator) and not isinstance(result, _STREAM_EXCLUDE_TYPES):
        return True
    if hasattr(result, "__iter__") and not isinstance(result, _STREAM_EXCLUDE_TYPES):
        return True
    return False


def _is_async_streaming_result(result: Any) -> bool:
    if result is None:
        return False
    if inspect.isasyncgen(result):
        return True
    if isinstance(result, AsyncIterator):
        return True
    if hasattr(result, "__aiter__"):
        return True
    return False


def _finalize_llm_run(
    result: Any,
    provider: Optional[str],
    model_name: Optional[str],
    start_time: float,
    log_outputs: bool,
    track_tokens: bool,
    track_cost: bool,
) -> None:
    latency_ms = (time.time() - start_time) * 1000
    mlflow.log_metric("llm.latency_ms", latency_ms)

    if log_outputs and result:
        outputs = extract_llm_outputs(result)
        if outputs:
            mlflow.log_text(json.dumps(outputs, indent=2), "llm_outputs.json")

    metadata_tags = normalize_llm_metadata(provider, result)
    for key, value in metadata_tags.items():
        mlflow.set_tag(key, value)

    if track_tokens and result:
        tokens = normalize_llm_usage(provider, result)
        if tokens:
            for key, value in tokens.items():
                mlflow.log_metric(f"llm.tokens.{key}", value)

            if track_cost:
                model = model_name or "unknown"
                if provider and model != "unknown":
                    cost = calculate_cost(tokens, model, provider)
                    if cost is not None:
                        mlflow.log_metric("llm.cost_usd", cost)


def track_llm(
    func: Optional[F] = None,
    *,
    name: Optional[str] = None,
    tags: Optional[Dict[str, str]] = None,
    log_inputs: bool = True,
    log_outputs: bool = True,
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
        track_tokens: Whether to track token usage
        track_cost: Whether to estimate and track cost
        
    Returns:
        Wrapped function with LLM tracking
    """
    def decorator(func: F) -> F:
        if inspect.isasyncgenfunction(func):
            @wraps(func)
            async def async_gen_wrapper(*args, **kwargs):
                run_name = name or f"llm-{func.__name__}"

                provider = kwargs.get("provider") or detect_provider(func, args, kwargs)
                if not provider:
                    provider = detect_provider(async_gen_wrapper, args, kwargs)
                model_name = (
                    kwargs.get("model")
                    or kwargs.get("model_name")
                    or kwargs.get("model_id")
                    or kwargs.get("modelId")
                )

                run_tags = {}
                if tags:
                    run_tags.update(tags)
                if provider:
                    run_tags["llm.provider"] = provider
                if model_name:
                    run_tags["llm.model"] = model_name

                nested = mlflow.active_run() is not None
                mlflow.start_run(run_name=run_name, tags=run_tags, nested=nested)
                start_time = time.time()
                last_item = None

                try:
                    if provider and "llm.provider" not in run_tags:
                        mlflow.set_tag("llm.provider", provider)
                    if model_name and "llm.model" not in run_tags:
                        mlflow.set_tag("llm.model", model_name)

                    if log_inputs:
                        inputs = extract_llm_inputs(args, kwargs)
                        if inputs:
                            mlflow.log_text(json.dumps(inputs, indent=2), "llm_inputs.json")

                    result = func(*args, **kwargs)
                    async for item in result:
                        last_item = item
                        yield item
                finally:
                    _finalize_llm_run(
                        last_item,
                        provider,
                        model_name,
                        start_time,
                        log_outputs,
                        track_tokens,
                        track_cost,
                    )
                    mlflow.end_run()

            return async_gen_wrapper  # type: ignore[return-value]

        if inspect.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                run_name = name or f"llm-{func.__name__}"

                provider = kwargs.get("provider") or detect_provider(func, args, kwargs)
                if not provider:
                    provider = detect_provider(async_wrapper, args, kwargs)
                model_name = (
                    kwargs.get("model")
                    or kwargs.get("model_name")
                    or kwargs.get("model_id")
                    or kwargs.get("modelId")
                )

                run_tags = {}
                if tags:
                    run_tags.update(tags)
                if provider:
                    run_tags["llm.provider"] = provider
                if model_name:
                    run_tags["llm.model"] = model_name

                nested = mlflow.active_run() is not None
                mlflow.start_run(run_name=run_name, tags=run_tags, nested=nested)
                start_time = time.time()
                streaming = False

                try:
                    if provider and "llm.provider" not in run_tags:
                        mlflow.set_tag("llm.provider", provider)
                    if model_name and "llm.model" not in run_tags:
                        mlflow.set_tag("llm.model", model_name)

                    if log_inputs:
                        inputs = extract_llm_inputs(args, kwargs)
                        if inputs:
                            mlflow.log_text(json.dumps(inputs, indent=2), "llm_inputs.json")

                    result = await func(*args, **kwargs)

                    if _is_async_streaming_result(result):
                        streaming = True

                        async def stream_wrapper():
                            last_item = None
                            try:
                                async for item in result:
                                    last_item = item
                                    yield item
                            finally:
                                _finalize_llm_run(
                                    last_item,
                                    provider,
                                    model_name,
                                    start_time,
                                    log_outputs,
                                    track_tokens,
                                    track_cost,
                                )
                                mlflow.end_run()

                        return stream_wrapper()

                    _finalize_llm_run(
                        result,
                        provider,
                        model_name,
                        start_time,
                        log_outputs,
                        track_tokens,
                        track_cost,
                    )
                    return result
                finally:
                    if not streaming:
                        mlflow.end_run()

            return async_wrapper  # type: ignore[return-value]

        @wraps(func)
        def wrapper(*args, **kwargs):
            run_name = name or f"llm-{func.__name__}"

            provider = kwargs.get("provider") or detect_provider(func, args, kwargs)
            if not provider:
                provider = detect_provider(wrapper, args, kwargs)
            model_name = (
                kwargs.get("model")
                or kwargs.get("model_name")
                or kwargs.get("model_id")
                or kwargs.get("modelId")
            )

            run_tags = {}
            if tags:
                run_tags.update(tags)
            if provider:
                run_tags["llm.provider"] = provider
            if model_name:
                run_tags["llm.model"] = model_name

            nested = mlflow.active_run() is not None
            mlflow.start_run(run_name=run_name, tags=run_tags, nested=nested)
            start_time = time.time()
            streaming = False

            try:
                if provider and "llm.provider" not in run_tags:
                    mlflow.set_tag("llm.provider", provider)
                if model_name and "llm.model" not in run_tags:
                    mlflow.set_tag("llm.model", model_name)

                if log_inputs:
                    inputs = extract_llm_inputs(args, kwargs)
                    if inputs:
                        mlflow.log_text(json.dumps(inputs, indent=2), "llm_inputs.json")

                result = func(*args, **kwargs)

                if _is_streaming_result(result):
                    streaming = True

                    def stream_wrapper():
                        last_item = None
                        try:
                            for item in result:
                                last_item = item
                                yield item
                        finally:
                            _finalize_llm_run(
                                last_item,
                                provider,
                                model_name,
                                start_time,
                                log_outputs,
                                track_tokens,
                                track_cost,
                            )
                            mlflow.end_run()

                    return stream_wrapper()

                _finalize_llm_run(
                    result,
                    provider,
                    model_name,
                    start_time,
                    log_outputs,
                    track_tokens,
                    track_cost,
                )
                return result
            finally:
                if not streaming:
                    mlflow.end_run()

        return wrapper
    
    if func is None:
        return decorator
    else:
        return decorator(func)


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


def _get_usage_value(container: Any, *names: str) -> Optional[int]:
    for name in names:
        if isinstance(container, dict) and name in container:
            return container[name]
        if hasattr(container, name):
            return getattr(container, name)
    return None


def _get_usage_container(result: Any, *names: str) -> Any:
    for name in names:
        if isinstance(result, dict) and name in result:
            return result[name]
        if hasattr(result, name):
            return getattr(result, name)
    return None


def _get_value(container: Any, *names: str) -> Any:
    for name in names:
        if isinstance(container, dict) and name in container:
            return container[name]
        if hasattr(container, name):
            return getattr(container, name)
    return None


def _infer_provider_from_model_name(model_name: Optional[str]) -> Optional[str]:
    if not model_name:
        return None

    normalized = model_name.strip().lower()
    if not normalized:
        return None

    if "/" in normalized:
        prefix = normalized.split("/", 1)[0]
        if prefix in {"openai", "anthropic", "bedrock", "gemini"}:
            return prefix
        if prefix in {"vertexai", "vertex_ai", "vertex"}:
            return "vertex_ai"
        if prefix in {"google"}:
            return "gemini"

    if "bedrock" in normalized:
        return "bedrock"
    if "gpt" in normalized or "openai" in normalized:
        return "openai"
    if "claude" in normalized or "anthropic" in normalized:
        return "anthropic"
    if "vertex" in normalized:
        return "vertex_ai"
    if "gemini" in normalized:
        return "gemini"

    return None


def normalize_llm_usage(provider: Optional[str], result: Any) -> Dict[str, int]:
    """Normalize provider token usage to canonical keys."""
    if not provider:
        return {}

    provider = provider.lower()
    tokens: Dict[str, int] = {}

    if provider == "openai":
        usage = _get_usage_container(result, "usage")
        if usage:
            prompt = _get_usage_value(usage, "prompt_tokens", "input_tokens")
            completion = _get_usage_value(usage, "completion_tokens", "output_tokens")
            total = _get_usage_value(usage, "total_tokens")

            if prompt is not None:
                tokens["prompt_tokens"] = prompt
            if completion is not None:
                tokens["completion_tokens"] = completion
            if total is not None:
                tokens["total_tokens"] = total

    elif provider == "anthropic":
        usage = _get_usage_container(result, "usage")
        if usage:
            prompt = _get_usage_value(usage, "input_tokens", "prompt_tokens")
            completion = _get_usage_value(usage, "output_tokens", "completion_tokens")
            total = _get_usage_value(usage, "total_tokens")
            cache_creation = _get_usage_value(usage, "cache_creation_input_tokens")
            cache_read = _get_usage_value(usage, "cache_read_input_tokens")

            if prompt is not None:
                tokens["prompt_tokens"] = prompt
            if completion is not None:
                tokens["completion_tokens"] = completion
            if total is not None:
                tokens["total_tokens"] = total
            if cache_creation is not None:
                tokens["cache_creation_input_tokens"] = cache_creation
            if cache_read is not None:
                tokens["cache_read_input_tokens"] = cache_read

    elif provider in {"gemini", "vertex_ai"}:
        usage = _get_usage_container(result, "usageMetadata", "usage_metadata")
        if usage:
            prompt = _get_usage_value(
                usage,
                "promptTokenCount",
                "prompt_token_count",
                "inputTokenCount",
                "input_token_count",
            )
            completion = _get_usage_value(
                usage,
                "candidatesTokenCount",
                "candidates_token_count",
                "outputTokenCount",
                "output_token_count",
            )
            total = _get_usage_value(usage, "totalTokenCount", "total_token_count")
            cached = _get_usage_value(usage, "cachedContentTokenCount", "cached_content_token_count")
            tool_use = _get_usage_value(usage, "toolUsePromptTokenCount", "tool_use_prompt_token_count")

            if prompt is not None:
                tokens["prompt_tokens"] = prompt
            if completion is not None:
                tokens["completion_tokens"] = completion
            if total is not None:
                tokens["total_tokens"] = total
            if cached is not None:
                tokens["cached_content_token_count"] = cached
            if tool_use is not None:
                tokens["tool_use_prompt_token_count"] = tool_use

    elif provider == "bedrock":
        usage = _get_usage_container(result, "usage")
        if usage:
            prompt = _get_usage_value(
                usage,
                "inputTokens",
                "inputTokenCount",
                "input_token_count",
            )
            completion = _get_usage_value(
                usage,
                "outputTokens",
                "outputTokenCount",
                "output_token_count",
            )
            total = _get_usage_value(
                usage,
                "totalTokens",
                "totalTokenCount",
                "total_token_count",
            )
            cache_read = _get_usage_value(
                usage,
                "cacheReadInputTokens",
                "cacheReadInputTokenCount",
                "cache_read_input_tokens",
            )
            cache_write = _get_usage_value(
                usage,
                "cacheWriteInputTokens",
                "cacheWriteInputTokenCount",
                "cache_write_input_tokens",
            )

            if prompt is not None:
                tokens["prompt_tokens"] = prompt
            if completion is not None:
                tokens["completion_tokens"] = completion
            if total is not None:
                tokens["total_tokens"] = total
            if cache_read is not None:
                tokens["cache_read_input_tokens"] = cache_read
            if cache_write is not None:
                tokens["cache_write_input_tokens"] = cache_write

    if (
        "total_tokens" not in tokens
        and "prompt_tokens" in tokens
        and "completion_tokens" in tokens
    ):
        tokens["total_tokens"] = tokens["prompt_tokens"] + tokens["completion_tokens"]

    return tokens


def normalize_llm_metadata(provider: Optional[str], result: Any) -> Dict[str, str]:
    """Normalize provider metadata to canonical tags."""
    if not provider or result is None:
        return {}

    provider = provider.lower()
    metadata: Dict[str, str] = {}

    def set_tag(key: str, value: Any) -> None:
        if value is None:
            return
        metadata[key] = str(value)

    if provider == "openai":
        set_tag("llm.response_id", _get_value(result, "id"))
        set_tag("llm.request_id", _get_value(result, "_request_id", "request_id"))

        choices = _get_value(result, "choices")
        if isinstance(choices, (list, tuple)) and choices:
            set_tag("llm.finish_reason", _get_value(choices[0], "finish_reason"))

    elif provider == "anthropic":
        set_tag("llm.response_id", _get_value(result, "id"))
        set_tag("llm.request_id", _get_value(result, "_request_id", "request_id"))
        set_tag("llm.finish_reason", _get_value(result, "stop_reason"))

    elif provider in {"gemini", "vertex_ai"}:
        set_tag("llm.response_id", _get_value(result, "responseId", "response_id"))
        set_tag("llm.request_id", _get_value(result, "requestId", "request_id"))

        candidates = _get_value(result, "candidates")
        if isinstance(candidates, (list, tuple)) and candidates:
            set_tag("llm.finish_reason", _get_value(candidates[0], "finishReason", "finish_reason"))

    elif provider == "bedrock":
        set_tag("llm.request_id", _get_value(result, "requestId", "request_id"))
        set_tag("llm.response_id", _get_value(result, "responseId", "response_id"))
        set_tag("llm.finish_reason", _get_value(result, "stopReason", "stop_reason"))

    return metadata


def detect_provider(func: Callable, args: tuple, kwargs: Dict[str, Any]) -> Optional[str]:
    """Detect the LLM provider from function context."""
    # Check function module
    module = getattr(func, "__module__", "")
    model_id = kwargs.get("model_id") or kwargs.get("modelId")
    model_name = kwargs.get("model") or kwargs.get("model_name")
    
    if "openai" in module:
        return "openai"
    elif "anthropic" in module:
        return "anthropic"
    elif "bedrock" in module:
        return "bedrock"
    elif "vertexai" in module:
        return "vertex_ai"
    elif any(token in module for token in ("generativeai", "genai", "generativelanguage")):
        return "gemini"
    elif "langchain" in module:
        # Try to detect actual provider from model name
        if model_id:
            return "bedrock"

        inferred = _infer_provider_from_model_name(model_name)
        if inferred:
            return inferred
        return "langchain"
    elif "litellm" in module:
        # LiteLLM can use multiple providers
        inferred = _infer_provider_from_model_name(model_name)
        if inferred:
            return inferred
        return "litellm"
    
    if model_id:
        return "bedrock"

    inferred = _infer_provider_from_model_name(model_name)
    if inferred:
        return inferred

    # Check if the function is a method of a client object
    if args and hasattr(args[0], "__class__"):
        class_name = args[0].__class__.__name__.lower()
        if "openai" in class_name:
            return "openai"
        elif "anthropic" in class_name:
            return "anthropic"
        elif "bedrock" in class_name:
            return "bedrock"
        elif "vertex" in class_name:
            return "vertex_ai"
        elif "gemini" in class_name or "google" in class_name:
            return "gemini"
    
    return None


@contextmanager
def track_llm_context(
    name: str,
    tags: Optional[Dict[str, str]] = None,
):
    """Context manager for tracking multiple LLM calls."""
    run_tags = tags.copy() if tags else {}

    # Check if we're already in an active run
    active_run = mlflow.active_run()
    nested = active_run is not None

    with mlflow.start_run(run_name=name, tags=run_tags, nested=nested) as run:
        yield run


def log_llm_call(
    *,
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: float,
    finish_reason: Optional[str] = None,
    request_id: Optional[str] = None,
    response_id: Optional[str] = None,
    cost_usd: Optional[float] = None,
    run_name: Optional[str] = None,
    tags: Optional[Dict[str, str]] = None,
) -> None:
    """Log an LLM call to MLflow.

    This is a simple function for direct integration with LLM clients.
    It handles all MLflow logging in one call, including:
    - Token usage metrics
    - Latency
    - Cost calculation (automatic if not provided)
    - Provider/model tags

    If no MLflow run is active, a new run is started and ended automatically.
    If a run is active, metrics are logged to the current run.

    Args:
        provider: LLM provider name (e.g., "openai", "anthropic", "bedrock")
        model: Model identifier (e.g., "gpt-4", "claude-3-sonnet")
        input_tokens: Number of input/prompt tokens
        output_tokens: Number of output/completion tokens
        latency_ms: Request latency in milliseconds
        finish_reason: Stop reason (e.g., "stop", "length", "tool_calls")
        request_id: Provider request ID
        response_id: Provider response ID
        cost_usd: Cost in USD (auto-calculated if not provided)
        run_name: Optional name for the MLflow run (if starting a new one)
        tags: Additional tags to log

    Example:
        >>> from mltrack import log_llm_call
        >>>
        >>> # After making an LLM call:
        >>> log_llm_call(
        ...     provider="anthropic",
        ...     model="claude-3-5-sonnet",
        ...     input_tokens=150,
        ...     output_tokens=75,
        ...     latency_ms=1234.5,
        ...     finish_reason="end_turn",
        ... )
    """
    # Determine if we need to manage our own run
    active_run = mlflow.active_run()
    manage_run = active_run is None

    if manage_run:
        name = run_name or f"llm-{provider}-{model}"
        mlflow.start_run(run_name=name)

    try:
        # Log metrics
        mlflow.log_metric("llm.latency_ms", latency_ms)
        mlflow.log_metric("llm.tokens.prompt_tokens", input_tokens)
        mlflow.log_metric("llm.tokens.completion_tokens", output_tokens)
        mlflow.log_metric("llm.tokens.total_tokens", input_tokens + output_tokens)

        # Calculate cost if not provided
        if cost_usd is None:
            tokens = {
                "prompt_tokens": input_tokens,
                "completion_tokens": output_tokens,
            }
            cost_usd = calculate_cost(tokens, model, provider)

        if cost_usd is not None:
            mlflow.log_metric("llm.cost_usd", cost_usd)

        # Log tags
        mlflow.set_tag("llm.provider", provider)
        mlflow.set_tag("llm.model", model)

        if finish_reason:
            mlflow.set_tag("llm.finish_reason", finish_reason)
        if request_id:
            mlflow.set_tag("llm.request_id", request_id)
        if response_id:
            mlflow.set_tag("llm.response_id", response_id)

        # Additional custom tags
        if tags:
            for key, value in tags.items():
                mlflow.set_tag(key, value)

    finally:
        if manage_run:
            mlflow.end_run()
