const { Knex } = require('knex');
const { v4: uuidv4 } = require('uuid');
const { DatabaseService } = require('../../src/services/DatabaseService');

class TestUtils {
  static async setupTestDatabase() {
    const dbService = DatabaseService.getInstance();
    await dbService.runMigrations();
  }

  static async cleanupTestDatabase() {
    const dbService = DatabaseService.getInstance();
    const knex = await dbService.getKnexInstance();
    
    // Get all tables
    const tables = await knex.raw(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%'
    `);
    
    // Disable foreign key checks
    await knex.raw('PRAGMA foreign_keys = OFF');
    
    // Clear all tables
    for (const { name } of tables) {
      await knex(name).truncate();
    }
    
    // Re-enable foreign key checks
    await knex.raw('PRAGMA foreign_keys = ON');
  }

  static generateMockEvent(overrides = {}) {
    return {
      id: uuidv4(),
      title: `Test Event ${Math.random()}`,
      description: 'Test event description',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
      status: 'DRAFT',
      createdBy: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static generateMockInstance(eventId = uuidv4(), overrides = {}) {
    return {
      id: uuidv4(),
      eventId,
      status: 'PENDING',
      data: JSON.stringify({ test: 'data' }),
      createdBy: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static generateMockUser(overrides = {}) {
    const email = `test.${Math.random()}@example.com`;
    return {
      id: uuidv4(),
      email,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static generateMockValidation(instanceId = uuidv4(), overrides = {}) {
    return {
      id: uuidv4(),
      instanceId,
      type: 'SYSTEM',
      status: 'PENDING',
      data: JSON.stringify({ rules: ['test_rule'] }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static generateMockApproval(instanceId = uuidv4(), overrides = {}) {
    return {
      id: uuidv4(),
      instanceId,
      approverId: uuidv4(),
      status: 'PENDING',
      comments: 'Test approval comments',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static async createTestEvent(overrides = {}) {
    const dbService = DatabaseService.getInstance();
    const knex = await dbService.getKnexInstance();
    const event = this.generateMockEvent(overrides);
    await knex('events').insert(event);
    return event;
  }

  static async createTestInstance(eventId, overrides = {}) {
    const dbService = DatabaseService.getInstance();
    const knex = await dbService.getKnexInstance();
    const instance = this.generateMockInstance(eventId, overrides);
    await knex('instances').insert(instance);
    return instance;
  }

  static async createTestUser(overrides = {}) {
    const dbService = DatabaseService.getInstance();
    const knex = await dbService.getKnexInstance();
    const user = this.generateMockUser(overrides);
    await knex('users').insert(user);
    return user;
  }
}

module.exports = TestUtils;