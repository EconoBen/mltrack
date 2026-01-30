"""Tests for LLM tracking functionality."""

import pytest
from unittest.mock import Mock, MagicMock
from mltrack.llm import (
    track_llm, track_llm_context, extract_llm_inputs, extract_llm_outputs,
    detect_provider, calculate_cost
)
import mlflow


class TestLLMTracking:
    """Test LLM tracking decorators and utilities."""
    
    @pytest.fixture
    def mock_mlflow(self, monkeypatch):
        """Mock MLflow for testing."""
        mock = Mock()
        mock_run = MagicMock()
        mock_run.__enter__ = MagicMock(return_value=mock_run)
        mock_run.__exit__ = MagicMock(return_value=None)
        mock.start_run.return_value = mock_run
        mock.active_run.return_value = None  # No active run by default
        monkeypatch.setattr("mltrack.llm.mlflow", mock)
        return mock
    
    def test_track_llm_decorator_basic(self, mock_mlflow):
        """Test basic LLM tracking decorator."""
        @track_llm(name="test-llm")
        def dummy_llm_call(prompt: str, model: str = "gpt-3.5-turbo"):
            return {"content": f"Response to: {prompt}"}
        
        # Need to mock log_text and log_metric
        mock_mlflow.log_text = Mock()
        mock_mlflow.log_metric = Mock()
        mock_mlflow.log_param = Mock()
        
        result = dummy_llm_call("Hello")
        
        # Verify MLflow was called
        mock_mlflow.start_run.assert_called_once()
        assert mock_mlflow.log_metric.called  # latency metric
        assert result["content"] == "Response to: Hello"
    
    def test_track_llm_with_token_tracking(self, mock_mlflow):
        """Test LLM tracking with token usage."""
        @track_llm(track_tokens=True)
        def dummy_llm_call(prompt: str):
            # Simulate OpenAI-style response
            response = Mock()
            response.usage = Mock(
                prompt_tokens=10,
                completion_tokens=20,
                total_tokens=30
            )
            # Need to add choices for extract_llm_outputs to work
            response.choices = []
            return response
        
        dummy_llm_call.__module__ = "openai.resources.chat"
        
        # Mock required methods
        mock_mlflow.log_text = Mock()
        mock_mlflow.log_metric = Mock()
        mock_mlflow.log_param = Mock()
        
        result = dummy_llm_call("Test prompt")
        
        # Check token metrics were logged
        expected_calls = [
            (("llm.tokens.prompt_tokens", 10),),
            (("llm.tokens.completion_tokens", 20),),
            (("llm.tokens.total_tokens", 30),)
        ]
        
        actual_metric_calls = [
            call.args for call in mock_mlflow.log_metric.call_args_list
            if call.args[0].startswith("llm.tokens.")
        ]
        
        for expected in expected_calls:
            assert expected[0] in actual_metric_calls
    
    def test_track_llm_context_manager(self, mock_mlflow):
        """Test LLM conversation context manager."""
        # Mock required methods
        mock_mlflow.log_text = Mock()
        mock_mlflow.log_metric = Mock()
        mock_mlflow.log_param = Mock()
        
        # Mock run info
        mock_run = Mock()
        mock_run.info.run_id = "test-run-id"
        mock_mlflow.start_run.return_value.__enter__.return_value = mock_run
        
        with track_llm_context("test-conversation"):
            # Context should start a run
            mock_mlflow.start_run.assert_called_once()
            
            # Simulate some LLM calls within context
            @track_llm()
            def call1():
                return {"content": "Response 1"}
            
            @track_llm()
            def call2():
                return {"content": "Response 2"}
            
            # Set active run for nested calls
            mock_mlflow.active_run.return_value = mock_run
            
            call1()
            call2()
        
        # After context, aggregated metrics should be logged
        assert mock_mlflow.log_metric.called
    
    def test_extract_llm_inputs(self):
        """Test extraction of LLM inputs."""
        # Test with messages in kwargs
        kwargs = {
            "messages": [{"role": "user", "content": "Hello"}],
            "system": "You are helpful"
        }
        inputs = extract_llm_inputs((), kwargs)
        assert inputs["messages"] == kwargs["messages"]
        assert inputs["system"] == kwargs["system"]
        
        # Test with prompt in kwargs
        kwargs = {"prompt": "Test prompt"}
        inputs = extract_llm_inputs((), kwargs)
        assert inputs["prompt"] == "Test prompt"
        
        # Test with prompt as first arg
        args = ("Test prompt from args",)
        inputs = extract_llm_inputs(args, {})
        assert inputs["prompt"] == "Test prompt from args"
    
    def test_extract_llm_outputs_openai_format(self):
        """Test extraction of OpenAI-style outputs."""
        # Mock OpenAI response
        choice = Mock()
        choice.index = 0
        choice.finish_reason = "stop"
        choice.message = Mock(
            role="assistant",
            content="Test response"
        )
        choice.message.tool_calls = None
        
        response = Mock()
        response.choices = [choice]
        
        outputs = extract_llm_outputs(response)
        
        assert len(outputs["choices"]) == 1
        assert outputs["choices"][0]["message"]["content"] == "Test response"
        assert outputs["choices"][0]["finish_reason"] == "stop"
    
    def test_extract_llm_outputs_anthropic_format(self):
        """Test extraction of Anthropic-style outputs."""
        response = Mock(spec=['content', 'role', 'stop_reason'])
        response.content = "Claude response"
        response.role = "assistant"
        response.stop_reason = "end_turn"
        
        outputs = extract_llm_outputs(response)
        
        assert outputs["content"] == "Claude response"
        assert outputs["role"] == "assistant"
        assert outputs["stop_reason"] == "end_turn"
    
    def test_detect_provider(self):
        """Test LLM provider detection."""
        # Test by module name
        func = Mock()
        func.__module__ = "openai.resources.chat"
        provider = detect_provider(func, (), {})
        assert provider == "openai"
        
        func.__module__ = "anthropic.messages"
        provider = detect_provider(func, (), {})
        assert provider == "anthropic"
        
        # Test by model name in kwargs
        func.__module__ = "langchain.llms"
        provider = detect_provider(func, (), {"model": "gpt-4"})
        assert provider == "openai"
        
        provider = detect_provider(func, (), {"model": "claude-3-opus"})
        assert provider == "anthropic"

        func.__module__ = "litellm.router"
        provider = detect_provider(
            func,
            (),
            {"model": "bedrock/anthropic.claude-3-sonnet-20240229-v1:0"},
        )
        assert provider == "bedrock"

        provider = detect_provider(func, (), {"model": "gemini/gemini-1.5-pro"})
        assert provider == "gemini"

        func.__module__ = "langchain_aws.chat_models"
        provider = detect_provider(
            func,
            (),
            {"model_id": "anthropic.claude-3-sonnet-20240229-v1:0"},
        )
        assert provider == "bedrock"

        func.__module__ = "custom.wrapper"
        provider = detect_provider(func, (), {"model_name": "openai/gpt-4o-mini"})
        assert provider == "openai"

        func.__module__ = "vertexai.preview.generative_models"
        provider = detect_provider(func, (), {"model": "vertex_ai/gemini-1.5-pro"})
        assert provider == "vertex_ai"
    
    def test_calculate_cost(self):
        """Test cost calculation."""
        snapshot = {
            "schema_version": "1",
            "models": {
                "gpt-3.5-turbo": {
                    "canonical_provider": "openai",
                    "input_cost_per_token": 5e-7,
                    "output_cost_per_token": 1.5e-6,
                },
                "claude-3-haiku": {
                    "canonical_provider": "anthropic",
                    "input_cost_per_token": 2.5e-7,
                    "output_cost_per_token": 1.25e-6,
                },
            },
        }

        # Test OpenAI pricing
        tokens = {"prompt_tokens": 1000, "completion_tokens": 500}
        cost = calculate_cost(tokens, "gpt-3.5-turbo", "openai", snapshot=snapshot)
        expected = (1000 * 5e-7) + (500 * 1.5e-6)
        assert cost == round(expected, 6)

        # Test Anthropic pricing
        tokens = {"prompt_tokens": 2000, "completion_tokens": 1000}
        cost = calculate_cost(tokens, "claude-3-haiku", "anthropic", snapshot=snapshot)
        expected = (2000 * 2.5e-7) + (1000 * 1.25e-6)
        assert cost == round(expected, 6)

        # Test unknown model/provider
        cost = calculate_cost(tokens, "unknown-model", "unknown", snapshot=snapshot)
        assert cost is None
    
    def test_nested_tracking(self, mock_mlflow):
        """Test nested LLM tracking."""
        # Simulate active run
        mock_mlflow.active_run.return_value = Mock(info=Mock(run_id="parent-run"))
        
        @track_llm()
        def nested_call():
            return {"content": "Nested response"}
        
        result = nested_call()
        
        # Should create nested run
        mock_mlflow.start_run.assert_called_with(
            run_name="llm-nested_call",
            tags={},
            nested=True
        )
    
    def test_error_handling(self, mock_mlflow):
        """Test error handling in LLM tracking."""
        @track_llm()
        def failing_call():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError, match="Test error"):
            failing_call()

        assert mock_mlflow.log_param.call_count == 0


def test_llm_tracker_removed():
    """Ensure legacy LLMTracker stub is not part of the API."""
    import mltrack.llm as llm

    assert not hasattr(llm, "LLMTracker")


class TestLogLLMCall:
    """Test the log_llm_call() function for direct integration."""

    @pytest.fixture
    def mock_mlflow(self, monkeypatch):
        """Mock MLflow for testing."""
        mock = Mock()
        mock.active_run.return_value = None  # No active run by default
        mock.log_metric = Mock()
        mock.set_tag = Mock()
        mock.start_run = Mock()
        mock.end_run = Mock()
        monkeypatch.setattr("mltrack.llm.mlflow", mock)
        return mock

    def test_log_llm_call_basic(self, mock_mlflow):
        """Test basic log_llm_call functionality."""
        from mltrack.llm import log_llm_call

        log_llm_call(
            provider="anthropic",
            model="claude-3-5-sonnet",
            input_tokens=100,
            output_tokens=50,
            latency_ms=1234.5,
        )

        # Should start and end a run (no active run)
        mock_mlflow.start_run.assert_called_once()
        mock_mlflow.end_run.assert_called_once()

        # Check metrics logged
        metric_calls = {call.args[0]: call.args[1] for call in mock_mlflow.log_metric.call_args_list}
        assert metric_calls["llm.latency_ms"] == 1234.5
        assert metric_calls["llm.tokens.prompt_tokens"] == 100
        assert metric_calls["llm.tokens.completion_tokens"] == 50
        assert metric_calls["llm.tokens.total_tokens"] == 150

        # Check tags logged
        tag_calls = {call.args[0]: call.args[1] for call in mock_mlflow.set_tag.call_args_list}
        assert tag_calls["llm.provider"] == "anthropic"
        assert tag_calls["llm.model"] == "claude-3-5-sonnet"

    def test_log_llm_call_with_metadata(self, mock_mlflow):
        """Test log_llm_call with optional metadata."""
        from mltrack.llm import log_llm_call

        log_llm_call(
            provider="openai",
            model="gpt-4",
            input_tokens=200,
            output_tokens=100,
            latency_ms=500.0,
            finish_reason="stop",
            request_id="req-123",
            response_id="resp-456",
        )

        tag_calls = {call.args[0]: call.args[1] for call in mock_mlflow.set_tag.call_args_list}
        assert tag_calls["llm.finish_reason"] == "stop"
        assert tag_calls["llm.request_id"] == "req-123"
        assert tag_calls["llm.response_id"] == "resp-456"

    def test_log_llm_call_with_active_run(self, mock_mlflow):
        """Test log_llm_call when there's an active MLflow run."""
        from mltrack.llm import log_llm_call

        # Simulate active run
        mock_mlflow.active_run.return_value = Mock(info=Mock(run_id="existing-run"))

        log_llm_call(
            provider="bedrock",
            model="anthropic.claude-3-sonnet",
            input_tokens=50,
            output_tokens=25,
            latency_ms=800.0,
        )

        # Should NOT start a new run (use existing)
        mock_mlflow.start_run.assert_not_called()
        # Should NOT end run (leave it open for caller)
        mock_mlflow.end_run.assert_not_called()

        # Metrics should still be logged
        assert mock_mlflow.log_metric.called

    def test_log_llm_call_with_custom_tags(self, mock_mlflow):
        """Test log_llm_call with additional custom tags."""
        from mltrack.llm import log_llm_call

        log_llm_call(
            provider="gemini",
            model="gemini-pro",
            input_tokens=100,
            output_tokens=50,
            latency_ms=600.0,
            tags={"custom.tag": "value", "environment": "test"},
        )

        tag_calls = {call.args[0]: call.args[1] for call in mock_mlflow.set_tag.call_args_list}
        assert tag_calls["custom.tag"] == "value"
        assert tag_calls["environment"] == "test"

    def test_log_llm_call_with_explicit_cost(self, mock_mlflow):
        """Test log_llm_call with explicitly provided cost."""
        from mltrack.llm import log_llm_call

        log_llm_call(
            provider="anthropic",
            model="claude-3-opus",
            input_tokens=1000,
            output_tokens=500,
            latency_ms=2000.0,
            cost_usd=0.05,
        )

        metric_calls = {call.args[0]: call.args[1] for call in mock_mlflow.log_metric.call_args_list}
        assert metric_calls["llm.cost_usd"] == 0.05
