import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setRealTimeActive,
  setWebSocketConnected,
  setWebSocketError,
  startRealTimeSession,
} from '../../store/slices/hairTryOnSlice';
import { webSocketManager } from '../../utils/webSocketClient';

interface RealTimeCameraPreviewProps {
  styleImageUri: string;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const RealTimeCameraPreview: React.FC<RealTimeCameraPreviewProps> = ({
  styleImageUri,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { realTime } = useAppSelector((state) => state.hairTryOn);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.front);
  const [isInitializing, setIsInitializing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestPermissions();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Handle WebSocket connection changes
    if (realTime.webSocket.isConnected && realTime.isActive) {
      startFrameCapture();
    } else {
      stopFrameCapture();
    }
  }, [realTime.webSocket.isConnected, realTime.isActive]);

  const requestPermissions = async () => {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraPermission.status === 'granted');
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to use real-time hair try-on.',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Settings', onPress: () => {/* Open settings */} }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const startRealTimeSession = async () => {
    try {
      setIsInitializing(true);
      
      // Create FormData with style image
      const formData = new FormData();
      formData.append('styleImage', {
        uri: styleImageUri,
        type: 'image/jpeg',
        name: 'style.jpg',
      } as any);

      // Start WebSocket session
      const connectionInfo = await dispatch(startRealTimeSession(formData)).unwrap();
      
      // Create WebSocket client
      const wsClient = webSocketManager.createClient(
        connectionInfo.url,
        connectionInfo.sessionId
      );
      
      // Connect to WebSocket
      await wsClient.connect();
      
      dispatch(setRealTimeActive(true));
    } catch (error) {
      console.error('Failed to start real-time session:', error);
      dispatch(setWebSocketError('Failed to start real-time session'));
      Alert.alert(
        'Connection Failed',
        'Unable to start real-time hair try-on. Please check your internet connection and try again.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const stopRealTimeSession = () => {
    dispatch(setRealTimeActive(false));
    webSocketManager.disconnect();
    dispatch(setWebSocketConnected(false));
    stopFrameCapture();
  };

  const startFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    // Capture and send frames at 10 FPS (100ms interval)
    frameIntervalRef.current = setInterval(async () => {
      await captureAndSendFrame();
    }, 100);
  };

  const stopFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  const captureAndSendFrame = async () => {
    if (!cameraRef.current || !realTime.webSocket.isConnected) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Lower quality for faster processing
        base64: false,
        skipProcessing: true,
      });

      if (photo?.uri) {
        // Convert image to blob and send via WebSocket
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        
        const wsClient = webSocketManager.getCurrentClient();
        if (wsClient) {
          wsClient.sendFrame(blob);
        }
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const cleanup = () => {
    stopFrameCapture();
    stopRealTimeSession();
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 justify-center items-center bg-black px-8">
        <Ionicons name="camera-outline" size={64} color="white" />
        <Text className="text-white text-lg font-medium mt-4 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-300 text-sm mt-2 text-center">
          Please grant camera permission to use real-time hair try-on.
        </Text>
        <TouchableOpacity
          onPress={requestPermissions}
          className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
        >
          <Text className="text-white font-medium">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera View or Processed Frame */}
      <View style={{ width: screenWidth, height: screenHeight }}>
        {realTime.currentFrame ? (
          // Show processed frame from WebSocket
          <Image
            source={{ uri: realTime.currentFrame }}
            style={{
              width: screenWidth,
              height: screenHeight,
            }}
            resizeMode="cover"
          />
        ) : (
          // Show camera view
          <CameraView
            ref={cameraRef}
            style={{
              width: screenWidth,
              height: screenHeight,
            }}
            facing={cameraType}
          />
        )}

        {/* Header */}
        <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between p-4 pt-12 bg-black/50">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            {realTime.isActive && (
              <View className="flex-row items-center mr-4">
                <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                <Text className="text-white text-sm font-medium">LIVE</Text>
              </View>
            )}
            {realTime.webSocket.latency && (
              <Text className="text-white text-xs">
                {realTime.webSocket.latency}ms
              </Text>
            )}
          </View>
          
          <TouchableOpacity onPress={toggleCameraType} className="p-2">
            <Ionicons name="camera-reverse" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Style Preview */}
        <View className="absolute top-20 right-4">
          <View className="bg-black/70 p-2 rounded-lg">
            <Text className="text-white text-xs mb-2">Style:</Text>
            <Image
              source={{ uri: styleImageUri }}
              className="w-16 h-20 rounded"
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Connection Status */}
        {realTime.webSocket.error && (
          <View className="absolute bottom-32 left-4 right-4">
            <View className="bg-red-500/90 p-3 rounded-lg">
              <Text className="text-white text-sm text-center">
                {realTime.webSocket.error}
              </Text>
            </View>
          </View>
        )}

        {/* Instructions */}
        {!realTime.isActive && !isInitializing && (
          <View className="absolute bottom-32 left-4 right-4">
            <View className="bg-black/70 p-4 rounded-lg">
              <Text className="text-white text-center text-sm">
                Tap "Start Live Try-On" to see the hairstyle applied in real-time.
                Make sure you have a stable internet connection.
              </Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View className="absolute bottom-8 left-0 right-0 items-center">
          {!realTime.isActive ? (
            <TouchableOpacity
              onPress={startRealTimeSession}
              disabled={isInitializing}
              className={`px-8 py-4 rounded-full ${
                isInitializing ? 'bg-gray-600' : 'bg-blue-600'
              }`}
            >
              <Text className="text-white font-semibold">
                {isInitializing ? 'Connecting...' : 'Start Live Try-On'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={stopRealTimeSession}
              className="px-8 py-4 bg-red-600 rounded-full"
            >
              <Text className="text-white font-semibold">
                Stop Live Try-On
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default RealTimeCameraPreview;