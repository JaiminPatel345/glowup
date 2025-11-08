import { query } from '../config/database';

// Global test setup
beforeAll(async () => {
  // Ensure test database is clean
  await cleanDatabase();
});

afterAll(async () => {
  // Clean up after all tests
  await cleanDatabase();
  
  // Close database pool to prevent hanging
  const { resetPool } = require('../config/database');
  resetPool();
});

// Clean database helper
export async function cleanDatabase() {
  try {
    // Delete in order to respect foreign keys
    await query('DELETE FROM password_reset_tokens');
    await query('DELETE FROM email_verification_tokens');
    await query('DELETE FROM sessions');
    await query('DELETE FROM user_preferences');
    await query('DELETE FROM users');

    // Reset any sequences if needed
    await query('ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE IF EXISTS sessions_id_seq RESTART WITH 1');
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
}

// Helper to wait for rate limit reset
export async function waitForRateLimit(ms: number = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}