# .env.example Configuration Guide

## Overview

The `.env.example` file provides comprehensive configuration documentation for the Skin Analysis ML Service. It includes all ML configuration variables with detailed descriptions, examples for GPU and CPU setups, and optional settings documentation.

## Quick Start

### 1. Copy the Example File
```bash
cd services/skin-analysis-service
cp .env.example .env
```

### 2. Choose Your Configuration

The file includes 5 ready-to-use configuration examples at the bottom:

#### Example 1: GPU Development Setup
**Best for**: Local development with GPU
- Auto device detection
- GPU enabled (80% memory)
- Lazy loading for fast startup
- Small cache (32 entries)
- Debug mode enabled

#### Example 2: CPU-Only Development Setup
**Best for**: Development without GPU
- CPU-only mode
- Quantization enabled for speed
- Small cache (32 entries)
- Debug mode enabled

#### Example 3: Production GPU Setup
**Best for**: High-performance production with GPU
- GPU optimized (90% memory)
- Preloaded model
- Large cache (256 entries)
- Batch processing (up to 16)
- Fallback API configured
- Metrics enabled

#### Example 4: Production CPU Setup
**Best for**: Cost-effective production without GPU
- CPU-only with quantization
- Preloaded model
- Large cache (256 entries)
- Batch processing (up to 4)
- Fallback API configured
- Metrics enabled

#### Example 5: Testing/CI Setup
**Best for**: Automated testing and CI/CD
- CPU-only
- Minimal resources
- No caching
- Debug logging

### 3. Customize Your Configuration

Edit the `.env` file and adjust values based on your needs:

```bash
# For GPU setup
DEVICE=auto
ENABLE_GPU=true
GPU_MEMORY_FRACTION=0.8

# For CPU-only setup
DEVICE=cpu
ENABLE_GPU=false
ENABLE_QUANTIZATION=true

# For production
PRELOAD_MODEL=true
ENABLE_PREDICTION_CACHE=true
PREDICTION_CACHE_SIZE=256
ENABLE_METRICS=true

# For development
DEBUG_MODE=true
LOG_LEVEL=INFO
LAZY_LOADING=true
```

## Configuration Sections

### Core Settings
- **Database**: MongoDB connection and database name
- **File Upload**: Max file size and upload directory
- **ML Model**: Model selection, path, and version
- **Device**: GPU/CPU configuration
- **Inference**: Confidence threshold, batch size, timeout

### Performance Optimization
- **Quantization**: Speed up CPU inference
- **ONNX**: Alternative runtime for optimization
- **Caching**: Cache predictions for identical images
- **Batch Processing**: Process multiple images efficiently
- **Memory Management**: Automatic cleanup

### Optional Features
- **Fallback API**: External API for backup
- **HuggingFace**: Model download configuration
- **Highlighted Images**: Visual overlays for detected issues
- **Debug Features**: Save preprocessed images and attention maps

### Monitoring
- **Logging**: Inference time, memory usage
- **Metrics**: Prometheus-compatible metrics
- **Error Handling**: Retry logic and error recovery

## Key Configuration Variables

### Essential Settings

| Variable | Description | Default | Recommended |
|----------|-------------|---------|-------------|
| `MODEL_NAME` | Model to use | `efficientnet_b0` | Keep default |
| `MODEL_PATH` | Path to model file | `./models/efficientnet_b0.pth` | Keep default |
| `DEVICE` | Device selection | `auto` | `auto` (GPU/CPU) |
| `ENABLE_GPU` | Enable GPU | `true` | `true` if available |
| `CONFIDENCE_THRESHOLD` | Min confidence | `0.7` | `0.7` (prod), `0.5` (dev) |
| `BATCH_SIZE` | Inference batch size | `1` | `1` (single), `4-8` (batch) |

### Performance Settings

| Variable | Description | Default | GPU | CPU |
|----------|-------------|---------|-----|-----|
| `ENABLE_QUANTIZATION` | Model quantization | `false` | `false` | `true` |
| `ENABLE_PREDICTION_CACHE` | Cache predictions | `true` | `true` | `true` |
| `PREDICTION_CACHE_SIZE` | Cache size | `128` | `256` | `128` |
| `ENABLE_BATCH_PROCESSING` | Batch processing | `true` | `true` | `true` |
| `MAX_BATCH_SIZE` | Max batch size | `8` | `16` | `4` |

### Optional Settings

| Variable | Description | Default | When to Enable |
|----------|-------------|---------|----------------|
| `ENABLE_FALLBACK_API` | External API backup | `false` | Production |
| `FALLBACK_API_URL` | Fallback API endpoint | - | If fallback enabled |
| `ENABLE_ONNX` | ONNX runtime | `false` | Experimental |
| `DEBUG_MODE` | Verbose logging | `false` | Development |
| `SAVE_PREPROCESSED_IMAGES` | Save debug images | `false` | Debugging |

## Configuration Tips

### For Development
1. Enable debug mode: `DEBUG_MODE=true`
2. Use lazy loading: `LAZY_LOADING=true`
3. Smaller cache: `PREDICTION_CACHE_SIZE=32`
4. Enable logging: `LOG_INFERENCE_TIME=true`

### For Production
1. Preload model: `PRELOAD_MODEL=true`
2. Larger cache: `PREDICTION_CACHE_SIZE=256`
3. Enable metrics: `ENABLE_METRICS=true`
4. Configure fallback: `ENABLE_FALLBACK_API=true`
5. Disable debug: `DEBUG_MODE=false`

### For CPU-Only Systems
1. Force CPU: `DEVICE=cpu`
2. Enable quantization: `ENABLE_QUANTIZATION=true`
3. Smaller batches: `BATCH_SIZE=1`, `MAX_BATCH_SIZE=4`
4. Adjust timeout: `MAX_INFERENCE_TIME=10`

### For GPU Systems
1. Auto detect: `DEVICE=auto`
2. Enable GPU: `ENABLE_GPU=true`
3. Set memory: `GPU_MEMORY_FRACTION=0.8`
4. Larger batches: `BATCH_SIZE=4`, `MAX_BATCH_SIZE=16`

## Environment-Specific Configurations

### Development Environment
```env
ENVIRONMENT=development
DEBUG_MODE=true
LOG_LEVEL=INFO
LAZY_LOADING=true
PRELOAD_MODEL=false
PREDICTION_CACHE_SIZE=32
```

### Staging Environment
```env
ENVIRONMENT=staging
DEBUG_MODE=false
LOG_LEVEL=WARNING
LAZY_LOADING=false
PRELOAD_MODEL=true
PREDICTION_CACHE_SIZE=128
ENABLE_METRICS=true
```

### Production Environment
```env
ENVIRONMENT=production
DEBUG_MODE=false
LOG_LEVEL=WARNING
LAZY_LOADING=false
PRELOAD_MODEL=true
PREDICTION_CACHE_SIZE=256
ENABLE_METRICS=true
ENABLE_FALLBACK_API=true
```

## Troubleshooting

### Issue: Out of Memory on GPU
**Solution**: Reduce `GPU_MEMORY_FRACTION` or `BATCH_SIZE`
```env
GPU_MEMORY_FRACTION=0.5
BATCH_SIZE=1
```

### Issue: Slow CPU Inference
**Solution**: Enable quantization and reduce batch size
```env
ENABLE_QUANTIZATION=true
BATCH_SIZE=1
MAX_BATCH_SIZE=2
```

### Issue: Model Not Loading
**Solution**: Check model path and ensure model file exists
```bash
ls -la services/skin-analysis-service/models/
```

### Issue: Low Accuracy
**Solution**: Adjust confidence threshold
```env
CONFIDENCE_THRESHOLD=0.6
MIN_CONFIDENCE_THRESHOLD=0.4
```

## Security Considerations

### Sensitive Values
Never commit these values to version control:
- `HF_TOKEN`: HuggingFace API token
- `FALLBACK_API_KEY`: External API credentials
- Production database URLs

### Best Practices
1. Keep `.env` in `.gitignore`
2. Use environment-specific `.env` files
3. Rotate API keys regularly
4. Use secrets management in production

## Additional Resources

- **ML Config Documentation**: `ML_CONFIG_GUIDE.md`
- **Performance Guide**: `PERFORMANCE_OPTIMIZATIONS.md`
- **Setup Instructions**: `README.md`
- **Task Verification**: `TASK_22_VERIFICATION.md`

## File Statistics

- **Total Lines**: 439
- **Configuration Variables**: 50+
- **Configuration Examples**: 5
- **Sections**: 20+
- **Size**: 16.4 KB

## Conclusion

The `.env.example` file provides comprehensive configuration documentation that makes it easy to set up and customize the Skin Analysis ML Service for any environment. Choose one of the provided examples as a starting point, then customize based on your specific needs.
