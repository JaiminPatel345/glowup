// PostgreSQL Database Connection Utility
const { Pool } = require('pg');

class PostgreSQLConnection {
  constructor() {
    this.pool = null;
  }

  async connect() {
    if (this.pool) {
      return this.pool;
    }

    const config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'growup',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'root123',
      max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);

    // Test connection
    try {
      const client = await this.pool.connect();
      console.log('PostgreSQL connected successfully');
      client.release();
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw error;
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });

    return this.pool;
  }

  async query(text, params) {
    if (!this.pool) {
      await this.connect();
    }
    
    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async getClient() {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL connection closed');
    }
  }

  // Migration utilities
  async runMigration(migrationSQL) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('Migration executed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkConnection() {
    try {
      const result = await this.query('SELECT NOW()');
      return { connected: true, timestamp: result.rows[0].now };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

// Singleton instance
const postgresConnection = new PostgreSQLConnection();

module.exports = {
  PostgreSQLConnection,
  db: postgresConnection
};
