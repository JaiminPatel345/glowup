const redis = require('redis');
const logger = require('../configs/logger');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect(redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
    try {
      this.client = redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Get value from cache
  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  // Set value in cache with TTL
  async set(key, value, ttlSeconds = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  // Delete key from cache
  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache delete');
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Set with expiration time
  async setWithExpiry(key, value, expiryTimestamp) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache set with expiry');
        return false;
      }
      await this.client.setEx(key, expiryTimestamp, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis SET with expiry error for key ${key}:`, error);
      return false;
    }
  }

  // Increment counter
  async incr(key, ttlSeconds = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping increment');
        return 0;
      }
      const result = await this.client.incr(key);
      if (result === 1) {
        // Set TTL only on first increment
        await this.client.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  // Hash operations for complex data
  async hset(key, field, value) {
    try {
      if (!this.isConnected) {
        return false;
      }
      await this.client.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      if (!this.isConnected) {
        return null;
      }
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      if (!this.isConnected) {
        return {};
      }
      const hash = await this.client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      return {};
    }
  }

  // Cache patterns for common use cases
  
  // User session caching
  async cacheUserSession(userId, sessionData, ttlSeconds = 86400) {
    const key = `session:${userId}`;
    return await this.set(key, sessionData, ttlSeconds);
  }

  async getUserSession(userId) {
    const key = `session:${userId}`;
    return await this.get(key);
  }

  async invalidateUserSession(userId) {
    const key = `session:${userId}`;
    return await this.del(key);
  }

  // Product recommendations caching
  async cacheProductRecommendations(issueId, products, ttlSeconds = 3600) {
    const key = `products:${issueId}`;
    return await this.set(key, products, ttlSeconds);
  }

  async getProductRecommendations(issueId) {
    const key = `products:${issueId}`;
    return await this.get(key);
  }

  // Skin analysis results caching
  async cacheSkinAnalysis(imageHash, results, ttlSeconds = 7200) {
    const key = `skin_analysis:${imageHash}`;
    return await this.set(key, results, ttlSeconds);
  }

  async getSkinAnalysis(imageHash) {
    const key = `skin_analysis:${imageHash}`;
    return await this.get(key);
  }

  // Rate limiting
  async checkRateLimit(identifier, limit, windowSeconds) {
    const key = `rate_limit:${identifier}`;
    const current = await this.incr(key, windowSeconds);
    return {
      allowed: current <= limit,
      current,
      limit,
      resetTime: Date.now() + (windowSeconds * 1000)
    };
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Redis client not connected' };
      }
      await this.client.ping();
      return { status: 'healthy', message: 'Redis connection is healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

// Singleton instance
const redisCache = new RedisCache();

module.exports = redisCache;