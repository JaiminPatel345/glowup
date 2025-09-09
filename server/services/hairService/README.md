# Hair Processing Service

Python gRPC service for real-time hair analysis and processing. Currently implements placeholder processing with a framework ready for ML model integration.

## Features

- gRPC streaming server for real-time video processing
- Modular hair processing pipeline
- Base64 image encoding/decoding
- OpenCV and PIL image processing
- Performance monitoring and logging
- Health check endpoint
- Async processing for optimal performance

## Installation

### Prerequisites
- Python 3.8+
- pip

### Setup

```bash
# Create virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate gRPC code from proto files
./generate_proto.sh
```

## Dependencies

```
grpcio==1.60.1
grpcio-tools==1.60.1
Pillow==10.2.0
numpy==1.26.4
opencv-python==4.9.0.80
protobuf==4.25.3
```

## Running

```bash
python app.py
```

The service will start on port 50051 (default gRPC port).

## Configuration

### Environment Variables

```bash
GRPC_PORT=50051
LOG_LEVEL=INFO
```

## Architecture

### Core Components

1. **app.py** - gRPC server implementation
2. **hair_processor.py** - Hair processing logic (currently placeholder)
3. **video_processing_pb2.py** - Generated protobuf message classes
4. **video_processing_pb2_grpc.py** - Generated gRPC service classes

### Processing Pipeline

```
[Video Frame] → [Decode Base64] → [Convert Format] → [Process Hair] → [Encode Base64] → [Return Frame]
```

## gRPC API

### Service Definition

```protobuf
service VideoProcessingService {
  rpc ProcessVideoStream(stream VideoFrame) returns (stream VideoFrame);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}
```

### Message Types

#### VideoFrame
```protobuf
message VideoFrame {
  string session_id = 1;
  bytes frame_data = 2;
  string format = 3;
  int64 timestamp = 4;
  int32 width = 5;
  int32 height = 6;
  FrameMetadata metadata = 7;
}
```

#### FrameMetadata
```protobuf
message FrameMetadata {
  string camera_facing = 1;
  float quality = 2;
  map<string, string> extra = 3;
}
```

## Hair Processing

### Current Implementation

The `HairProcessor` class currently implements placeholder processing that:

1. Decodes base64 image data
2. Converts to OpenCV format
3. Applies minimal brightness adjustment
4. Encodes back to base64

### TODO: Implement Actual Hair Processing

Replace placeholder methods with actual ML models:

```python
# hair_processor.py - Areas to implement

async def analyze_hair_health(self, image: np.ndarray) -> Dict[str, Any]:
    """TODO: Implement ML model for hair health analysis"""
    pass

async def detect_hair_style(self, image: np.ndarray) -> Dict[str, Any]:
    """TODO: Implement ML model for hair style detection"""
    pass

async def suggest_improvements(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
    """TODO: Implement recommendation engine"""
    pass
```

### Integration Points for ML Models

1. **Hair Detection**: Segment hair regions in the image
2. **Style Classification**: Classify hair style, length, texture
3. **Health Analysis**: Assess hair condition and damage
4. **Virtual Styling**: Apply virtual hair styles or colors
5. **Recommendations**: Suggest hair care products or treatments

## Performance Metrics

The service tracks:

- **Processing Time**: Time per frame in milliseconds
- **Throughput**: Frames processed per second
- **Session Stats**: Active sessions and total frames processed
- **Error Rates**: Failed processing attempts

### Example Logs

```
INFO - VideoProcessingService initialized
INFO - New video stream session started: 123e4567-e89b-12d3-a456-426614174000
INFO - Session 123e4567: 30 frames, 14.50 FPS
INFO - Processed frame #50 in 12.34ms
```

## Development

### Adding New Processing Features

1. **Extend HairProcessor**: Add new methods to `hair_processor.py`
2. **Update Metadata**: Modify proto files if new data fields needed
3. **Add Tests**: Create unit tests for new processing functions
4. **Performance Testing**: Benchmark new features for real-time requirements

### Code Structure

```python
class HairProcessor:
    async def process_frame(self, frame_data, format, metadata):
        # Main processing pipeline
        
    async def _placeholder_processing(self, frame_data, format, metadata):
        # Current placeholder implementation
        
    # TODO: Replace with actual ML implementations
    async def analyze_hair_health(self, image):
    async def detect_hair_style(self, image):
    async def suggest_improvements(self, analysis_results):
```

## Troubleshooting

### Common Issues

**Import Errors**
```bash
# Regenerate proto files
./generate_proto.sh
```

**Performance Issues**
- Check image size and quality settings
- Monitor memory usage during processing
- Verify OpenCV installation

**gRPC Connection Issues**
- Ensure port 50051 is available
- Check firewall settings
- Verify proto file compatibility with gateway

### Debug Mode

Enable detailed logging:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Health Check

Test service health:

```bash
# Using grpcurl (install: go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest)
grpcurl -plaintext localhost:50051 video_processing.VideoProcessingService/HealthCheck
```

Expected response:
```json
{
  "status": "SERVING",
  "message": "Hair service is healthy"
}
```

## Future Enhancements

### Planned ML Features

1. **Real-time Hair Segmentation**
   - Use computer vision models to isolate hair regions
   - Support for different hair types and colors

2. **Style Transfer**
   - Apply different hair styles virtually
   - Color transformation and highlights

3. **Damage Assessment**
   - Analyze hair health from image data
   - Detect split ends, breakage, and texture issues

4. **Personalized Recommendations**
   - AI-powered product suggestions
   - Custom hair care routines

### Performance Optimizations

1. **Model Optimization**
   - Use TensorRT or ONNX for faster inference
   - Implement model quantization

2. **Batch Processing**
   - Process multiple frames together
   - GPU acceleration with CUDA

3. **Caching**
   - Cache processed results for similar frames
   - Implement smart frame skipping

## Contributing

1. Follow PEP 8 style guidelines
2. Add type hints to new functions
3. Include unit tests for new features
4. Update documentation for API changes
5. Test performance impact of changes
### For compile `.proto` files 
```bash
#make sure you are in virtual environment 
# Also make sure you are at growup/server.
pip install grpc_tools
python3 -m grpc_tools.protoc --proto_path=proto --python_out=services/hairService/ --grpc_python_out=services/hairService  proto/will_be_some_proto_file.proto 
```