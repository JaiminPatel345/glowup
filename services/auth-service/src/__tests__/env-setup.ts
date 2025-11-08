import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
