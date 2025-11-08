import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, ApiResponse, CreateUserRequest, LoginRequest, RefreshTokenRequest, ChangePasswordRequest, ResetPasswordRequest } from '../types';
import { logger } from '../config/logger';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;
      const user = await authService.createUser(userData);

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Registration error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };

      const statusCode = error instanceof Error && error.message?.includes('already exists') ? 409 : 500;
      res.status(statusCode).json(response);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      const result = await authService.authenticateUser(loginData);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Login successful'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Login error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };

      const statusCode = error instanceof Error && error.message?.includes('Invalid') ? 401 : 500;
      res.status(statusCode).json(response);
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      const result = await authService.refreshAccessToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };

      const statusCode = error instanceof Error && (error.message?.includes('Invalid') || error.message?.includes('expired')) ? 401 : 500;
      res.status(statusCode).json(response);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      await authService.logout(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Logout error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };

      res.status(500).json(response);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required'
        };
        res.status(401).json(response);
        return;
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
      await authService.changePassword(req.user.userId, currentPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Change password error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      };

      const statusCode = error instanceof Error && error.message?.includes('incorrect') ? 400 : 500;
      res.status(statusCode).json(response);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email }: ResetPasswordRequest = req.body;
      await authService.resetPassword(email);

      // Always return success for security reasons (don't reveal if email exists)
      const response: ApiResponse = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Password reset error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Password reset failed'
      };

      res.status(500).json(response);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required'
        };
        res.status(401).json(response);
        return;
      }

      // In a real implementation, you might want to fetch fresh user data from the database
      const response: ApiResponse = {
        success: true,
        data: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role,
          permissions: req.user.permissions
        },
        message: 'Profile retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get profile error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to retrieve profile'
      };

      res.status(500).json(response);
    }
  }

  async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid token'
        };
        res.status(401).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          valid: true,
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role
        },
        message: 'Token is valid'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Token validation error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Token validation failed'
      };

      res.status(500).json(response);
    }
  }
}