import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { logger } from './logger';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'growup',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'growup_dev_password',
});

export const auth = betterAuth({
  database: {
    provider: 'pg',
    connection: pool,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  jwt: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
  plugins: [],
  logger: {
    level: process.env.LOG_LEVEL as any || 'info',
    disabled: process.env.NODE_ENV === 'test',
  },
});

export type Auth = typeof auth;