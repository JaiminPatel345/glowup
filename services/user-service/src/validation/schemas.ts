import { z } from 'zod';
import { SkinType, HairType } from '../types';

// User Profile Validation Schemas
export const createUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  profileImageUrl: z.string().url().optional(),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  profileImageUrl: z.string().url().optional(),
});

// User Preferences Validation Schemas
export const createUserPreferencesSchema = z.object({
  skinType: z.nativeEnum(SkinType).optional(),
  hairType: z.nativeEnum(HairType).optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  notificationSettings: z.record(z.any()).optional(),
  privacySettings: z.record(z.any()).optional(),
  appPreferences: z.record(z.any()).optional(),
});

export const updateUserPreferencesSchema = z.object({
  skinType: z.nativeEnum(SkinType).optional(),
  hairType: z.nativeEnum(HairType).optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  notificationSettings: z.record(z.any()).optional(),
  privacySettings: z.record(z.any()).optional(),
  appPreferences: z.record(z.any()).optional(),
});

// Query Parameter Validation Schemas
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const userIdSchema = z.object({
  userId: z.string().uuid(),
});

// File Upload Validation
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().refine(
    (type) => type.startsWith('image/'),
    'Only image files are allowed'
  ),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
});

// Notification Settings Schema
export const notificationSettingsSchema = z.object({
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  skinAnalysisReminders: z.boolean().optional(),
  productRecommendations: z.boolean().optional(),
  weeklyTips: z.boolean().optional(),
});

// Privacy Settings Schema
export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private']).optional(),
  shareAnalysisData: z.boolean().optional(),
  allowDataCollection: z.boolean().optional(),
  shareWithPartners: z.boolean().optional(),
});

// App Preferences Schema
export const appPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  autoSaveResults: z.boolean().optional(),
  highQualityImages: z.boolean().optional(),
  offlineMode: z.boolean().optional(),
});

export type CreateUserProfileInput = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateUserPreferencesInput = z.infer<typeof createUserPreferencesSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
export type AppPreferencesInput = z.infer<typeof appPreferencesSchema>;