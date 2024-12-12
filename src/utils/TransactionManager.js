// src/utils/TransactionManager.js
const { DatabaseService } = require('../services/DatabaseService');

class TransactionManager {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    /**
     * Execute a function within a transaction
     * @param {Function} callback - Function to execute within transaction
     * @returns {Promise<any>} - Result of the callback function
     */
    async executeTransaction(callback) {
        const trx = await this.db.knex.transaction();
        
        try {
            const result = await callback(trx);
            await trx.commit();
            return result;
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    /**
     * Execute multiple operations within a transaction
     * @param {Array<Function>} operations - Array of functions to execute
     * @returns {Promise<Array<any>>} - Results of all operations
     */
    async executeBatch(operations) {
        return this.executeTransaction(async (trx) => {
            const results = [];
            for (const operation of operations) {
                const result = await operation(trx);
                results.push(result);
            }
            return results;
        });
    }

    /**
     * Create a savepoint within a transaction
     * @param {Object} trx - Knex transaction object
     * @param {string} savepoint - Savepoint name
     */
    async createSavepoint(trx, savepoint) {
        await trx.raw(`SAVEPOINT ${savepoint}`);
    }

    /**
     * Rollback to a savepoint within a transaction
     * @param {Object} trx - Knex transaction object
     * @param {string} savepoint - Savepoint name
     */
    async rollbackToSavepoint(trx, savepoint) {
        await trx.raw(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    }

    /**
     * Release a savepoint within a transaction
     * @param {Object} trx - Knex transaction object
     * @param {string} savepoint - Savepoint name
     */
    async releaseSavepoint(trx, savepoint) {
        await trx.raw(`RELEASE SAVEPOINT ${savepoint}`);
    }
}

module.exports = new TransactionManager();