# GlowUp Client - React Native Expo App

This is the React Native Expo client for the GlowUp real-time video processing system.

## Features

### 🎥 Dual Video Preview
- **Main Screen**: Large processed video with face anonymization from the server
- **Live Preview**: Small overlay showing the raw camera feed
- **Real-time Processing**: Streams camera frames to the server at 15 FPS
- **Visual Feedback**: Connection status, FPS counter, and frame count

### 📱 Camera Controls
- **Camera Flip**: Toggle between front and back cameras
- **Camera Toggle**: Open/close camera view
- **Smart Layout**: Responsive design for different screen sizes

### 🔗 Real-time Communication
- **WebSocket Connection**: Maintains persistent connection to the gateway
- **Redux State Management**: Centralized state for video and connection data
- **Error Handling**: Graceful error handling and reconnection logic

## UI Layout

When the camera is active, you'll see:
1. **Main processed video** (full screen) - Shows face-anonymized video from server
2. **Live camera preview** (small overlay, top-right) - Raw camera feed
3. **Status overlay** (top) - Processing status and statistics
4. **Control buttons** (bottom) - Flip camera and close camera options

## Installation

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## Configuration

The app connects to the WebSocket gateway at `ws://localhost:8080` by default. You can modify this in the Redux connection slice.

## Performance

- **Frame Rate**: Captures at 15 FPS for optimal real-time performance
- **Image Quality**: Configurable compression (default 80%)
- **Latency Monitoring**: Real-time latency tracking and display

## Tech Stack

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and toolkit
- **Redux Toolkit**: State management
- **expo-camera**: Camera access and controls
- **WebSocket**: Real-time communication
- **TypeScript**: Type safety and better development experience
