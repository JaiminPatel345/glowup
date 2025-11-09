# Implementation Plan

- [x] 1. Set up ML module structure and dependencies
  - Create `app/ml/` directory with `__init__.py`, `model_manager.py`, `preprocessor.py`, `postprocessor.py`, and `models.py`
  - Update `requirements.txt` with ML dependencies: torch, torchvision, transformers, timm, huggingface-hub
  - Create `scripts/` directory for setup and utility scripts
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement model download script
  - Create `scripts/download_models.py` with ModelDownloader class
  - Implement download_model() function to fetch models from Hugging Face Hub
  - Add model verification with checksum validation
  - Support for multiple models (efficientnet_b0, resnet50, vit_base)
  - Include retry logic for failed downloads (up to 3 attempts)
  - _Requirements: 1.1, 1.2, 1.4, 4.3, 4.4_

- [x] 3. Create Linux setup script
  - Create `setup.sh` with executable permissions
  - Implement Python version check (3.8+)
  - Add virtual environment creation
  - Implement GPU detection using nvidia-smi
  - Install appropriate PyTorch version (CUDA or CPU)
  - Install all dependencies from requirements.txt
  - Call model download script
  - Run validation tests
  - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 1.6, 1.7_

- [ ] 4. Create Windows setup script
  - Create `setup.bat` for Windows 11
  - Implement Python version check
  - Add virtual environment creation for Windows
  - Implement GPU detection using nvidia-smi
  - Install appropriate PyTorch version (CUDA or CPU)
  - Install all dependencies from requirements.txt
  - Call model download script
  - Run validation tests
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 1.6, 1.7_

- [x] 5. Implement image preprocessor
  - Create ImagePreprocessor class in `app/ml/preprocessor.py`
  - Implement preprocess() method with resize, normalize, and tensor conversion
  - Add validate_image() method for quality checks
  - Support for batch preprocessing
  - Use ImageNet normalization statistics
  - _Requirements: 3.1, 5.2_

- [x] 6. Implement model manager
  - Create ModelManager class in `app/ml/model_manager.py`
  - Implement detect_device() method for automatic GPU/CPU detection
  - Implement load_model() with device-aware loading and CPU fallback
  - Add predict() method for inference with error handling
  - Implement lazy loading (load on first inference)
  - Add unload_model() for memory cleanup
  - Include OutOfMemoryError handling with automatic CPU fallback
  - _Requirements: 1.6, 1.7, 3.3, 5.1, 5.3, 5.4_

- [x] 7. Implement post-processor
  - Create PostProcessor class in `app/ml/postprocessor.py`
  - Implement process_predictions() to format model outputs
  - Add filter_low_confidence() method with configurable threshold
  - Implement generate_highlighted_image() for issue visualization
  - Map model outputs to API response format (SkinIssue objects)
  - _Requirements: 3.2, 2.1_

- [x] 8. Create ML data models
  - Create Pydantic models in `app/ml/models.py`
  - Define ModelConfig, SkinType, IssueType enums
  - Define ModelPrediction, SkinIssue, AnalysisResult models
  - Ensure compatibility with existing API response schemas
  - _Requirements: 3.2_

- [x] 9. Implement ML configuration
  - Create `app/core/ml_config.py` with MLSettings class
  - Add environment variables for model configuration
  - Include settings for model path, device, confidence threshold, batch size
  - Add HuggingFace cache directory configuration
  - Support for fallback API configuration (optional)
  - _Requirements: 7.2_

- [x] 10. Integrate ML model with AI service
  - Update `app/services/ai_service.py` to use ModelManager
  - Replace placeholder logic with actual ML inference
  - Implement analyze_skin() method using preprocessor, model manager, and postprocessor
  - Add error handling with graceful degradation
  - Include timing metrics for performance monitoring
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.5_

- [x] 11. Create model validation script
  - Create `scripts/validate_model.py` for post-setup validation
  - Test model loading on detected device
  - Run sample inference with test image
  - Verify output format matches expected schema
  - Check inference time meets performance requirements
  - _Requirements: 6.4, 5.1_

- [x] 12. Implement model accuracy testing
  - Create `tests/test_model_accuracy.py`
  - Load test dataset with labeled skin images (100+ samples)
  - Implement accuracy calculation for skin type classification
  - Calculate precision, recall, F1-score for each skin condition
  - Generate confusion matrix
  - Assert accuracy >= 90% threshold
  - Log detailed metrics report
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2_

- [x] 12.1 Create test dataset loader
  - Implement function to load and parse test dataset
  - Support multiple image formats (JPEG, PNG)
  - Include ground truth labels for validation
  - _Requirements: 6.2_

- [ ] 12.2 Implement metrics calculation utilities
  - Create helper functions for accuracy, precision, recall, F1-score
  - Generate confusion matrix visualization
  - Format metrics report for readability
  - _Requirements: 2.2, 2.5_

- [x] 13. Write unit tests for preprocessor
  - Create `tests/test_preprocessor.py`
  - Test image resizing to target dimensions
  - Test normalization with ImageNet stats
  - Test tensor conversion and batch dimension
  - Test invalid image handling
  - Test batch preprocessing
  - _Requirements: 6.1_

- [x] 14. Write unit tests for model manager
  - Create `tests/test_model_manager.py`
  - Test device detection (GPU/CPU)
  - Test model loading and unloading
  - Test inference with sample images
  - Test error handling for missing models
  - Test memory cleanup
  - Test CPU fallback on GPU OOM
  - _Requirements: 6.1, 6.4_

- [ ]* 15. Write unit tests for post-processor
  - Create `tests/test_postprocessor.py`
  - Test confidence thresholding
  - Test result formatting to API schema
  - Test highlighted image generation
  - Test issue classification mapping
  - _Requirements: 6.1_

- [ ]* 16. Write integration tests
  - Create `tests/test_ml_integration.py`
  - Test end-to-end analysis pipeline (preprocess → inference → postprocess)
  - Test API endpoint with real images
  - Verify response format matches OpenAPI spec
  - Test error handling for invalid inputs
  - _Requirements: 6.3_

- [ ]* 17. Write performance tests
  - Create `tests/test_ml_performance.py`
  - Test CPU inference time (should be <= 3 seconds)
  - Test GPU inference time (should be <= 1 second) if GPU available
  - Test memory usage during inference
  - Test concurrent request handling
  - _Requirements: 5.1, 5.5, 6.4_

- [x] 18. Update service documentation
  - Update `README.md` with ML model setup instructions
  - Add quick start guide for Linux and Windows
  - Document model architecture and accuracy metrics
  - Add troubleshooting section for common issues
  - Include example API calls with model responses
  - Document GPU vs CPU setup differences
  - _Requirements: 7.1, 7.3, 7.4, 7.5_

- [x] 19. Add model metadata endpoint
  - Add `/api/v1/model/info` endpoint to return model metadata
  - Include model name, version, accuracy, device (GPU/CPU)
  - Add model loading status
  - Include supported skin types and issues
  - _Requirements: 7.1_

- [x] 20. Implement error handling and logging
  - Add custom exceptions (ModelError, ModelNotFoundError, InferenceError)
  - Implement error handling in all ML components
  - Add structured logging with timing metrics
  - Log model loading, inference times, and errors
  - Implement graceful degradation for inference failures
  - _Requirements: 3.3, 6.4_

- [x] 21. Add performance optimizations
  - Implement model quantization for CPU inference
  - Add prediction caching with LRU cache
  - Implement batch processing support
  - Add memory cleanup utilities
  - _Requirements: 5.2, 5.5_

- [ ]* 21.1 Implement ONNX export (optional)
  - Create script to export PyTorch model to ONNX format
  - Add ONNX runtime inference support
  - Benchmark ONNX vs PyTorch performance
  - _Requirements: 5.1_

- [x] 22. Create comprehensive .env.example
  - Add all ML configuration variables with descriptions
  - Include examples for GPU and CPU configurations
  - Document optional settings (caching, fallback API)
  - Add comments explaining each setting
  - _Requirements: 7.2_

- [x] 23. Final integration and validation
  - Run complete setup script on clean Linux environment
  - Run complete setup script on clean Windows 11 environment
  - Verify all tests pass (unit, integration, accuracy, performance)
  - Test complete analysis workflow via API
  - Verify accuracy meets >= 90% threshold
  - Validate GPU and CPU modes work correctly
  - Generate final validation report
  - _Requirements: 2.1, 2.3, 4.7, 6.1, 6.2, 6.3, 6.4_
