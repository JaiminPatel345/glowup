const logger = require('../configs/logger');

class DatabaseOptimization {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * PostgreSQL optimization utilities
   */
  static getPostgreSQLOptimizations() {
    return {
      // Index creation queries for better performance
      indexes: [
        // Users table indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_updated_at ON users(updated_at);',
        
        // Sessions table indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);',
        
        // User preferences indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_skin_type ON user_preferences(skin_type);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_hair_type ON user_preferences(hair_type);',
        
        // Composite indexes for common queries
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_created ON users(email, created_at);'
      ],

      // Optimized queries
      queries: {
        // Get user with preferences in single query
        getUserWithPreferences: `
          SELECT 
            u.id, u.email, u.first_name, u.last_name, u.profile_image_url,
            u.created_at, u.updated_at,
            up.skin_type, up.hair_type, up.preferences
          FROM users u
          LEFT JOIN user_preferences up ON u.id = up.user_id
          WHERE u.id = $1
        `,

        // Get active sessions with user info
        getActiveSessionsWithUser: `
          SELECT 
            s.id, s.expires_at, s.created_at,
            u.id as user_id, u.email, u.first_name, u.last_name
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.expires_at > NOW()
          ORDER BY s.created_at DESC
        `,

        // Cleanup expired sessions
        cleanupExpiredSessions: `
          DELETE FROM sessions 
          WHERE expires_at < NOW()
        `,

        // Get user statistics
        getUserStats: `
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as users_last_24h,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as users_last_week
          FROM users
        `
      },

      // Connection pool settings
      poolConfig: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
        evict: 1000,
        handleDisconnects: true
      }
    };
  }

  /**
   * MongoDB optimization utilities
   */
  static getMongoDBOptimizations() {
    return {
      // Index creation for collections
      indexes: {
        skinAnalysis: [
          { userId: 1, createdAt: -1 },
          { 'issues.id': 1 },
          { skinType: 1 },
          { createdAt: -1 },
          { 'analysisMetadata.modelVersion': 1 }
        ],
        
        hairTryOn: [
          { userId: 1, createdAt: -1 },
          { type: 1, userId: 1 },
          { createdAt: -1 },
          { 'processingMetadata.modelVersion': 1 }
        ],
        
        productRecommendations: [
          { issueId: 1 },
          { lastUpdated: -1 },
          { 'products.isAyurvedic': 1 }
        ]
      },

      // Aggregation pipelines for common queries
      aggregations: {
        // Get user analysis summary
        getUserAnalysisSummary: [
          { $match: { userId: '{{userId}}' } },
          { $group: {
            _id: '$userId',
            totalAnalyses: { $sum: 1 },
            lastAnalysis: { $max: '$createdAt' },
            commonIssues: { $push: '$issues.name' }
          }},
          { $project: {
            totalAnalyses: 1,
            lastAnalysis: 1,
            commonIssues: { $slice: ['$commonIssues', 5] }
          }}
        ],

        // Get popular hairstyles
        getPopularHairstyles: [
          { $match: { type: 'video', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $group: {
            _id: '$styleImageUrl',
            count: { $sum: 1 },
            lastUsed: { $max: '$createdAt' }
          }},
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],

        // Get analysis performance metrics
        getAnalysisMetrics: [
          { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
          { $group: {
            _id: null,
            avgProcessingTime: { $avg: '$analysisMetadata.processingTime' },
            totalAnalyses: { $sum: 1 },
            avgImageQuality: { $avg: '$analysisMetadata.imageQuality' }
          }}
        ]
      },

      // Connection settings
      connectionOptions: {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    };
  }

  /**
   * Query caching mechanism
   */
  cacheQuery(key, result, ttl = this.cacheTimeout) {
    this.queryCache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl
    });

    // Clean up expired entries
    setTimeout(() => {
      this.queryCache.delete(key);
    }, ttl);
  }

  getCachedQuery(key) {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Generate cache key for queries
   */
  generateCacheKey(query, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `query:${Buffer.from(query).toString('base64')}:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Database health check utilities
   */
  static async checkPostgreSQLHealth(client) {
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      const stats = await client.query(`
        SELECT 
          count(*) as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);

      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].version,
        connections: stats.rows[0]
      };
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  static async checkMongoDBHealth(db) {
    try {
      const adminDb = db.admin();
      const status = await adminDb.ping();
      const stats = await db.stats();

      return {
        status: 'healthy',
        timestamp: new Date(),
        stats: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          storageSize: stats.storageSize
        }
      };
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Performance monitoring utilities
   */
  static createQueryLogger() {
    return {
      logSlowQuery: (query, duration, threshold = 1000) => {
        if (duration > threshold) {
          logger.warn(`Slow query detected (${duration}ms):`, {
            query: query.substring(0, 200),
            duration,
            threshold
          });
        }
      },

      logQueryStats: (stats) => {
        logger.info('Query statistics:', stats);
      }
    };
  }
}

module.exports = DatabaseOptimization;