// src/middleware/validation/suppliesValidator.js

const createValidationMiddleware = require('./index');

const supplySchema = {
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
    category: {
        type: 'string',
        required: false,
        maxLength: 50
    },
    current_quantity: {
        type: 'number',
        required: false,
        min: 0
    },
    minimum_quantity: {
        type: 'number',
        required: false,
        min: 0
    },
    unit: {
        type: 'string',
        required: false,
        maxLength: 20
    },
    location_id: {
        type: 'number',
        required: false
    },
    purchase_url: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    estimated_cost: {
        type: 'number',
        required: false,
        min: 0
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 500
    }
};

const updateLocationSuppliesSchema = {
    supplies: {
        type: 'array',
        required: true,
        minLength: 1,
        itemValidator: (item, field) => {
            const errors = {};
            if (!item.name) {
                errors.name = `${field} name is required`;
            }
            if (item.current_quantity !== undefined && (typeof item.current_quantity !== 'number' || item.current_quantity < 0)) {
                errors.current_quantity = `${field} current quantity must be a non-negative number`;
            }
            return Object.keys(errors).length > 0 ? errors : null;
        }
    }
};

module.exports = {
    validateSupply: createValidationMiddleware(supplySchema),
    validateLocationSupplies: createValidationMiddleware(updateLocationSuppliesSchema)
};