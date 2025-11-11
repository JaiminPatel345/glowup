// Shared Environment Configuration Utility
// Provides centralized environment variable management across services

const path = require('path');
const fs = require('fs');

class EnvironmentConfig {
  constructor() {
    this.config = {};
    this.loadEnvironment();
  }

  loadEnvironment() {
    // Load from process.env
    this.config = { ...process.env };

    // Load from .env file if it exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = this.parseEnvFile(envContent);
      
      // Only set if not already defined in process.env
      Object.keys(envVars).forEach(key => {
        if (!this.config[key]) {
          this.config[key] = envVars[key];
        }
      });
    }
  }

  parseEnvFile(content) {
    const result = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }

      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  }

  get(key, defaultValue = undefined) {
    return this.config[key] || defaultValue;
  }

  getRequired(key) {
    const value = this.config[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  getInt(key, defaultValue = undefined) {
    const value = this.get(key, defaultValue);
    return value ? parseInt(value, 10) : defaultValue;
  }

  getFloat(key, defaultValue = undefined) {
    const value = this.get(key, defaultValue);
    return value ? parseFloat(value) : defaultValue;
  }

  getBool(key, defaultValue = false) {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  getArray(key, separator = ',', defaultValue = []) {
    const value = this.get(key);
    if (!value) return defaultValue;
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }

  // Database configuration helpers
  getDatabaseConfig() {
    return {
      postgres: {
        host: this.get('POSTGRES_HOST', 'localhost'),
        port: this.getInt('POSTGRES_PORT', 5432),
        database: this.get('POSTGRES_DB', 'growup'),
        user: this.get('POSTGRES_USER', 'postgres'),
        password: this.getRequired('POSTGRES_PASSWORD'),
        maxConnections: this.getInt('POSTGRES_MAX_CONNECTIONS', 20),
        ssl: this.getBool('POSTGRES_SSL', false)
      },
      mongodb: {
        uri: this.get('MONGODB_URI', 'mongodb://localhost:27017'),
        database: this.get('MONGODB_DB', 'growup'),
        maxPoolSize: this.getInt('MONGODB_MAX_POOL_SIZE', 10)
      },
      redis: {
        url: this.get('REDIS_URL', 'redis://localhost:6379')
      }
    };
  }

  // JWT configuration
  getJWTConfig() {
    return {
      secret: this.getRequired('JWT_SECRET'),
      expiresIn: this.get('JWT_EXPIRES_IN', '7d'),
      algorithm: this.get('JWT_ALGORITHM', 'HS256')
    };
  }

  // API configuration
  getAPIConfig() {
    return {
      port: this.getInt('API_PORT', 3000),
      skinServicePort: this.getInt('SKIN_SERVICE_PORT', 3003),
      hairServicePort: this.getInt('HAIR_SERVICE_PORT', 3004),
      gatewayPort: this.getInt('GATEWAY_PORT', 80),
      corsEnabled: this.getBool('ENABLE_CORS', true),
      rateLimitWindowMs: this.getInt('RATE_LIMIT_WINDOW_MS', 900000),
      rateLimitMaxRequests: this.getInt('RATE_LIMIT_MAX_REQUESTS', 100)
    };
  }

  // File upload configuration
  getUploadConfig() {
    return {
      maxFileSize: this.get('MAX_FILE_SIZE', '50MB'),
      uploadPath: this.get('UPLOAD_PATH', './uploads'),
      allowedImageTypes: this.getArray('ALLOWED_IMAGE_TYPES', ',', ['jpg', 'jpeg', 'png', 'webp']),
      allowedVideoTypes: this.getArray('ALLOWED_VIDEO_TYPES', ',', ['mp4', 'mov', 'avi'])
    };
  }

  // AI model configuration
  getModelConfig() {
    return {
      cacheDir: this.get('MODEL_CACHE_DIR', './models'),
      githubModelPriority: this.getBool('GITHUB_MODEL_PRIORITY', true),
      huggingfaceApiKey: this.get('HUGGINGFACE_API_KEY'),
      openaiApiKey: this.get('OPENAI_API_KEY')
    };
  }

  // Security configuration
  getSecurityConfig() {
    return {
      bcryptRounds: this.getInt('BCRYPT_ROUNDS', 12),
      sessionSecret: this.getRequired('SESSION_SECRET'),
      corsOrigins: this.getArray('CORS_ORIGINS', ',', ['http://localhost:3000'])
    };
  }

  // Email configuration
  getEmailConfig() {
    return {
      smtp: {
        host: this.get('SMTP_HOST'),
        port: this.getInt('SMTP_PORT', 587),
        user: this.get('SMTP_USER'),
        pass: this.get('SMTP_PASS'),
        secure: this.getBool('SMTP_SECURE', false)
      },
      fromEmail: this.get('FROM_EMAIL', 'noreply@growup.com')
    };
  }

  // Cloud storage configuration
  getStorageConfig() {
    return {
      aws: {
        accessKeyId: this.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.get('AWS_SECRET_ACCESS_KEY'),
        region: this.get('AWS_REGION', 'us-east-1'),
        s3Bucket: this.get('AWS_S3_BUCKET')
      }
    };
  }

  // Development/production helpers
  isDevelopment() {
    return this.get('NODE_ENV', 'development') === 'development';
  }

  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  isTest() {
    return this.get('NODE_ENV') === 'test';
  }

  // Validation helper
  validateRequired(requiredKeys) {
    const missing = [];
    
    for (const key of requiredKeys) {
      if (!this.config[key]) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Get all configuration as object
  getAll() {
    return { ...this.config };
  }

  // Service-specific configurations
  getAuthServiceConfig() {
    return {
      database: this.getDatabaseConfig().postgres,
      redis: this.getDatabaseConfig().redis,
      jwt: this.getJWTConfig(),
      api: this.getAPIConfig(),
      security: this.getSecurityConfig(),
      email: this.getEmailConfig()
    };
  }

  getSkinAnalysisServiceConfig() {
    return {
      database: this.getDatabaseConfig().mongodb,
      api: this.getAPIConfig(),
      upload: this.getUploadConfig(),
      models: this.getModelConfig(),
      storage: this.getStorageConfig()
    };
  }

  getHairTryOnServiceConfig() {
    return {
      database: this.getDatabaseConfig().mongodb,
      api: this.getAPIConfig(),
      upload: this.getUploadConfig(),
      models: this.getModelConfig(),
      storage: this.getStorageConfig(),
      websocket: {
        enabled: this.getBool('WEBSOCKET_ENABLED', true),
        maxConnections: this.getInt('WEBSOCKET_MAX_CONNECTIONS', 100)
      }
    };
  }
}

// Singleton instance
const env = new EnvironmentConfig();

module.exports = {
  EnvironmentConfig,
  env
};