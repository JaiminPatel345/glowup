#!/usr/bin/env python3
"""
Validation script for PostProcessor implementation.

Tests the PostProcessor class to ensure it correctly processes model predictions,
filters low-confidence results, and generates highlighted images.
"""

import sys
from pathlib import Path
import numpy as np
from PIL import Image

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.ml.postprocessor import PostProcessor


def test_postprocessor_initialization():
    """Test PostProcessor initialization."""
    print("\n=== Test 1: PostProcessor Initialization ===")
    
    try:
        processor = PostProcessor(confidence_threshold=0.7)
        print(f"✓ PostProcessor initialized successfully")
        print(f"  - Confidence threshold: {processor.confidence_threshold}")
        print(f"  - Output directory: {processor.output_dir}")
        print(f"  - Issue metadata loaded: {len(processor.ISSUE_METADATA)} issue types")
        return True
    except Exception as e:
        print(f"✗ Initialization failed: {e}")
        return False


def test_filter_low_confidence():
    """Test confidence filtering."""
    print("\n=== Test 2: Filter Low Confidence ===")
    
    try:
        processor = PostProcessor(confidence_threshold=0.7)
        
        # Test data
        issues = {
            "acne": 0.95,
            "dark_spots": 0.85,
            "wrinkles": 0.65,  # Below threshold
            "redness": 0.50,   # Below threshold
            "dryness": 0.75
        }
        
        filtered = processor.filter_low_confidence(issues)
        
        print(f"✓ Filtering completed")
        print(f"  - Original issues: {len(issues)}")
        print(f"  - Filtered issues: {len(filtered)}")
        print(f"  - Filtered results: {filtered}")
        
        # Verify filtering
        assert len(filtered) == 3, f"Expected 3 issues, got {len(filtered)}"
        assert "wrinkles" not in filtered, "Low confidence issue not filtered"
        assert "redness" not in filtered, "Low confidence issue not filtered"
        assert "acne" in filtered, "High confidence issue was filtered"
        
        print("✓ All filtering assertions passed")
        return True
        
    except Exception as e:
        print(f"✗ Filtering test failed: {e}")
        return False


def test_create_skin_issue():
    """Test SkinIssue object creation."""
    print("\n=== Test 3: Create SkinIssue Object ===")
    
    try:
        processor = PostProcessor()
        
        # Create issue
        issue = processor._create_skin_issue("acne", 0.92, "test-analysis-123")
        
        print(f"✓ SkinIssue created successfully")
        print(f"  - ID: {issue['id']}")
        print(f"  - Name: {issue['name']}")
        print(f"  - Description: {issue['description']}")
        print(f"  - Severity: {issue['severity']}")
        print(f"  - Confidence: {issue['confidence']}")
        print(f"  - Causes: {len(issue['causes'])} listed")
        
        # Verify structure
        assert issue['id'] == "test-analysis-123_acne", "Incorrect issue ID"
        assert issue['name'] == "Acne", "Incorrect issue name"
        assert issue['severity'] == "high", "Incorrect severity for 0.92 confidence"
        assert issue['confidence'] == 0.92, "Incorrect confidence value"
        assert len(issue['causes']) > 0, "No causes listed"
        
        print("✓ All structure assertions passed")
        return True
        
    except Exception as e:
        print(f"✗ SkinIssue creation test failed: {e}")
        return False


def test_calculate_severity():
    """Test severity calculation."""
    print("\n=== Test 4: Calculate Severity ===")
    
    try:
        processor = PostProcessor()
        thresholds = {"low": 0.7, "medium": 0.8, "high": 0.9}
        
        # Test different confidence levels
        test_cases = [
            (0.95, "high"),
            (0.85, "medium"),
            (0.75, "low"),
            (0.70, "low")
        ]
        
        all_passed = True
        for confidence, expected_severity in test_cases:
            severity = processor._calculate_severity(confidence, thresholds)
            status = "✓" if severity == expected_severity else "✗"
            print(f"{status} Confidence {confidence} -> Severity: {severity} (expected: {expected_severity})")
            if severity != expected_severity:
                all_passed = False
        
        if all_passed:
            print("✓ All severity calculations correct")
            return True
        else:
            print("✗ Some severity calculations incorrect")
            return False
            
    except Exception as e:
        print(f"✗ Severity calculation test failed: {e}")
        return False


def test_process_predictions():
    """Test full prediction processing."""
    print("\n=== Test 5: Process Predictions ===")
    
    try:
        processor = PostProcessor(confidence_threshold=0.7)
        
        # Create mock predictions
        predictions = {
            "skin_type": "oily",
            "skin_type_confidence": 0.88,
            "issues": {
                "acne": 0.92,
                "dark_spots": 0.78,
                "wrinkles": 0.65,  # Below threshold
                "oiliness": 0.85
            },
            "confidence_scores": {
                "skin_type": 0.88,
                "acne": 0.92,
                "dark_spots": 0.78,
                "wrinkles": 0.65,
                "oiliness": 0.85
            }
        }
        
        # Create a test image
        test_image = Image.new('RGB', (224, 224), color='white')
        
        # Process predictions
        result = processor.process_predictions(
            predictions,
            test_image,
            analysis_id="test-123"
        )
        
        print(f"✓ Predictions processed successfully")
        print(f"  - Skin type: {result['skin_type']}")
        print(f"  - Issues detected: {len(result['issues'])}")
        print(f"  - Highlighted images: {len(result['highlighted_images'])}")
        
        # Verify result structure
        assert result['skin_type'] == "oily", "Incorrect skin type"
        assert len(result['issues']) == 3, f"Expected 3 issues, got {len(result['issues'])}"
        assert result['metadata']['total_issues_detected'] == 3, "Incorrect issue count in metadata"
        
        # Verify issues are sorted by confidence
        confidences = [issue['confidence'] for issue in result['issues']]
        assert confidences == sorted(confidences, reverse=True), "Issues not sorted by confidence"
        
        # Verify highlighted images were generated
        for issue in result['issues']:
            assert issue['highlighted_image_url'] is not None, f"No highlighted image for {issue['name']}"
            assert Path(issue['highlighted_image_url']).exists(), f"Highlighted image file not found"
        
        print("✓ All processing assertions passed")
        print(f"\nDetected issues:")
        for issue in result['issues']:
            print(f"  - {issue['name']}: {issue['confidence']:.2%} ({issue['severity']} severity)")
        
        return True
        
    except Exception as e:
        print(f"✗ Prediction processing test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_generate_highlighted_image():
    """Test highlighted image generation."""
    print("\n=== Test 6: Generate Highlighted Image ===")
    
    try:
        processor = PostProcessor()
        
        # Create test image
        test_image = Image.new('RGB', (300, 300), color=(200, 150, 100))
        
        # Generate highlighted image without attention map
        output_path = processor.generate_highlighted_image(
            test_image,
            "acne",
            0.85,
            "test-highlight-123"
        )
        
        print(f"✓ Highlighted image generated")
        print(f"  - Output path: {output_path}")
        
        # Verify file exists
        assert Path(output_path).exists(), "Highlighted image file not created"
        
        # Verify image can be opened
        highlighted = Image.open(output_path)
        assert highlighted.size == test_image.size, "Highlighted image has wrong dimensions"
        
        print(f"  - Image size: {highlighted.size}")
        print(f"  - Image mode: {highlighted.mode}")
        print("✓ Highlighted image validation passed")
        
        return True
        
    except Exception as e:
        print(f"✗ Highlighted image generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_batch_processing():
    """Test batch prediction processing."""
    print("\n=== Test 7: Batch Processing ===")
    
    try:
        processor = PostProcessor(confidence_threshold=0.7)
        
        # Create batch of predictions
        batch_predictions = [
            {
                "skin_type": "oily",
                "skin_type_confidence": 0.88,
                "issues": {"acne": 0.92, "oiliness": 0.85}
            },
            {
                "skin_type": "dry",
                "skin_type_confidence": 0.91,
                "issues": {"dryness": 0.89, "wrinkles": 0.76}
            }
        ]
        
        # Create batch of images
        batch_images = [
            Image.new('RGB', (224, 224), color='white'),
            Image.new('RGB', (224, 224), color='lightgray')
        ]
        
        # Process batch
        results = processor.batch_process_predictions(batch_predictions, batch_images)
        
        print(f"✓ Batch processing completed")
        print(f"  - Processed: {len(results)} analyses")
        
        # Verify results
        assert len(results) == 2, f"Expected 2 results, got {len(results)}"
        assert results[0]['skin_type'] == "oily", "Incorrect skin type in first result"
        assert results[1]['skin_type'] == "dry", "Incorrect skin type in second result"
        
        print("✓ Batch processing assertions passed")
        return True
        
    except Exception as e:
        print(f"✗ Batch processing test failed: {e}")
        return False


def test_issue_statistics():
    """Test issue statistics calculation."""
    print("\n=== Test 8: Issue Statistics ===")
    
    try:
        processor = PostProcessor()
        
        # Create mock processed results
        processed_results = [
            {
                "skin_type": "oily",
                "issues": [
                    {"name": "Acne", "confidence": 0.92},
                    {"name": "Oiliness", "confidence": 0.85}
                ]
            },
            {
                "skin_type": "oily",
                "issues": [
                    {"name": "Acne", "confidence": 0.88},
                    {"name": "Enlarged Pores", "confidence": 0.79}
                ]
            },
            {
                "skin_type": "dry",
                "issues": [
                    {"name": "Dryness", "confidence": 0.91}
                ]
            }
        ]
        
        # Calculate statistics
        stats = processor.get_issue_statistics(processed_results)
        
        print(f"✓ Statistics calculated")
        print(f"  - Total analyses: {stats['total_analyses']}")
        print(f"  - Skin type distribution: {stats['skin_type_distribution']}")
        print(f"  - Issue frequency: {stats['issue_frequency']}")
        print(f"  - Average confidence: {stats['average_confidence_by_issue']}")
        
        # Verify statistics
        assert stats['total_analyses'] == 3, "Incorrect total count"
        assert stats['skin_type_distribution']['oily'] == 2, "Incorrect oily count"
        assert stats['issue_frequency']['Acne'] == 2, "Incorrect acne frequency"
        
        print("✓ Statistics assertions passed")
        return True
        
    except Exception as e:
        print(f"✗ Statistics test failed: {e}")
        return False


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("PostProcessor Validation Tests")
    print("=" * 60)
    
    tests = [
        ("Initialization", test_postprocessor_initialization),
        ("Filter Low Confidence", test_filter_low_confidence),
        ("Create SkinIssue", test_create_skin_issue),
        ("Calculate Severity", test_calculate_severity),
        ("Process Predictions", test_process_predictions),
        ("Generate Highlighted Image", test_generate_highlighted_image),
        ("Batch Processing", test_batch_processing),
        ("Issue Statistics", test_issue_statistics)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Test '{test_name}' crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed! PostProcessor is working correctly.")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
