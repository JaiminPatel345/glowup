import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { loadStoredAuth } from './src/store/slices/authSlice';
import { AuthNavigator } from './src/components/auth';
import { MainNavigator } from './src/components/navigation';
import './global.css'

function AppContent() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Load stored authentication on app start
    dispatch(loadStoredAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="text-lg text-gray-600 mt-4">Loading...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
