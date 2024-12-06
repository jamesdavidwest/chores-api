/**
 * Date validation and processing utilities for chore management
 */

const DEFAULT_DUE_TIME = '21:00'; // 9 PM

/**
 * Validates and processes a due date, ensuring it's in the future
 * @param {string|Date} dueDate - The due date to validate
 * @param {string} [dueTime] - Optional time in HH:mm format
 * @returns {Object} Processed date info and validation status
 */
function validateDueDate(dueDate, dueTime = DEFAULT_DUE_TIME) {
    const now = new Date();
    let processedDate;

    // If dueDate is a string, convert to Date object
    if (typeof dueDate === 'string') {
        // Combine date and time
        processedDate = new Date(`${dueDate}T${dueTime}`);
    } else if (dueDate instanceof Date) {
        processedDate = new Date(dueDate);
        // Set the time if provided
        const [hours, minutes] = dueTime.split(':');
        processedDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    } else {
        return {
            isValid: false,
            error: 'Invalid date format',
            date: null
        };
    }

    // Check if date is valid
    if (isNaN(processedDate.getTime())) {
        return {
            isValid: false,
            error: 'Invalid date',
            date: null
        };
    }

    // Check if date is in the future
    if (processedDate <= now) {
        return {
            isValid: false,
            error: 'Due date must be in the future',
            date: null
        };
    }

    return {
        isValid: true,
        error: null,
        date: processedDate
    };
}

/**
 * Formats a date to ISO string with proper timezone handling
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDueDate(date) {
    if (!(date instanceof Date)) {
        throw new Error('Invalid date object');
    }
    return date.toISOString();
}

module.exports = {
    DEFAULT_DUE_TIME,
    validateDueDate,
    formatDueDate
};