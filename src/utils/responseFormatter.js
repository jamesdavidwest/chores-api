// src/utils/responseFormatter.js

const { v4: uuidv4 } = require('uuid');
const { format } = require('date-fns');

class ResponseFormatter {
  static success(data = null, metadata = {}) {
    return {
      success: true,
      data,
      metadata: {
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        requestId: metadata.requestId || uuidv4(),
        ...metadata,
      },
    };
  }

  static error(error = {}, metadata = {}) {
    const baseError = {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    };

    if (process.env.NODE_ENV !== 'production' && error.details) {
      baseError.details = error.details;
    }

    return {
      success: false,
      error: baseError,
      metadata: {
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        requestId: metadata.requestId || uuidv4(),
        ...metadata,
      },
    };
  }

  static withPagination(data, { page, limit, total }) {
    const hasMore = total > page * limit;

    return this.success(data, {
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        hasMore,
      },
    });
  }
}

module.exports = ResponseFormatter;
