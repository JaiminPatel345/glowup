import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store';
import { loadStoredAuth } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Try to load stored authentication on mount
    if (!isAuthenticated && !isLoading) {
      dispatch(loadStoredAuth());
    }
  }, [dispatch, isAuthenticated, isLoading]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

  // Show children if authenticated, otherwise show fallback
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show fallback component or default message
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-xl font-semibold text-gray-900 mb-2">
        Authentication Required
      </Text>
      <Text className="text-gray-600 text-center">
        Please log in to access this feature
      </Text>
    </View>
  );
};

export default ProtectedRoute;