import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { logger } from '../config/logger';

// Test database instance
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:root123@localhost:5432/mydb',
    },
  },
});

// Setup test database
beforeAll(async () => {
  try {
    // Connect to test database first
    await testPrisma.$connect();
    logger.info('Test database connected');
    
    // Clean existing data instead of resetting schema
    // This is faster and doesn't interfere with other test suites
    await testPrisma.emailVerificationToken.deleteMany();
    await testPrisma.passwordResetToken.deleteMany();
    await testPrisma.session.deleteMany();
    await testPrisma.userPreferences.deleteMany();
    await testPrisma.user.deleteMany();
    
    logger.info('Test database cleaned');
  } catch (error) {
    logger.error('Failed to setup test database:', error);
    // If tables don't exist, try to create schema
    try {
      logger.info('Attempting to create database schema...');
      execSync('npx prisma db push --skip-generate', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:root123@localhost:5432/mydb',
        },
        stdio: 'inherit',
      });
      await testPrisma.$connect();
      logger.info('Database schema created successfully');
    } catch (schemaError) {
      logger.error('Failed to create database schema:', schemaError);
      throw schemaError;
    }
  }
});

// Cleanup after each test
afterEach(async () => {
  try {
    // Clean up test data in reverse order of dependencies
    await testPrisma.emailVerificationToken.deleteMany();
    await testPrisma.passwordResetToken.deleteMany();
    await testPrisma.session.deleteMany();
    await testPrisma.userPreferences.deleteMany();
    await testPrisma.user.deleteMany();
  } catch (error) {
    logger.error('Failed to cleanup test data:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await testPrisma.$disconnect();
    logger.info('Test database disconnected');
  } catch (error) {
    logger.error('Failed to disconnect test database:', error);
  }
});

// Test data factories
export const createTestUser = async (overrides: any = {}) => {
  return await testPrisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uDfG',
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
      isActive: true,
      ...overrides,
    },
  });
};

export const createTestUserPreferences = async (userId: string, overrides: any = {}) => {
  return await testPrisma.userPreferences.create({
    data: {
      userId,
      skinType: 'normal',
      hairType: 'straight',
      preferredLanguage: 'en',
      notificationSettings: { pushNotifications: true },
      privacySettings: { profileVisibility: 'public' },
      appPreferences: { theme: 'light' },
      ...overrides,
    },
  });
};