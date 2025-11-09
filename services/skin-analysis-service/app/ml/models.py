"""
ML Data Models for Skin Analysis

This module defines Pydantic models for ML model configuration, predictions,
and results. These models ensure type safety and compatibility with the
existing API response schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any
from enum import Enum


class SkinType(str, Enum):
    """Skin type enumeration."""
    OILY = "oily"
    DRY = "dry"
    COMBINATION = "combination"
    SENSITIVE = "sensitive"
    NORMAL = "normal"


class IssueType(str, Enum):
    """Skin issue type enumeration."""
    ACNE = "acne"
    DARK_SPOTS = "dark_spots"
    WRINKLES = "wrinkles"
    REDNESS = "redness"
    DRYNESS = "dryness"
    OILINESS = "oiliness"
    ENLARGED_PORES = "enlarged_pores"
    UNEVEN_TONE = "uneven_tone"


class ModelConfig(BaseModel):
    """Configuration for ML model."""
    model_name: str = Field(
        default="efficientnet_b0",
        description="Name of the model to use"
    )
    model_path: str = Field(
        default="./models/efficientnet_b0.pth",
        description="Path to the model file"
    )
    device: str = Field(
        default="auto",
        description="Device to run inference on: 'auto', 'cuda', or 'cpu'"
    )
    batch_size: int = Field(
        default=1,
        ge=1,
        description="Batch size for inference"
    )
    confidence_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for predictions"
    )
    input_size: tuple = Field(
        default=(224, 224),
        description="Input image size (height, width)"
    )
    num_classes_skin_type: int = Field(
        default=5,
        description="Number of skin type classes"
    )
    num_classes_issues: int = Field(
        default=8,
        description="Number of skin issue classes"
    )
    
    @field_validator('device')
    @classmethod
    def validate_device(cls, v: str) -> str:
        """Validate device value."""
        if v not in ['auto', 'cuda', 'cpu']:
            raise ValueError("Device must be 'auto', 'cuda', or 'cpu'")
        return v
    
    @field_validator('input_size')
    @classmethod
    def validate_input_size(cls, v: tuple) -> tuple:
        """Validate input size is a tuple of two positive integers."""
        if not isinstance(v, tuple) or len(v) != 2:
            raise ValueError("Input size must be a tuple of (height, width)")
        if not all(isinstance(x, int) and x > 0 for x in v):
            raise ValueError("Input size dimensions must be positive integers")
        return v


class ModelPrediction(BaseModel):
    """Raw model prediction output."""
    skin_type: str = Field(
        ...,
        description="Predicted skin type"
    )
    skin_type_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for skin type prediction"
    )
    issues: Dict[str, float] = Field(
        default_factory=dict,
        description="Dictionary mapping issue names to confidence scores"
    )
    attention_maps: Optional[Dict[str, List[List[float]]]] = Field(
        default=None,
        description="Attention maps for each detected issue (optional)"
    )
    
    @field_validator('skin_type')
    @classmethod
    def validate_skin_type(cls, v: str) -> str:
        """Validate skin type is one of the allowed values."""
        valid_types = [st.value for st in SkinType]
        if v not in valid_types:
            raise ValueError(f"Skin type must be one of {valid_types}")
        return v
    
    @field_validator('issues')
    @classmethod
    def validate_issues(cls, v: Dict[str, float]) -> Dict[str, float]:
        """Validate issue confidence scores are between 0 and 1."""
        for issue_name, confidence in v.items():
            if not 0.0 <= confidence <= 1.0:
                raise ValueError(f"Confidence for {issue_name} must be between 0 and 1")
        return v


class SkinIssue(BaseModel):
    """
    Detected skin issue.
    Compatible with app.models.skin_analysis.SkinIssue
    """
    id: str = Field(
        ...,
        description="Unique identifier for the issue"
    )
    name: str = Field(
        ...,
        description="Name of the skin issue"
    )
    description: str = Field(
        ...,
        description="Detailed description of the issue"
    )
    severity: str = Field(
        ...,
        description="Severity level: 'low', 'medium', or 'high'"
    )
    causes: List[str] = Field(
        default_factory=list,
        description="List of possible causes"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="AI confidence score for this detection"
    )
    highlighted_image_url: Optional[str] = Field(
        default=None,
        description="URL to highlighted image showing the issue"
    )
    
    @field_validator('severity')
    @classmethod
    def validate_severity(cls, v: str) -> str:
        """Validate severity is one of the allowed values."""
        if v not in ['low', 'medium', 'high']:
            raise ValueError("Severity must be 'low', 'medium', or 'high'")
        return v


class AnalysisResult(BaseModel):
    """
    Complete analysis result from ML model.
    Compatible with API response format.
    """
    skin_type: str = Field(
        ...,
        description="Detected skin type"
    )
    issues: List[SkinIssue] = Field(
        default_factory=list,
        description="List of detected skin issues"
    )
    analysis_id: str = Field(
        ...,
        description="Unique identifier for this analysis"
    )
    processing_time: float = Field(
        ...,
        ge=0.0,
        description="Time taken for analysis in seconds"
    )
    model_version: str = Field(
        ...,
        description="Version of the ML model used"
    )
    model_confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Overall model confidence score"
    )
    
    @field_validator('skin_type')
    @classmethod
    def validate_skin_type(cls, v: str) -> str:
        """Validate skin type is one of the allowed values."""
        valid_types = [st.value for st in SkinType]
        if v not in valid_types:
            raise ValueError(f"Skin type must be one of {valid_types}")
        return v


class PreprocessingConfig(BaseModel):
    """Configuration for image preprocessing."""
    target_size: tuple = Field(
        default=(224, 224),
        description="Target image size (height, width)"
    )
    normalize_mean: tuple = Field(
        default=(0.485, 0.456, 0.406),
        description="Mean values for normalization (ImageNet stats)"
    )
    normalize_std: tuple = Field(
        default=(0.229, 0.224, 0.225),
        description="Standard deviation values for normalization (ImageNet stats)"
    )
    
    @field_validator('target_size', 'normalize_mean', 'normalize_std')
    @classmethod
    def validate_tuple_length(cls, v: tuple, info) -> tuple:
        """Validate tuple has correct length."""
        field_name = info.field_name
        if field_name == 'target_size' and len(v) != 2:
            raise ValueError("target_size must have 2 values (height, width)")
        if field_name in ['normalize_mean', 'normalize_std'] and len(v) != 3:
            raise ValueError(f"{field_name} must have 3 values (R, G, B)")
        return v


class PostprocessingConfig(BaseModel):
    """Configuration for post-processing predictions."""
    confidence_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold to include predictions"
    )
    max_issues: int = Field(
        default=10,
        ge=1,
        description="Maximum number of issues to return"
    )
    generate_highlights: bool = Field(
        default=True,
        description="Whether to generate highlighted images"
    )
    highlight_color: tuple = Field(
        default=(255, 0, 0),
        description="RGB color for highlighting (default: red)"
    )
    highlight_alpha: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Transparency for highlights (0=transparent, 1=opaque)"
    )


class InferenceMetrics(BaseModel):
    """Metrics collected during inference."""
    preprocessing_time: float = Field(
        ...,
        ge=0.0,
        description="Time spent on preprocessing in seconds"
    )
    inference_time: float = Field(
        ...,
        ge=0.0,
        description="Time spent on model inference in seconds"
    )
    postprocessing_time: float = Field(
        ...,
        ge=0.0,
        description="Time spent on post-processing in seconds"
    )
    total_time: float = Field(
        ...,
        ge=0.0,
        description="Total processing time in seconds"
    )
    device_used: str = Field(
        ...,
        description="Device used for inference (cuda/cpu)"
    )
    memory_used_mb: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Memory used during inference in MB"
    )
    
    @field_validator('total_time')
    @classmethod
    def validate_total_time(cls, v: float, info) -> float:
        """Validate total time is sum of component times."""
        data = info.data
        if all(k in data for k in ['preprocessing_time', 'inference_time', 'postprocessing_time']):
            expected = data['preprocessing_time'] + data['inference_time'] + data['postprocessing_time']
            # Allow small floating point differences
            if abs(v - expected) > 0.01:
                raise ValueError(f"Total time {v} doesn't match sum of components {expected}")
        return v


class BatchPrediction(BaseModel):
    """Results from batch prediction."""
    predictions: List[AnalysisResult] = Field(
        ...,
        description="List of analysis results"
    )
    batch_size: int = Field(
        ...,
        ge=1,
        description="Number of images in the batch"
    )
    total_processing_time: float = Field(
        ...,
        ge=0.0,
        description="Total time for batch processing in seconds"
    )
    average_time_per_image: float = Field(
        ...,
        ge=0.0,
        description="Average processing time per image in seconds"
    )
    
    @field_validator('batch_size')
    @classmethod
    def validate_batch_size(cls, v: int, info) -> int:
        """Validate batch size matches number of predictions."""
        data = info.data
        if 'predictions' in data and len(data['predictions']) != v:
            raise ValueError(f"Batch size {v} doesn't match number of predictions {len(data['predictions'])}")
        return v
