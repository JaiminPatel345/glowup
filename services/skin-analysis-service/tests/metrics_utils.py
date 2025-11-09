"""
Metrics Calculation Utilities

This module provides helper functions for calculating classification metrics,
generating confusion matrices, and formatting metrics reports.

Requirements: 2.2, 2.5
"""

import numpy as np
from typing import List, Tuple, Dict, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def calculate_accuracy(y_true: List[str], y_pred: List[str]) -> float:
    """
    Calculate accuracy score.
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        
    Returns:
        Accuracy score (0.0 to 1.0)
        
    Raises:
        ValueError: If lists have different lengths
        
    Example:
        >>> y_true = ["oily", "dry", "oily", "normal"]
        >>> y_pred = ["oily", "dry", "dry", "normal"]
        >>> accuracy = calculate_accuracy(y_true, y_pred)
        >>> print(f"Accuracy: {accuracy:.2%}")
        Accuracy: 75.00%
    """
    if len(y_true) != len(y_pred):
        raise ValueError(
            f"Length mismatch: y_true has {len(y_true)} items, "
            f"y_pred has {len(y_pred)} items"
        )
    
    if len(y_true) == 0:
        return 0.0
    
    correct = sum(1 for true, pred in zip(y_true, y_pred) if true == pred)
    return correct / len(y_true)


def calculate_precision(y_true: List[str], y_pred: List[str], label: str) -> float:
    """
    Calculate precision for a specific label.
    
    Precision = TP / (TP + FP)
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        label: The label to calculate precision for
        
    Returns:
        Precision score (0.0 to 1.0)
        
    Example:
        >>> y_true = ["acne", "acne", "wrinkles", "acne"]
        >>> y_pred = ["acne", "wrinkles", "wrinkles", "acne"]
        >>> precision = calculate_precision(y_true, y_pred, "acne")
        >>> print(f"Precision for acne: {precision:.2%}")
        Precision for acne: 100.00%
    """
    tp = sum(1 for true, pred in zip(y_true, y_pred) if true == label and pred == label)
    fp = sum(1 for true, pred in zip(y_true, y_pred) if true != label and pred == label)
    
    if (tp + fp) == 0:
        return 0.0
    
    return tp / (tp + fp)


def calculate_recall(y_true: List[str], y_pred: List[str], label: str) -> float:
    """
    Calculate recall (sensitivity) for a specific label.
    
    Recall = TP / (TP + FN)
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        label: The label to calculate recall for
        
    Returns:
        Recall score (0.0 to 1.0)
        
    Example:
        >>> y_true = ["acne", "acne", "wrinkles", "acne"]
        >>> y_pred = ["acne", "wrinkles", "wrinkles", "acne"]
        >>> recall = calculate_recall(y_true, y_pred, "acne")
        >>> print(f"Recall for acne: {recall:.2%}")
        Recall for acne: 66.67%
    """
    tp = sum(1 for true, pred in zip(y_true, y_pred) if true == label and pred == label)
    fn = sum(1 for true, pred in zip(y_true, y_pred) if true == label and pred != label)
    
    if (tp + fn) == 0:
        return 0.0
    
    return tp / (tp + fn)


def calculate_f1_score(precision: float, recall: float) -> float:
    """
    Calculate F1-score from precision and recall.
    
    F1 = 2 * (precision * recall) / (precision + recall)
    
    Args:
        precision: Precision score
        recall: Recall score
        
    Returns:
        F1-score (0.0 to 1.0)
        
    Example:
        >>> precision = 0.85
        >>> recall = 0.90
        >>> f1 = calculate_f1_score(precision, recall)
        >>> print(f"F1-Score: {f1:.2%}")
        F1-Score: 87.43%
    """
    if (precision + recall) == 0:
        return 0.0
    
    return 2 * (precision * recall) / (precision + recall)


def calculate_precision_recall_f1(
    y_true: List[str], 
    y_pred: List[str], 
    label: str
) -> Tuple[float, float, float]:
    """
    Calculate precision, recall, and F1-score for a specific label.
    
    This is a convenience function that combines the three metric calculations.
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        label: The label to calculate metrics for
        
    Returns:
        Tuple of (precision, recall, f1_score)
        
    Example:
        >>> y_true = ["oily", "dry", "oily", "normal", "oily"]
        >>> y_pred = ["oily", "dry", "dry", "normal", "oily"]
        >>> precision, recall, f1 = calculate_precision_recall_f1(y_true, y_pred, "oily")
        >>> print(f"Precision: {precision:.2%}, Recall: {recall:.2%}, F1: {f1:.2%}")
        Precision: 100.00%, Recall: 66.67%, F1: 80.00%
    """
    precision = calculate_precision(y_true, y_pred, label)
    recall = calculate_recall(y_true, y_pred, label)
    f1 = calculate_f1_score(precision, recall)
    
    return precision, recall, f1


def calculate_binary_metrics(
    y_true: List[int], 
    y_pred: List[int]
) -> Dict[str, float]:
    """
    Calculate metrics for binary classification.
    
    Args:
        y_true: List of true binary labels (0 or 1)
        y_pred: List of predicted binary labels (0 or 1)
        
    Returns:
        Dictionary containing:
        - accuracy: Overall accuracy
        - precision: Precision score
        - recall: Recall score
        - f1_score: F1-score
        - specificity: True negative rate
        - tp, fp, tn, fn: Confusion matrix values
        
    Example:
        >>> y_true = [1, 1, 0, 1, 0, 0, 1]
        >>> y_pred = [1, 0, 0, 1, 0, 1, 1]
        >>> metrics = calculate_binary_metrics(y_true, y_pred)
        >>> print(f"Accuracy: {metrics['accuracy']:.2%}")
        Accuracy: 71.43%
    """
    if len(y_true) != len(y_pred):
        raise ValueError("Length mismatch between true and predicted labels")
    
    # Calculate confusion matrix values
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    
    # Calculate metrics
    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1_score = calculate_f1_score(precision, recall)
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
        "specificity": specificity,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn
    }


def generate_confusion_matrix(
    y_true: List[str], 
    y_pred: List[str], 
    labels: List[str]
) -> np.ndarray:
    """
    Generate confusion matrix for multi-class classification.
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        labels: List of all possible labels (defines matrix order)
        
    Returns:
        Confusion matrix as numpy array of shape (n_labels, n_labels)
        where matrix[i, j] represents the count of samples with true label i
        and predicted label j
        
    Example:
        >>> y_true = ["oily", "dry", "oily", "normal", "dry"]
        >>> y_pred = ["oily", "dry", "dry", "normal", "dry"]
        >>> labels = ["oily", "dry", "normal"]
        >>> matrix = generate_confusion_matrix(y_true, y_pred, labels)
        >>> print(matrix)
        [[1 1 0]
         [0 2 0]
         [0 0 1]]
    """
    n_labels = len(labels)
    matrix = np.zeros((n_labels, n_labels), dtype=int)
    
    # Create label to index mapping
    label_to_idx = {label: idx for idx, label in enumerate(labels)}
    
    # Fill confusion matrix
    for true, pred in zip(y_true, y_pred):
        if true in label_to_idx and pred in label_to_idx:
            true_idx = label_to_idx[true]
            pred_idx = label_to_idx[pred]
            matrix[true_idx, pred_idx] += 1
        else:
            logger.warning(f"Unknown label encountered: true={true}, pred={pred}")
    
    return matrix


def format_confusion_matrix(
    matrix: np.ndarray, 
    labels: List[str],
    max_label_width: int = 12
) -> str:
    """
    Format confusion matrix as a readable string table.
    
    Args:
        matrix: Confusion matrix as numpy array
        labels: List of label names
        max_label_width: Maximum width for label names (will be truncated)
        
    Returns:
        Formatted confusion matrix as string
        
    Example:
        >>> matrix = np.array([[10, 2], [1, 15]])
        >>> labels = ["positive", "negative"]
        >>> print(format_confusion_matrix(matrix, labels))
        
        Confusion Matrix:
        ================================================================================
        True\Pred    positive   negative   
        --------------------------------------------------------------------------------
        positive     10         2          
        negative     1          15         
        ================================================================================
    """
    lines = ["\nConfusion Matrix:"]
    lines.append("=" * 80)
    
    # Truncate labels if needed
    display_labels = [label[:max_label_width] for label in labels]
    
    # Header row
    header = "True\\Pred".ljust(15)
    for label in display_labels:
        header += label.ljust(10)
    lines.append(header)
    lines.append("-" * 80)
    
    # Data rows
    for i, label in enumerate(display_labels):
        row = label.ljust(15)
        for j in range(len(labels)):
            row += str(matrix[i, j]).ljust(10)
        lines.append(row)
    
    lines.append("=" * 80)
    
    return "\n".join(lines)


def visualize_confusion_matrix_text(
    matrix: np.ndarray,
    labels: List[str]
) -> str:
    """
    Create a text-based visualization of confusion matrix with percentages.
    
    Args:
        matrix: Confusion matrix as numpy array
        labels: List of label names
        
    Returns:
        Formatted visualization with counts and percentages
        
    Example:
        >>> matrix = np.array([[8, 2], [1, 9]])
        >>> labels = ["class_a", "class_b"]
        >>> print(visualize_confusion_matrix_text(matrix, labels))
    """
    lines = ["\nConfusion Matrix (with percentages):"]
    lines.append("=" * 100)
    
    # Calculate row totals for percentages
    row_totals = matrix.sum(axis=1)
    
    # Header
    header = "True\\Pred".ljust(15)
    for label in labels:
        header += f"{label[:10].ljust(10)} "
    header += "Total"
    lines.append(header)
    lines.append("-" * 100)
    
    # Data rows with percentages
    for i, label in enumerate(labels):
        row = label[:12].ljust(15)
        for j in range(len(labels)):
            count = matrix[i, j]
            if row_totals[i] > 0:
                pct = (count / row_totals[i]) * 100
                cell = f"{count}({pct:.0f}%)"
            else:
                cell = f"{count}(0%)"
            row += cell.ljust(11)
        row += str(row_totals[i])
        lines.append(row)
    
    lines.append("=" * 100)
    
    return "\n".join(lines)


def calculate_per_class_metrics(
    y_true: List[str],
    y_pred: List[str],
    labels: List[str]
) -> Dict[str, Dict[str, float]]:
    """
    Calculate precision, recall, and F1-score for all classes.
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        labels: List of all possible labels
        
    Returns:
        Dictionary mapping each label to its metrics:
        {
            "label1": {"precision": 0.85, "recall": 0.90, "f1_score": 0.87},
            "label2": {"precision": 0.92, "recall": 0.88, "f1_score": 0.90},
            ...
        }
        
    Example:
        >>> y_true = ["oily", "dry", "oily", "normal", "dry"]
        >>> y_pred = ["oily", "dry", "dry", "normal", "dry"]
        >>> labels = ["oily", "dry", "normal"]
        >>> metrics = calculate_per_class_metrics(y_true, y_pred, labels)
        >>> print(f"Oily F1: {metrics['oily']['f1_score']:.2%}")
    """
    results = {}
    
    for label in labels:
        precision, recall, f1 = calculate_precision_recall_f1(y_true, y_pred, label)
        results[label] = {
            "precision": precision,
            "recall": recall,
            "f1_score": f1
        }
    
    return results


def calculate_macro_average(
    per_class_metrics: Dict[str, Dict[str, float]]
) -> Dict[str, float]:
    """
    Calculate macro-averaged metrics across all classes.
    
    Macro average gives equal weight to each class regardless of support.
    
    Args:
        per_class_metrics: Dictionary of per-class metrics
        
    Returns:
        Dictionary with macro-averaged precision, recall, and F1-score
        
    Example:
        >>> metrics = {
        ...     "class_a": {"precision": 0.8, "recall": 0.9, "f1_score": 0.85},
        ...     "class_b": {"precision": 0.9, "recall": 0.8, "f1_score": 0.85}
        ... }
        >>> macro = calculate_macro_average(metrics)
        >>> print(f"Macro F1: {macro['f1_score']:.2%}")
    """
    if not per_class_metrics:
        return {"precision": 0.0, "recall": 0.0, "f1_score": 0.0}
    
    precisions = [m["precision"] for m in per_class_metrics.values()]
    recalls = [m["recall"] for m in per_class_metrics.values()]
    f1_scores = [m["f1_score"] for m in per_class_metrics.values()]
    
    return {
        "precision": np.mean(precisions),
        "recall": np.mean(recalls),
        "f1_score": np.mean(f1_scores)
    }


def format_metrics_table(
    per_class_metrics: Dict[str, Dict[str, float]],
    include_support: bool = False,
    support_counts: Dict[str, int] = None
) -> str:
    """
    Format per-class metrics as a readable table.
    
    Args:
        per_class_metrics: Dictionary of per-class metrics
        include_support: Whether to include support (sample count) column
        support_counts: Dictionary mapping labels to sample counts
        
    Returns:
        Formatted table as string
        
    Example:
        >>> metrics = {
        ...     "oily": {"precision": 0.85, "recall": 0.90, "f1_score": 0.87},
        ...     "dry": {"precision": 0.92, "recall": 0.88, "f1_score": 0.90}
        ... }
        >>> print(format_metrics_table(metrics))
    """
    lines = ["\nPer-Class Metrics:"]
    lines.append("=" * 80)
    
    # Header
    if include_support and support_counts:
        header = "Class".ljust(20) + "Precision".ljust(12) + "Recall".ljust(12) + \
                 "F1-Score".ljust(12) + "Support"
    else:
        header = "Class".ljust(20) + "Precision".ljust(12) + "Recall".ljust(12) + "F1-Score"
    lines.append(header)
    lines.append("-" * 80)
    
    # Data rows
    for label, metrics in sorted(per_class_metrics.items()):
        row = label[:18].ljust(20)
        row += f"{metrics['precision']:.3f}".ljust(12)
        row += f"{metrics['recall']:.3f}".ljust(12)
        row += f"{metrics['f1_score']:.3f}".ljust(12)
        
        if include_support and support_counts and label in support_counts:
            row += str(support_counts[label])
        
        lines.append(row)
    
    # Macro average
    macro = calculate_macro_average(per_class_metrics)
    lines.append("-" * 80)
    row = "Macro Average".ljust(20)
    row += f"{macro['precision']:.3f}".ljust(12)
    row += f"{macro['recall']:.3f}".ljust(12)
    row += f"{macro['f1_score']:.3f}"
    lines.append(row)
    
    lines.append("=" * 80)
    
    return "\n".join(lines)


def format_metrics_report(
    y_true: List[str],
    y_pred: List[str],
    labels: List[str],
    report_title: str = "Classification Metrics Report"
) -> str:
    """
    Generate a comprehensive formatted metrics report.
    
    This function combines multiple formatting utilities to create a complete
    report including accuracy, confusion matrix, and per-class metrics.
    
    Args:
        y_true: List of true labels
        y_pred: List of predicted labels
        labels: List of all possible labels
        report_title: Title for the report
        
    Returns:
        Complete formatted report as string
        
    Example:
        >>> y_true = ["oily", "dry", "oily", "normal", "dry"]
        >>> y_pred = ["oily", "dry", "dry", "normal", "dry"]
        >>> labels = ["oily", "dry", "normal"]
        >>> report = format_metrics_report(y_true, y_pred, labels)
        >>> print(report)
    """
    lines = []
    lines.append("\n" + "=" * 80)
    lines.append(report_title.center(80))
    lines.append("=" * 80)
    
    # Overall accuracy
    accuracy = calculate_accuracy(y_true, y_pred)
    lines.append(f"\nOverall Accuracy: {accuracy:.2%}")
    lines.append(f"Total Samples: {len(y_true)}")
    lines.append(f"Correct Predictions: {sum(1 for t, p in zip(y_true, y_pred) if t == p)}")
    
    # Per-class metrics
    per_class_metrics = calculate_per_class_metrics(y_true, y_pred, labels)
    
    # Calculate support
    support_counts = {}
    for label in labels:
        support_counts[label] = sum(1 for t in y_true if t == label)
    
    lines.append(format_metrics_table(per_class_metrics, include_support=True, 
                                     support_counts=support_counts))
    
    # Confusion matrix
    confusion_matrix = generate_confusion_matrix(y_true, y_pred, labels)
    lines.append(format_confusion_matrix(confusion_matrix, labels))
    
    # Visualization with percentages
    lines.append(visualize_confusion_matrix_text(confusion_matrix, labels))
    
    lines.append("\n" + "=" * 80)
    
    return "\n".join(lines)


def save_metrics_report(
    report: str,
    filepath: Path,
    append: bool = False
) -> None:
    """
    Save metrics report to a file.
    
    Args:
        report: Formatted report string
        filepath: Path to save the report
        append: If True, append to existing file; otherwise overwrite
        
    Example:
        >>> report = format_metrics_report(y_true, y_pred, labels)
        >>> save_metrics_report(report, Path("metrics_report.txt"))
    """
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    mode = 'a' if append else 'w'
    with open(filepath, mode) as f:
        f.write(report)
        f.write("\n")
    
    logger.info(f"Metrics report saved to {filepath}")


# Example usage and testing
if __name__ == "__main__":
    # Example data
    y_true = ["oily", "dry", "oily", "normal", "dry", "oily", "combination", "sensitive"]
    y_pred = ["oily", "dry", "dry", "normal", "dry", "oily", "combination", "normal"]
    labels = ["oily", "dry", "normal", "combination", "sensitive"]
    
    print("=" * 80)
    print("METRICS UTILITIES DEMONSTRATION")
    print("=" * 80)
    
    # Calculate accuracy
    accuracy = calculate_accuracy(y_true, y_pred)
    print(f"\nOverall Accuracy: {accuracy:.2%}")
    
    # Calculate per-class metrics
    print("\nPer-Class Metrics:")
    for label in labels:
        precision, recall, f1 = calculate_precision_recall_f1(y_true, y_pred, label)
        print(f"{label:15} - Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}")
    
    # Generate confusion matrix
    confusion_matrix = generate_confusion_matrix(y_true, y_pred, labels)
    print(format_confusion_matrix(confusion_matrix, labels))
    
    # Generate comprehensive report
    report = format_metrics_report(y_true, y_pred, labels, "Example Classification Report")
    print(report)
    
    # Binary classification example
    print("\n" + "=" * 80)
    print("BINARY CLASSIFICATION EXAMPLE")
    print("=" * 80)
    
    y_true_binary = [1, 1, 0, 1, 0, 0, 1, 1, 0, 1]
    y_pred_binary = [1, 0, 0, 1, 0, 1, 1, 1, 0, 0]
    
    binary_metrics = calculate_binary_metrics(y_true_binary, y_pred_binary)
    print(f"\nAccuracy: {binary_metrics['accuracy']:.2%}")
    print(f"Precision: {binary_metrics['precision']:.2%}")
    print(f"Recall: {binary_metrics['recall']:.2%}")
    print(f"F1-Score: {binary_metrics['f1_score']:.2%}")
    print(f"Specificity: {binary_metrics['specificity']:.2%}")
    print(f"\nConfusion Matrix Values:")
    print(f"  TP: {binary_metrics['tp']}, FP: {binary_metrics['fp']}")
    print(f"  TN: {binary_metrics['tn']}, FN: {binary_metrics['fn']}")
