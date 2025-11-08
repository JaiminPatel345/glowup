import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

export class SecureStorage {
  /**
   * Store authentication tokens securely
   */
  static async storeAuthTokens(token: string, refreshToken: string): Promise<void> {
    try {
      // Store tokens in Keychain for maximum security
      await Keychain.setInternetCredentials(
        'growup_auth_tokens',
        'auth_token',
        JSON.stringify({ token, refreshToken })
      );
      
      // Also store in AsyncStorage as fallback
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Error storing auth tokens:', error);
      // Fallback to AsyncStorage only
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * Retrieve authentication tokens
   */
  static async getAuthTokens(): Promise<{ token: string; refreshToken: string } | null> {
    try {
      // Try to get from Keychain first
      const credentials = await Keychain.getInternetCredentials('growup_auth_tokens');
      
      if (credentials && credentials.password) {
        const tokens = JSON.parse(credentials.password);
        return {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
        };
      }
    } catch (error) {
      console.error('Error retrieving tokens from Keychain:', error);
    }

    try {
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (token && refreshToken) {
        return { token, refreshToken };
      }
    } catch (error) {
      console.error('Error retrieving tokens from AsyncStorage:', error);
    }

    return null;
  }

  /**
   * Clear all authentication tokens
   */
  static async clearAuthTokens(): Promise<void> {
    try {
      // Clear from Keychain by setting empty credentials
      await Keychain.setInternetCredentials('growup_auth_tokens', '', '');
    } catch (error) {
      console.error('Error clearing tokens from Keychain:', error);
    }

    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error clearing tokens from AsyncStorage:', error);
    }
  }

  /**
   * Store user preferences
   */
  static async storeUserPreferences(preferences: any): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error storing user preferences:', error);
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(): Promise<any | null> {
    try {
      const preferences = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return preferences ? JSON.parse(preferences) : null;
    } catch (error) {
      console.error('Error retrieving user preferences:', error);
      return null;
    }
  }

  /**
   * Clear user preferences
   */
  static async clearUserPreferences(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }

  /**
   * Check if onboarding is completed
   */
  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (error) {
      console.error('Error setting onboarding completed:', error);
    }
  }

  /**
   * Clear all stored data
   */
  static async clearAllData(): Promise<void> {
    await Promise.all([
      this.clearAuthTokens(),
      this.clearUserPreferences(),
      AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
    ]);
  }
}

export default SecureStorage;