# Model Accuracy Testing

## Overview

The `test_model_accuracy.py` module provides comprehensive accuracy testing for the skin analysis ML model. It validates that the model meets the >=90% accuracy requirement specified in the project requirements.

## Test Coverage

The accuracy testing module includes:

1. **Dataset Loading**: Loads or generates a test dataset with labeled skin images (100+ samples)
2. **Skin Type Classification**: Tests accuracy of skin type predictions
3. **Issue Detection Metrics**: Calculates precision, recall, and F1-score for each skin condition
4. **Confusion Matrix**: Generates confusion matrices for classification analysis
5. **Performance Testing**: Validates inference time meets requirements
6. **Comprehensive Reporting**: Generates detailed metrics reports

## Requirements

### Model File Format

The accuracy tests require a **complete PyTorch model object** (not just a state_dict). The model file should:

- Be a `.pth` or `.pt` file containing a full model with architecture
- Have an `eval()` method (be a `torch.nn.Module` instance)
- Be compatible with the expected input/output format

**Current Status**: The existing `models/efficientnet_b0.pth` file contains only a state_dict (model weights). To run full accuracy tests, you need a complete model file.

### Test Dataset

The tests can work with either:

1. **Real labeled dataset**: Place images and metadata in `tests/test_data/accuracy_dataset/`
   - Structure:
     ```
     tests/test_data/accuracy_dataset/
     ├── metadata.json
     └── images/
         ├── image_001.jpg
         ├── image_002.jpg
         └── ...
     ```
   - `metadata.json` format:
     ```json
     {
       "dataset_name": "Skin Analysis Test Dataset",
       "num_samples": 120,
       "samples": [
         {
           "image_id": "img_001",
           "image_filename": "image_001.jpg",
           "skin_type": "oily",
           "issues": ["acne", "oiliness"],
           "severity": {"acne": "medium", "oiliness": "high"}
         }
       ]
     }
     ```

2. **Synthetic dataset**: The tests automatically generate synthetic images if no real dataset is found

## Running the Tests

### Run All Accuracy Tests

```bash
cd services/skin-analysis-service
python -m pytest tests/test_model_accuracy.py -v -s
```

### Run Specific Tests

```bash
# Test dataset loading only
python -m pytest tests/test_model_accuracy.py::TestModelAccuracy::test_dataset_loaded -v

# Test skin type classification
python -m pytest tests/test_model_accuracy.py::TestModelAccuracy::test_skin_type_classification_accuracy -v

# Test issue detection metrics
python -m pytest tests/test_model_accuracy.py::TestModelAccuracy::test_issue_detection_metrics -v

# Test performance
python -m pytest tests/test_model_accuracy.py::TestModelAccuracy::test_inference_performance -v
```

### Run with Coverage

```bash
python -m pytest tests/test_model_accuracy.py --cov=app/ml --cov-report=html -v
```

## Test Outputs

The tests generate several report files in `tests/test_data/`:

1. **skin_type_accuracy_report.txt**: Detailed skin type classification metrics
2. **issue_detection_metrics_report.txt**: Per-issue precision, recall, F1-scores
3. **comprehensive_accuracy_report.txt**: Complete model accuracy report

## Expected Results

For the tests to pass:

- **Skin Type Accuracy**: >= 90% (ACCURACY_THRESHOLD)
- **Issue Detection**:
  - Average Precision: >= 70%
  - Average Recall: >= 70%
  - Average F1-Score: >= 70%
- **Performance**:
  - GPU Inference: <= 1.0 second
  - CPU Inference: <= 3.0 seconds

## Troubleshooting

### "Model file not found" Error

Ensure the model file exists at `models/efficientnet_b0.pth`. Run the setup script to download it:

```bash
./setup.sh  # Linux
# or
setup.bat   # Windows
```

### "AttributeError: 'collections.OrderedDict' object has no attribute 'eval'"

This means the model file contains only weights (state_dict), not a complete model. You need to:

1. Train a complete model with architecture, or
2. Load the state_dict into a model architecture before testing

Example of creating a complete model file:

```python
import torch
import timm

# Load model architecture
model = timm.create_model('efficientnet_b0', pretrained=False, num_classes=5)

# Load weights
state_dict = torch.load('models/efficientnet_b0.pth')
model.load_state_dict(state_dict)

# Save complete model
torch.save(model, 'models/efficientnet_b0_complete.pth')
```

### Low Accuracy Results

If accuracy is below 90%:

1. Check the test dataset quality and labels
2. Verify the model is properly trained
3. Review the confusion matrix to identify problematic classes
4. Consider fine-tuning the model on more diverse data

## Integration with CI/CD

To integrate accuracy testing into CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run Model Accuracy Tests
  run: |
    cd services/skin-analysis-service
    python -m pytest tests/test_model_accuracy.py -v --junitxml=test-results.xml
  
- name: Upload Test Results
  uses: actions/upload-artifact@v2
  with:
    name: accuracy-test-results
    path: services/skin-analysis-service/tests/test_data/*_report.txt
```

## Contributing

When adding new test cases:

1. Follow the existing test structure
2. Use the `MetricsCalculator` class for metric calculations
3. Use the `AccuracyReporter` class for report generation
4. Document expected behavior and requirements
5. Ensure tests are deterministic and reproducible

## References

- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2
- Design Document: `.kiro/specs/skin-analysis-ml-model/design.md`
- Task: Task 12 in `.kiro/specs/skin-analysis-ml-model/tasks.md`
