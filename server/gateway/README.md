# Gateway Service

Node.js WebSocket gateway that bridges React Native clients with the Python hair processing service via gRPC.

## Features

- WebSocket server for real-time client communication
- gRPC client for backend service communication
- Session management with automatic cleanup
- Connection health monitoring
- Error handling and automatic reconnection
- Performance monitoring and logging

## Installation

```bash
yarn install
```

## Configuration

Create a `.env` file:

```env
PORT=8080
GRPC_HOST=localhost
GRPC_PORT=50051
NODE_ENV=development
```

## Running

### Development
```bash
yarn dev
```

### Production
```bash
yarn start
```

## API Endpoints

### HTTP Endpoints

- `GET /health` - Health check endpoint
- `GET /ws-info` - WebSocket connection information

### WebSocket

Connect to `ws://localhost:8080` to start video processing.

## Message Types

### Incoming (from client)

#### video_frame
```json
{
  "type": "video_frame",
  "data": {
    "frameData": "base64_image",
    "format": "jpeg",
    "timestamp": 1234567890,
    "width": 1920,
    "height": 1080,
    "cameraFacing": "back",
    "quality": 0.85
  }
}
```

#### ping
```json
{
  "type": "ping",
  "data": { "timestamp": 1234567890 }
}
```

### Outgoing (to client)

#### connection_established
```json
{
  "type": "connection_established",
  "data": {
    "sessionId": "uuid",
    "timestamp": 1234567890
  }
}
```

#### processed_frame
```json
{
  "type": "processed_frame", 
  "data": {
    "sessionId": "uuid",
    "frameData": "base64_processed_image",
    "format": "jpeg",
    "timestamp": 1234567890,
    "metadata": {}
  }
}
```

#### pong
```json
{
  "type": "pong",
  "data": { "timestamp": 1234567890 }
}
```

#### error
```json
{
  "type": "error",
  "data": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": 1234567890
  }
}
```

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    gRPC Stream    ┌─────────────────┐
│  React Native   │ <──────────────> │   Gateway       │ <──────────────> │  Hair Service   │
│     Client      │                 │    Server       │                 │   (Python)      │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## Performance Optimizations

- **Connection Management**: Automatic cleanup of inactive sessions
- **Frame Queue**: Limited queue size to prevent memory issues  
- **gRPC Configuration**: Optimized keep-alive and message size settings
- **Error Recovery**: Automatic reconnection with exponential backoff

## Monitoring

The gateway provides real-time monitoring of:

- Active sessions count
- WebSocket connection status
- gRPC stream health
- Frame processing statistics
- Network latency metrics

## Development

### File Structure

```
src/
├── server.js           # Main server and WebSocket handling
├── grpc-client.js      # gRPC client implementation
├── session-manager.js  # Session lifecycle management
└── utils/
    ├── logger.js       # Logging utilities
    └── validation.js   # Input validation
```

### Adding New Features

1. **New Message Types**: Add handlers in `server.js`
2. **gRPC Methods**: Extend `grpc-client.js`
3. **Validation Rules**: Update `utils/validation.js`
4. **Monitoring**: Add metrics to session manager

## Troubleshooting

### Common Issues

**WebSocket Connection Failed**
- Check if port 8080 is available
- Verify firewall settings
- Check client connection URL

**gRPC Service Unavailable**  
- Ensure hair service is running on port 50051
- Check network connectivity
- Verify proto file compatibility

**High Memory Usage**
- Monitor session count in logs
- Check for memory leaks in frame processing
- Verify session cleanup is working

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```bash
NODE_ENV=development yarn dev
```

## Health Checks

Monitor service health:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "sessions": 2
}
```
