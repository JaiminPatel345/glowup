#!/usr/bin/env python3
"""
Validation script for ML data models.
Tests all Pydantic models to ensure they work correctly.
"""

import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.ml.models import (
    SkinType,
    IssueType,
    ModelConfig,
    ModelPrediction,
    SkinIssue,
    AnalysisResult,
    PreprocessingConfig,
    PostprocessingConfig,
    InferenceMetrics,
    BatchPrediction
)


def test_enums():
    """Test enum definitions."""
    print("Testing enums...")
    
    # Test SkinType enum
    assert SkinType.OILY.value == "oily"
    assert SkinType.DRY.value == "dry"
    assert SkinType.COMBINATION.value == "combination"
    assert SkinType.SENSITIVE.value == "sensitive"
    assert SkinType.NORMAL.value == "normal"
    print("  ✓ SkinType enum works correctly")
    
    # Test IssueType enum
    assert IssueType.ACNE.value == "acne"
    assert IssueType.DARK_SPOTS.value == "dark_spots"
    assert IssueType.WRINKLES.value == "wrinkles"
    assert IssueType.REDNESS.value == "redness"
    assert IssueType.DRYNESS.value == "dryness"
    assert IssueType.OILINESS.value == "oiliness"
    assert IssueType.ENLARGED_PORES.value == "enlarged_pores"
    assert IssueType.UNEVEN_TONE.value == "uneven_tone"
    print("  ✓ IssueType enum works correctly")


def test_model_config():
    """Test ModelConfig model."""
    print("\nTesting ModelConfig...")
    
    # Test with defaults
    config = ModelConfig()
    assert config.model_name == "efficientnet_b0"
    assert config.device == "auto"
    assert config.batch_size == 1
    assert config.confidence_threshold == 0.7
    print("  ✓ Default values work correctly")
    
    # Test with custom values
    config = ModelConfig(
        model_name="resnet50",
        model_path="./models/resnet50.pth",
        device="cuda",
        batch_size=4,
        confidence_threshold=0.8,
        input_size=(256, 256)
    )
    assert config.model_name == "resnet50"
    assert config.device == "cuda"
    assert config.batch_size == 4
    assert config.input_size == (256, 256)
    print("  ✓ Custom values work correctly")
    
    # Test validation
    try:
        ModelConfig(device="invalid")
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Device validation works correctly")
    
    try:
        ModelConfig(confidence_threshold=1.5)
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Confidence threshold validation works correctly")


def test_model_prediction():
    """Test ModelPrediction model."""
    print("\nTesting ModelPrediction...")
    
    prediction = ModelPrediction(
        skin_type="oily",
        skin_type_confidence=0.92,
        issues={
            "acne": 0.85,
            "dark_spots": 0.73,
            "oiliness": 0.88
        }
    )
    assert prediction.skin_type == "oily"
    assert prediction.skin_type_confidence == 0.92
    assert len(prediction.issues) == 3
    assert prediction.issues["acne"] == 0.85
    print("  ✓ ModelPrediction works correctly")
    
    # Test validation
    try:
        ModelPrediction(
            skin_type="invalid_type",
            skin_type_confidence=0.9,
            issues={}
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Skin type validation works correctly")
    
    try:
        ModelPrediction(
            skin_type="oily",
            skin_type_confidence=0.9,
            issues={"acne": 1.5}
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Issue confidence validation works correctly")


def test_skin_issue():
    """Test SkinIssue model."""
    print("\nTesting SkinIssue...")
    
    issue = SkinIssue(
        id="acne_001",
        name="Acne",
        description="Active acne breakouts detected",
        severity="medium",
        causes=["Excess oil", "Clogged pores"],
        confidence=0.87,
        highlighted_image_url="/uploads/highlighted_acne.png"
    )
    assert issue.id == "acne_001"
    assert issue.name == "Acne"
    assert issue.severity == "medium"
    assert issue.confidence == 0.87
    assert len(issue.causes) == 2
    print("  ✓ SkinIssue works correctly")
    
    # Test validation
    try:
        SkinIssue(
            id="test",
            name="Test",
            description="Test",
            severity="invalid",
            confidence=0.8
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Severity validation works correctly")


def test_analysis_result():
    """Test AnalysisResult model."""
    print("\nTesting AnalysisResult...")
    
    issues = [
        SkinIssue(
            id="acne_001",
            name="Acne",
            description="Active acne breakouts",
            severity="medium",
            causes=["Excess oil"],
            confidence=0.87
        ),
        SkinIssue(
            id="dark_spots_001",
            name="Dark Spots",
            description="Hyperpigmentation detected",
            severity="low",
            causes=["Sun exposure"],
            confidence=0.75
        )
    ]
    
    result = AnalysisResult(
        skin_type="oily",
        issues=issues,
        analysis_id="analysis_123",
        processing_time=2.5,
        model_version="efficientnet_b0_v1.0",
        model_confidence=0.85
    )
    assert result.skin_type == "oily"
    assert len(result.issues) == 2
    assert result.processing_time == 2.5
    assert result.model_version == "efficientnet_b0_v1.0"
    print("  ✓ AnalysisResult works correctly")
    
    # Test validation
    try:
        AnalysisResult(
            skin_type="invalid",
            issues=[],
            analysis_id="test",
            processing_time=1.0,
            model_version="v1.0"
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Skin type validation works correctly")


def test_preprocessing_config():
    """Test PreprocessingConfig model."""
    print("\nTesting PreprocessingConfig...")
    
    config = PreprocessingConfig()
    assert config.target_size == (224, 224)
    assert config.normalize_mean == (0.485, 0.456, 0.406)
    assert config.normalize_std == (0.229, 0.224, 0.225)
    print("  ✓ PreprocessingConfig defaults work correctly")
    
    config = PreprocessingConfig(
        target_size=(256, 256),
        normalize_mean=(0.5, 0.5, 0.5),
        normalize_std=(0.5, 0.5, 0.5)
    )
    assert config.target_size == (256, 256)
    print("  ✓ PreprocessingConfig custom values work correctly")


def test_postprocessing_config():
    """Test PostprocessingConfig model."""
    print("\nTesting PostprocessingConfig...")
    
    config = PostprocessingConfig()
    assert config.confidence_threshold == 0.7
    assert config.max_issues == 10
    assert config.generate_highlights == True
    assert config.highlight_color == (255, 0, 0)
    assert config.highlight_alpha == 0.5
    print("  ✓ PostprocessingConfig works correctly")


def test_inference_metrics():
    """Test InferenceMetrics model."""
    print("\nTesting InferenceMetrics...")
    
    metrics = InferenceMetrics(
        preprocessing_time=0.5,
        inference_time=1.5,
        postprocessing_time=0.5,
        total_time=2.5,
        device_used="cuda",
        memory_used_mb=512.0
    )
    assert metrics.preprocessing_time == 0.5
    assert metrics.inference_time == 1.5
    assert metrics.postprocessing_time == 0.5
    assert metrics.total_time == 2.5
    assert metrics.device_used == "cuda"
    print("  ✓ InferenceMetrics works correctly")
    
    # Test total time validation
    try:
        InferenceMetrics(
            preprocessing_time=0.5,
            inference_time=1.5,
            postprocessing_time=0.5,
            total_time=10.0,  # Wrong total
            device_used="cpu"
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Total time validation works correctly")


def test_batch_prediction():
    """Test BatchPrediction model."""
    print("\nTesting BatchPrediction...")
    
    predictions = [
        AnalysisResult(
            skin_type="oily",
            issues=[],
            analysis_id="analysis_1",
            processing_time=2.0,
            model_version="v1.0"
        ),
        AnalysisResult(
            skin_type="dry",
            issues=[],
            analysis_id="analysis_2",
            processing_time=2.0,
            model_version="v1.0"
        )
    ]
    
    batch = BatchPrediction(
        predictions=predictions,
        batch_size=2,
        total_processing_time=4.0,
        average_time_per_image=2.0
    )
    assert batch.batch_size == 2
    assert len(batch.predictions) == 2
    assert batch.total_processing_time == 4.0
    print("  ✓ BatchPrediction works correctly")
    
    # Test batch size validation
    try:
        BatchPrediction(
            predictions=predictions,
            batch_size=5,  # Wrong batch size
            total_processing_time=4.0,
            average_time_per_image=2.0
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("  ✓ Batch size validation works correctly")


def test_json_serialization():
    """Test JSON serialization/deserialization."""
    print("\nTesting JSON serialization...")
    
    issue = SkinIssue(
        id="acne_001",
        name="Acne",
        description="Active acne breakouts",
        severity="medium",
        causes=["Excess oil"],
        confidence=0.87
    )
    
    # Serialize to JSON
    json_data = issue.model_dump_json()
    assert isinstance(json_data, str)
    print("  ✓ JSON serialization works correctly")
    
    # Deserialize from JSON
    issue_from_json = SkinIssue.model_validate_json(json_data)
    assert issue_from_json.id == issue.id
    assert issue_from_json.name == issue.name
    assert issue_from_json.confidence == issue.confidence
    print("  ✓ JSON deserialization works correctly")


def test_compatibility_with_existing_models():
    """Test compatibility with existing API models."""
    print("\nTesting compatibility with existing API models...")
    
    # Import existing model
    from app.models.skin_analysis import SkinIssue as APISkinIssue
    
    # Create ML model instance
    ml_issue = SkinIssue(
        id="acne_001",
        name="Acne",
        description="Active acne breakouts",
        severity="medium",
        causes=["Excess oil"],
        confidence=0.87,
        highlighted_image_url="/uploads/highlighted.png"
    )
    
    # Convert to dict and create API model
    issue_dict = ml_issue.model_dump()
    api_issue = APISkinIssue(**issue_dict)
    
    # Verify fields match
    assert api_issue.id == ml_issue.id
    assert api_issue.name == ml_issue.name
    assert api_issue.description == ml_issue.description
    assert api_issue.severity == ml_issue.severity
    assert api_issue.causes == ml_issue.causes
    assert api_issue.confidence == ml_issue.confidence
    assert api_issue.highlighted_image_url == ml_issue.highlighted_image_url
    
    print("  ✓ ML models are compatible with existing API models")


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("ML Data Models Validation")
    print("=" * 60)
    
    try:
        test_enums()
        test_model_config()
        test_model_prediction()
        test_skin_issue()
        test_analysis_result()
        test_preprocessing_config()
        test_postprocessing_config()
        test_inference_metrics()
        test_batch_prediction()
        test_json_serialization()
        test_compatibility_with_existing_models()
        
        print("\n" + "=" * 60)
        print("✓ All validation tests passed!")
        print("=" * 60)
        return 0
        
    except Exception as e:
        print(f"\n✗ Validation failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
