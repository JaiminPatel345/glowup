import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useAppDispatch } from '../../store';
import { setSelectedIssue } from '../../store/slices/skinAnalysisSlice';
import { SkinAnalysisResult, SkinIssue } from '../../api/types';

interface SkinAnalysisResultsProps {
  analysis: SkinAnalysisResult;
}

const SkinAnalysisResults: React.FC<SkinAnalysisResultsProps> = ({ analysis }) => {
  const dispatch = useAppDispatch();

  const getSeverityColor = (severity: SkinIssue['severity']) => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: SkinIssue['severity']) => {
    switch (severity) {
      case 'low':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const handleIssuePress = (issue: SkinIssue) => {
    dispatch(setSelectedIssue(issue));
  };

  return (
    <View className="bg-white rounded-lg p-6">
      {/* Analysis Header */}
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Analysis Results
        </Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-600">
            Processing time: {analysis.analysisMetadata.processingTime}ms
          </Text>
          <Text className="text-gray-600">
            Quality: {Math.round(analysis.analysisMetadata.imageQuality * 100)}%
          </Text>
        </View>
      </View>

      {/* Skin Type */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Your Skin Type
        </Text>
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Text className="text-blue-800 font-medium text-lg">
            {analysis.skinType}
          </Text>
        </View>
      </View>

      {/* Detected Issues */}
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Detected Issues ({analysis.issues.length})
        </Text>
        
        {analysis.issues.length === 0 ? (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4">
            <Text className="text-green-800 font-medium">
              🎉 Great news! No significant skin issues detected.
            </Text>
            <Text className="text-green-700 mt-1">
              Your skin appears to be in good condition. Keep up your current skincare routine!
            </Text>
          </View>
        ) : (
          <ScrollView className="space-y-3">
            {analysis.issues.map((issue, index) => (
              <TouchableOpacity
                key={issue.id}
                className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                onPress={() => handleIssuePress(issue)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-lg mr-2">
                        {getSeverityIcon(issue.severity)}
                      </Text>
                      <Text className="text-lg font-semibold flex-1">
                        {issue.name}
                      </Text>
                      <Text className="text-sm opacity-75">
                        {Math.round(issue.confidence * 100)}%
                      </Text>
                    </View>
                    <Text className="text-sm opacity-90 mb-2">
                      {issue.description}
                    </Text>
                  </View>
                </View>

                {/* Highlighted Image Preview */}
                {issue.highlightedImageUrl && (
                  <View className="mb-3">
                    <Image
                      source={{ uri: issue.highlightedImageUrl }}
                      className="w-full h-32 rounded-lg"
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* Causes Preview */}
                {issue.causes.length > 0 && (
                  <View className="mb-2">
                    <Text className="font-medium mb-1">Common Causes:</Text>
                    <Text className="text-sm opacity-90">
                      {issue.causes.slice(0, 2).join(', ')}
                      {issue.causes.length > 2 && '...'}
                    </Text>
                  </View>
                )}

                {/* Tap for Details */}
                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-current opacity-50">
                  <Text className="text-sm font-medium">
                    Tap for details & solutions
                  </Text>
                  <Text className="text-lg">→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Analysis Metadata */}
      <View className="mt-4 pt-4 border-t border-gray-200">
        <Text className="text-sm text-gray-500 text-center">
          Analysis powered by {analysis.analysisMetadata.modelVersion}
        </Text>
      </View>
    </View>
  );
};

export default SkinAnalysisResults;