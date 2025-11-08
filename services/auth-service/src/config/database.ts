import { Pool } from 'pg';
import { logger } from './logger';

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'growup',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'root123',
      max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('connect', () => {
      logger.info('Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
      logger.error('PostgreSQL connection error:', err);
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error:', { text, error });
    throw error;
  }
};

export const getClient = async () => {
  return await getPool().connect();
};

// For testing: allow resetting the pool
export const resetPool = () => {
  if (pool) {
    pool.end();
    pool = null;
  }
};

export default getPool();