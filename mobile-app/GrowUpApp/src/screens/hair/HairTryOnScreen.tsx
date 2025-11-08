import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setSelectedMode,
  setVideoProcessingData,
  clearVideoProcessingResult,
  processVideo,
  setShowHistory,
  clearAllState,
} from '../../store/slices/hairTryOnSlice';
import {
  VideoCapture,
  HairstyleSelector,
  VideoProcessingStatus,
  RealTimeCameraPreview,
  VideoResultPlayer,
  HairTryOnHistory,
} from '../../components/hair';

type ScreenState = 
  | 'mode-selection'
  | 'style-selection'
  | 'video-capture'
  | 'video-processing'
  | 'video-result'
  | 'realtime-preview'
  | 'history';

export const HairTryOnScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedMode, videoProcessing, showHistory } = useAppSelector(
    (state) => state.hairTryOn
  );
  
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('mode-selection');
  const [selectedStyleUri, setSelectedStyleUri] = useState<string>('');
  const [selectedStyleName, setSelectedStyleName] = useState<string>('');
  const [selectedColorUri, setSelectedColorUri] = useState<string>('');
  const [recordedVideoUri, setRecordedVideoUri] = useState<string>('');

  useEffect(() => {
    // Handle navigation based on processing state
    if (videoProcessing.isProcessing && currentScreen !== 'video-processing') {
      setCurrentScreen('video-processing');
    } else if (videoProcessing.result && currentScreen === 'video-processing') {
      setCurrentScreen('video-result');
    }
  }, [videoProcessing.isProcessing, videoProcessing.result]);

  useEffect(() => {
    // Handle history navigation
    if (showHistory) {
      setCurrentScreen('history');
    }
  }, [showHistory]);

  const handleModeSelection = (mode: 'video' | 'realtime') => {
    dispatch(setSelectedMode(mode));
    setCurrentScreen('style-selection');
  };

  const handleStyleSelection = (styleUri: string, styleName?: string) => {
    setSelectedStyleUri(styleUri);
    setSelectedStyleName(styleName || 'Selected Style');
    
    if (selectedMode === 'video') {
      setCurrentScreen('video-capture');
    } else {
      setCurrentScreen('realtime-preview');
    }
  };

  const handleColorSelection = (colorUri: string) => {
    setSelectedColorUri(colorUri);
  };

  const handleVideoRecorded = (videoUri: string) => {
    setRecordedVideoUri(videoUri);
    startVideoProcessing(videoUri);
  };

  const startVideoProcessing = async (videoUri: string) => {
    try {
      // Prepare form data
      const videoFormData = new FormData();
      videoFormData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      } as any);

      const styleFormData = new FormData();
      styleFormData.append('styleImage', {
        uri: selectedStyleUri,
        type: 'image/jpeg',
        name: 'style.jpg',
      } as any);

      let colorFormData: FormData | undefined;
      if (selectedColorUri) {
        colorFormData = new FormData();
        colorFormData.append('colorImage', {
          uri: selectedColorUri,
          type: 'image/jpeg',
          name: 'color.jpg',
        } as any);
      }

      // Store processing data
      dispatch(setVideoProcessingData({
        video: videoUri,
        styleImage: selectedStyleUri,
        colorImage: selectedColorUri,
      }));

      // Start processing
      await dispatch(processVideo({
        videoFormData,
        styleImageFormData: styleFormData,
        colorImageFormData: colorFormData,
      })).unwrap();

    } catch (error) {
      console.error('Video processing failed:', error);
      Alert.alert(
        'Processing Failed',
        'Failed to process your video. Please try again.',
        [
          { text: 'OK', onPress: () => setCurrentScreen('video-capture') }
        ]
      );
    }
  };

  const handleBackNavigation = () => {
    switch (currentScreen) {
      case 'style-selection':
        setCurrentScreen('mode-selection');
        break;
      case 'video-capture':
      case 'realtime-preview':
        setCurrentScreen('style-selection');
        break;
      case 'video-processing':
        // Allow going back to cancel processing
        setCurrentScreen('video-capture');
        break;
      case 'video-result':
        setCurrentScreen('mode-selection');
        dispatch(clearVideoProcessingResult());
        break;
      case 'history':
        dispatch(setShowHistory(false));
        setCurrentScreen('mode-selection');
        break;
      default:
        setCurrentScreen('mode-selection');
    }
  };

  const handleReset = () => {
    dispatch(clearAllState());
    setCurrentScreen('mode-selection');
    setSelectedStyleUri('');
    setSelectedStyleName('');
    setSelectedColorUri('');
    setRecordedVideoUri('');
  };

  const renderModeSelection = () => (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Hair Try-On</Text>
        <TouchableOpacity
          onPress={() => dispatch(setShowHistory(true))}
          className="p-2"
        >
          <Ionicons name="time-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Mode Selection */}
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Choose Your Experience
        </Text>
        <Text className="text-gray-600 text-center mb-12">
          Try different hairstyles with our AI-powered technology
        </Text>

        {/* Video Mode */}
        <TouchableOpacity
          onPress={() => handleModeSelection('video')}
          className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl"
        >
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-4">
              <Ionicons name="videocam" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Video Mode
              </Text>
              <Text className="text-blue-600 text-sm">
                Record & Process
              </Text>
            </View>
          </View>
          <Text className="text-gray-600 text-sm">
            Record a short video and see how different hairstyles look on you.
            Perfect for trying multiple styles and sharing results.
          </Text>
        </TouchableOpacity>

        {/* Real-time Mode */}
        <TouchableOpacity
          onPress={() => handleModeSelection('realtime')}
          className="p-6 bg-green-50 border-2 border-green-200 rounded-xl"
        >
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 bg-green-600 rounded-full items-center justify-center mr-4">
              <Ionicons name="camera" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Live Mode
              </Text>
              <Text className="text-green-600 text-sm">
                Real-time Preview
              </Text>
            </View>
          </View>
          <Text className="text-gray-600 text-sm">
            See hairstyles applied instantly through your camera.
            Great for quick previews and live demonstrations.
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderStyleSelection = () => (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity onPress={handleBackNavigation} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          Select Hairstyle
        </Text>
        <TouchableOpacity
          onPress={handleReset}
          className="p-2"
        >
          <Ionicons name="refresh" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Style Selector */}
      <HairstyleSelector
        onStyleSelected={handleStyleSelection}
        onColorSelected={handleColorSelection}
        selectedStyle={selectedStyleUri}
        selectedColor={selectedColorUri}
        allowCustomUpload={true}
      />

      {/* Continue Button */}
      {selectedStyleUri && (
        <View className="p-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={() => handleStyleSelection(selectedStyleUri, selectedStyleName)}
            className="w-full py-3 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-semibold text-center">
              Continue with {selectedStyleName}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );

  // Render appropriate screen based on current state
  switch (currentScreen) {
    case 'mode-selection':
      return renderModeSelection();
      
    case 'style-selection':
      return renderStyleSelection();
      
    case 'video-capture':
      return (
        <VideoCapture
          onVideoRecorded={handleVideoRecorded}
          onClose={handleBackNavigation}
          maxDuration={10}
        />
      );
      
    case 'video-processing':
      return (
        <VideoProcessingStatus
          onCancel={handleBackNavigation}
          onComplete={() => setCurrentScreen('video-result')}
        />
      );
      
    case 'video-result':
      return videoProcessing.result ? (
        <VideoResultPlayer
          result={videoProcessing.result}
          onClose={handleBackNavigation}
          onSave={() => {
            // Handle save completion
            Alert.alert('Success', 'Video saved to your gallery!');
          }}
        />
      ) : null;
      
    case 'realtime-preview':
      return (
        <RealTimeCameraPreview
          styleImageUri={selectedStyleUri}
          onClose={handleBackNavigation}
        />
      );
      
    case 'history':
      return (
        <HairTryOnHistory
          onClose={() => {
            dispatch(setShowHistory(false));
            setCurrentScreen('mode-selection');
          }}
        />
      );
      
    default:
      return renderModeSelection();
  }
};

export default HairTryOnScreen;