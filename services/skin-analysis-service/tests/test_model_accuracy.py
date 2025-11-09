"""
Model Accuracy Testing Module

This module tests the ML model's accuracy on a labeled test dataset.
Tests include:
- Skin type classification accuracy
- Precision, recall, F1-score for each skin condition
- Confusion matrix generation
- Overall accuracy >= 90% threshold validation
- Detailed metrics reporting

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2
"""

import pytest
import logging
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any
import numpy as np
from PIL import Image
import torch

from app.ml.model_manager import ModelManager
from app.ml.preprocessor import ImagePreprocessor
from app.ml.postprocessor import PostProcessor
from tests.metrics_utils import (
    calculate_accuracy,
    calculate_precision_recall_f1,
    calculate_binary_metrics,
    generate_confusion_matrix,
    format_confusion_matrix,
    visualize_confusion_matrix_text,
    calculate_per_class_metrics,
    format_metrics_table,
    format_metrics_report,
    save_metrics_report
)

logger = logging.getLogger(__name__)


# Test dataset configuration
TEST_DATASET_DIR = Path("tests/test_data/accuracy_dataset")
ACCURACY_THRESHOLD = 0.90  # 90% accuracy requirement
MIN_SAMPLES = 100  # Minimum number of test samples


class TestDatasetLoader:
    """
    Loader for test dataset with labeled skin images.
    
    Expected directory structure:
    tests/test_data/accuracy_dataset/
        ├── metadata.json  # Contains labels and ground truth
        └── images/
            ├── image_001.jpg
            ├── image_002.jpg
            └── ...
    """

    
    def __init__(self, dataset_dir: Path):
        """Initialize dataset loader."""
        self.dataset_dir = dataset_dir
        self.images_dir = dataset_dir / "images"
        self.metadata_file = dataset_dir / "metadata.json"
        self.samples = []
        
    def load_dataset(self) -> List[Dict[str, Any]]:
        """
        Load test dataset with labels.
        
        Returns:
            List of samples with format:
            {
                "image_path": Path,
                "image_id": str,
                "skin_type": str,
                "issues": List[str],
                "severity": Dict[str, str]
            }
        """
        if not self.metadata_file.exists():
            logger.warning(f"Metadata file not found: {self.metadata_file}")
            return self._generate_synthetic_dataset()
        
        with open(self.metadata_file, 'r') as f:
            metadata = json.load(f)
        
        samples = []
        for item in metadata.get("samples", []):
            image_path = self.images_dir / item["image_filename"]
            if image_path.exists():
                samples.append({
                    "image_path": image_path,
                    "image_id": item["image_id"],
                    "skin_type": item["skin_type"],
                    "issues": item.get("issues", []),
                    "severity": item.get("severity", {})
                })
        
        self.samples = samples
        logger.info(f"Loaded {len(samples)} samples from dataset")
        return samples
    
    def _generate_synthetic_dataset(self) -> List[Dict[str, Any]]:
        """
        Generate synthetic test dataset for testing purposes.
        
        Creates synthetic images with known labels for validation.
        """
        logger.info("Generating synthetic test dataset")
        
        # Ensure directories exist
        self.images_dir.mkdir(parents=True, exist_ok=True)
        
        skin_types = ["oily", "dry", "combination", "sensitive", "normal"]
        issue_types = ["acne", "dark_spots", "wrinkles", "redness", "dryness", 
                      "oiliness", "enlarged_pores", "uneven_tone"]
        
        samples = []
        num_samples = 120  # Generate 120 synthetic samples
        
        for i in range(num_samples):
            # Create synthetic image
            image_id = f"synthetic_{i:03d}"
            image_filename = f"{image_id}.jpg"
            image_path = self.images_dir / image_filename
            
            # Generate image if it doesn't exist
            if not image_path.exists():
                self._create_synthetic_image(image_path, i)
            
            # Assign labels (distributed across categories)
            skin_type = skin_types[i % len(skin_types)]
            
            # Assign 1-3 random issues
            num_issues = (i % 3) + 1
            issues = np.random.choice(issue_types, size=num_issues, replace=False).tolist()
            
            severity = {issue: ["low", "medium", "high"][i % 3] for issue in issues}
            
            samples.append({
                "image_path": image_path,
                "image_id": image_id,
                "skin_type": skin_type,
                "issues": issues,
                "severity": severity
            })
        
        # Save metadata
        metadata = {
            "dataset_name": "Synthetic Test Dataset",
            "num_samples": len(samples),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "samples": [
                {
                    "image_id": s["image_id"],
                    "image_filename": s["image_path"].name,
                    "skin_type": s["skin_type"],
                    "issues": s["issues"],
                    "severity": s["severity"]
                }
                for s in samples
            ]
        }
        
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.samples = samples
        logger.info(f"Generated {len(samples)} synthetic samples")
        return samples

    
    def _create_synthetic_image(self, image_path: Path, seed: int):
        """Create a synthetic test image."""
        np.random.seed(seed)
        
        # Create base image with random colors
        image_array = np.random.randint(100, 200, (224, 224, 3), dtype=np.uint8)
        
        # Add some texture patterns based on seed
        if seed % 5 == 0:  # Acne-like spots
            for _ in range(5):
                x, y = np.random.randint(20, 204, 2)
                radius = np.random.randint(3, 8)
                color = (50, 50, 50)
                for i in range(-radius, radius):
                    for j in range(-radius, radius):
                        if i*i + j*j <= radius*radius:
                            px, py = x + i, y + j
                            if 0 <= px < 224 and 0 <= py < 224:
                                image_array[py, px] = color
        
        elif seed % 5 == 1:  # Dark spots
            for _ in range(3):
                x, y = np.random.randint(20, 204, 2)
                radius = np.random.randint(8, 15)
                for i in range(-radius, radius):
                    for j in range(-radius, radius):
                        if i*i + j*j <= radius*radius:
                            px, py = x + i, y + j
                            if 0 <= px < 224 and 0 <= py < 224:
                                image_array[py, px] = image_array[py, px] * 0.6
        
        # Convert to PIL Image and save
        image = Image.fromarray(image_array.astype(np.uint8))
        image.save(image_path, 'JPEG', quality=95)


# MetricsCalculator class removed - now using metrics_utils module functions


class AccuracyReporter:
    """Generate detailed accuracy reports."""
    
    def __init__(self):
        self.report_lines = []
    
    def add_section(self, title: str):
        """Add a section header."""
        self.report_lines.append(f"\n{'=' * 80}")
        self.report_lines.append(f"{title}")
        self.report_lines.append(f"{'=' * 80}")
    
    def add_metric(self, name: str, value: Any, format_str: str = "{}"):
        """Add a metric to the report."""
        formatted_value = format_str.format(value)
        self.report_lines.append(f"{name}: {formatted_value}")
    
    def add_table(self, headers: List[str], rows: List[List[Any]]):
        """Add a table to the report."""
        # Calculate column widths
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                col_widths[i] = max(col_widths[i], len(str(cell)))
        
        # Format header
        header_line = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
        separator = "-+-".join("-" * w for w in col_widths)
        
        self.report_lines.append(header_line)
        self.report_lines.append(separator)
        
        # Format rows
        for row in rows:
            row_line = " | ".join(str(cell).ljust(col_widths[i]) for i, cell in enumerate(row))
            self.report_lines.append(row_line)
    
    def get_report(self) -> str:
        """Get the complete report as a string."""
        return "\n".join(self.report_lines)
    
    def save_report(self, filepath: Path):
        """Save report to file."""
        with open(filepath, 'w') as f:
            f.write(self.get_report())
        logger.info(f"Report saved to {filepath}")



# Fixtures

@pytest.fixture(scope="module")
def test_dataset():
    """Load or generate test dataset."""
    loader = TestDatasetLoader(TEST_DATASET_DIR)
    samples = loader.load_dataset()
    
    # Ensure minimum sample size
    assert len(samples) >= MIN_SAMPLES, \
        f"Test dataset must have at least {MIN_SAMPLES} samples, found {len(samples)}"
    
    return samples


@pytest.fixture(scope="module")
def model_manager():
    """Initialize model manager for testing."""
    model_path = Path("models/efficientnet_b0.pth")
    
    if not model_path.exists():
        pytest.skip(f"Model file not found: {model_path}")
    
    manager = ModelManager(str(model_path), device="auto", confidence_threshold=0.5)
    
    # Load model once for all tests
    manager.load_model()
    
    yield manager
    
    # Cleanup
    manager.unload_model()


@pytest.fixture(scope="module")
def preprocessor():
    """Initialize image preprocessor."""
    return ImagePreprocessor(target_size=(224, 224))


@pytest.fixture(scope="module")
def postprocessor():
    """Initialize post-processor."""
    return PostProcessor(confidence_threshold=0.5)


# Test Cases

class TestModelAccuracy:
    """Test suite for model accuracy validation."""
    
    def test_dataset_loaded(self, test_dataset):
        """Test that dataset is properly loaded."""
        assert len(test_dataset) >= MIN_SAMPLES
        
        # Verify dataset structure
        for sample in test_dataset[:5]:  # Check first 5 samples
            assert "image_path" in sample
            assert "skin_type" in sample
            assert "issues" in sample
            assert sample["image_path"].exists()
        
        logger.info(f"✓ Dataset loaded: {len(test_dataset)} samples")
    
    def test_model_loads_successfully(self, model_manager):
        """Test that model loads without errors."""
        assert model_manager.is_loaded()
        assert model_manager.get_device() in ["cuda", "cpu"]
        
        logger.info(f"✓ Model loaded on {model_manager.get_device()}")

    
    def test_skin_type_classification_accuracy(
        self, 
        test_dataset, 
        model_manager, 
        preprocessor
    ):
        """
        Test skin type classification accuracy.
        
        Requirement 2.1: Model SHALL achieve >=90% accuracy on validation dataset
        """
        logger.info("Testing skin type classification accuracy...")
        
        y_true = []
        y_pred = []
        
        # Run predictions on all samples
        for i, sample in enumerate(test_dataset):
            if i % 20 == 0:
                logger.info(f"Processing sample {i+1}/{len(test_dataset)}")
            
            # Load and preprocess image
            image = Image.open(sample["image_path"])
            tensor = preprocessor.preprocess(image)
            
            # Run inference
            try:
                prediction = model_manager.predict(tensor)
                predicted_skin_type = prediction["skin_type"]
            except Exception as e:
                logger.warning(f"Prediction failed for {sample['image_id']}: {e}")
                predicted_skin_type = "unknown"
            
            y_true.append(sample["skin_type"])
            y_pred.append(predicted_skin_type)
        
        # Calculate accuracy
        accuracy = calculate_accuracy(y_true, y_pred)
        
        # Generate confusion matrix
        skin_types = ["oily", "dry", "combination", "sensitive", "normal"]
        confusion_mat = generate_confusion_matrix(y_true, y_pred, skin_types)
        
        # Calculate per-class metrics
        reporter = AccuracyReporter()
        reporter.add_section("SKIN TYPE CLASSIFICATION ACCURACY")
        reporter.add_metric("Overall Accuracy", accuracy, "{:.2%}")
        reporter.add_metric("Total Samples", len(test_dataset))
        reporter.add_metric("Correct Predictions", sum(1 for t, p in zip(y_true, y_pred) if t == p))
        
        # Per-class metrics
        reporter.add_section("Per-Class Metrics")
        
        table_rows = []
        for skin_type in skin_types:
            precision, recall, f1 = calculate_precision_recall_f1(
                y_true, y_pred, skin_type
            )
            table_rows.append([
                skin_type,
                f"{precision:.3f}",
                f"{recall:.3f}",
                f"{f1:.3f}"
            ])
        
        reporter.add_table(
            ["Skin Type", "Precision", "Recall", "F1-Score"],
            table_rows
        )
        
        # Add confusion matrix
        reporter.report_lines.append(
            format_confusion_matrix(confusion_mat, skin_types)
        )
        
        # Save report
        report_path = Path("tests/test_data/skin_type_accuracy_report.txt")
        report_path.parent.mkdir(parents=True, exist_ok=True)
        reporter.save_report(report_path)
        
        # Log report
        logger.info(reporter.get_report())
        
        # Assert accuracy threshold
        assert accuracy >= ACCURACY_THRESHOLD, \
            f"Skin type accuracy {accuracy:.2%} is below {ACCURACY_THRESHOLD:.0%} threshold"
        
        logger.info(f"✓ Skin type classification accuracy: {accuracy:.2%}")

    
    def test_issue_detection_metrics(
        self,
        test_dataset,
        model_manager,
        preprocessor
    ):
        """
        Test precision, recall, and F1-score for each skin condition.
        
        Requirements: 2.2, 2.3, 2.4, 2.5
        """
        logger.info("Testing issue detection metrics...")
        
        issue_types = ["acne", "dark_spots", "wrinkles", "redness", "dryness",
                      "oiliness", "enlarged_pores", "uneven_tone"]
        
        # Collect predictions for each issue type
        issue_predictions = {issue: {"y_true": [], "y_pred": []} for issue in issue_types}
        
        for i, sample in enumerate(test_dataset):
            if i % 20 == 0:
                logger.info(f"Processing sample {i+1}/{len(test_dataset)}")
            
            # Load and preprocess image
            image = Image.open(sample["image_path"])
            tensor = preprocessor.preprocess(image)
            
            # Run inference
            try:
                prediction = model_manager.predict(tensor)
                detected_issues = set(prediction.get("issues", {}).keys())
            except Exception as e:
                logger.warning(f"Prediction failed for {sample['image_id']}: {e}")
                detected_issues = set()
            
            # Record predictions for each issue type
            true_issues = set(sample["issues"])
            
            for issue in issue_types:
                # Binary classification: issue present (1) or not (0)
                issue_predictions[issue]["y_true"].append(1 if issue in true_issues else 0)
                issue_predictions[issue]["y_pred"].append(1 if issue in detected_issues else 0)
        
        # Calculate metrics for each issue
        reporter = AccuracyReporter()
        reporter.add_section("ISSUE DETECTION METRICS")
        
        table_rows = []
        overall_metrics = {"precision": [], "recall": [], "f1": []}
        
        for issue in issue_types:
            y_true = issue_predictions[issue]["y_true"]
            y_pred = issue_predictions[issue]["y_pred"]
            
            # Calculate metrics
            tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
            fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
            fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
            tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
            accuracy = (tp + tn) / len(y_true) if len(y_true) > 0 else 0.0
            
            overall_metrics["precision"].append(precision)
            overall_metrics["recall"].append(recall)
            overall_metrics["f1"].append(f1)
            
            table_rows.append([
                issue,
                f"{precision:.3f}",
                f"{recall:.3f}",
                f"{f1:.3f}",
                f"{accuracy:.3f}",
                f"{tp}/{tp+fn}"  # TP/Total positives
            ])
        
        reporter.add_table(
            ["Issue Type", "Precision", "Recall", "F1-Score", "Accuracy", "Detected"],
            table_rows
        )
        
        # Calculate average metrics
        reporter.add_section("AVERAGE METRICS")
        avg_precision = np.mean(overall_metrics["precision"])
        avg_recall = np.mean(overall_metrics["recall"])
        avg_f1 = np.mean(overall_metrics["f1"])
        
        reporter.add_metric("Average Precision", avg_precision, "{:.3f}")
        reporter.add_metric("Average Recall", avg_recall, "{:.3f}")
        reporter.add_metric("Average F1-Score", avg_f1, "{:.3f}")
        
        # Save report
        report_path = Path("tests/test_data/issue_detection_metrics_report.txt")
        report_path.parent.mkdir(parents=True, exist_ok=True)
        reporter.save_report(report_path)
        
        # Log report
        logger.info(reporter.get_report())
        
        # Assert minimum performance thresholds
        assert avg_precision >= 0.70, \
            f"Average precision {avg_precision:.2%} is below 70% threshold"
        assert avg_recall >= 0.70, \
            f"Average recall {avg_recall:.2%} is below 70% threshold"
        assert avg_f1 >= 0.70, \
            f"Average F1-score {avg_f1:.2%} is below 70% threshold"
        
        logger.info(f"✓ Issue detection metrics - Precision: {avg_precision:.2%}, "
                   f"Recall: {avg_recall:.2%}, F1: {avg_f1:.2%}")

    
    def test_inference_performance(
        self,
        test_dataset,
        model_manager,
        preprocessor
    ):
        """
        Test inference performance metrics.
        
        Requirement 5.1: Inference should complete within acceptable time
        """
        logger.info("Testing inference performance...")
        
        inference_times = []
        sample_size = min(50, len(test_dataset))  # Test on subset for performance
        
        for i, sample in enumerate(test_dataset[:sample_size]):
            # Load and preprocess image
            image = Image.open(sample["image_path"])
            tensor = preprocessor.preprocess(image)
            
            # Measure inference time
            start_time = time.time()
            try:
                prediction = model_manager.predict(tensor)
                inference_time = time.time() - start_time
                inference_times.append(inference_time)
            except Exception as e:
                logger.warning(f"Prediction failed for {sample['image_id']}: {e}")
        
        # Calculate statistics
        avg_time = np.mean(inference_times)
        median_time = np.median(inference_times)
        p95_time = np.percentile(inference_times, 95)
        max_time = np.max(inference_times)
        
        reporter = AccuracyReporter()
        reporter.add_section("INFERENCE PERFORMANCE")
        reporter.add_metric("Device", model_manager.get_device())
        reporter.add_metric("Samples Tested", len(inference_times))
        reporter.add_metric("Average Time", avg_time, "{:.3f}s")
        reporter.add_metric("Median Time", median_time, "{:.3f}s")
        reporter.add_metric("95th Percentile", p95_time, "{:.3f}s")
        reporter.add_metric("Max Time", max_time, "{:.3f}s")
        
        # Log report
        logger.info(reporter.get_report())
        
        # Performance assertions
        device = model_manager.get_device()
        if device == "cuda":
            assert avg_time <= 1.0, \
                f"GPU inference time {avg_time:.3f}s exceeds 1.0s threshold"
        else:
            assert avg_time <= 3.0, \
                f"CPU inference time {avg_time:.3f}s exceeds 3.0s threshold"
        
        logger.info(f"✓ Inference performance: {avg_time:.3f}s average on {device}")
    
    def test_generate_comprehensive_report(
        self,
        test_dataset,
        model_manager,
        preprocessor
    ):
        """
        Generate comprehensive accuracy report.
        
        Requirement 6.2: Log detailed metrics report
        """
        logger.info("Generating comprehensive accuracy report...")
        
        reporter = AccuracyReporter()
        reporter.add_section("COMPREHENSIVE MODEL ACCURACY REPORT")
        
        # Model information
        model_info = model_manager.get_model_info()
        reporter.add_section("Model Information")
        reporter.add_metric("Model Path", model_info["model_path"])
        reporter.add_metric("Model Version", model_info["model_version"])
        reporter.add_metric("Device", model_info["device"])
        reporter.add_metric("Model Size", model_info.get("model_size_mb", "N/A"), "{:.2f} MB")
        
        # Dataset information
        reporter.add_section("Dataset Information")
        reporter.add_metric("Total Samples", len(test_dataset))
        reporter.add_metric("Dataset Path", str(TEST_DATASET_DIR))
        
        # Skin type distribution
        skin_type_counts = {}
        for sample in test_dataset:
            skin_type = sample["skin_type"]
            skin_type_counts[skin_type] = skin_type_counts.get(skin_type, 0) + 1
        
        reporter.add_section("Skin Type Distribution")
        for skin_type, count in sorted(skin_type_counts.items()):
            percentage = (count / len(test_dataset)) * 100
            reporter.add_metric(skin_type.capitalize(), count, f"{{}} ({percentage:.1f}%)")
        
        # Issue distribution
        issue_counts = {}
        for sample in test_dataset:
            for issue in sample["issues"]:
                issue_counts[issue] = issue_counts.get(issue, 0) + 1
        
        reporter.add_section("Issue Distribution")
        for issue, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(test_dataset)) * 100
            reporter.add_metric(issue.replace("_", " ").title(), count, f"{{}} ({percentage:.1f}%)")
        
        # Save comprehensive report
        report_path = Path("tests/test_data/comprehensive_accuracy_report.txt")
        report_path.parent.mkdir(parents=True, exist_ok=True)
        reporter.save_report(report_path)
        
        logger.info(f"✓ Comprehensive report saved to {report_path}")
        logger.info(reporter.get_report())


# Integration test
def test_end_to_end_accuracy_validation(test_dataset, model_manager, preprocessor):
    """
    End-to-end accuracy validation test.
    
    This test validates the complete accuracy testing pipeline.
    """
    logger.info("Running end-to-end accuracy validation...")
    
    # Verify dataset
    assert len(test_dataset) >= MIN_SAMPLES
    
    # Verify model is loaded
    assert model_manager.is_loaded()
    
    # Run sample predictions
    sample_count = min(10, len(test_dataset))
    successful_predictions = 0
    
    for sample in test_dataset[:sample_count]:
        try:
            image = Image.open(sample["image_path"])
            tensor = preprocessor.preprocess(image)
            prediction = model_manager.predict(tensor)
            
            # Verify prediction structure
            assert "skin_type" in prediction
            assert "skin_type_confidence" in prediction
            assert "issues" in prediction
            
            successful_predictions += 1
        except Exception as e:
            logger.warning(f"Prediction failed: {e}")
    
    success_rate = successful_predictions / sample_count
    assert success_rate >= 0.9, \
        f"Success rate {success_rate:.2%} is below 90% threshold"
    
    logger.info(f"✓ End-to-end validation complete: {successful_predictions}/{sample_count} successful")


if __name__ == "__main__":
    # Allow running tests directly
    pytest.main([__file__, "-v", "-s"])
