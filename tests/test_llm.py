"""Tests for LLM tracking functionality."""

import pytest
from unittest.mock import Mock, MagicMock, patch
from mltrack.llm import (
    track_llm, track_llm_context, extract_llm_params,
    extract_llm_inputs, extract_llm_outputs, extract_token_usage,
    detect_provider, calculate_cost, LLMMetrics, LLMRequest, LLMResponse
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
    
    def test_extract_llm_params(self):
        """Test extraction of LLM parameters."""
        kwargs = {
            "model": "gpt-4",
            "temperature": 0.7,
            "max_tokens": 100,
            "top_p": 0.9,
            "unrelated_param": "ignore"
        }
        
        params = extract_llm_params(kwargs)
        
        assert params["model"] == "gpt-4"
        assert params["temperature"] == 0.7
        assert params["max_tokens"] == 100
        assert params["top_p"] == 0.9
        assert "unrelated_param" not in params
    
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
    
    def test_extract_token_usage_openai(self):
        """Test token extraction from OpenAI response."""
        response = Mock()
        response.usage = Mock(
            prompt_tokens=15,
            completion_tokens=25,
            total_tokens=40
        )
        
        tokens = extract_token_usage(response)
        
        assert tokens["prompt_tokens"] == 15
        assert tokens["completion_tokens"] == 25
        assert tokens["total_tokens"] == 40
    
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
    
    def test_calculate_cost(self):
        """Test cost calculation."""
        # Test OpenAI pricing
        tokens = {"prompt_tokens": 1000, "completion_tokens": 500}
        cost = calculate_cost(tokens, "gpt-3.5-turbo", "openai")
        expected = (1000/1000 * 0.0005) + (500/1000 * 0.0015)  # $0.0005 + $0.00075
        assert cost == round(expected, 6)
        
        # Test Anthropic pricing
        tokens = {"prompt_tokens": 2000, "completion_tokens": 1000}
        cost = calculate_cost(tokens, "claude-3-haiku", "anthropic")
        expected = (2000/1000 * 0.00025) + (1000/1000 * 0.00125)  # $0.0005 + $0.00125
        assert cost == round(expected, 6)
        
        # Test unknown model/provider
        cost = calculate_cost(tokens, "unknown-model", "unknown")
        assert cost == 0.0
    
    def test_llm_dataclasses(self):
        """Test LLM dataclass functionality."""
        # Test LLMMetrics
        metrics = LLMMetrics(
            prompt_tokens=100,
            completion_tokens=200,
            total_tokens=300,
            model="gpt-4",
            temperature=0.7
        )
        assert metrics.prompt_tokens == 100
        assert metrics.model == "gpt-4"
        
        # Test LLMRequest
        request = LLMRequest(
            messages=[{"role": "user", "content": "Hello"}],
            system="Be helpful"
        )
        assert len(request.messages) == 1
        assert request.system == "Be helpful"
        
        # Test LLMResponse
        response = LLMResponse(
            content="Hello there!",
            role="assistant",
            finish_reason="stop"
        )
        assert response.content == "Hello there!"
        assert response.finish_reason == "stop"
    
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
            tags={"mltrack.type": "llm"},
            nested=True
        )
    
    def test_error_handling(self, mock_mlflow):
        """Test error handling in LLM tracking."""
        @track_llm()
        def failing_call():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError, match="Test error"):
            failing_call()
        
        # Error should be logged
        mock_mlflow.log_param.assert_called_with("llm.error", "Test error")