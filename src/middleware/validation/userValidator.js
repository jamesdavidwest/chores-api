// src/middleware/validation/userValidator.js

const createValidationMiddleware = require('./index');

const loginSchema = {
    email: {
        type: 'email',
        required: true
    },
    password: {
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 100
    }
};

const registrationSchema = {
    name: {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 100
    },
    email: {
        type: 'email',
        required: true
    },
    password: {
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 100
    },
    role: {
        type: 'enum',
        required: true,
        values: ['ADMIN', 'MANAGER', 'USER', 'GUEST']
    }
};

const updateProfileSchema = {
    name: {
        type: 'string',
        required: false,
        minLength: 2,
        maxLength: 100
    },
    email: {
        type: 'email',
        required: false
    },
    timezone: {
        type: 'string',
        required: false
    },
    preferences: {
        type: 'string', // JSON string
        required: false
    }
};

module.exports = {
    validateLogin: createValidationMiddleware(loginSchema),
    validateRegistration: createValidationMiddleware(registrationSchema),
    validateProfileUpdate: createValidationMiddleware(updateProfileSchema)
};