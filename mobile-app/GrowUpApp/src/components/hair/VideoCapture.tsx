import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

interface VideoCaptureProps {
  onVideoRecorded: (videoUri: string) => void;
  onClose: () => void;
  maxDuration?: number; // in seconds
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const VideoCapture: React.FC<VideoCaptureProps> = ({
  onVideoRecorded,
  onClose,
  maxDuration = 10,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.front);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestPermissions();
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Camera.requestMicrophonePermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      
      setHasPermission(
        cameraPermission.status === 'granted' && 
        audioPermission.status === 'granted'
      );
      
      if (cameraPermission.status !== 'granted' || audioPermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and microphone permissions are required to record videos.',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Settings', onPress: () => {/* Open settings */} }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: maxDuration * 1000, // Convert to milliseconds
        quality: '720p',
      });

      if (video?.uri) {
        onVideoRecorded(video.uri);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Requesting permissions...</Text>
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
          Please grant camera and microphone permissions to record videos.
        </Text>
        <TouchableOpacity
          onPress={requestPermissions}
          className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
        >
          <Text className="text-white font-medium">Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={{
          width: screenWidth,
          height: screenHeight,
        }}
        facing={cameraType}
        mode="video"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 pt-12 bg-black/50">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            {isRecording && (
              <View className="flex-row items-center mr-4">
                <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                <Text className="text-white font-mono text-lg">
                  {formatTime(recordingTime)}
                </Text>
              </View>
            )}
            <Text className="text-white text-sm">
              Max: {formatTime(maxDuration)}
            </Text>
          </View>
          
          <TouchableOpacity onPress={toggleCameraType} className="p-2">
            <Ionicons name="camera-reverse" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Recording Progress */}
        {isRecording && (
          <View className="absolute top-20 left-4 right-4">
            <View className="h-1 bg-white/30 rounded-full">
              <View
                className="h-full bg-red-500 rounded-full"
                style={{
                  width: `${(recordingTime / maxDuration) * 100}%`,
                }}
              />
            </View>
          </View>
        )}

        {/* Instructions */}
        {!isRecording && (
          <View className="absolute bottom-32 left-4 right-4">
            <View className="bg-black/70 p-4 rounded-lg">
              <Text className="text-white text-center text-sm">
                Position your face in the frame and tap the record button to start.
                Maximum recording time is {maxDuration} seconds.
              </Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View className="absolute bottom-8 left-0 right-0 items-center">
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${
              isRecording ? 'bg-red-500' : 'bg-transparent'
            }`}
          >
            {isRecording ? (
              <View className="w-6 h-6 bg-white rounded" />
            ) : (
              <View className="w-16 h-16 bg-red-500 rounded-full" />
            )}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

export default VideoCapture;