import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
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
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.springify()}
          className="bg-white px-6 pt-14 pb-6 border-b border-gray-100"
        >
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="sparkles" size={20} color="#0284c7" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              Skin Analysis
            </Text>
          </View>
          <Text className="text-gray-600">
            Upload a clear photo to get personalized skin analysis
          </Text>
        </Animated.View>

        <View className="p-4">
          {/* Image Capture/Upload Section */}
          {!currentAnalysis && !isAnalyzing && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <ImageCaptureUpload
                onImageCapture={handleImageCapture}
                disabled={isAnalyzing}
              />
            </Animated.View>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <Animated.View
              entering={FadeIn}
              className="bg-white rounded-2xl p-8 mb-4 items-center shadow-sm"
            >
              <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-4">
                <ActivityIndicator size="large" color="#0284c7" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">
                Analyzing Your Skin...
              </Text>
              <Text className="text-gray-600 text-center">
                Our AI is examining your photo to detect skin type and issues
              </Text>
              <View className="w-full bg-gray-200 rounded-full h-2 mt-6">
                <Animated.View className="bg-primary-500 h-2 rounded-full w-3/4" />
              </View>
            </Animated.View>
          )}

          {/* Error State */}
          {analysisError && (
            <Animated.View
              entering={FadeInDown.springify()}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4"
            >
              <View className="flex-row items-start">
                <Ionicons name="alert-circle" size={24} color="#dc2626" />
                <View className="flex-1 ml-3">
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
              </View>
            </Animated.View>
          )}

          {/* Analysis Results */}
          {currentAnalysis && !isAnalyzing && (
            <Animated.View entering={FadeInDown.springify()} className="px-4">
              <View className="mb-6">
                <SkinAnalysisResults analysis={currentAnalysis} />
              </View>
              
              {/* New Analysis Button */}
              <View className="mb-8">
                <Button
                  title="Analyze Another Photo"
                  onPress={handleNewAnalysis}
                  variant="outline"
                />
              </View>
            </Animated.View>
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
    </View>
  );
};

export default SkinAnalysisScreen;