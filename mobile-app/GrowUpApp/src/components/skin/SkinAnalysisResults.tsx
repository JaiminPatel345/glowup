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
    <View className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      {/* Analysis Header */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900 mb-3">
          Analysis Results
        </Text>
        <View className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3">
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-1">⏱️</Text>
            <Text className="text-gray-600 text-sm">
              {analysis.analysisMetadata.processingTime}ms
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-1">✨</Text>
            <Text className="text-gray-600 text-sm">
              Quality: {Math.round(analysis.analysisMetadata.imageQuality * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Skin Type */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Your Skin Type
        </Text>
        <View className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
          <Text className="text-blue-900 font-bold text-xl capitalize">
            {analysis.skinType}
          </Text>
        </View>
      </View>

      {/* Detected Issues */}
      <View className="mb-2">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Detected Issues ({analysis.issues.length})
        </Text>
        
        {analysis.issues.length === 0 ? (
          <View className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <Text className="text-green-900 font-bold text-lg mb-2">
              🎉 Great news! No significant skin issues detected.
            </Text>
            <Text className="text-green-700 text-base">
              Your skin appears to be in good condition. Keep up your current skincare routine!
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {analysis.issues.map((issue, index) => (
              <TouchableOpacity
                key={issue.id}
                className={`border-2 rounded-xl p-5 shadow-sm ${getSeverityColor(issue.severity)}`}
                onPress={() => handleIssuePress(issue)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Text className="text-2xl mr-2">
                        {getSeverityIcon(issue.severity)}
                      </Text>
                      <Text className="text-xl font-bold flex-1">
                        {issue.name}
                      </Text>
                      <View className="bg-white/50 px-3 py-1 rounded-full">
                        <Text className="text-sm font-semibold">
                          {Math.round(issue.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-base opacity-90 mb-3 leading-5">
                      {issue.description}
                    </Text>
                  </View>
                </View>

                {/* Highlighted Image Preview */}
                {issue.highlightedImageUrl && (
                  <View className="mb-3">
                    <Image
                      source={{ uri: issue.highlightedImageUrl }}
                      className="w-full h-36 rounded-xl"
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* Causes Preview */}
                {issue.causes.length > 0 && (
                  <View className="mb-3 bg-white/50 rounded-lg p-3">
                    <Text className="font-semibold mb-2 text-base">Common Causes:</Text>
                    <Text className="text-sm opacity-90 leading-5">
                      {issue.causes.slice(0, 2).join(', ')}
                      {issue.causes.length > 2 && '...'}
                    </Text>
                  </View>
                )}

                {/* Tap for Details */}
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t-2 border-current opacity-60">
                  <Text className="text-sm font-semibold">
                    Tap for details & solutions
                  </Text>
                  <Text className="text-xl">→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Analysis Metadata */}
      <View className="mt-6 pt-6 border-t border-gray-200">
        <Text className="text-sm text-gray-500 text-center">
          Analysis powered by {analysis.analysisMetadata.modelVersion}
        </Text>
      </View>
    </View>
  );
};

export default SkinAnalysisResults;