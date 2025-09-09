import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface AppConfig {
  websocketUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isExpoGo: boolean;
}

// Get WebSocket URL from environment variables only
const getWebSocketUrl = (): string => {
  const port = process.env.EXPO_PUBLIC_WEBSOCKET_PORT || '8080';
  
  // Check if running in Android emulator
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    const androidHost = process.env.EXPO_PUBLIC_ANDROID_EMULATOR_HOST;
    if (androidHost) {
      return `ws://${androidHost}:${port}`;
    }
  }
  
  // Check if running in iOS simulator
  if (Platform.OS === 'ios' && Constants.appOwnership === 'expo') {
    const iosHost = process.env.EXPO_PUBLIC_IOS_SIMULATOR_HOST;
    if (iosHost) {
      return `ws://${iosHost}:${port}`;
    }
  }
  
  // For physical devices or tunnel mode, use the main host
  const mainHost = process.env.EXPO_PUBLIC_WEBSOCKET_HOST;
  if (mainHost) {
    return `ws://${mainHost}:${port}`;
  }
  
  // Fallback - should not reach here if .env is properly configured
  console.error('No WebSocket host configured in .env file');
  return 'ws://localhost:8080';
};

const config: AppConfig = {
  websocketUrl: __DEV__ ? getWebSocketUrl() : 'ws://your-production-server:8080',
  isProduction: !__DEV__,
  isDevelopment: __DEV__,
  isExpoGo: Constants.appOwnership === 'expo',
};

export default config;
