# Hair Try-On Service

AI-powered hair style try-on service with video processing and real-time streaming capabilities.

## Features

- **Video Processing Mode**: Upload a video and apply hair styles with HairFastGAN or similar models
- **Real-Time Streaming Mode**: Live hair try-on through WebSocket connections with <200ms latency
- **Hair Color Application**: Optional hair color changes in addition to style transfers
- **MongoDB Integration**: Store hair try-on history and processing results
- **Performance Optimized**: Frame sampling, quality adjustment, and latency optimization
- **Comprehensive Testing**: Unit, integration, and performance tests

## Architecture

### Core Components

1. **Video Service** (`app/services/video_service.py`)
   - Video upload validation and processing
   - Frame extraction with configurable sampling rates
   - Video reconstruction from processed frames
   - Format validation and duration limits

2. **AI Service** (`app/services/ai_service.py`)
   - HairFastGAN model integration
   - Frame-by-frame hair style application
   - Optional hair color processing
   - Performance monitoring and statistics

3. **WebSocket Service** (`app/services/websocket_service.py`)
   - Real-time frame processing
   - Connection management and scaling
   - Frame dropping for latency optimization
   - Error handling and reconnection

4. **Database Service** (`app/services/database_service.py`)
   - MongoDB operations for hair try-on history
   - Processing queue management
   - Statistics and analytics
   - Data cleanup and maintenance

### API Endpoints

- `POST /api/hair/upload-video` - Upload video for processing
- `POST /api/hair/process-video` - Start video processing with style/color
- `GET /api/hair/result/{result_id}` - Get processing result
- `GET /api/hair/history/{user_id}` - Get user's hair try-on history
- `DELETE /api/hair/result/{result_id}` - Delete a result
- `WS /api/hair/realtime/{session_id}` - WebSocket for real-time processing
- `GET /api/hair/stats` - Get processing statistics
- `GET /api/hair/health` - Health check

## Installation

### Prerequisites

- Python 3.11+
- MongoDB
- OpenCV dependencies
- GPU support (optional, for better performance)

### Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB:**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   
   # Or use existing MongoDB instance
   ```

4. **Validate setup:**
   ```bash
   python validate_service.py
   ```

5. **Run tests:**
   ```bash
   python run_tests.py
   ```

6. **Start the service:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 3004
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | `growup` |
| `MAX_VIDEO_SIZE` | Maximum video file size (bytes) | `50000000` (50MB) |
| `MAX_VIDEO_DURATION` | Maximum video duration (seconds) | `10` |
| `FRAME_SAMPLING_RATE` | Frame sampling rate for processing | `0.5` (50%) |
| `TARGET_LATENCY_MS` | Target latency for real-time processing | `200` |
| `WEBSOCKET_MAX_CONNECTIONS` | Maximum WebSocket connections | `100` |
| `MODEL_PATH` | Path to AI models | `/app/models` |
| `UPLOAD_DIR` | Directory for uploaded files | `/app/uploads` |
| `TEMP_DIR` | Directory for temporary files | `/app/temp` |

### Video Processing Configuration

- **Supported formats**: MP4, AVI, MOV, WebM
- **Maximum duration**: 10 seconds (configurable)
- **Frame sampling**: 50% by default for efficiency
- **Quality optimization**: Automatic quality adjustment for latency

### WebSocket Configuration

- **Maximum connections**: 100 concurrent connections
- **Timeout**: 5 minutes of inactivity
- **Frame queue size**: 10 frames per connection
- **Latency target**: <200ms per frame

## Usage

### Video Processing Mode

1. **Upload video:**
   ```bash
   curl -X POST "http://localhost:3004/api/hair/upload-video" \
        -F "video=@test_video.mp4" \
        -F "user_id=user123"
   ```

2. **Process with hair style:**
   ```bash
   curl -X POST "http://localhost:3004/api/hair/process-video" \
        -F "upload_id=upload_id_from_step1" \
        -F "user_id=user123" \
        -F "style_image=@hairstyle.jpg" \
        -F "color_image=@hair_color.jpg"
   ```

3. **Check result:**
   ```bash
   curl "http://localhost:3004/api/hair/result/result_id?user_id=user123"
   ```

### Real-Time Mode

Connect to WebSocket endpoint and send messages:

```javascript
const ws = new WebSocket('ws://localhost:3004/api/hair/realtime/session123?user_id=user123');

// Set style image
ws.send(JSON.stringify({
    type: 'set_style_image',
    data: {
        image_data: base64_encoded_image
    }
}));

// Send frames for processing
ws.send(JSON.stringify({
    type: 'process_frame',
    data: {
        frame_id: 'frame_001',
        frame_data: base64_encoded_frame
    }
}));
```

## Testing

### Run All Tests

```bash
python run_tests.py
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/ -m unit

# Integration tests
pytest tests/ -m integration

# Performance tests
pytest tests/ -m performance

# WebSocket tests
pytest tests/ -m websocket
```

### Test Coverage

```bash
python run_tests.py --coverage
```

## Performance Optimization

### Video Processing

- **Frame sampling**: Reduce processing load by sampling frames
- **Parallel processing**: Process multiple frames concurrently
- **Memory management**: Automatic cleanup of temporary files
- **Quality adjustment**: Balance quality vs. speed based on requirements

### Real-Time Processing

- **Frame dropping**: Drop frames when queue is full to maintain latency
- **Connection pooling**: Efficient WebSocket connection management
- **Batch processing**: Group operations for better throughput
- **Resource monitoring**: Track processing times and adjust accordingly

### AI Model Optimization

- **Model quantization**: Reduce model size for faster inference
- **GPU acceleration**: Use CUDA when available
- **Caching**: Cache frequently used style transformations
- **Preprocessing**: Optimize image preprocessing pipeline

## Monitoring and Logging

### Health Checks

- Service health: `GET /api/hair/health`
- Processing statistics: `GET /api/hair/stats`
- Connection status: WebSocket connection manager stats

### Logging

- Structured logging with correlation IDs
- Performance metrics logging
- Error tracking and alerting
- Processing time monitoring

### Metrics

- Processing latency (target: <200ms)
- Success/failure rates
- Connection counts and duration
- Memory and CPU usage

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t hair-tryOn-service .

# Run container
docker run -d \
  -p 3004:3004 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017 \
  -v ./models:/app/models \
  -v ./uploads:/app/uploads \
  hair-tryOn-service
```

### Production Considerations

1. **Scaling**: Use multiple service instances behind a load balancer
2. **Storage**: Use cloud storage for uploaded videos and results
3. **Monitoring**: Set up comprehensive monitoring and alerting
4. **Security**: Implement proper authentication and rate limiting
5. **Backup**: Regular backup of MongoDB data and AI models

## Troubleshooting

### Common Issues

1. **Model loading fails**: Check model file path and permissions
2. **WebSocket connections drop**: Verify network configuration and timeouts
3. **High latency**: Check GPU availability and model optimization
4. **Memory issues**: Monitor frame processing and implement cleanup

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=true
uvicorn app.main:app --reload --log-level debug
```

### Performance Profiling

Use the performance tests to identify bottlenecks:

```bash
pytest tests/test_performance.py -v -s
```

## Contributing

1. Follow the existing code structure and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Run validation and tests before submitting
5. Follow Python PEP 8 style guidelines

## License

This service is part of the GrowUp application suite.