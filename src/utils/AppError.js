const { formatErrorMessage } = require('./errorTypes');

class AppError extends Error {
  constructor(errorType, service, method, details = null) {
    // Create specific, detailed error message
    const message = formatErrorMessage(errorType, service, method, details);
    super(message);

    this.statusCode = errorType.statusCode;
    this.code = errorType.code;
    this.details = details;
    this.service = service;
    this.method = method;
    this.status = `${errorType.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  // Helper method to get full error context
  getErrorContext() {
    return {
      service: this.service,
      method: this.method,
      details: this.details,
      timestamp: new Date().toISOString(),
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

module.exports = AppError;
