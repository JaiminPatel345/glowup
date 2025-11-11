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
    await apiClient.post('/auth/logout');
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
   * Verify authentication token
   */
  static async verifyToken(): Promise<boolean> {
    try {
      await apiClient.get('/auth/validate');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default AuthApi;