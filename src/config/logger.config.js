const path = require('path');

const config = {
  // Default logging level, can be overridden by environment variable
  level: process.env.LOG_LEVEL || 'info',

  // Console logging configuration
  console: {
    enabled: process.env.NODE_ENV !== 'production',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: 'text', // 'text' for readable format, 'json' for structured format
  },

  // File logging configuration
  file: {
    enabled: true,
    directory: path.join(process.cwd(), 'logs'),
    combined: {
      filename: 'combined.log',
      level: 'info',
      maxSize: '10m', // 10 megabytes
      maxFiles: 5,
      format: 'json',
    },
    error: {
      filename: 'error.log',
      level: 'error',
      maxSize: '10m',
      maxFiles: 5,
      format: 'json',
    },
    exceptions: {
      filename: 'exceptions.log',
      maxSize: '10m',
      maxFiles: 5,
    },
  },

  // Request logging configuration
  request: {
    enabled: true,
    excludePaths: [
      '/health',
      '/metrics',
      '/favicon.ico'
    ],
    excludeMethods: [],
    includeBody: process.env.NODE_ENV !== 'production',
    includeSensitive: false, // Don't log sensitive headers/body fields
    sensitiveFields: [
      'password',
      'token',
      'authorization',
      'cookie',
      'api-key',
    ],
  },

  // Performance logging configuration
  performance: {
    enabled: true,
    slowRequestThreshold: 1000, // Log requests taking longer than 1 second
    slowQueryThreshold: 100,    // Log database queries taking longer than 100ms
  },

  // Audit logging configuration
  audit: {
    enabled: true,
    events: [
      'login',
      'logout',
      'create',
      'update',
      'delete',
      'permission-change',
    ],
  },
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  config.file.combined.compress = true;
  config.file.error.compress = true;
  config.request.includeBody = false;
}

// Validation function to ensure required directories exist
const validateConfig = () => {
  if (config.file.enabled) {
    const fs = require('fs');
    const logDir = config.file.directory;
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
};

module.exports = {
  config,
  validateConfig,
};