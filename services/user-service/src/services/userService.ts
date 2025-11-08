import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import {
  UserProfile,
  UserPreferences,
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  CreateUserPreferencesRequest,
  UpdateUserPreferencesRequest,
  PaginatedResponse,
  PaginationQuery,
} from '../types';

export class UserService {
  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      throw new AppError('Failed to fetch user profile', 500);
    }
  }

  async updateUserProfile(
    userId: string,
    data: UpdateUserProfileRequest
  ): Promise<UserProfile> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      if (!existingUser.isActive) {
        throw new AppError('User account is deactivated', 403);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          profileImageUrl: data.profileImageUrl,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`User profile updated for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating user profile:', error);
      throw new AppError('Failed to update user profile', 500);
    }
  }

  async deactivateUser(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deactivating user:', error);
      throw new AppError('Failed to deactivate user', 500);
    }
  }

  // User Preferences Operations
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      return preferences as UserPreferences | null;
    } catch (error) {
      logger.error('Error fetching user preferences:', error);
      throw new AppError('Failed to fetch user preferences', 500);
    }
  }

  async createUserPreferences(
    userId: string,
    data: CreateUserPreferencesRequest
  ): Promise<UserPreferences> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.isActive) {
        throw new AppError('User account is deactivated', 403);
      }

      // Check if preferences already exist
      const existingPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (existingPreferences) {
        throw new AppError('User preferences already exist', 409);
      }

      const preferences = await prisma.userPreferences.create({
        data: {
          userId,
          skinType: data.skinType,
          hairType: data.hairType,
          preferredLanguage: data.preferredLanguage || 'en',
          notificationSettings: data.notificationSettings || {},
          privacySettings: data.privacySettings || {},
          appPreferences: data.appPreferences || {},
        },
      });

      logger.info(`User preferences created for user: ${userId}`);
      return preferences as UserPreferences;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error creating user preferences:', error);
      throw new AppError('Failed to create user preferences', 500);
    }
  }

  async updateUserPreferences(
    userId: string,
    data: UpdateUserPreferencesRequest
  ): Promise<UserPreferences> {
    try {
      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.isActive) {
        throw new AppError('User account is deactivated', 403);
      }

      // Check if preferences exist
      const existingPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!existingPreferences) {
        throw new AppError('User preferences not found', 404);
      }

      const updatedPreferences = await prisma.userPreferences.update({
        where: { userId },
        data: {
          skinType: data.skinType,
          hairType: data.hairType,
          preferredLanguage: data.preferredLanguage,
          notificationSettings: data.notificationSettings,
          privacySettings: data.privacySettings,
          appPreferences: data.appPreferences,
        },
      });

      logger.info(`User preferences updated for user: ${userId}`);
      return updatedPreferences as UserPreferences;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating user preferences:', error);
      throw new AppError('Failed to update user preferences', 500);
    }
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        throw new AppError('User preferences not found', 404);
      }

      await prisma.userPreferences.delete({
        where: { userId },
      });

      logger.info(`User preferences deleted for user: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deleting user preferences:', error);
      throw new AppError('Failed to delete user preferences', 500);
    }
  }

  // Admin Operations
  async getAllUsers(query: PaginationQuery): Promise<PaginatedResponse<UserProfile>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: {
            [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count(),
      ]);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching all users:', error);
      throw new AppError('Failed to fetch users', 500);
    }
  }

  async getUserWithPreferences(userId: string): Promise<(UserProfile & { preferences?: UserPreferences }) | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          preferences: true,
        },
      });

      return user as (UserProfile & { preferences?: UserPreferences }) | null;
    } catch (error) {
      logger.error('Error fetching user with preferences:', error);
      throw new AppError('Failed to fetch user with preferences', 500);
    }
  }
}