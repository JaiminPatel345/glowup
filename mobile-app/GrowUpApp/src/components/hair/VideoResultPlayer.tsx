import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { ProcessedVideo } from '../../api/types';

interface VideoResultPlayerProps {
  result: ProcessedVideo;
  onClose: () => void;
  onSave?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const VideoResultPlayer: React.FC<VideoResultPlayerProps> = ({
  result,
  onClose,
  onSave,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef<Video>(null);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSaveToGallery = async () => {
    try {
      setIsSaving(true);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to save videos to your gallery.'
        );
        return;
      }

      // Download the video file
      const fileUri = FileSystem.documentDirectory + 'hair_tryon_result.mp4';
      const downloadResult = await FileSystem.downloadAsync(
        result.resultVideoUrl,
        fileUri
      );

      if (downloadResult.status === 200) {
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        
        Alert.alert(
          'Success',
          'Video saved to your gallery!',
          [{ text: 'OK', onPress: onSave }]
        );
      } else {
        throw new Error('Failed to download video');
      }
    } catch (error) {
      console.error('Error saving video:', error);
      Alert.alert(
        'Error',
        'Failed to save video. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);

      if (Platform.OS === 'ios') {
        // On iOS, we can share the URL directly
        await Share.share({
          url: result.resultVideoUrl,
          message: 'Check out my new hairstyle from GrowUp!',
        });
      } else {
        // On Android, we need to download first
        const fileUri = FileSystem.documentDirectory + 'hair_tryon_share.mp4';
        const downloadResult = await FileSystem.downloadAsync(
          result.resultVideoUrl,
          fileUri
        );

        if (downloadResult.status === 200) {
          await Share.share({
            url: downloadResult.uri,
            message: 'Check out my new hairstyle from GrowUp!',
          });
        } else {
          throw new Error('Failed to download video for sharing');
        }
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      Alert.alert(
        'Error',
        'Failed to share video. Please try again.'
      );
    } finally {
      setIsSharing(false);
    }
  };

  const formatProcessingTime = (timeInMs: number): string => {
    const seconds = Math.round(timeInMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 pt-12 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <TouchableOpacity
          onPress={onClose}
          className="p-2 rounded-full bg-black/30"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-semibold">
          Hair Try-On Result
        </Text>
        
        <View className="w-10" />
      </View>

      {/* Video Player */}
      <View className="flex-1 justify-center items-center">
        <Video
          ref={videoRef}
          source={{ uri: result.resultVideoUrl }}
          style={{
            width: screenWidth,
            height: screenWidth * (16 / 9), // 16:9 aspect ratio
            maxHeight: screenHeight * 0.6,
          }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={true}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying || false);
            }
          }}
        />

        {/* Play/Pause Button Overlay */}
        <TouchableOpacity
          onPress={handlePlayPause}
          className="absolute p-4 rounded-full bg-black/50"
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Processing Info */}
      <View className="px-4 py-2 bg-gray-900">
        <Text className="text-gray-300 text-sm text-center">
          Processing Time: {formatProcessingTime(result.processingMetadata.processingTime)} • 
          Frames: {result.processingMetadata.framesProcessed} • 
          Model: {result.processingMetadata.modelVersion}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row justify-around items-center p-6 bg-gray-900">
        <TouchableOpacity
          onPress={handleSaveToGallery}
          disabled={isSaving}
          className="flex-1 mx-2 py-3 px-4 bg-blue-600 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons
            name={isSaving ? 'hourglass' : 'download'}
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-semibold">
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          disabled={isSharing}
          className="flex-1 mx-2 py-3 px-4 bg-green-600 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons
            name={isSharing ? 'hourglass' : 'share'}
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-semibold">
            {isSharing ? 'Sharing...' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VideoResultPlayer;