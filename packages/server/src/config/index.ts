import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  version: process.env.APP_VERSION || '1.0.0',

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/accounting',
    sqliteUrl: process.env.SQLITE_DATABASE_URL || 'file:./dev.db',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000', 10),
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000', 10),
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200', 10),
    }
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'billing_app:',
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'billing-app',
    audience: process.env.JWT_AUDIENCE || 'billing-app-users',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain'
    ],
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    tempDir: process.env.TEMP_DIR || 'temp',
  },

  // Email configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@billingapp.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@billingapp.com',
  },

  // File storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
    local: {
      path: process.env.LOCAL_STORAGE_PATH || 'storage',
    },
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: process.env.AWS_S3_ENDPOINT,
    },
    gcs: {
      bucket: process.env.GCS_BUCKET,
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILENAME,
    },
  },

  // Payment gateway configuration
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      mode: process.env.PAYPAL_MODE || 'sandbox', // sandbox or live
    },
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    mfa: {
      issuer: process.env.MFA_ISSUER || 'BillingApp',
      algorithm: 'sha1',
      digits: 6,
      period: 30,
      window: 1,
    },
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90', 10), // days
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || 'logs',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      colorize: process.env.LOG_CONSOLE_COLORIZE === 'true',
    },
  },

  // Queue configuration
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10),
      password: process.env.QUEUE_REDIS_PASSWORD,
      db: parseInt(process.env.QUEUE_REDIS_DB || '1', 10),
    },
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE || '100', 10),
      removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL || '50', 10),
      attempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000', 10),
      },
    },
  },

  // Cache configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10), // 10 minutes
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10),
  },

  // API configuration
  api: {
    version: 'v1',
    prefix: '/api/v1',
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
    pagination: {
      defaultLimit: parseInt(process.env.API_DEFAULT_LIMIT || '20', 10),
      maxLimit: parseInt(process.env.API_MAX_LIMIT || '100', 10),
    },
  },

  // WebSocket configuration
  websocket: {
    cors: {
      origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  },

  // Cron jobs configuration
  cron: {
    enabled: process.env.CRON_ENABLED === 'true',
    timezone: process.env.CRON_TIMEZONE || 'UTC',
    jobs: {
      cleanup: process.env.CRON_CLEANUP || '0 2 * * *', // Daily at 2 AM
      backup: process.env.CRON_BACKUP || '0 3 * * 0',  // Weekly on Sunday at 3 AM
      reports: process.env.CRON_REPORTS || '0 9 * * 1', // Weekly on Monday at 9 AM
    },
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      port: parseInt(process.env.METRICS_PORT || '9090', 10),
    },
    health: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    },
  },
} as const;

// Type for the config object
export type Config = typeof config;

// Validation function to check required environment variables
export const validateConfig = (): void => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate database URL format
  if (config.database.url && !config.database.url.startsWith('postgresql://')) {
    throw new Error('Invalid DATABASE_URL format. Must start with postgresql://');
  }

  // Validate Redis URL format
  if (config.redis.url && !config.redis.url.startsWith('redis://')) {
    throw new Error('Invalid REDIS_URL format. Must start with redis://');
  }

  // Validate port numbers
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Invalid PORT number. Must be between 1 and 65535');
  }

  // Validate JWT secrets
  if (config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (config.jwt.refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
};

// Export environment-specific configurations
export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';

// Export configuration helpers
export const getDatabaseConfig = () => config.database;
export const getRedisConfig = () => config.redis;
export const getJwtConfig = () => config.jwt;
export const getCorsConfig = () => config.cors;
export const getRateLimitConfig = () => config.rateLimit;
export const getUploadConfig = () => config.upload;
export const getEmailConfig = () => config.email;
export const getStorageConfig = () => config.storage;
export const getPaymentConfig = () => config.payment;
export const getSecurityConfig = () => config.security;
export const getLoggingConfig = () => config.logging;
export const getQueueConfig = () => config.queue;
export const getCacheConfig = () => config.cache;
export const getApiConfig = () => config.api;
export const getWebSocketConfig = () => config.websocket;
export const getCronConfig = () => config.cron;
export const getMonitoringConfig = () => config.monitoring;
