// src/middleware/validation/userValidator.js

const createValidationMiddleware = require('./index');

const loginSchema = {
    email: {
        type: 'string',
        required: false
    },
    username: {
        type: 'string',
        required: false
    },
    password: {
        type: 'string',
        required: true,
        minLength: 1  // Temporarily reduce this for testing
    }
};

// Custom validation for login
const validateLogin = (req, res, next) => {
    const { email, username, password } = req.body;
    
    // Must have either email or username
    if (!email && !username) {
        return res.status(400).json({
            error: 'Either email or username is required'
        });
    }

    // Must have password
    if (!password) {
        return res.status(400).json({
            error: 'Password is required'
        });
    }

    // Store validated data
    req.validatedData = {
        email: email || username, // Use username as email if no email provided
        password
    };

    next();
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
    validateLogin,
    validateRegistration: createValidationMiddleware(registrationSchema),
    validateProfileUpdate: createValidationMiddleware(updateProfileSchema)
};