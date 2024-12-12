const Joi = require('joi');
const { config } = require('../config/auth');

const schemas = {
    // User schemas
    createUser: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string()
            .min(config.password.minLength)
            .regex(/\d/)
            .regex(/[!@#$%^&*(),.?":{}|<>]/)
            .required()
            .messages({
                'string.pattern.base': 'Password must contain at least one number and one special character'
            }),
        instanceId: Joi.number().integer().positive(),
        roles: Joi.array().items(Joi.string())
    }),

    updateUser: Joi.object({
        email: Joi.string().email(),
        password: Joi.string()
            .min(config.password.minLength)
            .regex(/\d/)
            .regex(/[!@#$%^&*(),.?":{}|<>]/)
            .messages({
                'string.pattern.base': 'Password must contain at least one number and one special character'
            }),
        instanceId: Joi.number().integer().positive(),
        roles: Joi.array().items(Joi.string()),
        isActive: Joi.boolean()
    }),

    // Auth schemas
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string()
            .min(config.password.minLength)
            .regex(/\d/)
            .regex(/[!@#$%^&*(),.?":{}|<>]/)
            .required()
            .messages({
                'string.pattern.base': 'Password must contain at least one number and one special character'
            })
    }),

    // Request parameter schemas
    idParam: Joi.object({
        id: Joi.number().integer().positive().required()
    }),

    // Query parameter schemas
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sortBy: Joi.string(),
        sortOrder: Joi.string().valid('asc', 'desc')
    })
};

module.exports = schemas;