import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { logger } from '../config/logger';
import {
  User,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  JWTPayload,
  DatabaseUser,
  Session
} from '../types';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly bcryptRounds: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    const userId = uuidv4();

    // Insert user into database
    const insertQuery = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, first_name, last_name, profile_image_url, created_at, updated_at
    `;

    const result = await query(insertQuery, [
      userId,
      email,
      passwordHash,
      firstName || null,
      lastName || null
    ]);

    const dbUser = result.rows[0];
    logger.info('User created successfully', { userId: dbUser.id, email: dbUser.email });

    return this.mapDatabaseUserToUser(dbUser);
  }

  async authenticateUser(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, password } = loginData;

    // Find user by email
    const dbUser = await this.findUserByEmail(email);
    if (!dbUser) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, dbUser.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const user = this.mapDatabaseUserToUser(dbUser);
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    logger.info('User authenticated successfully', { userId: user.id, email: user.email });

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const session = await this.findSessionByToken(refreshToken);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const dbUser = await this.findUserById(session.userId);
    if (!dbUser) {
      throw new Error('User not found');
    }

    const user = this.mapDatabaseUserToUser(dbUser);

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    // Invalidate old refresh token
    await this.invalidateSession(refreshToken);

    logger.info('Access token refreshed', { userId: user.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.invalidateSession(refreshToken);
    logger.info('User logged out');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const dbUser = await this.findUserById(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

    // Update password in database
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW() 
      WHERE id = $2
    `;

    await query(updateQuery, [newPasswordHash, userId]);
    logger.info('Password changed successfully', { userId });
  }

  async resetPassword(email: string): Promise<void> {
    const dbUser = await this.findUserByEmail(email);
    if (!dbUser) {
      // Don't reveal if email exists or not for security
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // In a real implementation, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with expiration
    // 3. Send email with reset link
    
    logger.info('Password reset requested', { userId: dbUser.id, email });
    // For now, just log the request
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: 'user',
      permissions: ['read:profile', 'write:profile'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const insertQuery = `
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;

    await query(insertQuery, [sessionId, userId, expiresAt]);
    return sessionId;
  }

  private async findUserByEmail(email: string): Promise<DatabaseUser | null> {
    const selectQuery = `
      SELECT id, email, password_hash, first_name, last_name, profile_image_url, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;

    const result = await query(selectQuery, [email]);
    return result.rows[0] || null;
  }

  private async findUserById(id: string): Promise<DatabaseUser | null> {
    const selectQuery = `
      SELECT id, email, password_hash, first_name, last_name, profile_image_url, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;

    const result = await query(selectQuery, [id]);
    return result.rows[0] || null;
  }

  private async findSessionByToken(token: string): Promise<Session | null> {
    const selectQuery = `
      SELECT id, user_id, expires_at, created_at
      FROM sessions 
      WHERE id = $1
    `;

    const result = await query(selectQuery, [token]);
    return result.rows[0] ? {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at
    } : null;
  }

  private async invalidateSession(sessionId: string): Promise<void> {
    const deleteQuery = `DELETE FROM sessions WHERE id = $1`;
    await query(deleteQuery, [sessionId]);
  }

  private mapDatabaseUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      profileImageUrl: dbUser.profile_image_url,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };
  }
}