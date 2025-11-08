import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  analyzeImage,
  retryAnalysis,
  clearAnalysisError,
  clearCurrentAnalysis,
} from '../../store/slices/skinAnalysisSlice';
import ImageCaptureUpload from '../../components/skin/ImageCaptureUpload';
import SkinAnalysisResults from '../../components/skin/SkinAnalysisResults';
import IssueDetailPopup from '../../components/skin/IssueDetailPopup';
import { Button } from '../../components/common';

const SkinAnalysisScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    currentAnalysis,
    isAnalyzing,
    analysisError,
    selectedIssue,
    retryCount,
    maxRetries,
  } = useAppSelector((state) => state.skinAnalysis);

  const [capturedImageData, setCapturedImageData] = useState<FormData | null>(null);

  const handleImageCapture = useCallback((imageFormData: FormData) => {
    setCapturedImageData(imageFormData);
    dispatch(clearAnalysisError());
    dispatch(analyzeImage(imageFormData));
  }, [dispatch]);

  const handleRetryAnalysis = useCallback(() => {
    if (capturedImageData && retryCount < maxRetries) {
      dispatch(retryAnalysis(capturedImageData));
    }
  }, [dispatch, capturedImageData, retryCount, maxRetries]);

  const handleNewAnalysis = useCallback(() => {
    dispatch(clearCurrentAnalysis());
    setCapturedImageData(null);
  }, [dispatch]);

  const showRetryOption = analysisError && retryCount < maxRetries && capturedImageData;
  const showMaxRetriesReached = retryCount >= maxRetries;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Skin Analysis
          </Text>
          <Text className="text-gray-600">
            Upload a clear photo of your face to get personalized skin analysis and recommendations
          </Text>
        </View>

        {/* Image Capture/Upload Section */}
        {!currentAnalysis && !isAnalyzing && (
          <ImageCaptureUpload
            onImageCapture={handleImageCapture}
            disabled={isAnalyzing}
          />
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <View className="bg-white rounded-lg p-6 mb-4 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-lg font-semibold text-gray-900 mt-4 mb-2">
              Analyzing Your Skin...
            </Text>
            <Text className="text-gray-600 text-center">
              Our AI is examining your photo to detect skin type and issues. This may take a few seconds.
            </Text>
            <View className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <View className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4" />
            </View>
          </View>
        )}

        {/* Error State */}
        {analysisError && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Text className="text-red-800 font-semibold mb-2">
              Analysis Failed
            </Text>
            <Text className="text-red-700 mb-4">
              {analysisError}
            </Text>
            
            {showRetryOption && (
              <View className="flex-row space-x-3">
                <Button
                  title={`Retry (${retryCount}/${maxRetries})`}
                  onPress={handleRetryAnalysis}
                  variant="outline"
                  className="flex-1"
                />
                <Button
                  title="New Photo"
                  onPress={handleNewAnalysis}
                  className="flex-1"
                />
              </View>
            )}
            
            {showMaxRetriesReached && (
              <View>
                <Text className="text-red-600 mb-3">
                  Maximum retry attempts reached. Please try with a different photo.
                </Text>
                <Button
                  title="Take New Photo"
                  onPress={handleNewAnalysis}
                />
              </View>
            )}
          </View>
        )}

        {/* Analysis Results */}
        {currentAnalysis && !isAnalyzing && (
          <View>
            <SkinAnalysisResults analysis={currentAnalysis} />
            
            {/* New Analysis Button */}
            <View className="mt-6">
              <Button
                title="Analyze Another Photo"
                onPress={handleNewAnalysis}
                variant="outline"
              />
            </View>
          </View>
        )}

        {/* Issue Detail Popup */}
        {selectedIssue && (
          <IssueDetailPopup
            issue={selectedIssue}
            visible={!!selectedIssue}
            onClose={() => dispatch({ type: 'skinAnalysis/setSelectedIssue', payload: null })}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default SkinAnalysisScreen;