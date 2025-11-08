export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  permissions: string[];
  iat: number;
  exp?: number; // Optional since JWT library adds this automatically
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  correlationId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}