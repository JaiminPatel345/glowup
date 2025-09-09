# GlowUp - Real-time Video Processing App

A real-time video processing application built with React Native (client), Node.js (gateway), and Python (hair processing service) using WebSocket and gRPC for low-latency communication.

## Architecture

```
[React Native Client] <--WebSocket--> [Node.js Gateway] <--gRPC--> [Python Hair Service]
```

### Components

- **Client**: React Native Expo app with camera and real-time video display
- **Gateway**: Node.js WebSocket server that manages client connections and gRPC communication
- **Hair Service**: Python service with ML processing capabilities (currently placeholder)

## Features

- 📱 Real-time camera feed from React Native app
- 🔄 Live video frame processing
- ⚡ Low-latency WebSocket communication
- 🚀 gRPC streaming for high-performance backend communication
- 📊 Redux state management
- 🔄 Automatic reconnection and error handling
- 📈 Performance monitoring (FPS, latency, frame count)

## ✨ Features

### Face Anonymization
- **Real-time face detection**: Uses MediaPipe for accurate face detection
- **Privacy protection**: Automatically blurs detected faces in processed video
- **High performance**: Optimized for real-time processing with minimal latency

### Dual Video Preview
- **Live camera feed**: Small overlay showing the raw camera input
- **Processed video**: Main screen displays the face-anonymized video from the server
- **Real-time stats**: Shows FPS, frame count, and connection status
- **Seamless switching**: Easy camera controls for flip and close operations

### Technical Stack
```

## Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Python 3.8+
- Expo CLI
- Mobile device or simulator

### 1. Install Dependencies

```bash
# Install client dependencies
cd client
yarn install

# Install gateway dependencies
cd server/gateway
yarn install

# Install Python service dependencies
cd server/services/hairService
pip install -r requirements.txt
```

### 2. Generate Proto Files

```bash
# Generate Python gRPC files
cd server/services/hairService
./generate_proto.sh
```

### 3. Start Services

Open 3 terminal windows:

**Terminal 1 - Hair Service:**
```bash
cd server/services/hairService
python app.py
```

**Terminal 2 - Gateway:**
```bash
cd server/gateway
yarn dev
```

**Terminal 3 - Client:**
```bash
cd client
npx expo start
```

### 4. Test the App

1. Scan QR code with Expo Go app or run on simulator
2. Allow camera permissions
3. The app will automatically connect to the gateway
4. Video frames will be processed in real-time

## Development

### Project Structure

```
glowup/
├── client/                 # React Native app
│   ├── src/
│   │   ├── store/         # Redux store
│   │   ├── services/      # WebSocket service
│   │   └── hooks/         # Custom hooks
│   ├── App.tsx           # Main app component
│   └── package.json
├── server/
│   ├── gateway/          # Node.js gateway
│   │   ├── src/
│   │   │   ├── server.js        # Main server
│   │   │   ├── grpc-client.js   # gRPC client
│   │   │   ├── session-manager.js
│   │   │   └── utils/
│   │   └── package.json
│   ├── services/
│   │   └── hairService/  # Python ML service
│   │       ├── app.py           # gRPC server
│   │       ├── hair_processor.py # ML processing
│   │       └── requirements.txt
│   └── proto/           # Protocol buffer definitions
│       └── video_processing.proto
└── README.md
```

### Configuration

#### Environment Variables

**Gateway (.env):**
```
PORT=8080
GRPC_HOST=localhost
GRPC_PORT=50051
NODE_ENV=development
```

**Hair Service:**
```
GRPC_PORT=50051
LOG_LEVEL=INFO
```

### Performance Optimization

- **Frame Rate**: Configured for 15 FPS for optimal balance between quality and performance
- **Compression**: JPEG quality set to 85% for real-time processing
- **Queue Management**: Frame queue limited to 5 frames to prevent memory issues
- **gRPC Configuration**: Optimized for streaming with keep-alive settings

## API Documentation

### WebSocket Messages

#### Client → Gateway

**Video Frame:**
```json
{
  "type": "video_frame",
  "data": {
    "frameData": "base64_encoded_image",
    "format": "jpeg",
    "timestamp": 1234567890,
    "width": 1920,
    "height": 1080,
    "cameraFacing": "back",
    "quality": 0.85
  }
}
```

**Ping:**
```json
{
  "type": "ping",
  "data": { "timestamp": 1234567890 }
}
```

#### Gateway → Client

**Processed Frame:**
```json
{
  "type": "processed_frame",
  "data": {
    "sessionId": "uuid",
    "frameData": "base64_encoded_processed_image",
    "format": "jpeg",
    "timestamp": 1234567890,
    "metadata": {}
  }
}
```

**Connection Established:**
```json
{
  "type": "connection_established",
  "data": {
    "sessionId": "uuid",
    "timestamp": 1234567890
  }
}
```

### gRPC API

See `server/proto/video_processing.proto` for complete API definition.

## Troubleshooting

### Common Issues

1. **Connection Failed**: Ensure all services are running and ports are available
2. **Permission Denied**: Grant camera permissions in the mobile app
3. **Frame Processing Slow**: Check network connection and server performance
4. **gRPC Errors**: Verify Python service is running and accessible

### Logs

- **Gateway**: Check console output for WebSocket and gRPC connection logs
- **Hair Service**: Python logs show frame processing statistics
- **Client**: Use React Native debugger for client-side issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
A grooming app.
