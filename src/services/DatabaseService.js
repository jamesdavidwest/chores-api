// src/services/DatabaseService.js
const knex = require('knex');
const dbConfig = require('../config/database');

class DatabaseService {
  constructor() {
    this.knex = null;
    this.config = null;
    this._connected = false;
  }

  /**
   * Initialize the database connection
   * @param {string} environment - The environment to use (development, production, testing)
   * @returns {Promise<void>}
   */
  async initialize(environment = process.env.NODE_ENV || 'development') {
    try {
      this.config = dbConfig[environment];
      
      if (!this.config) {
        throw new Error(`Invalid environment: ${environment}`);
      }

      this.knex = knex(this.config);
      
      // Test the connection
      await this.knex.raw('SELECT 1');
      this._connected = true;
      
      console.log(`Database connected successfully in ${environment} mode`);
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Get the Knex instance
   * @returns {Knex} The Knex instance
   * @throws {Error} If database is not initialized
   */
  getKnex() {
    if (!this._connected) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.knex;
  }

  /**
   * Begin a transaction
   * @returns {Knex.Transaction} A transaction object
   */
  async beginTransaction() {
    return await this.getKnex().transaction();
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this._connected && this.knex) {
      await this.knex.destroy();
      this._connected = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Whether the database is connected
   */
  isConnected() {
    return this._connected;
  }

  /**
   * Get current environment
   * @returns {string} The current environment
   */
  getEnvironment() {
    return this.config?.client === 'sqlite3' ? 'development' : 'production';
  }
}

// Export a singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService;