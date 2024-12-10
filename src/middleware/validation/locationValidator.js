// src/middleware/validation/locationValidator.js

const createValidationMiddleware = require('./index');

const createLocationSchema = {
    name: {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 100
    },
    parent_location_id: {
        type: 'number',
        required: false
    },
    floor: {
        type: 'number',
        required: false
    },
    area_square_feet: {
        type: 'number',
        required: false,
        min: 0
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    requires_supplies: {
        type: 'string', // JSON array
        required: false
    }
};

const updateLocationSchema = {
    name: {
        type: 'string',
        required: false,
        minLength: 2,
        maxLength: 100
    },
    parent_location_id: {
        type: 'number',
        required: false
    },
    floor: {
        type: 'number',
        required: false
    },
    area_square_feet: {
        type: 'number',
        required: false,
        min: 0
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    requires_supplies: {
        type: 'string', // JSON array
        required: false
    },
    is_active: {
        type: 'boolean',
        required: false
    }
};

module.exports = {
    validateCreateLocation: createValidationMiddleware(createLocationSchema),
    validateUpdateLocation: createValidationMiddleware(updateLocationSchema)
};