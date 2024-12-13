const DatabaseService = require('../../../src/services/DatabaseService');
const AppError = require('../../../src/utils/AppError');

describe('DatabaseService', () => {
  let dbService;

  beforeEach(() => {
    dbService = DatabaseService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with correct configuration', () => {
      expect(dbService.config).toMatchObject({
        client: expect.any(String),
        connection: expect.any(Object)
      });
    });
  });

  describe('getKnexInstance', () => {
    it('should return initialized knex instance', async () => {
      const knex = await dbService.getKnexInstance();
      expect(knex).toBeDefined();
      expect(typeof knex.raw).toBe('function');
    });

    it('should maintain connection pool', async () => {
      const knex1 = await dbService.getKnexInstance();
      const knex2 = await dbService.getKnexInstance();
      expect(knex1).toBe(knex2);
    });
  });

  describe('runMigrations', () => {
    it('should run pending migrations successfully', async () => {
      await expect(dbService.runMigrations()).resolves.not.toThrow();
    });
  });

  describe('transaction handling', () => {
    it('should execute transaction successfully', async () => {
      const result = await dbService.transaction(async (trx) => {
        await trx.raw('SELECT 1+1 as result');
        return 'success';
      });
      
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      await expect(
        dbService.transaction(async (trx) => {
          await trx.raw('SELECT 1+1 as result');
          throw new Error('Test error');
        })
      ).rejects.toThrow();
    });

    it('should handle nested transactions', async () => {
      const result = await dbService.transaction(async (trx1) => {
        return await dbService.transaction(async (trx2) => {
          await trx2.raw('SELECT 1+1 as result');
          return 'success';
        });
      });
      
      expect(result).toBe('success');
    });
  });

  describe('query builder', () => {
    it('should build and execute select queries', async () => {
      const knex = await dbService.getKnexInstance();
      const query = knex('users').select('id', 'email');
      expect(query.toString()).toContain('SELECT');
    });

    it('should handle query errors gracefully', async () => {
      const knex = await dbService.getKnexInstance();
      await expect(
        knex.raw('SELECT * FROM non_existent_table')
      ).rejects.toThrow();
    });
  });

  describe('connection management', () => {
    it('should detect connection issues', async () => {
      const invalidConfig = {
        client: 'pg',
        connection: {
          host: 'invalid-host',
          port: 5432
        }
      };

      const testService = new DatabaseService(invalidConfig);
      await expect(
        testService.getKnexInstance()
      ).rejects.toThrow();
    });
  });

  describe('pooling configuration', () => {
    it('should respect max pool size', async () => {
      const knex = await dbService.getKnexInstance();
      expect(knex.client.pool.max).toBeDefined();
    });
  });
});