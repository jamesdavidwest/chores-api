const { AppError } = require('../utils/AppError');

const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        try {
            const { error, value } = schema.validate(req[property], {
                abortEarly: false,
                stripUnknown: true
            });

            if (error) {
                const details = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));

                throw new AppError(400, 'VAL001', 'Validation error', details);
            }

            // Replace request data with validated data
            req[property] = value;
            next();
        } catch (error) {
            next(error);
        }
    };
};

const validateRequest = (schemas) => {
    return (req, res, next) => {
        try {
            // Validate different parts of the request if schemas provided
            if (schemas.params) {
                const { error, value } = schemas.params.validate(req.params, {
                    abortEarly: false,
                    stripUnknown: true
                });
                if (error) throw error;
                req.params = value;
            }

            if (schemas.query) {
                const { error, value } = schemas.query.validate(req.query, {
                    abortEarly: false,
                    stripUnknown: true
                });
                if (error) throw error;
                req.query = value;
            }

            if (schemas.body) {
                const { error, value } = schemas.body.validate(req.body, {
                    abortEarly: false,
                    stripUnknown: true
                });
                if (error) throw error;
                req.body = value;
            }

            next();
        } catch (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            next(new AppError(400, 'VAL001', 'Validation error', details));
        }
    };
};

module.exports = {
    validate,
    validateRequest
};