const AppError = require("../utils/AppError");
const ErrorTypes = require("../utils/errorTypes");
const logger = require("../services/LoggerService");

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
      stack: err.stack,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for internal tracking
    logger.error("Unhandled error", { error: err });

    res.status(500).json({
      success: false,
      error: {
        code: ErrorTypes.INTERNAL_ERROR.code,
        message: ErrorTypes.INTERNAL_ERROR.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// Handle Knex database errors
const handleKnexError = (err) => {
  if (err.code === "23505") {
    return new AppError(
      ErrorTypes.DUPLICATE_ENTRY.statusCode,
      ErrorTypes.DUPLICATE_ENTRY.code,
      ErrorTypes.DUPLICATE_ENTRY.message,
      err.detail
    );
  }

  if (err.code === "23503") {
    return new AppError(
      ErrorTypes.VALIDATION_ERROR.statusCode,
      ErrorTypes.VALIDATION_ERROR.code,
      "Referenced record does not exist",
      err.detail
    );
  }

  return new AppError(
    ErrorTypes.DB_ERROR.statusCode,
    ErrorTypes.DB_ERROR.code,
    ErrorTypes.DB_ERROR.message,
    err.message
  );
};

// Handle JWT errors
const handleJWTError = () =>
  new AppError(
    ErrorTypes.TOKEN_INVALID.statusCode,
    ErrorTypes.TOKEN_INVALID.code,
    ErrorTypes.TOKEN_INVALID.message
  );

const handleJWTExpiredError = () =>
  new AppError(
    ErrorTypes.TOKEN_EXPIRED.statusCode,
    ErrorTypes.TOKEN_EXPIRED.code,
    ErrorTypes.TOKEN_EXPIRED.message
  );

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  if (error.code && error.code.startsWith("22")) {
    error = handleKnexError(error);
  }
  if (error.name === "JsonWebTokenError") error = handleJWTError();
  if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

  // Log the error
  logger.logError(error, req);

  // Send appropriate error response based on environment
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;
