// src/config/response.config.js

const config = {
  // Default pagination settings
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultPage: 1,
  },

  // Error code prefixes for different types of errors
  errorCodes: {
    validation: "VAL_",
    authentication: "AUTH_",
    authorization: "PERM_",
    notFound: "NOT_FOUND_",
    database: "DB_",
    business: "BUS_",
    system: "SYS_",
  },

  // Response metadata configuration
  metadata: {
    includeTimestamp: true,
    includeRequestId: true,
    includeEnvironment: process.env.NODE_ENV !== "production",
  },
};

module.exports = config;
