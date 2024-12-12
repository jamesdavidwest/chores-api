const winston = require('winston');
require('winston-daily-rotate-file');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;
const { config, validateConfig } = require('../config/logger.config');

class LoggerService {
  constructor() {
    validateConfig();
    this.logger = this.initializeLogger();
  }

  initializeLogger() {
    // Define log levels with HTTP level
    const logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4
    };

    // Custom format for console output (development)
    const consoleFormat = combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      printf(({ timestamp, level, message, ...metadata }) => {
        let meta = '';
        if (Object.keys(metadata).length > 0) {
          meta = '\n' + JSON.stringify(metadata, null, 2);
        }
        return `${timestamp} [${level}]: ${message}${meta}`;
      })
    );

    // JSON format for file output
    const fileFormat = combine(
      timestamp(),
      json()
    );

    const loggerTransports = [];

    // Console transport (development)
    if (config.console.enabled) {
      loggerTransports.push(
        new transports.Console({
          level: config.console.level,
          format: consoleFormat
        })
      );
    }

    // File transports
    if (config.file.enabled) {
      // Combined logs
      loggerTransports.push(
        new transports.DailyRotateFile({
          filename: `${config.file.directory}/${config.file.combined.filename}-%DATE%`,
          datePattern: 'YYYY-MM-DD',
          level: config.file.combined.level,
          maxSize: config.file.combined.maxSize,
          maxFiles: config.file.combined.maxFiles,
          format: fileFormat,
          zippedArchive: config.file.combined.compress
        })
      );

      // Error logs
      loggerTransports.push(
        new transports.DailyRotateFile({
          filename: `${config.file.directory}/${config.file.error.filename}-%DATE%`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: config.file.error.maxSize,
          maxFiles: config.file.error.maxFiles,
          format: fileFormat,
          zippedArchive: config.file.error.compress
        })
      );
    }

    return createLogger({
      levels: logLevels,
      level: config.level,
      transports: loggerTransports,
      exitOnError: false
    });
  }

  // Core logging methods
  error(message, metadata = {}) {
    if (message instanceof Error) {
      metadata.error = this.formatError(message);
      message = message.message;
    }
    this.logger.error(message, metadata);
  }

  warn(message, metadata = {}) {
    this.logger.warn(message, metadata);
  }

  info(message, metadata = {}) {
    this.logger.info(message, metadata);
  }

  http(message, metadata = {}) {
    this.logger.http(message, metadata);
  }

  debug(message, metadata = {}) {
    this.logger.debug(message, metadata);
  }

  // Specialized logging methods
  logRequest(req, res, duration) {
    if (this.shouldSkipPath(req.path)) return;

    const metadata = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    };

    if (config.request.includeBody && !this.containsSensitiveData(req.body)) {
      metadata.body = req.body;
    }

    const level = res.statusCode >= 400 ? 'warn' : 'http';
    this.logger[level](`${req.method} ${req.originalUrl}`, metadata);
  }

  logError(error, req = null) {
    const errorMeta = {
      error: this.formatError(error),
      timestamp: new Date().toISOString()
    };

    if (req) {
      errorMeta.request = {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id,
        ip: req.ip
      };
    }

    this.error(error.message, errorMeta);
  }

  logDatabase(operation, duration, success, error = null) {
    const metadata = {
      operation,
      duration: `${duration}ms`,
      success
    };

    if (!success && error) {
      metadata.error = this.formatError(error);
    }

    if (duration > config.performance.slowQueryThreshold) {
      this.warn('Slow database query detected', metadata);
    } else {
      this.debug('Database operation', metadata);
    }
  }

  logAudit(action, userId, details = {}) {
    if (!config.audit.enabled || !config.audit.events.includes(action)) return;

    this.info('Audit event', {
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Utility methods
  formatError(error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code,
      statusCode: error.statusCode
    };
  }

  shouldSkipPath(path) {
    return config.request.excludePaths.some(excludePath => 
      path.startsWith(excludePath)
    );
  }

  containsSensitiveData(obj) {
    if (!obj) return false;
    return config.request.sensitiveFields.some(field => 
      Object.keys(obj).includes(field)
    );
  }
}

// Export singleton instance
module.exports = new LoggerService();