// src/middleware/validation/commonValidator.js

/**
 * Common validation functions for use across all validators
 */

const validateString = (value, field, { required = true, minLength = 1, maxLength = 255 } = {}) => {
    if (!value && required) {
        return `${field} is required`;
    }
    if (value) {
        if (typeof value !== 'string') {
            return `${field} must be a string`;
        }
        if (value.length < minLength) {
            return `${field} must be at least ${minLength} characters`;
        }
        if (value.length > maxLength) {
            return `${field} must be less than ${maxLength} characters`;
        }
    }
    return null;
};

const validateNumber = (value, field, { required = true, min = null, max = null } = {}) => {
    if (value === undefined && required) {
        return `${field} is required`;
    }
    if (value !== undefined) {
        if (typeof value !== 'number' || isNaN(value)) {
            return `${field} must be a number`;
        }
        if (min !== null && value < min) {
            return `${field} must be greater than or equal to ${min}`;
        }
        if (max !== null && value > max) {
            return `${field} must be less than or equal to ${max}`;
        }
    }
    return null;
};

const validateBoolean = (value, field, { required = true } = {}) => {
    if (value === undefined && required) {
        return `${field} is required`;
    }
    if (value !== undefined && typeof value !== 'boolean') {
        return `${field} must be a boolean`;
    }
    return null;
};

const validateDate = (value, field, { required = true, past = false, future = false } = {}) => {
    if (!value && required) {
        return `${field} is required`;
    }
    if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return `${field} must be a valid date`;
        }
        const now = new Date();
        if (past && date > now) {
            return `${field} must be in the past`;
        }
        if (future && date < now) {
            return `${field} must be in the future`;
        }
    }
    return null;
};

const validateEmail = (value, field, { required = true } = {}) => {
    if (!value && required) {
        return `${field} is required`;
    }
    if (value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return `${field} must be a valid email address`;
        }
    }
    return null;
};

const validateEnum = (value, field, allowedValues, { required = true } = {}) => {
    if (!value && required) {
        return `${field} is required`;
    }
    if (value && !allowedValues.includes(value)) {
        return `${field} must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
};

const validateArray = (value, field, { required = true, minLength = 0, maxLength = null, itemValidator = null } = {}) => {
    if (!value && required) {
        return `${field} is required`;
    }
    if (value) {
        if (!Array.isArray(value)) {
            return `${field} must be an array`;
        }
        if (value.length < minLength) {
            return `${field} must have at least ${minLength} items`;
        }
        if (maxLength !== null && value.length > maxLength) {
            return `${field} must have no more than ${maxLength} items`;
        }
        if (itemValidator) {
            for (let i = 0; i < value.length; i++) {
                const itemError = itemValidator(value[i], `${field}[${i}]`);
                if (itemError) return itemError;
            }
        }
    }
    return null;
};

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} value - The string to sanitize
 * @returns {string} The sanitized string
 */
const sanitizeString = (value) => {
    if (typeof value !== 'string') return value;
    return value
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
        .trim(); // Remove leading/trailing whitespace
};

/**
 * Validates an object against a schema and returns all validation errors
 * @param {Object} data - The data to validate
 * @param {Object} schema - The validation schema
 * @returns {Object} Object with isValid and errors properties
 */
const validateSchema = (data, schema) => {
    const errors = {};
    let isValid = true;

    Object.keys(schema).forEach(field => {
        const value = data[field];
        const validation = schema[field];
        
        // Handle required fields
        if (validation.required && value === undefined) {
            errors[field] = `${field} is required`;
            isValid = false;
            return;
        }

        // Skip validation for undefined optional fields
        if (value === undefined && !validation.required) {
            return;
        }

        // Sanitize string values
        if (validation.type === 'string' && value) {
            data[field] = sanitizeString(value);
        }

        // Validate based on type
        let error = null;
        switch (validation.type) {
            case 'string':
                error = validateString(value, field, validation);
                break;
            case 'number':
                error = validateNumber(value, field, validation);
                break;
            case 'boolean':
                error = validateBoolean(value, field, validation);
                break;
            case 'date':
                error = validateDate(value, field, validation);
                break;
            case 'email':
                error = validateEmail(value, field, validation);
                break;
            case 'enum':
                error = validateEnum(value, field, validation.values, validation);
                break;
            case 'array':
                error = validateArray(value, field, validation);
                break;
        }

        if (error) {
            errors[field] = error;
            isValid = false;
        }
    });

    return { isValid, errors, sanitizedData: data };
};

module.exports = {
    validateString,
    validateNumber,
    validateBoolean,
    validateDate,
    validateEmail,
    validateEnum,
    validateArray,
    validateSchema,
    sanitizeString
};