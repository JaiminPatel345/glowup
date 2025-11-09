# Metrics Calculation Utilities - Quick Reference

## Overview
Comprehensive helper functions for calculating classification metrics, generating confusion matrices, and formatting reports.

## Quick Start

```python
from tests.metrics_utils import (
    calculate_accuracy,
    calculate_precision_recall_f1,
    generate_confusion_matrix,
    format_metrics_report
)

# Your predictions
y_true = ["oily", "dry", "oily", "normal"]
y_pred = ["oily", "dry", "dry", "normal"]
labels = ["oily", "dry", "normal"]

# Calculate accuracy
accuracy = calculate_accuracy(y_true, y_pred)
print(f"Accuracy: {accuracy:.2%}")

# Calculate per-class metrics
for label in labels:
    precision, recall, f1 = calculate_precision_recall_f1(y_true, y_pred, label)
    print(f"{label}: P={precision:.2%}, R={recall:.2%}, F1={f1:.2%}")

# Generate comprehensive report
report = format_metrics_report(y_true, y_pred, labels)
print(report)
```

## Available Functions

### Basic Metrics
- `calculate_accuracy(y_true, y_pred)` → float
- `calculate_precision(y_true, y_pred, label)` → float
- `calculate_recall(y_true, y_pred, label)` → float
- `calculate_f1_score(precision, recall)` → float
- `calculate_precision_recall_f1(y_true, y_pred, label)` → (precision, recall, f1)

### Binary Classification
- `calculate_binary_metrics(y_true, y_pred)` → dict with accuracy, precision, recall, f1, specificity, tp, fp, tn, fn

### Confusion Matrix
- `generate_confusion_matrix(y_true, y_pred, labels)` → numpy array
- `format_confusion_matrix(matrix, labels)` → formatted string
- `visualize_confusion_matrix_text(matrix, labels)` → string with percentages

### Multi-Class Metrics
- `calculate_per_class_metrics(y_true, y_pred, labels)` → dict of metrics per class
- `calculate_macro_average(per_class_metrics)` → dict with averaged metrics

### Report Generation
- `format_metrics_table(per_class_metrics, include_support, support_counts)` → formatted table
- `format_metrics_report(y_true, y_pred, labels, report_title)` → comprehensive report
- `save_metrics_report(report, filepath, append)` → saves to file

## Example Output

```
================================================================================
                    Skin Type Classification Report                     
================================================================================

Overall Accuracy: 75.00%
Total Samples: 4
Correct Predictions: 3

Per-Class Metrics:
================================================================================
Class               Precision   Recall      F1-Score    Support
--------------------------------------------------------------------------------
dry                 1.000       1.000       1.000       1
normal              1.000       1.000       1.000       1
oily                0.500       1.000       0.667       2
--------------------------------------------------------------------------------
Macro Average       0.833       1.000       0.889
================================================================================

Confusion Matrix:
================================================================================
True\Pred      oily      dry       normal    
--------------------------------------------------------------------------------
oily           2         0         0         
dry            0         1         0         
normal         0         0         1         
================================================================================
```

## Testing

Run the comprehensive test suite:
```bash
python -m pytest tests/test_metrics_utils.py -v
```

29 tests covering:
- Accuracy calculations
- Precision/Recall/F1 calculations
- Binary metrics
- Confusion matrices
- Report formatting
- Edge cases

## Integration

Used by:
- `tests/test_model_accuracy.py` - Model accuracy validation
- Any custom validation scripts
- Performance monitoring tools

## Requirements Satisfied
- ✅ Requirement 2.2: Precision, recall, F1-score for each skin condition
- ✅ Requirement 2.5: Performance report with confusion matrix and per-class metrics
