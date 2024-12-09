// src/middleware/validation/index.js

/**
 * Creates a validation middleware using a schema
 * @param {Object} schema - The validation schema
 * @returns {Function} Express middleware function
 */
const createValidationMiddleware = (schema) => {
    return (req, res, next) => {
        const { validateSchema } = require('./commonValidator');
        
        // Determine which data to validate based on request method
        const dataToValidate = req.method === 'GET' ? req.query : req.body;
        
        console.log('Validating data:', dataToValidate);
        
        const { isValid, errors, sanitizedData } = validateSchema(dataToValidate, schema);
        
        if (!isValid) {
            console.log('Validation failed:', errors);
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