import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../store';
import { cancelProcessing } from '../../store/slices/hairTryOnSlice';

interface VideoProcessingStatusProps {
  onCancel?: () => void;
  onComplete?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const VideoProcessingStatus: React.FC<VideoProcessingStatusProps> = ({
  onCancel,
  onComplete,
}) => {
  const dispatch = useAppDispatch();
  const { videoProcessing, processingStatus } = useAppSelector(
    (state) => state.hairTryOn
  );
  
  const [animatedValue] = useState(new Animated.Value(0));
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate progress bar
    if (processingStatus?.progress) {
      Animated.timing(animatedValue, {
        toValue: processingStatus.progress / 100,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [processingStatus?.progress]);

  useEffect(() => {
    // Animate loading dots
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle completion
    if (processingStatus?.status === 'completed' && videoProcessing.result) {
      onComplete?.();
    }
  }, [processingStatus?.status, videoProcessing.result]);

  const handleCancel = async () => {
    if (processingStatus?.sessionId) {
      try {
        await dispatch(cancelProcessing(processingStatus.sessionId)).unwrap();
        onCancel?.();
      } catch (error) {
        console.error('Failed to cancel processing:', error);
      }
    } else {
      onCancel?.();
    }
  };

  const getStatusMessage = () => {
    if (!processingStatus) {
      return 'Initializing processing...';
    }

    switch (processingStatus.status) {
      case 'processing':
        return 'Processing your video';
      case 'completed':
        return 'Processing complete!';
      case 'failed':
        return 'Processing failed';
      case 'cancelled':
        return 'Processing cancelled';
      default:
        return 'Preparing to process';
    }
  };

  const getStatusIcon = () => {
    if (!processingStatus) {
      return 'hourglass-outline';
    }

    switch (processingStatus.status) {
      case 'processing':
        return 'cog-outline';
      case 'completed':
        return 'checkmark-circle';
      case 'failed':
        return 'alert-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'hourglass-outline';
    }
  };

  const getStatusColor = () => {
    if (!processingStatus) {
      return '#6B7280';
    }

    switch (processingStatus.status) {
      case 'processing':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isProcessing = processingStatus?.status === 'processing' || videoProcessing.isProcessing;
  const progress = processingStatus?.progress || 0;
  const estimatedTime = processingStatus?.estimatedTimeRemaining;

  return (
    <View className="flex-1 justify-center items-center bg-white px-8">
      {/* Status Icon */}
      <View className="mb-8">
        <View
          className="w-24 h-24 rounded-full items-center justify-center"
          style={{ backgroundColor: `${getStatusColor()}20` }}
        >
          <Ionicons
            name={getStatusIcon()}
            size={48}
            color={getStatusColor()}
          />
        </View>
      </View>

      {/* Status Message */}
      <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
        {getStatusMessage()}{isProcessing ? dots : ''}
      </Text>

      {/* Progress Information */}
      {isProcessing && (
        <View className="w-full mb-8">
          {/* Progress Bar */}
          <View className="w-full h-2 bg-gray-200 rounded-full mb-4">
            <Animated.View
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }}
            />
          </View>

          {/* Progress Text */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">
              {progress.toFixed(0)}% complete
            </Text>
            {estimatedTime && (
              <Text className="text-sm text-gray-600">
                ~{formatTime(estimatedTime)} remaining
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Error Message */}
      {processingStatus?.status === 'failed' && processingStatus.error && (
        <View className="w-full mb-8 p-4 bg-red-50 rounded-lg">
          <Text className="text-red-800 text-center">
            {processingStatus.error}
          </Text>
        </View>
      )}

      {/* Processing Details */}
      {isProcessing && (
        <View className="w-full mb-8 p-4 bg-gray-50 rounded-lg">
          <Text className="text-gray-700 text-sm text-center mb-2">
            Applying hairstyle using AI model
          </Text>
          <Text className="text-gray-500 text-xs text-center">
            This may take a few moments depending on video length
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View className="w-full">
        {isProcessing ? (
          <TouchableOpacity
            onPress={handleCancel}
            className="w-full py-3 px-6 bg-red-600 rounded-lg"
          >
            <Text className="text-white font-semibold text-center">
              Cancel Processing
            </Text>
          </TouchableOpacity>
        ) : processingStatus?.status === 'failed' ? (
          <View className="space-y-3">
            <TouchableOpacity
              onPress={onCancel}
              className="w-full py-3 px-6 bg-blue-600 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">
                Try Again
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              className="w-full py-3 px-6 bg-gray-300 rounded-lg"
            >
              <Text className="text-gray-700 font-semibold text-center">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        ) : processingStatus?.status === 'completed' ? (
          <TouchableOpacity
            onPress={onComplete}
            className="w-full py-3 px-6 bg-green-600 rounded-lg"
          >
            <Text className="text-white font-semibold text-center">
              View Result
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onCancel}
            className="w-full py-3 px-6 bg-gray-300 rounded-lg"
          >
            <Text className="text-gray-700 font-semibold text-center">
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default VideoProcessingStatus;