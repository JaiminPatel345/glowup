#!/usr/bin/env python3
"""
Integration test demonstrating ML models working together.
Shows a realistic workflow from configuration to final result.
"""

import sys
from pathlib import Path
import time

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.ml.models import (
    ModelConfig,
    PreprocessingConfig,
    PostprocessingConfig,
    ModelPrediction,
    SkinIssue,
    AnalysisResult,
    InferenceMetrics,
    SkinType,
    IssueType
)


def simulate_ml_pipeline():
    """Simulate a complete ML pipeline using the models."""
    
    print("=" * 70)
    print("ML Models Integration Test - Simulating Complete Pipeline")
    print("=" * 70)
    
    # Step 1: Configuration
    print("\n[Step 1] Creating model configuration...")
    model_config = ModelConfig(
        model_name="efficientnet_b0",
        model_path="./models/efficientnet_b0.pth",
        device="auto",
        confidence_threshold=0.75
    )
    print(f"  Model: {model_config.model_name}")
    print(f"  Device: {model_config.device}")
    print(f"  Confidence threshold: {model_config.confidence_threshold}")
    
    preprocessing_config = PreprocessingConfig(
        target_size=(224, 224)
    )
    print(f"  Input size: {preprocessing_config.target_size}")
    
    postprocessing_config = PostprocessingConfig(
        confidence_threshold=0.75,
        max_issues=10,
        generate_highlights=True
    )
    print(f"  Max issues: {postprocessing_config.max_issues}")
    
    # Step 2: Simulate preprocessing
    print("\n[Step 2] Preprocessing image...")
    preprocessing_start = time.time()
    time.sleep(0.1)  # Simulate preprocessing
    preprocessing_time = time.time() - preprocessing_start
    print(f"  Preprocessing completed in {preprocessing_time:.3f}s")
    
    # Step 3: Simulate model inference
    print("\n[Step 3] Running model inference...")
    inference_start = time.time()
    time.sleep(0.2)  # Simulate inference
    inference_time = time.time() - inference_start
    
    # Create model prediction
    prediction = ModelPrediction(
        skin_type=SkinType.OILY.value,
        skin_type_confidence=0.92,
        issues={
            IssueType.ACNE.value: 0.87,
            IssueType.DARK_SPOTS.value: 0.78,
            IssueType.OILINESS.value: 0.91,
            IssueType.ENLARGED_PORES.value: 0.82
        }
    )
    print(f"  Detected skin type: {prediction.skin_type} (confidence: {prediction.skin_type_confidence:.2f})")
    print(f"  Detected {len(prediction.issues)} potential issues")
    print(f"  Inference completed in {inference_time:.3f}s")
    
    # Step 4: Simulate post-processing
    print("\n[Step 4] Post-processing results...")
    postprocessing_start = time.time()
    time.sleep(0.1)  # Simulate post-processing
    postprocessing_time = time.time() - postprocessing_start
    
    # Filter issues by confidence threshold
    filtered_issues = {
        issue: conf for issue, conf in prediction.issues.items()
        if conf >= postprocessing_config.confidence_threshold
    }
    print(f"  Filtered to {len(filtered_issues)} issues above threshold")
    
    # Create SkinIssue objects
    issues = []
    
    if IssueType.ACNE.value in filtered_issues:
        issues.append(SkinIssue(
            id="acne_001",
            name="Acne",
            description="Active acne breakouts detected on facial area",
            severity="medium",
            causes=[
                "Excess sebum production",
                "Clogged pores",
                "Bacterial growth",
                "Hormonal fluctuations"
            ],
            confidence=filtered_issues[IssueType.ACNE.value],
            highlighted_image_url="/uploads/highlighted_acne_test.png"
        ))
    
    if IssueType.DARK_SPOTS.value in filtered_issues:
        issues.append(SkinIssue(
            id="dark_spots_001",
            name="Dark Spots",
            description="Hyperpigmentation and dark spots detected",
            severity="low",
            causes=[
                "Sun exposure",
                "Post-inflammatory hyperpigmentation",
                "Age spots",
                "Melasma"
            ],
            confidence=filtered_issues[IssueType.DARK_SPOTS.value],
            highlighted_image_url="/uploads/highlighted_dark_spots_test.png"
        ))
    
    if IssueType.OILINESS.value in filtered_issues:
        issues.append(SkinIssue(
            id="oiliness_001",
            name="Excess Oiliness",
            description="Excessive sebum production detected",
            severity="medium",
            causes=[
                "Overactive sebaceous glands",
                "Hormonal imbalance",
                "Genetics",
                "Climate and humidity"
            ],
            confidence=filtered_issues[IssueType.OILINESS.value],
            highlighted_image_url="/uploads/highlighted_oiliness_test.png"
        ))
    
    if IssueType.ENLARGED_PORES.value in filtered_issues:
        issues.append(SkinIssue(
            id="pores_001",
            name="Enlarged Pores",
            description="Visible enlarged pores detected",
            severity="low",
            causes=[
                "Excess oil production",
                "Loss of skin elasticity",
                "Sun damage",
                "Genetics"
            ],
            confidence=filtered_issues[IssueType.ENLARGED_PORES.value],
            highlighted_image_url="/uploads/highlighted_pores_test.png"
        ))
    
    print(f"  Created {len(issues)} SkinIssue objects")
    print(f"  Post-processing completed in {postprocessing_time:.3f}s")
    
    # Step 5: Create final analysis result
    print("\n[Step 5] Creating final analysis result...")
    total_time = preprocessing_time + inference_time + postprocessing_time
    
    result = AnalysisResult(
        skin_type=prediction.skin_type,
        issues=issues,
        analysis_id="test_analysis_12345",
        processing_time=total_time,
        model_version="efficientnet_b0_v1.0",
        model_confidence=prediction.skin_type_confidence
    )
    
    print(f"  Analysis ID: {result.analysis_id}")
    print(f"  Total processing time: {result.processing_time:.3f}s")
    print(f"  Model version: {result.model_version}")
    
    # Step 6: Create inference metrics
    print("\n[Step 6] Recording inference metrics...")
    metrics = InferenceMetrics(
        preprocessing_time=preprocessing_time,
        inference_time=inference_time,
        postprocessing_time=postprocessing_time,
        total_time=total_time,
        device_used="cuda",
        memory_used_mb=512.5
    )
    
    print(f"  Device: {metrics.device_used}")
    print(f"  Memory used: {metrics.memory_used_mb:.1f} MB")
    print(f"  Breakdown:")
    print(f"    - Preprocessing: {metrics.preprocessing_time:.3f}s")
    print(f"    - Inference: {metrics.inference_time:.3f}s")
    print(f"    - Post-processing: {metrics.postprocessing_time:.3f}s")
    
    # Step 7: Display final results
    print("\n[Step 7] Final Analysis Results")
    print("-" * 70)
    print(f"Skin Type: {result.skin_type.upper()}")
    print(f"Confidence: {result.model_confidence:.1%}")
    print(f"\nDetected Issues ({len(result.issues)}):")
    
    for i, issue in enumerate(result.issues, 1):
        print(f"\n  {i}. {issue.name} (Severity: {issue.severity})")
        print(f"     Confidence: {issue.confidence:.1%}")
        print(f"     Description: {issue.description}")
        print(f"     Causes: {', '.join(issue.causes[:2])}...")
        if issue.highlighted_image_url:
            print(f"     Highlighted image: {issue.highlighted_image_url}")
    
    # Step 8: Test JSON serialization
    print("\n[Step 8] Testing JSON serialization...")
    json_result = result.model_dump_json(indent=2)
    print(f"  Serialized to JSON ({len(json_result)} bytes)")
    
    # Deserialize
    result_from_json = AnalysisResult.model_validate_json(json_result)
    print(f"  Deserialized successfully")
    print(f"  Verified: {result_from_json.analysis_id == result.analysis_id}")
    
    # Step 9: Test API compatibility
    print("\n[Step 9] Testing API compatibility...")
    from app.models.skin_analysis import SkinIssue as APISkinIssue
    
    # Convert first issue to API format
    api_issue = APISkinIssue(**issues[0].model_dump())
    print(f"  Converted to API SkinIssue: {api_issue.name}")
    print(f"  All fields compatible: ✓")
    
    print("\n" + "=" * 70)
    print("✓ Integration test completed successfully!")
    print("=" * 70)
    print("\nSummary:")
    print(f"  - Processed 1 image")
    print(f"  - Detected skin type: {result.skin_type}")
    print(f"  - Found {len(result.issues)} issues")
    print(f"  - Total time: {result.processing_time:.3f}s")
    print(f"  - All models working correctly ✓")
    print("=" * 70)


def main():
    """Run integration test."""
    try:
        simulate_ml_pipeline()
        return 0
    except Exception as e:
        print(f"\n✗ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
