import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import {
  CreateUserPreferencesInput,
  UpdateUserPreferencesInput,
  UpdateUserProfileInput,
  PaginationInput,
} from '../validation/schemas';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // User Profile Endpoints
  getUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    const user = await this.userService.getUserProfile(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  });

  updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const data: UpdateUserProfileInput = req.body;

    const updatedUser = await this.userService.updateUserProfile(userId, data);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User profile updated successfully',
    });
  });

  deactivateUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    await this.userService.deactivateUser(userId);

    res.json({
      success: true,
      message: 'User account deactivated successfully',
    });
  });

  // User Preferences Endpoints
  getUserPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    const preferences = await this.userService.getUserPreferences(userId);

    if (!preferences) {
      res.status(404).json({
        success: false,
        error: 'User preferences not found',
      });
      return;
    }

    res.json({
      success: true,
      data: preferences,
    });
  });

  createUserPreferences = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const data: CreateUserPreferencesInput = req.body;

    const preferences = await this.userService.createUserPreferences(userId, data);

    res.status(201).json({
      success: true,
      data: preferences,
      message: 'User preferences created successfully',
    });
  });

  updateUserPreferences = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const data: UpdateUserPreferencesInput = req.body;

    const updatedPreferences = await this.userService.updateUserPreferences(userId, data);

    res.json({
      success: true,
      data: updatedPreferences,
      message: 'User preferences updated successfully',
    });
  });

  deleteUserPreferences = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    await this.userService.deleteUserPreferences(userId);

    res.json({
      success: true,
      message: 'User preferences deleted successfully',
    });
  });

  // Combined Endpoints
  getUserWithPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    const user = await this.userService.getUserWithPreferences(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  });

  // Admin Endpoints
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const query: PaginationInput = req.query as any;

    const result = await this.userService.getAllUsers(query);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  // Health Check
  healthCheck = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'User service is healthy',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: '1.0.0',
    });
  });

  // File Upload Handler
  uploadProfileImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    // In a real implementation, you would upload to cloud storage (AWS S3, etc.)
    // For now, we'll just return a mock URL
    const profileImageUrl = `/uploads/profiles/${userId}/${req.file.filename}`;

    const updatedUser = await this.userService.updateUserProfile(userId, {
      profileImageUrl,
    });

    logger.info(`Profile image uploaded for user: ${userId}`);

    res.json({
      success: true,
      data: {
        user: updatedUser,
        imageUrl: profileImageUrl,
      },
      message: 'Profile image uploaded successfully',
    });
  });
}