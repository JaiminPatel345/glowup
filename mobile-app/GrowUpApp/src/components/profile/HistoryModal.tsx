import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SkinAnalysisApi, SkinAnalysisHistorySummary } from '../../api/skin';
import { HairTryOnApi, HairTryOnHistoryItem } from '../../api/hair';
import { useTheme } from '../../context/ThemeContext';

interface HistoryModalProps {
  visible: boolean;
  initialTab?: HistoryTab;
  userId?: string;
  onClose: () => void;
}

type HistoryTab = 'skin' | 'hair';

interface HistoryState<T> {
  items: T[];
  total: number;
  nextOffset: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  initialLoaded: boolean;
  error: string | null;
}

const PAGE_SIZE = 10;

const createInitialState = <T,>(): HistoryState<T> => ({
  items: [],
  total: 0,
  nextOffset: 0,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  initialLoaded: false,
  error: null,
});

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  try {
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} • ${timePart}`;
  } catch (error) {
    return date.toISOString();
  }
};

const HistoryModal: React.FC<HistoryModalProps> = ({ visible, initialTab = 'skin', userId, onClose }) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab);
  const [skinState, setSkinState] = useState<HistoryState<SkinAnalysisHistorySummary>>(createInitialState);
  const [hairState, setHairState] = useState<HistoryState<HairTryOnHistoryItem>>(createInitialState);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const skinHasMore = useMemo(
    () => !skinState.initialLoaded || skinState.items.length < skinState.total,
    [skinState.initialLoaded, skinState.items.length, skinState.total]
  );

  const hairHasMore = useMemo(
    () => !hairState.initialLoaded || hairState.items.length < hairState.total,
    [hairState.initialLoaded, hairState.items.length, hairState.total]
  );

  const fetchSkinHistory = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!userId) {
        return;
      }

      if (!reset && !skinHasMore) {
        return;
      }

      if (skinState.isLoading || skinState.isRefreshing || skinState.isLoadingMore) {
        if (!reset) {
          return;
        }
      }

      const offset = reset ? 0 : skinState.nextOffset;

      setSkinState((prev) => ({
        ...prev,
        error: null,
        isLoading: !prev.initialLoaded || reset,
        isRefreshing: prev.initialLoaded && reset,
        isLoadingMore: prev.initialLoaded && !reset,
      }));

      try {
        const { items, total } = await SkinAnalysisApi.getAnalysisHistorySummary(userId, PAGE_SIZE, offset);
        setSkinState((prev) => {
          const mergedItems = reset
            ? items
            : [
                ...prev.items,
                ...items.filter((item) => !prev.items.some((existing) => existing.id === item.id)),
              ];

          return {
            ...prev,
            items: mergedItems,
            total,
            nextOffset: offset + items.length,
            isLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            initialLoaded: true,
            error: null,
          };
        });
      } catch (error) {
        setSkinState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : 'Failed to load history',
        }));
      }
    },
    [userId, skinHasMore, skinState.isLoading, skinState.isLoadingMore, skinState.isRefreshing, skinState.nextOffset]
  );

  const fetchHairHistory = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!userId) {
        return;
      }

      if (!reset && !hairHasMore) {
        return;
      }

      if (hairState.isLoading || hairState.isRefreshing || hairState.isLoadingMore) {
        if (!reset) {
          return;
        }
      }

      const offset = reset ? 0 : hairState.nextOffset;

      setHairState((prev) => ({
        ...prev,
        error: null,
        isLoading: !prev.initialLoaded || reset,
        isRefreshing: prev.initialLoaded && reset,
        isLoadingMore: prev.initialLoaded && !reset,
      }));

      try {
        const { items, total } = await HairTryOnApi.getHairTryOnHistoryWithMeta(userId, PAGE_SIZE, offset);
        setHairState((prev) => {
          const mergedItems = reset
            ? items
            : [
                ...prev.items,
                ...items.filter((item) => !prev.items.some((existing) => existing.id === item.id)),
              ];

          return {
            ...prev,
            items: mergedItems,
            total,
            nextOffset: offset + items.length,
            isLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            initialLoaded: true,
            error: null,
          };
        });
      } catch (error) {
        setHairState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : 'Failed to load history',
        }));
      }
    },
    [userId, hairHasMore, hairState.isLoading, hairState.isLoadingMore, hairState.isRefreshing, hairState.nextOffset]
  );

  useEffect(() => {
    if (!visible || !userId) {
      return;
    }

    if (activeTab === 'skin' && !skinState.initialLoaded) {
      fetchSkinHistory({ reset: true });
    }

    if (activeTab === 'hair' && !hairState.initialLoaded) {
      fetchHairHistory({ reset: true });
    }
  }, [visible, userId, activeTab, skinState.initialLoaded, hairState.initialLoaded, fetchSkinHistory, fetchHairHistory]);

  const renderSkinItem = ({ item }: { item: SkinAnalysisHistorySummary }) => (
    <View className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {item.skinType ?? 'Unknown skin type'}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {item.issuesCount} {item.issuesCount === 1 ? 'issue detected' : 'issues detected'}
          </Text>
        </View>
        <View className="items-end">
          <Ionicons name="color-palette-outline" size={20} color="#0284c7" />
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );

  const getStatusStyles = (status?: string) => {
    switch ((status ?? '').toLowerCase()) {
      case 'processing':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200';
      default:
        return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    }
  };

  const formatStatus = (status?: string) => {
    if (!status) {
      return 'Completed';
    }
    return status
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderHairItem = ({ item }: { item: HairTryOnHistoryItem }) => (
    <View className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {item.type === 'realtime' ? 'Real-time Session' : 'Video Try-On'}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDateTime(item.createdAt)}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Processing time: {item.processingMetadata.processingTime || 0}s
          </Text>
        </View>
        <View>
          <View className={`px-3 py-1 rounded-full ${getStatusStyles(item.status)}`}>
            <Text className="text-xs font-semibold">
              {formatStatus(item.status)}
            </Text>
          </View>
        </View>
      </View>
      {item.resultMediaUrl ? (
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-3" numberOfLines={1}>
          Result: {item.resultMediaUrl}
        </Text>
      ) : null}
    </View>
  );

  const renderEmptyState = (message: string) => (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Ionicons name="time-outline" size={36} color="#9ca3af" />
      <Text className="text-base text-gray-600 dark:text-gray-400 mt-4 text-center">{message}</Text>
    </View>
  );

  const renderErrorState = (message: string, retry: () => void) => (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Ionicons name="warning-outline" size={36} color="#f97316" />
      <Text className="text-base text-gray-600 dark:text-gray-400 mt-4 text-center">{message}</Text>
      <TouchableOpacity
        className="mt-6 bg-primary-600 px-6 py-2.5 rounded-full"
        onPress={retry}
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
  const renderSkinContent = () => {
    if (skinState.isLoading && !skinState.initialLoaded) {
      return (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading history...</Text>
        </View>
      );
    }

    if (skinState.error && !skinState.isLoading) {
      return renderErrorState(skinState.error, () => fetchSkinHistory({ reset: true }));
    }

    return (
      <FlatList<SkinAnalysisHistorySummary>
        data={skinState.items}
        keyExtractor={(item) => item.id}
        renderItem={renderSkinItem}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 32,
          paddingTop: skinState.items.length ? 12 : 0,
          flexGrow: skinState.items.length ? 0 : 1,
        }}
        ListEmptyComponent={
          !skinState.items.length
            ? () => renderEmptyState('You have not completed any skin analyses yet.')
            : undefined
        }
        refreshing={skinState.isRefreshing}
        onRefresh={() => fetchSkinHistory({ reset: true })}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (skinHasMore && !skinState.isLoadingMore) {
            fetchSkinHistory();
          }
        }}
        ListFooterComponent={
          skinState.isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#0284c7" />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderHairContent = () => {
    if (hairState.isLoading && !hairState.initialLoaded) {
      return (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading history...</Text>
        </View>
      );
    }

    if (hairState.error && !hairState.isLoading) {
      return renderErrorState(hairState.error, () => fetchHairHistory({ reset: true }));
    }

    return (
      <FlatList<HairTryOnHistoryItem>
        data={hairState.items}
        keyExtractor={(item) => item.id}
        renderItem={renderHairItem}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 32,
          paddingTop: hairState.items.length ? 12 : 0,
          flexGrow: hairState.items.length ? 0 : 1,
        }}
        ListEmptyComponent={
          !hairState.items.length
            ? () => renderEmptyState('You have not saved any hair try-on sessions yet.')
            : undefined
        }
        refreshing={hairState.isRefreshing}
        onRefresh={() => fetchHairHistory({ reset: true })}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (hairHasMore && !hairState.isLoadingMore) {
            fetchHairHistory();
          }
        }}
        ListFooterComponent={
          hairState.isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#0284c7" />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderContent = () => (activeTab === 'skin' ? renderSkinContent() : renderHairContent());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 items-center justify-center" activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={isDarkMode ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">History</Text>
          <View className="w-10" />
        </View>

        <View className="px-6 pt-4">
          <View className="flex-row bg-gray-100 dark:bg-gray-900 rounded-full p-1">
            {(['skin', 'hair'] as HistoryTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  className={`flex-1 py-2 rounded-full ${
                    isActive ? 'bg-white dark:bg-gray-800 shadow' : ''
                  }`}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.9}
                >
                  <Text
                    className={`text-sm text-center font-semibold ${
                      isActive ? 'text-primary-600 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab === 'skin' ? 'Skin Analyses' : 'Hair Try-Ons'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="flex-1 mt-2">{renderContent()}</View>
      </SafeAreaView>
    </Modal>
  );
};

export default HistoryModal;
