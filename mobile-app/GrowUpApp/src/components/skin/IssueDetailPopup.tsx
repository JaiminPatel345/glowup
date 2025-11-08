import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  loadProductRecommendations,
  setProductFilter,
  clearRecommendationError,
} from '../../store/slices/skinAnalysisSlice';
import { SkinIssue } from '../../api/types';
import { Button } from '../common';
import ProductRecommendations from './ProductRecommendations';

interface IssueDetailPopupProps {
  issue: SkinIssue;
  visible: boolean;
  onClose: () => void;
}

const IssueDetailPopup: React.FC<IssueDetailPopupProps> = ({
  issue,
  visible,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const {
    productRecommendations,
    isLoadingRecommendations,
    recommendationErrors,
  } = useAppSelector((state) => state.skinAnalysis);

  const [showRecommendations, setShowRecommendations] = useState(false);

  const isLoadingProducts = isLoadingRecommendations[issue.id] || false;
  const recommendationError = recommendationErrors[issue.id];
  const recommendations = productRecommendations[issue.id];

  useEffect(() => {
    if (visible) {
      // Clear any previous errors when opening
      dispatch(clearRecommendationError(issue.id));
      setShowRecommendations(false);
    }
  }, [visible, issue.id, dispatch]);

  const handleViewSolutions = () => {
    setShowRecommendations(true);
    if (!recommendations && !isLoadingProducts) {
      dispatch(loadProductRecommendations(issue.id));
    }
  };

  const handleRetryRecommendations = () => {
    dispatch(clearRecommendationError(issue.id));
    dispatch(loadProductRecommendations(issue.id));
  };

  const getSeverityColor = (severity: SkinIssue['severity']) => {
    switch (severity) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityLabel = (severity: SkinIssue['severity']) => {
    switch (severity) {
      case 'low':
        return 'Low Priority';
      case 'medium':
        return 'Medium Priority';
      case 'high':
        return 'High Priority';
      default:
        return 'Unknown';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Text className="text-xl font-bold text-gray-900 flex-1">
            {issue.name}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 items-center justify-center"
          >
            <Text className="text-2xl text-gray-500">×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
          <View className="p-4">
            {/* Issue Overview */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className={`text-lg font-semibold ${getSeverityColor(issue.severity)}`}>
                  {getSeverityLabel(issue.severity)}
                </Text>
                <Text className="text-gray-600">
                  Confidence: {Math.round(issue.confidence * 100)}%
                </Text>
              </View>
              
              <Text className="text-gray-700 text-base leading-6">
                {issue.description}
              </Text>
            </View>

            {/* Highlighted Image */}
            {issue.highlightedImageUrl && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Affected Areas
                </Text>
                <Image
                  source={{ uri: issue.highlightedImageUrl }}
                  className="w-full h-64 rounded-lg"
                  resizeMode="cover"
                />
                <Text className="text-sm text-gray-600 mt-2 text-center">
                  Highlighted regions show detected {issue.name.toLowerCase()}
                </Text>
              </View>
            )}

            {/* Causes */}
            {issue.causes.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Common Causes
                </Text>
                <View className="bg-gray-50 rounded-lg p-4">
                  {issue.causes.map((cause, index) => (
                    <View key={index} className="flex-row items-start mb-2 last:mb-0">
                      <Text className="text-gray-600 mr-2">•</Text>
                      <Text className="text-gray-700 flex-1">{cause}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Prevention Tips */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Prevention Tips
              </Text>
              <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <View className="flex-row items-start mb-2">
                  <Text className="text-blue-600 mr-2">•</Text>
                  <Text className="text-blue-800 flex-1">
                    Maintain a consistent skincare routine with gentle products
                  </Text>
                </View>
                <View className="flex-row items-start mb-2">
                  <Text className="text-blue-600 mr-2">•</Text>
                  <Text className="text-blue-800 flex-1">
                    Use sunscreen daily to protect against UV damage
                  </Text>
                </View>
                <View className="flex-row items-start mb-2">
                  <Text className="text-blue-600 mr-2">•</Text>
                  <Text className="text-blue-800 flex-1">
                    Stay hydrated and maintain a balanced diet
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Text className="text-blue-600 mr-2">•</Text>
                  <Text className="text-blue-800 flex-1">
                    Avoid touching or picking at affected areas
                  </Text>
                </View>
              </View>
            </View>

            {/* Solutions Button */}
            {!showRecommendations && (
              <View className="mb-6">
                <Button
                  title="View Product Solutions"
                  onPress={handleViewSolutions}
                  className="w-full"
                />
              </View>
            )}

            {/* Product Recommendations */}
            {showRecommendations && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Recommended Products
                </Text>

                {isLoadingProducts && (
                  <View className="bg-gray-50 rounded-lg p-8 items-center">
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text className="text-gray-600 mt-3">
                      Loading product recommendations...
                    </Text>
                  </View>
                )}

                {recommendationError && (
                  <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <Text className="text-red-800 font-semibold mb-2">
                      Failed to Load Recommendations
                    </Text>
                    <Text className="text-red-700 mb-3">
                      {recommendationError}
                    </Text>
                    <Button
                      title="Retry"
                      onPress={handleRetryRecommendations}
                      variant="outline"
                    />
                  </View>
                )}

                {recommendations && !isLoadingProducts && (
                  <ProductRecommendations
                    recommendations={recommendations}
                    issueId={issue.id}
                  />
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default IssueDetailPopup;