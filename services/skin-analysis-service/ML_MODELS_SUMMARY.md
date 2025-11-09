# ML Data Models Implementation Summary

## Overview
This document summarizes the implementation of ML data models for the skin analysis service (Task 8).

## Files Created

### 1. `app/ml/models.py`
Main module containing all Pydantic models for ML operations.

### 2. `validate_ml_models.py`
Comprehensive validation script to test all models.

## Models Implemented

### Enumerations

#### `SkinType` (Enum)
- OILY = "oily"
- DRY = "dry"
- COMBINATION = "combination"
- SENSITIVE = "sensitive"
- NORMAL = "normal"

#### `IssueType` (Enum)
- ACNE = "acne"
- DARK_SPOTS = "dark_spots"
- WRINKLES = "wrinkles"
- REDNESS = "redness"
- DRYNESS = "dryness"
- OILINESS = "oiliness"
- ENLARGED_PORES = "enlarged_pores"
- UNEVEN_TONE = "uneven_tone"

### Configuration Models

#### `ModelConfig`
Configuration for ML model initialization and inference.

**Fields:**
- `model_name`: Name of the model (default: "efficientnet_b0")
- `model_path`: Path to model file
- `device`: Device for inference ("auto", "cuda", "cpu")
- `batch_size`: Batch size for inference
- `confidence_threshold`: Minimum confidence threshold (0.0-1.0)
- `input_size`: Input image dimensions (height, width)
- `num_classes_skin_type`: Number of skin type classes (5)
- `num_classes_issues`: Number of issue classes (8)

**Validations:**
- Device must be "auto", "cuda", or "cpu"
- Input size must be tuple of 2 positive integers
- Confidence threshold between 0.0 and 1.0

#### `PreprocessingConfig`
Configuration for image preprocessing.

**Fields:**
- `target_size`: Target image size (default: 224x224)
- `normalize_mean`: Mean values for normalization (ImageNet stats)
- `normalize_std`: Std values for normalization (ImageNet stats)

#### `PostprocessingConfig`
Configuration for post-processing predictions.

**Fields:**
- `confidence_threshold`: Minimum confidence to include predictions
- `max_issues`: Maximum number of issues to return
- `generate_highlights`: Whether to generate highlighted images
- `highlight_color`: RGB color for highlighting
- `highlight_alpha`: Transparency for highlights

### Prediction Models

#### `ModelPrediction`
Raw model prediction output.

**Fields:**
- `skin_type`: Predicted skin type
- `skin_type_confidence`: Confidence score (0.0-1.0)
- `issues`: Dict mapping issue names to confidence scores
- `attention_maps`: Optional attention maps for visualization

**Validations:**
- Skin type must be valid SkinType value
- All confidence scores between 0.0 and 1.0

#### `SkinIssue`
Detected skin issue (compatible with existing API models).

**Fields:**
- `id`: Unique identifier
- `name`: Issue name
- `description`: Detailed description
- `severity`: "low", "medium", or "high"
- `causes`: List of possible causes
- `confidence`: AI confidence score (0.0-1.0)
- `highlighted_image_url`: Optional URL to highlighted image

**Validations:**
- Severity must be "low", "medium", or "high"
- Confidence between 0.0 and 1.0

#### `AnalysisResult`
Complete analysis result (compatible with API response format).

**Fields:**
- `skin_type`: Detected skin type
- `issues`: List of detected issues
- `analysis_id`: Unique identifier
- `processing_time`: Time taken in seconds
- `model_version`: Model version used
- `model_confidence`: Optional overall confidence

**Validations:**
- Skin type must be valid SkinType value
- Processing time must be non-negative

### Metrics Models

#### `InferenceMetrics`
Metrics collected during inference.

**Fields:**
- `preprocessing_time`: Time for preprocessing
- `inference_time`: Time for model inference
- `postprocessing_time`: Time for post-processing
- `total_time`: Total processing time
- `device_used`: Device used (cuda/cpu)
- `memory_used_mb`: Optional memory usage

**Validations:**
- Total time must equal sum of component times
- All times must be non-negative

#### `BatchPrediction`
Results from batch prediction.

**Fields:**
- `predictions`: List of analysis results
- `batch_size`: Number of images in batch
- `total_processing_time`: Total time for batch
- `average_time_per_image`: Average time per image

**Validations:**
- Batch size must match number of predictions

## Compatibility

### With Existing API Models
All ML models are designed to be compatible with existing API response schemas:

- `SkinIssue` matches `app.models.skin_analysis.SkinIssue`
- `AnalysisResult` can be converted to `SkinAnalysisResponse`
- Field names and types are consistent across models

### JSON Serialization
All models support:
- `model_dump()`: Convert to dictionary
- `model_dump_json()`: Serialize to JSON string
- `model_validate_json()`: Deserialize from JSON string

## Validation

The `validate_ml_models.py` script tests:
1. ✓ Enum definitions
2. ✓ ModelConfig with defaults and custom values
3. ✓ ModelPrediction with validation
4. ✓ SkinIssue with severity validation
5. ✓ AnalysisResult with skin type validation
6. ✓ PreprocessingConfig
7. ✓ PostprocessingConfig
8. ✓ InferenceMetrics with time validation
9. ✓ BatchPrediction with batch size validation
10. ✓ JSON serialization/deserialization
11. ✓ Compatibility with existing API models

All tests pass successfully!

## Usage Examples

### Creating a ModelConfig
```python
from app.ml.models import ModelConfig

config = ModelConfig(
    model_name="efficientnet_b0",
    device="auto",
    confidence_threshold=0.8
)
```

### Creating a Prediction
```python
from app.ml.models import ModelPrediction

prediction = ModelPrediction(
    skin_type="oily",
    skin_type_confidence=0.92,
    issues={
        "acne": 0.85,
        "dark_spots": 0.73
    }
)
```

### Creating an Analysis Result
```python
from app.ml.models import AnalysisResult, SkinIssue

issues = [
    SkinIssue(
        id="acne_001",
        name="Acne",
        description="Active acne breakouts",
        severity="medium",
        causes=["Excess oil", "Clogged pores"],
        confidence=0.87
    )
]

result = AnalysisResult(
    skin_type="oily",
    issues=issues,
    analysis_id="analysis_123",
    processing_time=2.5,
    model_version="efficientnet_b0_v1.0"
)
```

## Requirements Satisfied

✓ **Requirement 3.2**: Model outputs are formatted to API response format (SkinIssue objects)
- SkinIssue model matches existing API schema
- AnalysisResult provides complete response structure
- All models support JSON serialization

## Next Steps

These models will be used by:
1. **ModelManager** (Task 6) - for inference output
2. **PostProcessor** (Task 7) - for formatting results
3. **AI Service Integration** (Task 10) - for API responses

## Testing

Run validation:
```bash
cd services/skin-analysis-service
python validate_ml_models.py
```

Expected output: All tests pass ✓
