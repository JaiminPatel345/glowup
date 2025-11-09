"""
Unit tests for metrics calculation utilities.

This module tests the helper functions for calculating classification metrics,
generating confusion matrices, and formatting reports.

Requirements: 2.2, 2.5
"""

import pytest
import numpy as np
from pathlib import Path
from tests.metrics_utils import (
    calculate_accuracy,
    calculate_precision,
    calculate_recall,
    calculate_f1_score,
    calculate_precision_recall_f1,
    calculate_binary_metrics,
    generate_confusion_matrix,
    format_confusion_matrix,
    visualize_confusion_matrix_text,
    calculate_per_class_metrics,
    calculate_macro_average,
    format_metrics_table,
    format_metrics_report,
    save_metrics_report
)


class TestAccuracyCalculation:
    """Test accuracy calculation functions."""
    
    def test_calculate_accuracy_perfect(self):
        """Test accuracy calculation with perfect predictions."""
        y_true = ["oily", "dry", "normal", "combination"]
        y_pred = ["oily", "dry", "normal", "combination"]
        
        accuracy = calculate_accuracy(y_true, y_pred)
        assert accuracy == 1.0
    
    def test_calculate_accuracy_partial(self):
        """Test accuracy calculation with partial correct predictions."""
        y_true = ["oily", "dry", "oily", "normal"]
        y_pred = ["oily", "dry", "dry", "normal"]
        
        accuracy = calculate_accuracy(y_true, y_pred)
        assert accuracy == 0.75  # 3 out of 4 correct
    
    def test_calculate_accuracy_zero(self):
        """Test accuracy calculation with no correct predictions."""
        y_true = ["oily", "dry", "normal"]
        y_pred = ["dry", "oily", "oily"]
        
        accuracy = calculate_accuracy(y_true, y_pred)
        assert accuracy == 0.0
    
    def test_calculate_accuracy_empty(self):
        """Test accuracy calculation with empty lists."""
        y_true = []
        y_pred = []
        
        accuracy = calculate_accuracy(y_true, y_pred)
        assert accuracy == 0.0
    
    def test_calculate_accuracy_length_mismatch(self):
        """Test that length mismatch raises ValueError."""
        y_true = ["oily", "dry"]
        y_pred = ["oily"]
        
        with pytest.raises(ValueError, match="Length mismatch"):
            calculate_accuracy(y_true, y_pred)


class TestPrecisionRecallF1:
    """Test precision, recall, and F1-score calculations."""
    
    def test_calculate_precision_perfect(self):
        """Test precision with perfect predictions for a label."""
        y_true = ["acne", "acne", "wrinkles", "acne"]
        y_pred = ["acne", "acne", "wrinkles", "acne"]
        
        precision = calculate_precision(y_true, y_pred, "acne")
        assert precision == 1.0
    
    def test_calculate_precision_with_false_positives(self):
        """Test precision with false positives."""
        y_true = ["acne", "wrinkles", "wrinkles", "acne"]
        y_pred = ["acne", "acne", "wrinkles", "acne"]
        
        precision = calculate_precision(y_true, y_pred, "acne")
        # TP=2, FP=1, precision = 2/3
        assert abs(precision - 0.6667) < 0.001
    
    def test_calculate_recall_perfect(self):
        """Test recall with perfect predictions for a label."""
        y_true = ["acne", "acne", "wrinkles", "acne"]
        y_pred = ["acne", "acne", "wrinkles", "acne"]
        
        recall = calculate_recall(y_true, y_pred, "acne")
        assert recall == 1.0
    
    def test_calculate_recall_with_false_negatives(self):
        """Test recall with false negatives."""
        y_true = ["acne", "acne", "wrinkles", "acne"]
        y_pred = ["acne", "wrinkles", "wrinkles", "acne"]
        
        recall = calculate_recall(y_true, y_pred, "acne")
        # TP=2, FN=1, recall = 2/3
        assert abs(recall - 0.6667) < 0.001
    
    def test_calculate_f1_score(self):
        """Test F1-score calculation."""
        precision = 0.8
        recall = 0.9
        
        f1 = calculate_f1_score(precision, recall)
        expected_f1 = 2 * (0.8 * 0.9) / (0.8 + 0.9)
        assert abs(f1 - expected_f1) < 0.001
    
    def test_calculate_f1_score_zero_case(self):
        """Test F1-score when precision and recall are zero."""
        f1 = calculate_f1_score(0.0, 0.0)
        assert f1 == 0.0
    
    def test_calculate_precision_recall_f1_combined(self):
        """Test combined precision, recall, F1 calculation."""
        y_true = ["oily", "dry", "oily", "normal", "oily"]
        y_pred = ["oily", "dry", "dry", "normal", "oily"]
        
        precision, recall, f1 = calculate_precision_recall_f1(y_true, y_pred, "oily")
        
        # TP=2, FP=0, FN=1
        assert precision == 1.0  # 2/(2+0)
        assert abs(recall - 0.6667) < 0.001  # 2/(2+1)
        assert abs(f1 - 0.8) < 0.001  # 2*(1.0*0.6667)/(1.0+0.6667)


class TestBinaryMetrics:
    """Test binary classification metrics."""
    
    def test_calculate_binary_metrics_perfect(self):
        """Test binary metrics with perfect predictions."""
        y_true = [1, 1, 0, 0, 1]
        y_pred = [1, 1, 0, 0, 1]
        
        metrics = calculate_binary_metrics(y_true, y_pred)
        
        assert metrics["accuracy"] == 1.0
        assert metrics["precision"] == 1.0
        assert metrics["recall"] == 1.0
        assert metrics["f1_score"] == 1.0
        assert metrics["specificity"] == 1.0
        assert metrics["tp"] == 3
        assert metrics["tn"] == 2
        assert metrics["fp"] == 0
        assert metrics["fn"] == 0
    
    def test_calculate_binary_metrics_mixed(self):
        """Test binary metrics with mixed predictions."""
        y_true = [1, 1, 0, 1, 0, 0, 1]
        y_pred = [1, 0, 0, 1, 0, 1, 1]
        
        metrics = calculate_binary_metrics(y_true, y_pred)
        
        # TP=3, FP=1, TN=2, FN=1
        assert metrics["tp"] == 3
        assert metrics["fp"] == 1
        assert metrics["tn"] == 2
        assert metrics["fn"] == 1
        assert abs(metrics["accuracy"] - 5/7) < 0.001
        assert abs(metrics["precision"] - 3/4) < 0.001
        assert abs(metrics["recall"] - 3/4) < 0.001


class TestConfusionMatrix:
    """Test confusion matrix generation and formatting."""
    
    def test_generate_confusion_matrix_simple(self):
        """Test confusion matrix generation with simple data."""
        y_true = ["oily", "dry", "oily", "normal", "dry"]
        y_pred = ["oily", "dry", "dry", "normal", "dry"]
        labels = ["oily", "dry", "normal"]
        
        matrix = generate_confusion_matrix(y_true, y_pred, labels)
        
        # Expected matrix:
        # oily: [1, 1, 0]  (1 correct, 1 predicted as dry)
        # dry: [0, 2, 0]   (2 correct)
        # normal: [0, 0, 1] (1 correct)
        assert matrix.shape == (3, 3)
        assert matrix[0, 0] == 1  # oily -> oily
        assert matrix[0, 1] == 1  # oily -> dry
        assert matrix[1, 1] == 2  # dry -> dry
        assert matrix[2, 2] == 1  # normal -> normal
    
    def test_generate_confusion_matrix_perfect(self):
        """Test confusion matrix with perfect predictions."""
        y_true = ["a", "b", "c", "a", "b", "c"]
        y_pred = ["a", "b", "c", "a", "b", "c"]
        labels = ["a", "b", "c"]
        
        matrix = generate_confusion_matrix(y_true, y_pred, labels)
        
        # Should be identity matrix scaled by 2
        expected = np.array([[2, 0, 0], [0, 2, 0], [0, 0, 2]])
        np.testing.assert_array_equal(matrix, expected)
    
    def test_format_confusion_matrix(self):
        """Test confusion matrix formatting."""
        matrix = np.array([[10, 2], [1, 15]])
        labels = ["positive", "negative"]
        
        formatted = format_confusion_matrix(matrix, labels)
        
        assert "Confusion Matrix:" in formatted
        assert "positive" in formatted
        assert "negative" in formatted
        assert "10" in formatted
        assert "15" in formatted
    
    def test_visualize_confusion_matrix_text(self):
        """Test confusion matrix visualization with percentages."""
        matrix = np.array([[8, 2], [1, 9]])
        labels = ["class_a", "class_b"]
        
        visualization = visualize_confusion_matrix_text(matrix, labels)
        
        assert "Confusion Matrix" in visualization
        assert "%" in visualization  # Should contain percentages
        assert "class_a" in visualization
        assert "class_b" in visualization


class TestPerClassMetrics:
    """Test per-class metrics calculations."""
    
    def test_calculate_per_class_metrics(self):
        """Test per-class metrics calculation."""
        y_true = ["oily", "dry", "oily", "normal", "dry", "oily"]
        y_pred = ["oily", "dry", "dry", "normal", "dry", "oily"]
        labels = ["oily", "dry", "normal"]
        
        metrics = calculate_per_class_metrics(y_true, y_pred, labels)
        
        assert "oily" in metrics
        assert "dry" in metrics
        assert "normal" in metrics
        
        # Check structure
        for label in labels:
            assert "precision" in metrics[label]
            assert "recall" in metrics[label]
            assert "f1_score" in metrics[label]
            assert 0.0 <= metrics[label]["precision"] <= 1.0
            assert 0.0 <= metrics[label]["recall"] <= 1.0
            assert 0.0 <= metrics[label]["f1_score"] <= 1.0
    
    def test_calculate_macro_average(self):
        """Test macro average calculation."""
        per_class_metrics = {
            "class_a": {"precision": 0.8, "recall": 0.9, "f1_score": 0.85},
            "class_b": {"precision": 0.9, "recall": 0.8, "f1_score": 0.85},
            "class_c": {"precision": 0.7, "recall": 0.7, "f1_score": 0.70}
        }
        
        macro = calculate_macro_average(per_class_metrics)
        
        assert abs(macro["precision"] - 0.8) < 0.001
        assert abs(macro["recall"] - 0.8) < 0.001
        assert abs(macro["f1_score"] - 0.8) < 0.001
    
    def test_calculate_macro_average_empty(self):
        """Test macro average with empty metrics."""
        macro = calculate_macro_average({})
        
        assert macro["precision"] == 0.0
        assert macro["recall"] == 0.0
        assert macro["f1_score"] == 0.0


class TestReportFormatting:
    """Test report formatting functions."""
    
    def test_format_metrics_table(self):
        """Test metrics table formatting."""
        metrics = {
            "oily": {"precision": 0.85, "recall": 0.90, "f1_score": 0.87},
            "dry": {"precision": 0.92, "recall": 0.88, "f1_score": 0.90}
        }
        
        table = format_metrics_table(metrics)
        
        assert "Per-Class Metrics:" in table
        assert "oily" in table
        assert "dry" in table
        assert "Precision" in table
        assert "Recall" in table
        assert "F1-Score" in table
        assert "Macro Average" in table
    
    def test_format_metrics_table_with_support(self):
        """Test metrics table formatting with support counts."""
        metrics = {
            "oily": {"precision": 0.85, "recall": 0.90, "f1_score": 0.87},
            "dry": {"precision": 0.92, "recall": 0.88, "f1_score": 0.90}
        }
        support = {"oily": 50, "dry": 45}
        
        table = format_metrics_table(metrics, include_support=True, support_counts=support)
        
        assert "Support" in table
        assert "50" in table
        assert "45" in table
    
    def test_format_metrics_report(self):
        """Test comprehensive metrics report formatting."""
        y_true = ["oily", "dry", "oily", "normal", "dry"]
        y_pred = ["oily", "dry", "dry", "normal", "dry"]
        labels = ["oily", "dry", "normal"]
        
        report = format_metrics_report(y_true, y_pred, labels, "Test Report")
        
        assert "Test Report" in report
        assert "Overall Accuracy" in report
        assert "Per-Class Metrics" in report
        assert "Confusion Matrix" in report
        assert "oily" in report
        assert "dry" in report
        assert "normal" in report
    
    def test_save_metrics_report(self, tmp_path):
        """Test saving metrics report to file."""
        report = "Test metrics report\nAccuracy: 95%"
        filepath = tmp_path / "test_report.txt"
        
        save_metrics_report(report, filepath)
        
        assert filepath.exists()
        content = filepath.read_text()
        assert "Test metrics report" in content
        assert "Accuracy: 95%" in content
    
    def test_save_metrics_report_append(self, tmp_path):
        """Test appending to existing metrics report."""
        filepath = tmp_path / "test_report.txt"
        
        # Write initial report
        save_metrics_report("First report", filepath)
        
        # Append second report
        save_metrics_report("Second report", filepath, append=True)
        
        content = filepath.read_text()
        assert "First report" in content
        assert "Second report" in content


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_precision_no_predictions(self):
        """Test precision when label is never predicted."""
        y_true = ["a", "b", "c"]
        y_pred = ["b", "b", "c"]
        
        precision = calculate_precision(y_true, y_pred, "a")
        assert precision == 0.0
    
    def test_recall_no_true_labels(self):
        """Test recall when label never appears in true labels."""
        y_true = ["b", "b", "c"]
        y_pred = ["a", "b", "c"]
        
        recall = calculate_recall(y_true, y_pred, "a")
        assert recall == 0.0
    
    def test_confusion_matrix_unknown_labels(self):
        """Test confusion matrix with unknown labels in predictions."""
        y_true = ["a", "b", "c"]
        y_pred = ["a", "b", "unknown"]
        labels = ["a", "b", "c"]
        
        # Should handle gracefully without crashing
        matrix = generate_confusion_matrix(y_true, y_pred, labels)
        assert matrix.shape == (3, 3)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
