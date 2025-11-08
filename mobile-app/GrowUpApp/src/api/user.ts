import apiClient from './client';
import { 
  UserProfile,
  UpdateUserRequest,
  UpdatePreferencesRequest,
  UserPreferences,
  ApiResponse 
} from './types';

export class UserApi {
  /**
   * Get current user profile
   */
  static async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/user/profile');
    return response.data.data;
  }

  /**
   * Update user profile information
   */
  static async updateProfile(updates: UpdateUserRequest): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>(
      '/user/profile',
      updates
    );
    return response.data.data;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: UpdatePreferencesRequest): Promise<UserPreferences> {
    const response = await apiClient.put<ApiResponse<UserPreferences>>(
      '/user/preferences',
      preferences
    );
    return response.data.data;
  }

  /**
   * Get user preferences
   */
  static async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get<ApiResponse<UserPreferences>>('/user/preferences');
    return response.data.data;
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(imageFormData: FormData): Promise<{ imageUrl: string }> {
    const response = await apiClient.post<ApiResponse<{ imageUrl: string }>>(
      '/user/profile-image',
      imageFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Delete user account
   */
  static async deleteAccount(): Promise<void> {
    await apiClient.delete('/user/account');
  }

  /**
   * Change user password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/user/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Get user activity summary
   */
  static async getActivitySummary(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/user/activity');
    return response.data.data;
  }
}

export default UserApi;