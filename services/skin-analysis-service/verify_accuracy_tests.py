#!/usr/bin/env python3
"""
Verification Script for Model Accuracy Tests

This script verifies that the model accuracy testing module is properly
implemented and can run successfully.

It tests:
1. Test dataset generation
2. Metrics calculation utilities
3. Report generation
4. Test structure and fixtures
"""

import sys
import logging
from pathlib import Path
import numpy as np
from PIL import Image

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tests.test_model_accuracy import (
    TestDatasetLoader,
    MetricsCalculator,
    AccuracyReporter,
    TEST_DATASET_DIR,
    MIN_SAMPLES
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def verify_dataset_loader():
    """Verify dataset loader functionality."""
    logger.info("=" * 60)
    logger.info("Verifying Dataset Loader")
    logger.info("=" * 60)
    
    try:
        loader = TestDatasetLoader(TEST_DATASET_DIR)
        samples = loader.load_dataset()
        
        logger.info(f"✓ Dataset loaded: {len(samples)} samples")
        
        # Verify minimum samples
        assert len(samples) >= MIN_SAMPLES, \
            f"Dataset has {len(samples)} samples, need at least {MIN_SAMPLES}"
        logger.info(f"✓ Minimum sample requirement met: {len(samples)} >= {MIN_SAMPLES}")
        
        # Verify sample structure
        sample = samples[0]
        required_fields = ["image_path", "image_id", "skin_type", "issues", "severity"]
        for field in required_fields:
            assert field in sample, f"Missing field: {field}"
        logger.info(f"✓ Sample structure valid")
        
        # Verify images exist
        for i, sample in enumerate(samples[:5]):
            assert sample["image_path"].exists(), \
                f"Image not found: {sample['image_path']}"
        logger.info(f"✓ Sample images exist")
        
        # Verify metadata file was created
        metadata_file = TEST_DATASET_DIR / "metadata.json"
        assert metadata_file.exists(), "Metadata file not created"
        logger.info(f"✓ Metadata file created: {metadata_file}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Dataset loader verification failed: {e}")
        return False


def verify_metrics_calculator():
    """Verify metrics calculation utilities."""
    logger.info("\n" + "=" * 60)
    logger.info("Verifying Metrics Calculator")
    logger.info("=" * 60)
    
    try:
        # Test accuracy calculation
        y_true = ["oily", "dry", "combination", "oily", "normal"]
        y_pred = ["oily", "dry", "oily", "oily", "normal"]
        
        accuracy = MetricsCalculator.calculate_accuracy(y_true, y_pred)
        expected_accuracy = 4/5  # 4 correct out of 5
        
        assert abs(accuracy - expected_accuracy) < 0.01, \
            f"Accuracy calculation incorrect: {accuracy} != {expected_accuracy}"
        logger.info(f"✓ Accuracy calculation correct: {accuracy:.2%}")
        
        # Test precision, recall, F1
        precision, recall, f1 = MetricsCalculator.calculate_precision_recall_f1(
            y_true, y_pred, "oily"
        )
        
        # For "oily": TP=2, FP=1, FN=0
        # Precision = 2/(2+1) = 0.667
        # Recall = 2/(2+0) = 1.0
        # F1 = 2 * (0.667 * 1.0) / (0.667 + 1.0) = 0.8
        
        assert abs(precision - 0.667) < 0.01, f"Precision incorrect: {precision}"
        assert abs(recall - 1.0) < 0.01, f"Recall incorrect: {recall}"
        assert abs(f1 - 0.8) < 0.01, f"F1 incorrect: {f1}"
        
        logger.info(f"✓ Precision calculation correct: {precision:.3f}")
        logger.info(f"✓ Recall calculation correct: {recall:.3f}")
        logger.info(f"✓ F1-score calculation correct: {f1:.3f}")
        
        # Test confusion matrix
        labels = ["oily", "dry", "combination", "normal"]
        matrix = MetricsCalculator.generate_confusion_matrix(y_true, y_pred, labels)
        
        assert matrix.shape == (4, 4), f"Matrix shape incorrect: {matrix.shape}"
        assert matrix[0, 0] == 2, f"Matrix[0,0] should be 2, got {matrix[0, 0]}"  # oily->oily
        assert matrix[1, 1] == 1, f"Matrix[1,1] should be 1, got {matrix[1, 1]}"  # dry->dry
        
        logger.info(f"✓ Confusion matrix generation correct")
        
        # Test matrix formatting
        formatted = MetricsCalculator.format_confusion_matrix(matrix, labels)
        assert "Confusion Matrix" in formatted, "Matrix formatting failed"
        logger.info(f"✓ Confusion matrix formatting correct")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Metrics calculator verification failed: {e}")
        return False


def verify_accuracy_reporter():
    """Verify accuracy reporter functionality."""
    logger.info("\n" + "=" * 60)
    logger.info("Verifying Accuracy Reporter")
    logger.info("=" * 60)
    
    try:
        reporter = AccuracyReporter()
        
        # Add section
        reporter.add_section("Test Section")
        
        # Add metrics
        reporter.add_metric("Accuracy", 0.95, "{:.2%}")
        reporter.add_metric("Total Samples", 100)
        
        # Add table
        reporter.add_table(
            ["Metric", "Value"],
            [
                ["Precision", "0.92"],
                ["Recall", "0.88"],
                ["F1-Score", "0.90"]
            ]
        )
        
        # Get report
        report = reporter.get_report()
        
        assert "Test Section" in report, "Section not in report"
        assert "Accuracy" in report, "Metric not in report"
        assert "Precision" in report, "Table not in report"
        
        logger.info(f"✓ Report generation successful")
        logger.info(f"✓ Report length: {len(report)} characters")
        
        # Test save report
        test_report_path = Path("tests/test_data/test_report.txt")
        test_report_path.parent.mkdir(parents=True, exist_ok=True)
        reporter.save_report(test_report_path)
        
        assert test_report_path.exists(), "Report file not saved"
        logger.info(f"✓ Report saved to: {test_report_path}")
        
        # Cleanup
        test_report_path.unlink()
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Accuracy reporter verification failed: {e}")
        return False


def verify_test_structure():
    """Verify test module structure."""
    logger.info("\n" + "=" * 60)
    logger.info("Verifying Test Module Structure")
    logger.info("=" * 60)
    
    try:
        # Import test module
        from tests import test_model_accuracy
        
        # Verify test class exists
        assert hasattr(test_model_accuracy, 'TestModelAccuracy'), \
            "TestModelAccuracy class not found"
        logger.info(f"✓ TestModelAccuracy class exists")
        
        # Verify test methods exist
        test_class = test_model_accuracy.TestModelAccuracy
        required_methods = [
            'test_dataset_loaded',
            'test_model_loads_successfully',
            'test_skin_type_classification_accuracy',
            'test_issue_detection_metrics',
            'test_inference_performance',
            'test_generate_comprehensive_report'
        ]
        
        for method_name in required_methods:
            assert hasattr(test_class, method_name), \
                f"Method {method_name} not found"
            logger.info(f"✓ Method '{method_name}' exists")
        
        # Verify fixtures exist
        assert hasattr(test_model_accuracy, 'test_dataset'), \
            "test_dataset fixture not found"
        assert hasattr(test_model_accuracy, 'model_manager'), \
            "model_manager fixture not found"
        assert hasattr(test_model_accuracy, 'preprocessor'), \
            "preprocessor fixture not found"
        
        logger.info(f"✓ All fixtures exist")
        
        # Verify helper classes
        assert hasattr(test_model_accuracy, 'TestDatasetLoader'), \
            "TestDatasetLoader class not found"
        assert hasattr(test_model_accuracy, 'MetricsCalculator'), \
            "MetricsCalculator class not found"
        assert hasattr(test_model_accuracy, 'AccuracyReporter'), \
            "AccuracyReporter class not found"
        
        logger.info(f"✓ All helper classes exist")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Test structure verification failed: {e}")
        return False


def print_summary(results):
    """Print verification summary."""
    logger.info("\n" + "=" * 60)
    logger.info("Verification Summary")
    logger.info("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{test_name:.<45} {status}")
    
    all_passed = all(results.values())
    
    logger.info("\n" + "=" * 60)
    if all_passed:
        logger.info("✓ ALL VERIFICATIONS PASSED")
        logger.info("Model accuracy testing module is properly implemented!")
    else:
        logger.info("✗ SOME VERIFICATIONS FAILED")
        logger.info("Please check the errors above.")
    logger.info("=" * 60)
    
    return all_passed


def main():
    """Main verification entry point."""
    logger.info("Starting Model Accuracy Tests Verification\n")
    
    results = {}
    
    # Run verifications
    results["Dataset Loader"] = verify_dataset_loader()
    results["Metrics Calculator"] = verify_metrics_calculator()
    results["Accuracy Reporter"] = verify_accuracy_reporter()
    results["Test Structure"] = verify_test_structure()
    
    # Print summary
    all_passed = print_summary(results)
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
