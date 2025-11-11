import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PROD_API = 'https://api.growup.app/api';

export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (__DEV__) {
    const debuggerHost = Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      if (host) {
        return `http://${host}:3000/api`;
      }
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }

    return 'http://127.0.0.1:3000/api';
  }

  return DEFAULT_PROD_API;
};

export const API_BASE_URL = getApiBaseUrl();
