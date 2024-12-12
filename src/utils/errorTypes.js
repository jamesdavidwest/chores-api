const ErrorTypes = {
  // Authentication & Authorization Errors (400-403)
  INVALID_CREDENTIALS: {
    code: "AUTH001",
    statusCode: 401,
    defaultMessage: "Invalid credentials provided",
  },
  TOKEN_EXPIRED: {
    code: "AUTH002",
    statusCode: 401,
    defaultMessage: "Authentication token has expired",
  },
  TOKEN_INVALID: {
    code: "AUTH003",
    statusCode: 401,
    defaultMessage: "Invalid authentication token",
  },
  UNAUTHORIZED: {
    code: "AUTH004",
    statusCode: 401,
    defaultMessage: "Unauthorized access",
  },
  FORBIDDEN: {
    code: "AUTH005",
    statusCode: 403,
    defaultMessage: "Forbidden access",
  },

  // Resource Errors (404)
  NOT_FOUND: {
    code: "RES001",
    statusCode: 404,
    defaultMessage: "Resource not found",
  },
  RESOURCE_ARCHIVED: {
    code: "RES002",
    statusCode: 404,
    defaultMessage: "Resource is archived",
  },
  PARENT_NOT_FOUND: {
    code: "RES003",
    statusCode: 404,
    defaultMessage: "Parent resource not found",
  },
  CHILD_NOT_FOUND: {
    code: "RES004",
    statusCode: 404,
    defaultMessage: "Child resource not found",
  },

  // Validation Errors (400)
  VALIDATION_ERROR: {
    code: "VAL001",
    statusCode: 400,
    defaultMessage: "Validation error",
  },
  INVALID_INPUT: {
    code: "VAL002",
    statusCode: 400,
    defaultMessage: "Invalid input provided",
  },
  DUPLICATE_ENTRY: {
    code: "VAL003",
    statusCode: 400,
    defaultMessage: "Duplicate entry",
  },
  INVALID_STATUS_TRANSITION: {
    code: "VAL004",
    statusCode: 400,
    defaultMessage: "Invalid status transition",
  },
  INVALID_RELATIONSHIP: {
    code: "VAL005",
    statusCode: 400,
    defaultMessage: "Invalid relationship between resources",
  },
  INVALID_METADATA: {
    code: "VAL006",
    statusCode: 400,
    defaultMessage: "Invalid metadata format",
  },
  MISSING_REQUIRED_FIELD: {
    code: "VAL007",
    statusCode: 400,
    defaultMessage: "Required field missing",
  },
  INVALID_DATE_RANGE: {
    code: "VAL008",
    statusCode: 400,
    defaultMessage: "Invalid date range",
  },

  // Database Errors (500)
  DB_ERROR: {
    code: "DB001",
    statusCode: 500,
    defaultMessage: "Database error occurred",
  },
  TRANSACTION_ERROR: {
    code: "DB002",
    statusCode: 500,
    defaultMessage: "Transaction failed",
  },
  DB_CONSTRAINT_VIOLATION: {
    code: "DB003",
    statusCode: 500,
    defaultMessage: "Database constraint violation",
  },
  DB_UNIQUE_VIOLATION: {
    code: "DB004",
    statusCode: 500,
    defaultMessage: "Unique constraint violation",
  },
  DB_FOREIGN_KEY_VIOLATION: {
    code: "DB005",
    statusCode: 500,
    defaultMessage: "Foreign key constraint violation",
  },
  DB_CONNECTION_ERROR: {
    code: "DB006",
    statusCode: 500,
    defaultMessage: "Database connection error",
  },
  DEADLOCK_DETECTED: {
    code: "DB007",
    statusCode: 500,
    defaultMessage: "Database deadlock detected",
  },

  // Server Errors (500)
  INTERNAL_ERROR: {
    code: "SRV001",
    statusCode: 500,
    defaultMessage: "Internal server error",
  },
  SERVICE_UNAVAILABLE: {
    code: "SRV002",
    statusCode: 503,
    defaultMessage: "Service temporarily unavailable",
  },
  RATE_LIMIT_EXCEEDED: {
    code: "SRV003",
    statusCode: 429,
    defaultMessage: "Rate limit exceeded",
  },
  REQUEST_TIMEOUT: {
    code: "SRV004",
    statusCode: 408,
    defaultMessage: "Request timeout",
  },
  INVALID_JSON: {
    code: "SRV005",
    statusCode: 400,
    defaultMessage: "Invalid JSON format",
  },

  // Business Logic Errors (400)
  BUSINESS_RULE_VIOLATION: {
    code: "BUS001",
    statusCode: 400,
    defaultMessage: "Business rule violation",
  },
  INSUFFICIENT_PERMISSIONS: {
    code: "BUS002",
    statusCode: 403,
    defaultMessage: "Insufficient permissions for operation",
  },
  RESOURCE_LOCKED: {
    code: "BUS003",
    statusCode: 423,
    defaultMessage: "Resource is locked",
  },
  CONCURRENT_MODIFICATION: {
    code: "BUS004",
    statusCode: 409,
    defaultMessage: "Resource was modified by another request",
  },
};

// Helper function to format error messages with context
const formatErrorMessage = (errorType, service, method, details) => {
  const baseInfo = `${service}.${method}`;
  const timestamp = new Date().toISOString();

  // Build details string
  let detailsStr = "";
  if (details) {
    detailsStr = Object.entries(details)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (typeof value === "object") {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .join(", ");
  }

  // Construct specific message based on error type and context
  switch (errorType.code) {
    case "AUTH001":
      return `Authentication failed in ${baseInfo}: ${details?.reason || "Invalid credentials"}`;

    case "RES001":
      return `${details?.resource || "Resource"} not found in ${baseInfo}: ID ${details?.id} does not exist`;

    case "VAL001":
      return `Validation failed in ${baseInfo}: ${details?.message}${detailsStr ? ` (${detailsStr})` : ""}`;

    case "DB001":
      return `Database error in ${baseInfo}: Failed to ${details?.action || "perform operation"} on ${details?.resource || "resource"}${detailsStr ? ` (${detailsStr})` : ""}`;

    case "DB002":
      return `Transaction failed in ${baseInfo}: ${details?.message || "Operation could not be completed"}${detailsStr ? ` (${detailsStr})` : ""}`;

    case "VAL003":
      return `Duplicate entry in ${baseInfo}: ${details?.constraint} violation${detailsStr ? ` (${detailsStr})` : ""}`;

    case "BUS001":
      return `Business rule violation in ${baseInfo}: ${details?.rule || "Operation not allowed"}${detailsStr ? ` (${detailsStr})` : ""}`;

    // Add more specific formatters as needed

    default:
      return `${errorType.defaultMessage} in ${baseInfo}${detailsStr ? ` (${detailsStr})` : ""}`;
  }
};

module.exports = {
  ErrorTypes,
  formatErrorMessage,
};
