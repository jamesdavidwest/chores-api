// src/middleware/responseHandler.js

const ResponseFormatter = require('../utils/responseFormatter');
const LoggerService = require('../services/LoggerService');
const responseConfig = require('../config/response.config');

const responseHandler = (req, res, next) => {
  // Store the original res.json function
  const originalJson = res.json;
  const logger = LoggerService.getInstance();
  
  // Override res.json to format all responses
  res.json = function(body) {
    let response;
    
    // If the response is already formatted, send it as is
    if (body && (body.hasOwnProperty('success') && body.hasOwnProperty('metadata'))) {
      response = body;
    } else {
      // Format successful responses
      response = ResponseFormatter.success(body, {
        requestId: req.id, // Set by requestLogger middleware
        path: req.path,
        method: req.method,
      });
    }

    // Log the response if it's an error
    if (!response.success) {
      logger.error('API Error Response', {
        error: response.error,
        path: req.path,
        method: req.method,
        requestId: req.id,
      });
    } else if (process.env.NODE_ENV !== 'production') {
      // In non-production, log all responses for debugging
      logger.debug('API Response', {
        path: req.path,
        method: req.method,
        requestId: req.id,
        statusCode: res.statusCode,
      });
    }

    // Call the original json function with our formatted response
    return originalJson.call(this, response);
  };

  // Add convenience methods for common response patterns
  res.success = function(data, metadata = {}) {
    return res.json(ResponseFormatter.success(data, { ...metadata, requestId: req.id }));
  };

  res.error = function(error, metadata = {}) {
    return res.json(ResponseFormatter.error(error, { ...metadata, requestId: req.id }));
  };

  res.paginated = function(data, paginationData) {
    return res.json(ResponseFormatter.withPagination(data, {
      ...paginationData,
      requestId: req.id,
    }));
  };

  next();
};

module.exports = responseHandler;