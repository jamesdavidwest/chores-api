// src/middleware/responseHandler.js

const ResponseFormatter = require("../utils/responseFormatter");
const LoggerService = require("../services/LoggerService");
const responseConfig = require("../config/response.config");

const responseHandler = (req, res, next) => {
  // Store the original res.json function
  const originalJson = res.json;
  const logger = LoggerService.getInstance();

  // Override res.json to format all responses
  res.json = function (body) {
    let response;

    // If the response is already formatted, send it as is
    if (
      body &&
      Object.prototype.hasOwnProperty.call(body, "success") &&
      Object.prototype.hasOwnProperty.call(body, "metadata")
    ) {
      response = body;
    } else {
      // Format successful responses with configured metadata options
      const metadata = {
        requestId: responseConfig.metadata.includeRequestId
          ? req.id
          : undefined,
        path: req.path,
        method: req.method,
        environment: responseConfig.metadata.includeEnvironment
          ? process.env.NODE_ENV
          : undefined,
      };

      // Remove undefined values
      Object.keys(metadata).forEach(
        (key) => metadata[key] === undefined && delete metadata[key]
      );

      response = ResponseFormatter.success(body, metadata);
    }

    // Log the response if it's an error
    if (!response.success) {
      logger.error("API Error Response", {
        error: response.error,
        path: req.path,
        method: req.method,
        requestId: req.id,
      });
    } else if (process.env.NODE_ENV !== "production") {
      // In non-production, log all responses for debugging
      logger.debug("API Response", {
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
  res.success = function (data, metadata = {}) {
    return res.json(
      ResponseFormatter.success(data, { ...metadata, requestId: req.id })
    );
  };

  res.error = function (error, metadata = {}) {
    // Add error code prefix based on error type
    if (error && error.code && !error.code.includes("_")) {
      const errorType = error.type || "system";
      const prefix =
        responseConfig.errorCodes[errorType] ||
        responseConfig.errorCodes.system;
      error.code = `${prefix}${error.code}`;
    }

    return res.json(
      ResponseFormatter.error(error, { ...metadata, requestId: req.id })
    );
  };

  res.paginated = function (data, paginationOptions = {}) {
    if (!Array.isArray(data)) {
      throw new TypeError("Data must be an array for paginated responses");
    }

    // Apply pagination config defaults
    const page =
      paginationOptions.page || responseConfig.pagination.defaultPage;
    const limit = Math.min(
      paginationOptions.limit || responseConfig.pagination.defaultLimit,
      responseConfig.pagination.maxLimit
    );

    return res.json(
      ResponseFormatter.withPagination(data, {
        page,
        limit,
        total: paginationOptions.total || data.length,
        requestId: req.id,
      })
    );
  };

  next();
};

module.exports = responseHandler;
