import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), config.logging.file.path);

// Configure transports
const transports: winston.transport[] = [];

// Console transport
if (config.logging.console.enabled) {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// File transports
if (config.logging.file.enabled) {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Access log file for HTTP requests
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
    })
  );

  // SQL query log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'sql-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'debug',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'billing-app-server',
    version: config.version,
    environment: config.env,
  },
  transports,
  exitOnError: false,
});

// Create access logger for HTTP requests
export const accessLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: 'billing-app-server',
    type: 'access',
  },
  transports: config.logging.file.enabled ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
    })
  ] : [],
});

// Create SQL logger for database queries
export const sqlLogger = winston.createLogger({
  level: 'debug',
  format: logFormat,
  defaultMeta: {
    service: 'billing-app-server',
    type: 'sql',
  },
  transports: config.logging.file.enabled ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'sql-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
    })
  ] : [],
});

// Create audit logger for security events
export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: 'billing-app-server',
    type: 'audit',
  },
  transports: config.logging.file.enabled ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
    })
  ] : [],
});

// Create performance logger for timing and metrics
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: 'billing-app-server',
    type: 'performance',
  },
  transports: config.logging.file.enabled ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
    })
  ] : [],
});

// Logging utility functions
export const logRequest = (req: any, res: any, responseTime: number) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || 'anonymous',
    requestId: req.id || 'unknown',
    timestamp: new Date().toISOString(),
  };

  accessLogger.info('HTTP Request', logData);
};

export const logError = (error: Error, context?: any) => {
  const logData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString(),
  };

  logger.error('Application Error', logData);
};

export const logSecurity = (event: string, details: any) => {
  const logData = {
    event,
    details,
    timestamp: new Date().toISOString(),
  };

  auditLogger.info('Security Event', logData);
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString(),
  };

  performanceLogger.info('Performance Metric', logData);
};

export const logSQL = (query: string, params: any, duration: number) => {
  const logData = {
    query,
    params,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  };

  sqlLogger.debug('SQL Query', logData);
};

// Log levels
export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Export logger instance for direct use
export default logger;
