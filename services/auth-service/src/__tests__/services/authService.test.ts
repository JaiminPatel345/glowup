import { AuthService } from '../../services/authService';
import { CreateUserRequest, LoginRequest } from '../../types';
import { cleanDatabase } from '../setup';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData: CreateUserRequest = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await authService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should throw error when creating user with existing email', async () => {
      const userData: CreateUserRequest = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!'
      };

      await authService.createUser(userData);

      await expect(authService.createUser(userData))
        .rejects
        .toThrow('User already exists with this email');
    });

    it('should create user without optional fields', async () => {
      const userData: CreateUserRequest = {
        email: 'minimal@example.com',
        password: 'TestPassword123!'
      };

      const user = await authService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBeUndefined();
      expect(user.lastName).toBeUndefined();
    });
  });

  describe('authenticateUser', () => {
    beforeEach(async () => {
      // Create a test user
      await authService.createUser({
        email: 'auth@example.com',
        password: 'TestPassword123!',
        firstName: 'Auth',
        lastName: 'User'
      });
    });

    it('should authenticate user with correct credentials', async () => {
      const loginData: LoginRequest = {
        email: 'auth@example.com',
        password: 'TestPassword123!'
      };

      const result = await authService.authenticateUser(loginData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error with incorrect email', async () => {
      const loginData: LoginRequest = {
        email: 'wrong@example.com',
        password: 'TestPassword123!'
      };

      await expect(authService.authenticateUser(loginData))
        .rejects
        .toThrow('Invalid email or password');
    });

    it('should throw error with incorrect password', async () => {
      const loginData: LoginRequest = {
        email: 'auth@example.com',
        password: 'WrongPassword123!'
      };

      await expect(authService.authenticateUser(loginData))
        .rejects
        .toThrow('Invalid email or password');
    });
  });

  describe('refreshAccessToken', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create and authenticate a user to get refresh token
      const user = await authService.createUser({
        email: 'refresh@example.com',
        password: 'TestPassword123!'
      });
      userId = user.id;

      const authResult = await authService.authenticateUser({
        email: 'refresh@example.com',
        password: 'TestPassword123!'
      });
      refreshToken = authResult.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken); // Should be a new token
    });

    it('should throw error with invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      await expect(authService.refreshAccessToken(invalidToken))
        .rejects
        .toThrow('Invalid or expired refresh token');
    });
  });

  describe('verifyAccessToken', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and authenticate a user to get access token
      await authService.createUser({
        email: 'verify@example.com',
        password: 'TestPassword123!'
      });

      const authResult = await authService.authenticateUser({
        email: 'verify@example.com',
        password: 'TestPassword123!'
      });
      accessToken = authResult.accessToken;
    });

    it('should verify valid access token', () => {
      const payload = authService.verifyAccessToken(accessToken);

      expect(payload).toBeDefined();
      expect(payload.userId).toBeDefined();
      expect(payload.email).toBe('verify@example.com');
      expect(payload.role).toBe('user');
      expect(payload.permissions).toContain('read:profile');
    });

    it('should throw error with invalid access token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => authService.verifyAccessToken(invalidToken))
        .toThrow('Invalid or expired access token');
    });
  });

  describe('changePassword', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await authService.createUser({
        email: 'password@example.com',
        password: 'OldPassword123!'
      });
      userId = user.id;
    });

    it('should change password with correct current password', async () => {
      await expect(
        authService.changePassword(userId, 'OldPassword123!', 'NewPassword123!')
      ).resolves.not.toThrow();

      // Verify new password works
      const loginResult = await authService.authenticateUser({
        email: 'password@example.com',
        password: 'NewPassword123!'
      });
      expect(loginResult).toBeDefined();
    });

    it('should throw error with incorrect current password', async () => {
      await expect(
        authService.changePassword(userId, 'WrongPassword123!', 'NewPassword123!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error with non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      await expect(
        authService.changePassword(fakeUserId, 'OldPassword123!', 'NewPassword123!')
      ).rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await authService.createUser({
        email: 'logout@example.com',
        password: 'TestPassword123!'
      });

      const authResult = await authService.authenticateUser({
        email: 'logout@example.com',
        password: 'TestPassword123!'
      });
      refreshToken = authResult.refreshToken;
    });

    it('should logout successfully', async () => {
      await expect(authService.logout(refreshToken)).resolves.not.toThrow();

      // Verify refresh token is invalidated
      await expect(authService.refreshAccessToken(refreshToken))
        .rejects
        .toThrow('Invalid or expired refresh token');
    });
  });

  describe('resetPassword', () => {
    beforeEach(async () => {
      await authService.createUser({
        email: 'reset@example.com',
        password: 'TestPassword123!'
      });
    });

    it('should handle password reset for existing email', async () => {
      await expect(authService.resetPassword('reset@example.com'))
        .resolves.not.toThrow();
    });

    it('should handle password reset for non-existing email', async () => {
      await expect(authService.resetPassword('nonexistent@example.com'))
        .resolves.not.toThrow();
    });
  });
});