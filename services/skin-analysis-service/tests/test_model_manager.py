"""
Unit tests for ModelManager.

Tests model loading, device detection, inference, error handling,
memory cleanup, and CPU fallback on GPU OOM.
"""

import pytest
import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os

from app.ml.model_manager import ModelManager
from app.ml.exceptions import (
    ModelNotFoundError,
    ModelLoadError,
    InferenceError,
    DeviceError,
    OutOfMemoryError,
)


class DummyModel(nn.Module):
    """Dummy model for testing purposes."""
    
    def __init__(self, num_skin_types=5, num_issues=8):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 16, 3, padding=1)
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc_skin_type = nn.Linear(16, num_skin_types)
        self.fc_issues = nn.Linear(16, num_issues)
    
    def forward(self, x):
        x = self.conv1(x)
        x = self.pool(x)
        x = x.view(x.size(0), -1)
        skin_type = self.fc_skin_type(x)
        issues = self.fc_issues(x)
        return skin_type, issues


class TestModelManager:
    """Test suite for ModelManager class."""
    
    @pytest.fixture
    def temp_model_path(self):
        """Create a temporary model file for testing."""
        with tempfile.NamedTemporaryFile(suffix='.pth', delete=False) as tmp_file:
            # Create and save a dummy model
            model = DummyModel()
            torch.save(model, tmp_file.name)
            
            yield tmp_file.name
            
            # Cleanup
            if os.path.exists(tmp_file.name):
                os.unlink(tmp_file.name)
    
    @pytest.fixture
    def nonexistent_model_path(self):
        """Return a path to a non-existent model file."""
        return "/tmp/nonexistent_model_12345.pth"
    
    @pytest.fixture
    def sample_input_tensor(self):
        """Create a sample input tensor for inference."""
        # Create a tensor with shape (1, 3, 224, 224)
        return torch.randn(1, 3, 224, 224)
    
    @pytest.fixture
    def model_manager_cpu(self, temp_model_path):
        """Create a ModelManager instance configured for CPU."""
        return ModelManager(
            model_path=temp_model_path,
            device="cpu",
            confidence_threshold=0.7,
            enable_quantization=False,
            enable_caching=False
        )
    
    @pytest.fixture
    def model_manager_auto(self, temp_model_path):
        """Create a ModelManager instance with auto device detection."""
        return ModelManager(
            model_path=temp_model_path,
            device="auto",
            confidence_threshold=0.7,
            enable_quantization=False,
            enable_caching=False
        )
    
    # Test initialization
    def test_model_manager_initialization(self, temp_model_path):
        """Test ModelManager initialization with default parameters."""
        manager = ModelManager(model_path=temp_model_path)
        
        assert manager.model_path == Path(temp_model_path)
        assert manager.device_preference == "auto"
        assert manager.device is None
        assert manager.model is None
        assert manager._is_loaded is False
        assert manager.confidence_threshold == 0.7
    
    def test_model_manager_initialization_custom_params(self, temp_model_path):
        """Test ModelManager initialization with custom parameters."""
        manager = ModelManager(
            model_path=temp_model_path,
            device="cpu",
            confidence_threshold=0.8,
            enable_quantization=True,
            enable_caching=True,
            cache_size=256,
            batch_size=16
        )
        
        assert manager.device_preference == "cpu"
        assert manager.confidence_threshold == 0.8
    
    def test_model_manager_initialization_nonexistent_path(self, nonexistent_model_path):
        """Test that ModelManager can be initialized with non-existent path."""
        # Initialization should succeed even if file doesn't exist
        # Error should only occur when trying to load
        manager = ModelManager(model_path=nonexistent_model_path)
        
        assert manager.model_path == Path(nonexistent_model_path)
        assert manager._is_loaded is False
    
    # Test device detection
    def test_detect_device_cpu_preference(self, model_manager_cpu):
        """Test device detection when CPU is explicitly requested."""
        device = model_manager_cpu.detect_device()
        
        assert device == "cpu"
    
    def test_detect_device_auto_with_cuda_available(self, model_manager_auto):
        """Test device detection with auto when CUDA is available."""
        with patch('torch.cuda.is_available', return_value=True):
            with patch('torch.cuda.get_device_name', return_value='NVIDIA GeForce GTX 1080'):
                device = model_manager_auto.detect_device()
                
                assert device == "cuda"
    
    def test_detect_device_auto_without_cuda(self, model_manager_auto):
        """Test device detection with auto when CUDA is not available."""
        with patch('torch.cuda.is_available', return_value=False):
            device = model_manager_auto.detect_device()
            
            assert device == "cpu"
    
    def test_detect_device_exception_handling(self, model_manager_auto):
        """Test device detection handles exceptions properly."""
        with patch('torch.cuda.is_available', side_effect=RuntimeError("CUDA error")):
            with pytest.raises(DeviceError) as exc_info:
                model_manager_auto.detect_device()
            
            assert "Failed to detect device" in str(exc_info.value)
    
    # Test model loading
    def test_load_model_success_cpu(self, model_manager_cpu):
        """Test successful model loading on CPU."""
        model_manager_cpu.load_model()
        
        assert model_manager_cpu._is_loaded is True
        assert model_manager_cpu.model is not None
        assert model_manager_cpu.device == "cpu"
    
    def test_load_model_success_auto_device(self, model_manager_auto):
        """Test successful model loading with auto device detection."""
        model_manager_auto.load_model()
        
        assert model_manager_auto._is_loaded is True
        assert model_manager_auto.model is not None
        assert model_manager_auto.device in ["cpu", "cuda"]
    
    def test_load_model_file_not_found(self, nonexistent_model_path):
        """Test model loading fails when file doesn't exist."""
        manager = ModelManager(model_path=nonexistent_model_path, device="cpu")
        
        with pytest.raises(ModelNotFoundError) as exc_info:
            manager.load_model()
        
        assert "Model file not found" in str(exc_info.value)
        assert nonexistent_model_path in str(exc_info.value.details)
    
    def test_load_model_already_loaded(self, model_manager_cpu):
        """Test that loading an already loaded model is handled gracefully."""
        # Load model first time
        model_manager_cpu.load_model()
        assert model_manager_cpu._is_loaded is True
        
        # Try to load again
        model_manager_cpu.load_model()
        
        # Should still be loaded without errors
        assert model_manager_cpu._is_loaded is True
    
    def test_load_model_sets_eval_mode(self, model_manager_cpu):
        """Test that loaded model is set to evaluation mode."""
        model_manager_cpu.load_model()
        
        # Check if model is in eval mode
        if isinstance(model_manager_cpu.model, nn.Module):
            assert not model_manager_cpu.model.training
    
    def test_load_model_corrupted_file(self):
        """Test model loading fails with corrupted file."""
        with tempfile.NamedTemporaryFile(suffix='.pth', delete=False) as tmp_file:
            # Write invalid data
            tmp_file.write(b"corrupted data")
            tmp_file.flush()
            
            manager = ModelManager(model_path=tmp_file.name, device="cpu")
            
            try:
                with pytest.raises(ModelLoadError) as exc_info:
                    manager.load_model()
                
                assert "Failed to load model" in str(exc_info.value)
            finally:
                os.unlink(tmp_file.name)
    
    @patch('torch.cuda.is_available', return_value=True)
    @patch('torch.cuda.get_device_name', return_value='Mock GPU')
    def test_load_model_gpu_oom_fallback_to_cpu(self, mock_device_name, mock_cuda_available, temp_model_path):
        """Test automatic CPU fallback when GPU runs out of memory during loading."""
        manager = ModelManager(model_path=temp_model_path, device="auto", enable_caching=False)
        
        # Mock torch.load to raise OOM on first call (GPU), succeed on second (CPU)
        original_load = torch.load
        call_count = [0]
        
        def mock_load(path, map_location, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1 and map_location == "cuda":
                # Create a proper CUDA OOM error
                oom_error = torch.cuda.OutOfMemoryError()
                oom_error.args = ("CUDA out of memory",)
                raise oom_error
            return original_load(path, map_location="cpu", **kwargs)
        
        with patch('torch.load', side_effect=mock_load):
            with patch('torch.cuda.empty_cache'):
                manager.load_model()
        
        # Should have fallen back to CPU
        assert manager._is_loaded is True
        assert manager.device == "cpu"
        assert call_count[0] == 2  # Should have tried twice
    
    # Test model unloading
    def test_unload_model(self, model_manager_cpu):
        """Test model unloading."""
        # Load model first
        model_manager_cpu.load_model()
        assert model_manager_cpu._is_loaded is True
        
        # Unload model
        model_manager_cpu.unload_model()
        
        assert model_manager_cpu.model is None
        assert model_manager_cpu._is_loaded is False
    
    def test_unload_model_when_not_loaded(self, model_manager_cpu):
        """Test unloading when model is not loaded."""
        # Should not raise an error
        model_manager_cpu.unload_model()
        
        assert model_manager_cpu.model is None
        assert model_manager_cpu._is_loaded is False
    
    def test_unload_model_multiple_times(self, model_manager_cpu):
        """Test unloading model multiple times."""
        model_manager_cpu.load_model()
        
        # Unload multiple times
        model_manager_cpu.unload_model()
        model_manager_cpu.unload_model()
        
        assert model_manager_cpu.model is None
        assert model_manager_cpu._is_loaded is False
    
    # Test inference
    def test_predict_lazy_loading(self, model_manager_cpu, sample_input_tensor):
        """Test that predict triggers lazy loading if model not loaded."""
        assert model_manager_cpu._is_loaded is False
        
        # Predict should trigger loading
        result = model_manager_cpu.predict(sample_input_tensor, use_cache=False)
        
        assert model_manager_cpu._is_loaded is True
        assert result is not None
    
    def test_predict_success(self, model_manager_cpu, sample_input_tensor):
        """Test successful prediction."""
        model_manager_cpu.load_model()
        
        result = model_manager_cpu.predict(sample_input_tensor, use_cache=False)
        
        assert isinstance(result, dict)
        assert "skin_type" in result
        assert "skin_type_confidence" in result
        assert "issues" in result
        assert "device_used" in result
        assert result["device_used"] == "cpu"
    
    def test_predict_output_format(self, model_manager_cpu, sample_input_tensor):
        """Test that prediction output has correct format."""
        model_manager_cpu.load_model()
        
        result = model_manager_cpu.predict(sample_input_tensor, use_cache=False)
        
        # Check skin type
        assert isinstance(result["skin_type"], str)
        assert result["skin_type"] in ["oily", "dry", "combination", "sensitive", "normal", "unknown"]
        
        # Check confidence
        assert isinstance(result["skin_type_confidence"], float)
        assert 0.0 <= result["skin_type_confidence"] <= 1.0
        
        # Check issues
        assert isinstance(result["issues"], dict)
        for issue_name, confidence in result["issues"].items():
            assert isinstance(issue_name, str)
            assert isinstance(confidence, float)
            assert 0.0 <= confidence <= 1.0
            assert confidence >= model_manager_cpu.confidence_threshold
    
    def test_predict_confidence_threshold(self, temp_model_path, sample_input_tensor):
        """Test that confidence threshold filters low-confidence predictions."""
        # Create manager with high threshold
        manager = ModelManager(
            model_path=temp_model_path,
            device="cpu",
            confidence_threshold=0.9,
            enable_caching=False
        )
        manager.load_model()
        
        result = manager.predict(sample_input_tensor, use_cache=False)
        
        # All issues should have confidence >= 0.9
        for confidence in result["issues"].values():
            assert confidence >= 0.9
    
    def test_predict_different_inputs_different_outputs(self, model_manager_cpu):
        """Test that different inputs produce different outputs."""
        model_manager_cpu.load_model()
        
        input1 = torch.randn(1, 3, 224, 224)
        input2 = torch.randn(1, 3, 224, 224)
        
        result1 = model_manager_cpu.predict(input1, use_cache=False)
        result2 = model_manager_cpu.predict(input2, use_cache=False)
        
        # Results should be different (with very high probability)
        # At least one of these should be different
        assert (
            result1["skin_type"] != result2["skin_type"] or
            result1["skin_type_confidence"] != result2["skin_type_confidence"] or
            result1["issues"] != result2["issues"]
        )
    
    def test_predict_invalid_input_shape(self, model_manager_cpu):
        """Test prediction with invalid input shape."""
        model_manager_cpu.load_model()
        
        # Wrong shape tensor
        invalid_tensor = torch.randn(3, 224, 224)  # Missing batch dimension
        
        with pytest.raises(InferenceError):
            model_manager_cpu.predict(invalid_tensor, use_cache=False)
    
    def test_predict_gpu_oom_fallback_to_cpu(self, temp_model_path):
        """Test automatic CPU fallback when GPU runs out of memory during inference."""
        manager = ModelManager(model_path=temp_model_path, device="cpu", enable_caching=False)
        
        # Load model on CPU first
        manager.load_model()
        
        # Manually set device to cuda to simulate GPU scenario
        manager.device = "cuda"
        
        # Create input tensor
        input_tensor = torch.randn(1, 3, 224, 224)
        
        # Mock tensor.to() to raise OOM when moving to CUDA
        original_to = input_tensor.to
        call_count = [0]
        
        def mock_to(device, *args, **kwargs):
            call_count[0] += 1
            if device == "cuda" and call_count[0] == 1:
                # Create proper CUDA OOM error
                oom_error = torch.cuda.OutOfMemoryError()
                oom_error.args = ("CUDA out of memory",)
                raise oom_error
            # Return CPU tensor
            return input_tensor
        
        with patch.object(input_tensor, 'to', side_effect=mock_to):
            with patch('torch.cuda.empty_cache'):
                with patch('torch.cuda.is_available', return_value=True):
                    with patch('torch.cuda.memory_allocated', return_value=1024*1024*100):
                        # This should trigger fallback
                        result = manager.predict(input_tensor, use_cache=False)
        
        # Should have attempted fallback and succeeded
        assert call_count[0] >= 1
        assert result is not None
        assert result["device_used"] == "cpu"
    
    # Test memory cleanup
    def test_cleanup_memory(self, model_manager_cpu):
        """Test memory cleanup without unloading model."""
        model_manager_cpu.load_model()
        
        # Cleanup should not unload model
        model_manager_cpu.cleanup_memory()
        
        assert model_manager_cpu._is_loaded is True
        assert model_manager_cpu.model is not None
    
    def test_cleanup_memory_when_not_loaded(self, model_manager_cpu):
        """Test memory cleanup when model is not loaded."""
        # Should not raise an error
        model_manager_cpu.cleanup_memory()
        
        assert model_manager_cpu._is_loaded is False
    
    def test_cleanup_memory_calls_performance_optimizer(self, model_manager_cpu):
        """Test that cleanup calls performance optimizer cleanup."""
        model_manager_cpu.load_model()
        
        # Mock the performance optimizer cleanup
        with patch.object(model_manager_cpu.performance_optimizer, 'cleanup') as mock_cleanup:
            model_manager_cpu.cleanup_memory()
            
            # Should have called cleanup
            assert mock_cleanup.called
    
    # Test is_loaded method
    def test_is_loaded_initially_false(self, model_manager_cpu):
        """Test that is_loaded returns False initially."""
        assert model_manager_cpu.is_loaded() is False
    
    def test_is_loaded_after_loading(self, model_manager_cpu):
        """Test that is_loaded returns True after loading."""
        model_manager_cpu.load_model()
        
        assert model_manager_cpu.is_loaded() is True
    
    def test_is_loaded_after_unloading(self, model_manager_cpu):
        """Test that is_loaded returns False after unloading."""
        model_manager_cpu.load_model()
        model_manager_cpu.unload_model()
        
        assert model_manager_cpu.is_loaded() is False
    
    # Test get_device method
    def test_get_device_before_loading(self, model_manager_cpu):
        """Test get_device returns None before loading."""
        assert model_manager_cpu.get_device() is None
    
    def test_get_device_after_loading(self, model_manager_cpu):
        """Test get_device returns correct device after loading."""
        model_manager_cpu.load_model()
        
        device = model_manager_cpu.get_device()
        assert device == "cpu"
    
    # Test get_model_info method
    def test_get_model_info_before_loading(self, model_manager_cpu):
        """Test get_model_info before loading model."""
        info = model_manager_cpu.get_model_info()
        
        assert isinstance(info, dict)
        assert info["is_loaded"] is False
        assert info["device"] is None
        assert info["model_exists"] is True
        assert "model_size_mb" in info
    
    def test_get_model_info_after_loading(self, model_manager_cpu):
        """Test get_model_info after loading model."""
        model_manager_cpu.load_model()
        
        info = model_manager_cpu.get_model_info()
        
        assert info["is_loaded"] is True
        assert info["device"] == "cpu"
        assert "model_size_mb" in info
        assert "performance_stats" in info
    
    def test_get_model_info_nonexistent_model(self, nonexistent_model_path):
        """Test get_model_info with non-existent model."""
        manager = ModelManager(model_path=nonexistent_model_path, device="cpu")
        
        info = manager.get_model_info()
        
        assert info["model_exists"] is False
        assert "model_size_mb" not in info
    
    # Test batch prediction
    def test_predict_batch_success(self, model_manager_cpu):
        """Test successful batch prediction."""
        model_manager_cpu.load_model()
        
        # Create batch of inputs
        inputs = [torch.randn(1, 3, 224, 224) for _ in range(3)]
        
        results = model_manager_cpu.predict_batch(inputs)
        
        assert isinstance(results, list)
        assert len(results) == 3
        
        for result in results:
            assert isinstance(result, dict)
            assert "skin_type" in result
            assert "issues" in result
    
    def test_predict_batch_lazy_loading(self, model_manager_cpu):
        """Test that predict_batch triggers lazy loading."""
        assert model_manager_cpu._is_loaded is False
        
        inputs = [torch.randn(1, 3, 224, 224) for _ in range(2)]
        
        results = model_manager_cpu.predict_batch(inputs)
        
        assert model_manager_cpu._is_loaded is True
        assert len(results) == 2
    
    def test_predict_batch_empty_list(self, model_manager_cpu):
        """Test batch prediction with empty list."""
        model_manager_cpu.load_model()
        
        with pytest.raises(InferenceError):
            model_manager_cpu.predict_batch([])
    
    # Test error handling
    def test_model_load_error_includes_details(self, nonexistent_model_path):
        """Test that ModelLoadError includes detailed information."""
        manager = ModelManager(model_path=nonexistent_model_path, device="cpu")
        
        try:
            manager.load_model()
            assert False, "Should have raised ModelNotFoundError"
        except ModelNotFoundError as e:
            assert e.error_code == "MODEL_NOT_FOUND"
            assert "model_path" in e.details
            assert e.details["model_path"] == nonexistent_model_path
    
    def test_inference_error_includes_details(self, model_manager_cpu):
        """Test that InferenceError includes detailed information."""
        model_manager_cpu.load_model()
        
        # Create invalid input
        invalid_input = torch.randn(3, 224, 224)  # Wrong shape
        
        try:
            model_manager_cpu.predict(invalid_input, use_cache=False)
            assert False, "Should have raised InferenceError"
        except InferenceError as e:
            assert e.error_code == "INFERENCE_ERROR"
            assert "device" in e.details or "input_shape" in e.details
    
    # Test caching functionality
    def test_predict_with_caching_enabled(self, temp_model_path, sample_input_tensor):
        """Test prediction with caching enabled."""
        manager = ModelManager(
            model_path=temp_model_path,
            device="cpu",
            enable_caching=True,
            cache_size=128
        )
        manager.load_model()
        
        # First prediction (cache miss)
        result1 = manager.predict(sample_input_tensor, use_cache=True)
        assert result1["cached"] is False
        
        # Second prediction with same input (cache hit)
        result2 = manager.predict(sample_input_tensor, use_cache=True)
        assert result2["cached"] is True
        
        # Results should be identical
        assert result1["skin_type"] == result2["skin_type"]
        assert result1["skin_type_confidence"] == result2["skin_type_confidence"]
    
    def test_predict_with_caching_disabled(self, temp_model_path, sample_input_tensor):
        """Test prediction with caching disabled."""
        manager = ModelManager(
            model_path=temp_model_path,
            device="cpu",
            enable_caching=False
        )
        manager.load_model()
        
        # Both predictions should be cache misses
        result1 = manager.predict(sample_input_tensor, use_cache=True)
        result2 = manager.predict(sample_input_tensor, use_cache=True)
        
        assert result1["cached"] is False
        assert result2["cached"] is False
    
    # Test multiple load/unload cycles
    def test_multiple_load_unload_cycles(self, model_manager_cpu, sample_input_tensor):
        """Test multiple load/unload cycles."""
        for i in range(3):
            # Load
            model_manager_cpu.load_model()
            assert model_manager_cpu.is_loaded() is True
            
            # Predict
            result = model_manager_cpu.predict(sample_input_tensor, use_cache=False)
            assert result is not None
            
            # Unload
            model_manager_cpu.unload_model()
            assert model_manager_cpu.is_loaded() is False
    
    # Test thread safety (basic check)
    def test_concurrent_predictions(self, model_manager_cpu):
        """Test that multiple predictions can be made sequentially."""
        model_manager_cpu.load_model()
        
        inputs = [torch.randn(1, 3, 224, 224) for _ in range(5)]
        
        results = []
        for input_tensor in inputs:
            result = model_manager_cpu.predict(input_tensor, use_cache=False)
            results.append(result)
        
        assert len(results) == 5
        for result in results:
            assert "skin_type" in result
            assert "issues" in result
