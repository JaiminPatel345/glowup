/**
 * Backend Integration Tests
 * 
 * These tests verify that the mobile app correctly integrates with backend services.
 * Run these tests against a running backend instance.
 * 
 * Setup:
 * 1. Start backend services: docker-compose up
 * 2. Set API_BASE_URL environment variable if needed
 * 3. Run tests: npm test -- backendIntegration.test.ts
 */

import { AuthApi } from '../../api/auth';
import { UserApi } from '../../api/user';
import { SkinAnalysisApi } from '../../api/skin';
import { HairTryOnApi } from '../../api/hair';

// Test configuration
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test123!@#',
  firstName: 'Test',
  lastName: 'User',
};

let authToken: string;
let userId: string;

describe('Backend Integration Tests', () => {
  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await AuthApi.register(TEST_USER);
      
      expect(response).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe(TEST_USER.email);
      expect(response.token).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      
      // Store for subsequent tests
      authToken = response.token;
      userId = response.user.id;
    }, 10000);

    it('should login with credentials', async () => {
      const response = await AuthApi.login({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      
      expect(response).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.token).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      
      authToken = response.token;
      userId = response.user.id;
    }, 10000);

    it('should validate token', async () => {
      const isValid = await AuthApi.verifyToken();
      expect(isValid).toBe(true);
    }, 10000);

    it('should refresh token', async () => {
      const loginResponse = await AuthApi.login({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      
      const response = await AuthApi.refreshToken(loginResponse.refreshToken);
      
      expect(response).toBeDefined();
      expect(response.token).toBeDefined();
      expect(response.token).not.toBe(loginResponse.token);
    }, 10000);
  });

  describe('User Management', () => {
    it('should get user profile', async () => {
      const profile = await UserApi.getProfile(userId);
      
      expect(profile).toBeDefined();
      expect(profile.id).toBe(userId);
      expect(profile.email).toBe(TEST_USER.email);
      expect(profile.firstName).toBe(TEST_USER.firstName);
    }, 10000);

    it('should update user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      
      const updatedProfile = await UserApi.updateProfile(userId, updates);
      
      expect(updatedProfile).toBeDefined();
      expect(updatedProfile.firstName).toBe(updates.firstName);
      expect(updatedProfile.lastName).toBe(updates.lastName);
    }, 10000);

    it('should get user preferences', async () => {
      const preferences = await UserApi.getPreferences(userId);
      
      expect(preferences).toBeDefined();
    }, 10000);

    it('should update user preferences', async () => {
      const updates = {
        skinType: 'oily',
        hairType: 'curly',
      };
      
      const updatedPreferences = await UserApi.updatePreferences(userId, updates);
      
      expect(updatedPreferences).toBeDefined();
      expect(updatedPreferences.skinType).toBe(updates.skinType);
      expect(updatedPreferences.hairType).toBe(updates.hairType);
    }, 10000);
  });

  describe('Skin Analysis Service', () => {
    it('should analyze skin image', async () => {
      // Create a mock image FormData
      const formData = new FormData();
      const mockImageBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
      formData.append('image', mockImageBlob, 'test.jpg');
      
      const result = await SkinAnalysisApi.analyzeImage(formData, userId);
      
      expect(result).toBeDefined();
      expect(result.skinType).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.analysisMetadata).toBeDefined();
    }, 30000);

    it('should get analysis history', async () => {
      const history = await SkinAnalysisApi.getAnalysisHistory(userId, 10, 0);
      
      expect(Array.isArray(history)).toBe(true);
    }, 10000);

    it('should get product recommendations', async () => {
      // First, analyze an image to get issues
      const formData = new FormData();
      const mockImageBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
      formData.append('image', mockImageBlob, 'test.jpg');
      
      const analysisResult = await SkinAnalysisApi.analyzeImage(formData, userId);
      
      if (analysisResult.issues.length > 0) {
        const issueId = analysisResult.issues[0].id;
        const recommendations = await SkinAnalysisApi.getProductRecommendations(issueId);
        
        expect(recommendations).toBeDefined();
        expect(recommendations.issueId).toBe(issueId);
        expect(Array.isArray(recommendations.ayurvedicProducts)).toBe(true);
      }
    }, 30000);
  });

  describe('Hair Try-On Service', () => {
    it('should get default hairstyles', async () => {
      const hairstyles = await HairTryOnApi.getDefaultHairstyles(20);
      
      expect(Array.isArray(hairstyles)).toBe(true);
      if (hairstyles.length > 0) {
        expect(hairstyles[0]).toHaveProperty('id');
        expect(hairstyles[0]).toHaveProperty('preview_image_url');
        expect(hairstyles[0]).toHaveProperty('style_name');
      }
    }, 10000);

    it('should get hairstyle by ID', async () => {
      const hairstyles = await HairTryOnApi.getDefaultHairstyles(1);
      
      if (hairstyles.length > 0) {
        const hairstyleId = hairstyles[0].id;
        const hairstyle = await HairTryOnApi.getHairstyleById(hairstyleId);
        
        expect(hairstyle).toBeDefined();
        expect(hairstyle.id).toBe(hairstyleId);
      }
    }, 10000);

    it('should process hair try-on', async () => {
      // Get a default hairstyle
      const hairstyles = await HairTryOnApi.getDefaultHairstyles(1);
      expect(hairstyles.length).toBeGreaterThan(0);
      
      // Create mock user photo
      const mockUserPhoto = new Blob(['mock user photo'], { type: 'image/jpeg' });
      
      const resultBlob = await HairTryOnApi.processHairTryOn({
        userPhoto: mockUserPhoto,
        hairstyleId: hairstyles[0].id,
        userId: userId,
        blendRatio: 0.8,
      });
      
      expect(resultBlob).toBeDefined();
      expect(resultBlob instanceof Blob).toBe(true);
    }, 60000);

    it('should get hair try-on history', async () => {
      const history = await HairTryOnApi.getHairTryOnHistory(userId, 10, 0);
      
      expect(Array.isArray(history)).toBe(true);
    }, 10000);

    it('should check service health', async () => {
      const health = await HairTryOnApi.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle invalid credentials', async () => {
      await expect(
        AuthApi.login({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    }, 10000);

    it('should handle unauthorized requests', async () => {
      // Clear auth token temporarily
      const originalToken = authToken;
      authToken = '';
      
      await expect(
        UserApi.getProfile(userId)
      ).rejects.toThrow();
      
      // Restore token
      authToken = originalToken;
    }, 10000);

    it('should handle invalid user ID', async () => {
      await expect(
        UserApi.getProfile('invalid-user-id')
      ).rejects.toThrow();
    }, 10000);

    it('should handle missing required fields', async () => {
      await expect(
        AuthApi.register({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
        })
      ).rejects.toThrow();
    }, 10000);
  });

  describe('Cleanup', () => {
    it('should logout user', async () => {
      await expect(AuthApi.logout()).resolves.not.toThrow();
    }, 10000);
  });
});
