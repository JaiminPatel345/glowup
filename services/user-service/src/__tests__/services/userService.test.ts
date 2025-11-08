import { UserService } from '../../services/userService';
import { AppError } from '../../middleware/errorHandler';
import { testPrisma, createTestUser, createTestUserPreferences } from '../setup';
import { SkinType, HairType } from '../../types';

describe('UserService', () => {
  let userService: UserService;
  let testUser: any;

  beforeEach(async () => {
    userService = new UserService();
    testUser = await createTestUser();
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      const profile = await userService.getUserProfile(testUser.id);

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(testUser.id);
      expect(profile?.email).toBe(testUser.email);
      expect(profile?.firstName).toBe(testUser.firstName);
      expect(profile?.lastName).toBe(testUser.lastName);
    });

    it('should return null when user does not exist', async () => {
      const profile = await userService.getUserProfile('non-existent-id');
      expect(profile).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        profileImageUrl: 'https://example.com/image.jpg',
      };

      const updatedProfile = await userService.updateUserProfile(testUser.id, updateData);

      expect(updatedProfile.firstName).toBe(updateData.firstName);
      expect(updatedProfile.lastName).toBe(updateData.lastName);
      expect(updatedProfile.profileImageUrl).toBe(updateData.profileImageUrl);
    });

    it('should throw error when user does not exist', async () => {
      const updateData = { firstName: 'Updated' };

      await expect(
        userService.updateUserProfile('non-existent-id', updateData)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when user is deactivated', async () => {
      const deactivatedUser = await createTestUser({
        email: 'deactivated@example.com',
        isActive: false,
      });

      const updateData = { firstName: 'Updated' };

      await expect(
        userService.updateUserProfile(deactivatedUser.id, updateData)
      ).rejects.toThrow('User account is deactivated');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      await userService.deactivateUser(testUser.id);

      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });

      expect(user?.isActive).toBe(false);
    });

    it('should throw error when user does not exist', async () => {
      await expect(
        userService.deactivateUser('non-existent-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when they exist', async () => {
      const testPreferences = await createTestUserPreferences(testUser.id);

      const preferences = await userService.getUserPreferences(testUser.id);

      expect(preferences).toBeDefined();
      expect(preferences?.userId).toBe(testUser.id);
      expect(preferences?.skinType).toBe(testPreferences.skinType);
    });

    it('should return null when preferences do not exist', async () => {
      const preferences = await userService.getUserPreferences(testUser.id);
      expect(preferences).toBeNull();
    });
  });

  describe('createUserPreferences', () => {
    it('should create user preferences successfully', async () => {
      const preferencesData = {
        skinType: SkinType.OILY,
        hairType: HairType.CURLY,
        preferredLanguage: 'es',
        notificationSettings: { pushNotifications: false },
        privacySettings: { profileVisibility: 'private' },
        appPreferences: { theme: 'dark' },
      };

      const preferences = await userService.createUserPreferences(testUser.id, preferencesData);

      expect(preferences.userId).toBe(testUser.id);
      expect(preferences.skinType).toBe(preferencesData.skinType);
      expect(preferences.hairType).toBe(preferencesData.hairType);
      expect(preferences.preferredLanguage).toBe(preferencesData.preferredLanguage);
    });

    it('should throw error when user does not exist', async () => {
      const preferencesData = { skinType: SkinType.NORMAL };

      await expect(
        userService.createUserPreferences('non-existent-id', preferencesData)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when preferences already exist', async () => {
      await createTestUserPreferences(testUser.id);
      const preferencesData = { skinType: SkinType.NORMAL };

      await expect(
        userService.createUserPreferences(testUser.id, preferencesData)
      ).rejects.toThrow('User preferences already exist');
    });

    it('should throw error when user is deactivated', async () => {
      const deactivatedUser = await createTestUser({
        email: 'deactivated@example.com',
        isActive: false,
      });

      const preferencesData = { skinType: SkinType.NORMAL };

      await expect(
        userService.createUserPreferences(deactivatedUser.id, preferencesData)
      ).rejects.toThrow('User account is deactivated');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      await createTestUserPreferences(testUser.id);

      const updateData = {
        skinType: SkinType.DRY,
        hairType: HairType.WAVY,
        notificationSettings: { emailNotifications: true },
      };

      const updatedPreferences = await userService.updateUserPreferences(testUser.id, updateData);

      expect(updatedPreferences.skinType).toBe(updateData.skinType);
      expect(updatedPreferences.hairType).toBe(updateData.hairType);
      expect(updatedPreferences.notificationSettings).toEqual(updateData.notificationSettings);
    });

    it('should throw error when user does not exist', async () => {
      const updateData = { skinType: SkinType.NORMAL };

      await expect(
        userService.updateUserPreferences('non-existent-id', updateData)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when preferences do not exist', async () => {
      const updateData = { skinType: SkinType.NORMAL };

      await expect(
        userService.updateUserPreferences(testUser.id, updateData)
      ).rejects.toThrow('User preferences not found');
    });
  });

  describe('deleteUserPreferences', () => {
    it('should delete user preferences successfully', async () => {
      await createTestUserPreferences(testUser.id);

      await userService.deleteUserPreferences(testUser.id);

      const preferences = await testPrisma.userPreferences.findUnique({
        where: { userId: testUser.id },
      });

      expect(preferences).toBeNull();
    });

    it('should throw error when preferences do not exist', async () => {
      await expect(
        userService.deleteUserPreferences(testUser.id)
      ).rejects.toThrow('User preferences not found');
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users list', async () => {
      // Create additional test users
      await createTestUser({ email: 'user2@example.com' });
      await createTestUser({ email: 'user3@example.com' });

      const result = await userService.getAllUsers({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should handle sorting', async () => {
      const user2 = await createTestUser({ 
        email: 'user2@example.com',
        firstName: 'Alpha',
      });
      const user3 = await createTestUser({ 
        email: 'user3@example.com',
        firstName: 'Zeta',
      });

      const result = await userService.getAllUsers({
        page: 1,
        limit: 10,
        sortBy: 'firstName',
        sortOrder: 'asc',
      });

      expect(result.data[0].firstName).toBe('Alpha');
      expect(result.data[result.data.length - 1].firstName).toBe('Zeta');
    });
  });

  describe('getUserWithPreferences', () => {
    it('should return user with preferences when both exist', async () => {
      await createTestUserPreferences(testUser.id);

      const result = await userService.getUserWithPreferences(testUser.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUser.id);
      expect(result?.preferences).toBeDefined();
      expect(result?.preferences?.userId).toBe(testUser.id);
    });

    it('should return user without preferences when preferences do not exist', async () => {
      const result = await userService.getUserWithPreferences(testUser.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUser.id);
      expect(result?.preferences).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      const result = await userService.getUserWithPreferences('non-existent-id');
      expect(result).toBeNull();
    });
  });
});