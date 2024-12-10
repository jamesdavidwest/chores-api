// src/middleware/validation/calendarValidator.js

const createValidationMiddleware = require('./index');

const dateRangeSchema = {
    start_date: {
        type: 'date',
        required: true
    },
    end_date: {
        type: 'date',
        required: true
    },
    user_id: {
        type: 'number',
        required: false
    },
    category_id: {
        type: 'number',
        required: false
    },
    location_id: {
        type: 'number',
        required: false
    }
};

const eventUpdateSchema = {
    due_date: {
        type: 'date',
        required: false
    },
    due_time: {
        type: 'string',
        required: false
    },
    assigned_to: {
        type: 'number',
        required: false
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 500
    }
};

const instanceGenerationSchema = {
    task_id: {
        type: 'number',
        required: true
    },
    start_date: {
        type: 'date',
        required: true
    },
    end_date: {
        type: 'date',
        required: true
    }
};

module.exports = {
    validateDateRange: createValidationMiddleware(dateRangeSchema),
    validateEventUpdate: createValidationMiddleware(eventUpdateSchema),
    validateInstanceGeneration: createValidationMiddleware(instanceGenerationSchema)
};