import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import { Button } from '../../components/common';

const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16 pb-8">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to GrowUp!
          </Text>
          <Text className="text-lg text-gray-600">
            Hello, {user?.firstName || 'User'}!
          </Text>
        </View>

        {/* Feature Cards */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            What would you like to do today?
          </Text>
          
          <View className="space-y-4">
            {/* Skin Analysis Card */}
            <View className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <Text className="text-lg font-semibold text-primary-900 mb-2">
                Skin Analysis
              </Text>
              <Text className="text-primary-700 mb-4">
                Upload a photo to get personalized skin care recommendations
              </Text>
              <Button
                title="Start Analysis"
                onPress={() => {/* Navigate to skin analysis */}}
                size="sm"
                testID="skin-analysis-button"
              />
            </View>

            {/* Hair Try-On Card */}
            <View className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <Text className="text-lg font-semibold text-secondary-900 mb-2">
                Hair Try-On
              </Text>
              <Text className="text-secondary-700 mb-4">
                Try different hairstyles and colors with AI technology
              </Text>
              <Button
                title="Try Hairstyles"
                onPress={() => {/* Navigate to hair try-on */}}
                variant="secondary"
                size="sm"
                testID="hair-tryon-button"
              />
            </View>
          </View>
        </View>

        {/* User Info */}
        <View className="bg-gray-50 rounded-lg p-4 mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Account Information
          </Text>
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Name:</Text>
              <Text className="text-gray-900 font-medium">
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Email:</Text>
              <Text className="text-gray-900 font-medium">
                {user?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
          loading={isLoading}
          disabled={isLoading}
          testID="logout-button"
        />
      </View>
    </ScrollView>
  );
};

export default HomeScreen;