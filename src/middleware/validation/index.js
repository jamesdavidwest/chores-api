// src/middleware/validation/index.js

/**
 * Creates a validation middleware using a schema
 * @param {Object} schema - The validation schema
 * @returns {Function} Express middleware function
 */
const createValidationMiddleware = (schema) => {
    return (req, res, next) => {
        const { validateSchema } = require('./commonValidator');
        const { isValid, errors, sanitizedData } = validateSchema(req.body, schema);
        
        if (!isValid) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors
            });
        }

        // Attach sanitized data to request
        req.validatedData = sanitizedData;
        next();
    };
};

module.exports = createValidationMiddleware;