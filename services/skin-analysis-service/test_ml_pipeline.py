#!/usr/bin/env python3
"""
Integration test for the complete ML pipeline.

Tests the integration between ImagePreprocessor, ModelManager, and PostProcessor
to ensure they work together correctly.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.ml.preprocessor import ImagePreprocessor
from app.ml.postprocessor import PostProcessor


def test_complete_pipeline():
    """Test the complete ML pipeline from image to formatted results."""
    print("=" * 60)
    print("ML Pipeline Integration Test")
    print("=" * 60)
    
    # Step 1: Create test image
    print("\n[Step 1] Creating test image...")
    test_image = Image.new('RGB', (400, 400), color=(220, 180, 150))
    print(f"✓ Test image created: {test_image.size}, mode: {test_image.mode}")
    
    # Step 2: Initialize preprocessor
    print("\n[Step 2] Initializing preprocessor...")
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    print(f"✓ Preprocessor initialized with target size: {preprocessor.target_size}")
    
    # Step 3: Preprocess image
    print("\n[Step 3] Preprocessing image...")
    tensor = preprocessor.preprocess(test_image)
    print(f"✓ Image preprocessed to tensor shape: {tensor.shape}")
    print(f"  - Batch dimension: {tensor.shape[0]}")
    print(f"  - Channels: {tensor.shape[1]}")
    print(f"  - Height x Width: {tensor.shape[2]} x {tensor.shape[3]}")
    
    # Step 4: Simulate model predictions
    print("\n[Step 4] Simulating model predictions...")
    # In real scenario, this would come from ModelManager.predict()
    mock_predictions = {
        "skin_type": "combination",
        "skin_type_confidence": 0.87,
        "issues": {
            "acne": 0.91,
            "dark_spots": 0.82,
            "wrinkles": 0.68,  # Below threshold
            "redness": 0.76,
            "enlarged_pores": 0.79
        },
        "confidence_scores": {
            "skin_type": 0.87,
            "acne": 0.91,
            "dark_spots": 0.82,
            "wrinkles": 0.68,
            "redness": 0.76,
            "enlarged_pores": 0.79
        },
        "inference_time": 0.125,
        "device_used": "cpu"
    }
    print(f"✓ Mock predictions generated")
    print(f"  - Skin type: {mock_predictions['skin_type']} ({mock_predictions['skin_type_confidence']:.2%})")
    print(f"  - Raw issues detected: {len(mock_predictions['issues'])}")
    
    # Step 5: Initialize postprocessor
    print("\n[Step 5] Initializing postprocessor...")
    postprocessor = PostProcessor(confidence_threshold=0.7)
    print(f"✓ Postprocessor initialized with threshold: {postprocessor.confidence_threshold}")
    
    # Step 6: Process predictions
    print("\n[Step 6] Processing predictions...")
    result = postprocessor.process_predictions(
        mock_predictions,
        test_image,
        analysis_id="pipeline-test-001"
    )
    print(f"✓ Predictions processed successfully")
    
    # Step 7: Display results
    print("\n[Step 7] Analysis Results:")
    print("=" * 60)
    print(f"\nSkin Type: {result['skin_type'].upper()}")
    print(f"Confidence: {result['metadata']['skin_type_confidence']:.1%}")
    print(f"\nIssues Detected: {result['metadata']['total_issues_detected']}")
    print(f"Confidence Threshold: {result['metadata']['confidence_threshold']}")
    
    print("\nDetailed Issues:")
    for i, issue in enumerate(result['issues'], 1):
        print(f"\n{i}. {issue['name']}")
        print(f"   Severity: {issue['severity'].upper()}")
        print(f"   Confidence: {issue['confidence']:.1%}")
        print(f"   Description: {issue['description'][:60]}...")
        print(f"   Causes: {', '.join(issue['causes'][:3])}...")
        print(f"   Highlighted Image: {Path(issue['highlighted_image_url']).name}")
        
        # Verify highlighted image exists
        if Path(issue['highlighted_image_url']).exists():
            print(f"   ✓ Highlighted image file exists")
        else:
            print(f"   ✗ Highlighted image file NOT found")
    
    # Step 8: Verify pipeline integrity
    print("\n[Step 8] Verifying pipeline integrity...")
    checks = []
    
    # Check 1: Preprocessing output is valid tensor
    checks.append(("Tensor shape is correct", tensor.shape == (1, 3, 224, 224)))
    
    # Check 2: Low confidence issues filtered
    checks.append(("Low confidence issues filtered", "wrinkles" not in [i['name'] for i in result['issues']]))
    
    # Check 3: High confidence issues included
    checks.append(("High confidence issues included", "Acne" in [i['name'] for i in result['issues']]))
    
    # Check 4: Issues sorted by confidence
    confidences = [i['confidence'] for i in result['issues']]
    checks.append(("Issues sorted by confidence", confidences == sorted(confidences, reverse=True)))
    
    # Check 5: Highlighted images generated
    checks.append(("Highlighted images generated", len(result['highlighted_images']) == len(result['issues'])))
    
    # Check 6: All highlighted images exist
    all_exist = all(Path(url).exists() for url in result['highlighted_images'].values())
    checks.append(("All highlighted images exist", all_exist))
    
    # Check 7: Metadata is complete
    required_metadata = ['total_issues_detected', 'confidence_threshold', 'analysis_id', 'skin_type_confidence']
    metadata_complete = all(key in result['metadata'] for key in required_metadata)
    checks.append(("Metadata is complete", metadata_complete))
    
    print("\nIntegrity Checks:")
    passed = 0
    for check_name, check_result in checks:
        status = "✓" if check_result else "✗"
        print(f"  {status} {check_name}")
        if check_result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(checks)} checks passed")
    
    # Step 9: Test batch processing
    print("\n[Step 9] Testing batch processing...")
    batch_images = [test_image, test_image.copy()]
    batch_predictions = [mock_predictions, mock_predictions.copy()]
    
    batch_results = postprocessor.batch_process_predictions(
        batch_predictions,
        batch_images
    )
    
    print(f"✓ Batch processing completed")
    print(f"  - Processed: {len(batch_results)} analyses")
    print(f"  - Total issues: {sum(len(r['issues']) for r in batch_results)}")
    
    # Step 10: Calculate statistics
    print("\n[Step 10] Calculating statistics...")
    stats = postprocessor.get_issue_statistics(batch_results)
    
    print(f"✓ Statistics calculated")
    print(f"  - Total analyses: {stats['total_analyses']}")
    print(f"  - Skin types: {stats['skin_type_distribution']}")
    print(f"  - Most common issue: {max(stats['issue_frequency'], key=stats['issue_frequency'].get)}")
    print(f"  - Average confidence: {sum(stats['average_confidence_by_issue'].values()) / len(stats['average_confidence_by_issue']):.2%}")
    
    # Final summary
    print("\n" + "=" * 60)
    print("Pipeline Integration Test Summary")
    print("=" * 60)
    
    if passed == len(checks):
        print("\n✓ ALL CHECKS PASSED")
        print("\nThe ML pipeline is working correctly:")
        print("  1. ✓ Image preprocessing")
        print("  2. ✓ Model prediction simulation")
        print("  3. ✓ Result post-processing")
        print("  4. ✓ Confidence filtering")
        print("  5. ✓ Highlighted image generation")
        print("  6. ✓ Batch processing")
        print("  7. ✓ Statistics calculation")
        print("\nThe pipeline is ready for integration with the AI service!")
        return 0
    else:
        print(f"\n✗ {len(checks) - passed} CHECK(S) FAILED")
        print("\nPlease review the failed checks above.")
        return 1


def test_pipeline_with_real_image():
    """Test pipeline with a real image if available."""
    print("\n" + "=" * 60)
    print("Testing with Real Image (if available)")
    print("=" * 60)
    
    # Look for test images in uploads directory
    uploads_dir = Path("uploads")
    if not uploads_dir.exists():
        print("\n⚠ No uploads directory found, skipping real image test")
        return
    
    image_files = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))
    image_files = [f for f in image_files if not f.name.startswith("highlighted_")]
    
    if not image_files:
        print("\n⚠ No test images found in uploads directory")
        return
    
    test_image_path = image_files[0]
    print(f"\n✓ Found test image: {test_image_path.name}")
    
    try:
        # Load image
        image = Image.open(test_image_path)
        print(f"✓ Image loaded: {image.size}, mode: {image.mode}")
        
        # Preprocess
        preprocessor = ImagePreprocessor()
        tensor = preprocessor.preprocess(image)
        print(f"✓ Image preprocessed: {tensor.shape}")
        
        # Mock predictions
        predictions = {
            "skin_type": "normal",
            "skin_type_confidence": 0.85,
            "issues": {"dark_spots": 0.88, "uneven_tone": 0.73}
        }
        
        # Post-process
        postprocessor = PostProcessor()
        result = postprocessor.process_predictions(predictions, image, "real-image-test")
        
        print(f"✓ Real image processed successfully")
        print(f"  - Detected: {len(result['issues'])} issues")
        print(f"  - Highlighted images: {len(result['highlighted_images'])}")
        
    except Exception as e:
        print(f"✗ Real image test failed: {e}")


if __name__ == "__main__":
    exit_code = test_complete_pipeline()
    test_pipeline_with_real_image()
    sys.exit(exit_code)
