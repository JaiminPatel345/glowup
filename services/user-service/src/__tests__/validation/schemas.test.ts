import {
  createUserProfileSchema,
  updateUserProfileSchema,
  createUserPreferencesSchema,
  updateUserPreferencesSchema,
  paginationSchema,
  userIdSchema,
  fileUploadSchema,
} from '../../validation/schemas';
import { SkinType, HairType } from '../../types';

describe('Validation Schemas', () => {
  describe('createUserProfileSchema', () => {
    it('should validate valid user profile data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        profileImageUrl: 'https://example.com/image.jpg',
      };

      const result = createUserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const validData = {};

      const result = createUserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        profileImageUrl: 'not-a-url',
      };

      const result = createUserProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty strings', () => {
      const invalidData = {
        firstName: '',
        lastName: '',
      };

      const result = createUserProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject strings that are too long', () => {
      const invalidData = {
        firstName: 'a'.repeat(101), // Max is 100
      };

      const result = createUserProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserProfileSchema', () => {
    it('should validate partial updates', () => {
      const validData = {
        firstName: 'Updated',
      };

      const result = updateUserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('createUserPreferencesSchema', () => {
    it('should validate valid preferences data', () => {
      const validData = {
        skinType: SkinType.OILY,
        hairType: HairType.CURLY,
        preferredLanguage: 'es',
        notificationSettings: { pushNotifications: true },
        privacySettings: { profileVisibility: 'private' },
        appPreferences: { theme: 'dark' },
      };

      const result = createUserPreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow empty preferences', () => {
      const validData = {};

      const result = createUserPreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid skin type', () => {
      const invalidData = {
        skinType: 'invalid-skin-type',
      };

      const result = createUserPreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid hair type', () => {
      const invalidData = {
        hairType: 'invalid-hair-type',
      };

      const result = createUserPreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid language code', () => {
      const invalidData = {
        preferredLanguage: 'x', // Too short
      };

      const result = createUserPreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject language code that is too long', () => {
      const invalidData = {
        preferredLanguage: 'this-is-too-long', // Max is 10
      };

      const result = createUserPreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserPreferencesSchema', () => {
    it('should validate partial preference updates', () => {
      const validData = {
        skinType: SkinType.DRY,
        notificationSettings: { emailNotifications: false },
      };

      const result = updateUserPreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination parameters', () => {
      const validData = {
        page: '2',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      };

      const result = paginationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should use default values', () => {
      const validData = {};

      const result = paginationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should reject invalid page number', () => {
      const invalidData = {
        page: '0', // Must be >= 1
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject limit that is too high', () => {
      const invalidData = {
        limit: '101', // Max is 100
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid sort order', () => {
      const invalidData = {
        sortOrder: 'invalid',
      };

      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('userIdSchema', () => {
    it('should validate valid UUID', () => {
      const validData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = userIdSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        userId: 'not-a-uuid',
      };

      const result = userIdSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing userId', () => {
      const invalidData = {};

      const result = userIdSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('fileUploadSchema', () => {
    it('should validate valid image file', () => {
      const validFile = {
        fieldname: 'profileImage',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      const result = fileUploadSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should reject non-image files', () => {
      const invalidFile = {
        fieldname: 'profileImage',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = fileUploadSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('should reject files that are too large', () => {
      const invalidFile = {
        fieldname: 'profileImage',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB (max is 5MB)
      };

      const result = fileUploadSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });
  });

  describe('Enum validations', () => {
    it('should validate all skin types', () => {
      const skinTypes = Object.values(SkinType);
      
      skinTypes.forEach(skinType => {
        const result = createUserPreferencesSchema.safeParse({ skinType });
        expect(result.success).toBe(true);
      });
    });

    it('should validate all hair types', () => {
      const hairTypes = Object.values(HairType);
      
      hairTypes.forEach(hairType => {
        const result = createUserPreferencesSchema.safeParse({ hairType });
        expect(result.success).toBe(true);
      });
    });
  });
});