import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { loadStoredAuth } from './src/store/slices/authSlice';
import { AuthNavigator } from './src/components/auth';
import { MainNavigator } from './src/components/navigation';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import './global.css'

function AppContent() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    // Load stored authentication on app start
    dispatch(loadStoredAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="text-lg text-gray-600 dark:text-gray-300 mt-4">Loading...</Text>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}
