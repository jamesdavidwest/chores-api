// src/middleware/validation/taskValidator.js

const createValidationMiddleware = require('./index');

const createTaskSchema = {
    name: {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 100
    },
    category_id: {
        type: 'number',
        required: true
    },
    location_id: {
        type: 'number',
        required: true
    },
    frequency_id: {
        type: 'number',
        required: true
    },
    assigned_to: {
        type: 'number',
        required: true
    },
    time_preference: {
        type: 'string',
        required: false
    },
    priority: {
        type: 'number',
        required: false,
        min: 1,
        max: 5
    },
    points_value: {
        type: 'number',
        required: false,
        min: 0
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 1000
    },
    requires_verification: {
        type: 'boolean',
        required: false
    },
    requires_photo: {
        type: 'boolean',
        required: false
    }
};

const updateTaskSchema = {
    name: {
        type: 'string',
        required: false,
        minLength: 2,
        maxLength: 100
    },
    category_id: {
        type: 'number',
        required: false
    },
    location_id: {
        type: 'number',
        required: false
    },
    frequency_id: {
        type: 'number',
        required: false
    },
    assigned_to: {
        type: 'number',
        required: false
    },
    time_preference: {
        type: 'string',
        required: false
    },
    priority: {
        type: 'number',
        required: false,
        min: 1,
        max: 5
    },
    points_value: {
        type: 'number',
        required: false,
        min: 0
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 1000
    },
    requires_verification: {
        type: 'boolean',
        required: false
    },
    requires_photo: {
        type: 'boolean',
        required: false
    },
    is_active: {
        type: 'boolean',
        required: false
    }
};

const completeTaskSchema = {
    completion_notes: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    photo_url: {
        type: 'string',
        required: false
    },
    rating: {
        type: 'number',
        required: false,
        min: 1,
        max: 5
    }
};

module.exports = {
    validateCreateTask: createValidationMiddleware(createTaskSchema),
    validateUpdateTask: createValidationMiddleware(updateTaskSchema),
    validateCompleteTask: createValidationMiddleware(completeTaskSchema)
};