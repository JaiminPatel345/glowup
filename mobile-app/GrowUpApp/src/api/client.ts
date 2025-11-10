import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import SecureStorage from '../utils/secureStorage';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://api.growup.app/api';

const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const tokens = await SecureStorage.getAuthTokens();
      if (tokens?.token && config.headers) {
        config.headers.Authorization = `Bearer ${tokens.token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }

    // Log request in development
    if (__DEV__) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (__DEV__) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error) => {
    // Log error in development
    if (__DEV__) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401) {
      try {
        await SecureStorage.clearAuthTokens();
        // Note: Navigation to login will be handled by the global error handler
      } catch (storageError) {
        console.error('Error clearing auth tokens:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;