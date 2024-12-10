// src/middleware/validation/categoryValidator.js

const createValidationMiddleware = require('./index');

const createCategorySchema = {
    name: {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 100
    },
    description: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    icon_name: {
        type: 'string',
        required: false,
        maxLength: 50
    },
    color_code: {
        type: 'string',
        required: false,
        maxLength: 7 // #RRGGBB format
    },
    parent_category_id: {
        type: 'number',
        required: false
    }
};

const updateCategorySchema = {
    name: {
        type: 'string',
        required: false,
        minLength: 2,
        maxLength: 100
    },
    description: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    icon_name: {
        type: 'string',
        required: false,
        maxLength: 50
    },
    color_code: {
        type: 'string',
        required: false,
        maxLength: 7
    },
    parent_category_id: {
        type: 'number',
        required: false
    },
    is_active: {
        type: 'boolean',
        required: false
    }
};

module.exports = {
    validateCreateCategory: createValidationMiddleware(createCategorySchema),
    validateUpdateCategory: createValidationMiddleware(updateCategorySchema)
};