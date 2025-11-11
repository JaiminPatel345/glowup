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
  static async getProfile(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(`/v1/users/${userId}`);
    return response.data.data;
  }

  /**
   * Update user profile information
   */
  static async updateProfile(userId: string, updates: UpdateUserRequest): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>(
      `/v1/users/${userId}`,
      updates
    );
    return response.data.data;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId: string, preferences: UpdatePreferencesRequest): Promise<UserPreferences> {
    const response = await apiClient.put<ApiResponse<UserPreferences>>(
      `/v1/users/${userId}/preferences`,
      preferences
    );
    return response.data.data;
  }

  /**
   * Get user preferences
   */
  static async getPreferences(userId: string): Promise<UserPreferences> {
    const response = await apiClient.get<ApiResponse<UserPreferences>>(`/v1/users/${userId}/preferences`);
    return response.data.data;
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(userId: string, imageFormData: FormData): Promise<{ imageUrl: string }> {
    const response = await apiClient.post<ApiResponse<{ imageUrl: string }>>(
      `/v1/users/${userId}/profile-image`,
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
  static async deleteAccount(userId: string): Promise<void> {
    await apiClient.delete(`/v1/users/${userId}`);
  }

  /**
   * Change user password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Get user activity summary
   * Note: This endpoint doesn't exist in backend yet
   */
  static async getActivitySummary(userId: string): Promise<any> {
    // TODO: Backend needs to implement this endpoint
    // For now, return mock data or throw not implemented error
    throw new Error('Activity summary endpoint not implemented in backend');
  }
}

export default UserApi;