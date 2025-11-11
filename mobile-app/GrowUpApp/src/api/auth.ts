import apiClient from './client';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ApiResponse 
} from './types';

export class AuthApi {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    return response.data.data;
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      userData
    );
    return response.data.data;
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors - we'll clear local storage anyway
      console.warn('Logout API call failed, clearing local storage anyway:', error);
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data.data;
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email });
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      password: newPassword,
    });
  }

  /**
   * Verify authentication token and get user data
   */
  static async verifyToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/auth/validate');
      if (response.data.success && response.data.data.valid) {
        // The validate endpoint returns: userId, email, role
        // We need to construct a User object that matches our User type
        return {
          valid: true,
          user: {
            id: response.data.data.userId,
            email: response.data.data.email,
            role: response.data.data.role,
            firstName: '', // Not provided by validate endpoint
            lastName: '',  // Not provided by validate endpoint
            createdAt: '',
            updatedAt: '',
          }
        };
      }
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Get current user profile from token
   */
  static async getCurrentUser(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/auth/validate');
    if (response.data.success && response.data.data.valid) {
      return {
        id: response.data.data.userId,
        email: response.data.data.email,
        role: response.data.data.role,
      };
    }
    throw new Error('Invalid token');
  }
}

export default AuthApi;