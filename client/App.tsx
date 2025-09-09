import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { useVideoProcessing } from './src/hooks/useVideoProcessing';
import { useAppSelector } from './src/hooks/redux';
import { ConnectionConfig } from './src/components/ConnectionConfig';
import config from './src/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function CameraApp() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [showConnectionConfig, setShowConnectionConfig] = useState(false);

  // Use video processing hook
  const { 
    cameraRef,
    startVideoProcessing, 
    stopVideoProcessing,
    isRecording,
    isProcessing,
    processedFrame,
    originalFrame,
    frameCount,
    fps,
    connectionStatus,
    error
  } = useVideoProcessing();

  // Get connection state from Redux
  const isConnected = connectionStatus === 'connected';

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    // Show connection config if connection fails and not already showing
    if (connectionStatus === 'error' && !showConnectionConfig) {
      setTimeout(() => setShowConnectionConfig(true), 3000);
    }
  }, [connectionStatus, showConnectionConfig]);

  useEffect(() => {
    // Start video processing when camera becomes active
    if (isCameraActive && !isRecording) {
      startVideoProcessing();
    } else if (!isCameraActive && isRecording) {
      stopVideoProcessing();
    }

    return () => {
      if (isRecording) {
        stopVideoProcessing();
      }
    };
  }, [isCameraActive, isRecording, startVideoProcessing, stopVideoProcessing]);

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function toggleCamera() {
    setIsCameraActive(current => !current);
  }

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <View style={styles.container}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isCameraActive ? (
        <View style={styles.dualPreviewContainer}>
          {/* Main processed video view */}
          <View style={styles.processedVideoContainer}>
            {processedFrame ? (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${processedFrame}` }} 
                style={styles.processedVideo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Processed Video</Text>
                <Text style={styles.placeholderSubText}>
                  {isConnected ? 'Processing...' : 'Connecting...'}
                </Text>
              </View>
            )}
            
            {/* Processing overlay */}
            <View style={styles.processedOverlay}>
              <Text style={styles.processedOverlayText}>
                {isProcessing ? 'Face Anonymization Active' : 'Ready'}
              </Text>
              <Text style={styles.statsText}>
                Frames: {frameCount} | FPS: {fps.toFixed(1)} | {connectionStatus}
              </Text>
              {!isConnected && (
                <Text style={styles.tunnelHint}>
                  Connection failed? Tap Config to update WebSocket URL
                </Text>
              )}
            </View>
          </View>

          {/* Small live camera preview */}
          <View style={styles.liveCameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.liveCamera}
              facing={facing}
              mode="video"
            />
            <View style={styles.liveCameraOverlay}>
              <Text style={styles.liveCameraText}>Live</Text>
            </View>
          </View>

          {/* Control buttons */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <Text style={styles.controlButtonText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
              <Text style={styles.controlButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => setShowConnectionConfig(true)}>
              <Text style={styles.controlButtonText}>Config</Text>
            </TouchableOpacity>
          </View>
          
          {/* Error display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>Camera is closed</Text>
          <Text style={styles.previewSubText}>Tap 'Open Camera' to start video feed</Text>
          {processedFrame && (
            <Image source={{ uri: `data:image/jpeg;base64,${processedFrame}` }} style={styles.processedImage} />
          )}
          <TouchableOpacity style={styles.openButton} onPress={toggleCamera}>
            <Text style={styles.openButtonText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Connection Configuration Modal */}
      {showConnectionConfig && (
        <ConnectionConfig onClose={() => setShowConnectionConfig(false)} />
      )}
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Dual preview layout styles
  dualPreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  processedVideoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processedVideo: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSubText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  processedOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
  },
  processedOverlayText: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statsText: {
    color: '#ccc',
    fontSize: 14,
  },
  tunnelHint: {
    color: '#ffaa00',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  // Live camera preview styles
  liveCameraContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: screenWidth * 0.3,
    height: screenWidth * 0.4,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00ff00',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  liveCamera: {
    flex: 1,
  },
  liveCameraOverlay: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,255,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  liveCameraText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Control styles
  controlsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Error styles
  errorContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  // Legacy styles (keeping for camera-closed state)
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 50,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  previewText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewSubText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  openButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
  },
  openButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  processedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 20,
  },
});

export default function App() {
  return (
    <Provider store={store}>
      <CameraApp />
    </Provider>
  );
}
