import dotenv from 'dotenv';
import { query } from '../config/database';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test setup
beforeAll(async () => {
  // Ensure test database is clean
  await cleanDatabase();
});

afterAll(async () => {
  // Clean up after all tests
  await cleanDatabase();
});

// Clean database helper
async function cleanDatabase() {
  try {
    await query('DELETE FROM sessions');
    await query('DELETE FROM users');
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
}

// Export helper for individual tests
export { cleanDatabase };