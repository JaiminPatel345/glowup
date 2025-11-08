import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchHairTryOnHistory,
  deleteHairTryOn,
  setShowHistory,
} from '../../store/slices/hairTryOnSlice';
import { HairTryOnHistory as HairTryOnHistoryType } from '../../store/slices/hairTryOnSlice';
import VideoResultPlayer from './VideoResultPlayer';

const { width: screenWidth } = Dimensions.get('window');
const itemWidth = (screenWidth - 48) / 2; // 2 columns with padding

interface HairTryOnHistoryProps {
  onClose: () => void;
}

export const HairTryOnHistory: React.FC<HairTryOnHistoryProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { history, historyLoading, historyError } = useAppSelector(
    (state) => state.hairTryOn
  );
  
  const [selectedItem, setSelectedItem] = useState<HairTryOnHistoryType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      await dispatch(fetchHairTryOnHistory()).unwrap();
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleDeleteItem = (item: HairTryOnHistoryType) => {
    Alert.alert(
      'Delete Hair Try-On',
      'Are you sure you want to delete this hair try-on result?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteHairTryOn(item.id)).unwrap();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item: HairTryOnHistoryType) => {
    setSelectedItem(item);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderHistoryItem = ({ item }: { item: HairTryOnHistoryType }) => (
    <TouchableOpacity
      onPress={() => handleItemPress(item)}
      className="mb-4 bg-white rounded-lg shadow-sm"
      style={{ width: itemWidth }}
    >
      {/* Thumbnail */}
      <View className="relative">
        <Image
          source={{ uri: item.resultMediaUrl }}
          className="w-full h-32 rounded-t-lg"
          resizeMode="cover"
        />
        
        {/* Type Badge */}
        <View className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded">
          <Text className="text-white text-xs font-medium">
            {item.type === 'video' ? 'Video' : 'Live'}
          </Text>
        </View>

        {/* Play Icon for Videos */}
        {item.type === 'video' && (
          <View className="absolute inset-0 justify-center items-center">
            <View className="p-2 bg-black/50 rounded-full">
              <Ionicons name="play" size={20} color="white" />
            </View>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          onPress={() => handleDeleteItem(item)}
          className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
        >
          <Ionicons name="trash" size={12} color="white" />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View className="p-3">
        <Text className="text-gray-800 text-sm font-medium mb-1">
          {formatDate(item.createdAt)}
        </Text>
        
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-500 text-xs">
            {Math.round(item.processingMetadata.processingTime / 1000)}s
          </Text>
          <Text className="text-gray-500 text-xs">
            {item.processingMetadata.framesProcessed} frames
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <Ionicons name="videocam-outline" size={64} color="#9CA3AF" />
      <Text className="text-gray-500 text-lg font-medium mt-4 text-center">
        No Hair Try-Ons Yet
      </Text>
      <Text className="text-gray-400 text-sm mt-2 text-center">
        Start creating hair try-on videos to see them here
      </Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 justify-center items-center px-8">
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text className="text-red-500 text-lg font-medium mt-4 text-center">
        Failed to Load History
      </Text>
      <Text className="text-gray-500 text-sm mt-2 text-center">
        {historyError}
      </Text>
      <TouchableOpacity
        onPress={loadHistory}
        className="mt-4 px-6 py-2 bg-blue-600 rounded-lg"
      >
        <Text className="text-white font-medium">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (selectedItem) {
    return (
      <VideoResultPlayer
        result={{
          resultVideoUrl: selectedItem.resultMediaUrl,
          processingMetadata: selectedItem.processingMetadata,
        }}
        onClose={() => setSelectedItem(null)}
        onSave={() => {
          setSelectedItem(null);
          // Optionally show success message
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 pt-12 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={onClose} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <Text className="text-gray-900 text-lg font-semibold">
          Hair Try-On History
        </Text>
        
        <TouchableOpacity onPress={handleRefresh} className="p-2">
          <Ionicons name="refresh" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {historyError ? (
        renderError()
      ) : history.length === 0 && !historyLoading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32,
          }}
          columnWrapperStyle={{
            justifyContent: 'space-between',
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default HairTryOnHistory;