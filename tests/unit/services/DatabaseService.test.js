const DatabaseService = require('../../../src/services/DatabaseService');
const LoggerService = require('../../../src/services/LoggerService');

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
    development: {
        client: 'sqlite3',
        connection: {
            filename: ':memory:'
        },
        useNullAsDefault: true
    },
    production: {
        client: 'pg',
        connection: {
            host: 'localhost',
            user: 'test',
            password: 'test',
            database: 'testdb'
        }
    },
    testing: {
        client: 'sqlite3',
        connection: ':memory:',
        useNullAsDefault: true
    }
}));

jest.mock('../../../src/services/LoggerService', () => ({
    getInstance: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
}));

describe('DatabaseService', () => {
    beforeEach(async () => {
        // Reset service state
        await DatabaseService.close();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Cleanup
        await DatabaseService.close();
    });

    describe('Initialization', () => {
        it('should initialize database connection successfully', async () => {
            await DatabaseService.initialize('development');
            
            expect(DatabaseService.isConnected()).toBe(true);
            expect(LoggerService.getInstance().info).toHaveBeenCalledWith(
                'Database connection established',
                expect.any(Object)
            );
        });

        it('should handle invalid environment', async () => {
            await expect(DatabaseService.initialize('invalid'))
                .rejects
                .toThrow('Invalid environment: invalid');

            expect(DatabaseService.isConnected()).toBe(false);
            expect(LoggerService.getInstance().error).toHaveBeenCalled();
        });

        it('should use development as default environment', async () => {
            const originalEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;

            await DatabaseService.initialize();
            
            expect(DatabaseService.getEnvironment()).toBe('development');
            expect(DatabaseService.isConnected()).toBe(true);

            process.env.NODE_ENV = originalEnv;
        });

        it('should handle initialization errors', async () => {
            // Mock knex to throw error
            jest.spyOn(DatabaseService, 'getKnex').mockImplementationOnce(() => ({
                raw: jest.fn().mockRejectedValueOnce(new Error('Connection failed'))
            }));

            await expect(DatabaseService.initialize('testing'))
                .rejects
                .toThrow('Connection failed');

            expect(LoggerService.getInstance().error).toHaveBeenCalledWith(
                'Database connection failed',
                expect.any(Object)
            );
        });
    });

    describe('Connection Management', () => {
        it('should handle multiple initialization calls', async () => {
            await DatabaseService.initialize('development');
            const firstConnection = DatabaseService.getKnex();

            await DatabaseService.initialize('development');
            const secondConnection = DatabaseService.getKnex();

            expect(firstConnection).not.toBe(secondConnection);
            expect(DatabaseService.isConnected()).toBe(true);
        });

        it('should close connection successfully', async () => {
            await DatabaseService.initialize('development');
            expect(DatabaseService.isConnected()).toBe(true);

            await DatabaseService.close();
            expect(DatabaseService.isConnected()).toBe(false);
            expect(LoggerService.getInstance().info).toHaveBeenCalledWith(
                'Database connection closed'
            );
        });

        it('should handle multiple close calls gracefully', async () => {
            await DatabaseService.close();
            await DatabaseService.close();

            expect(DatabaseService.isConnected()).toBe(false);
        });
    });

    describe('Transaction Management', () => {
        beforeEach(async () => {
            await DatabaseService.initialize('development');
        });

        it('should create transaction successfully', async () => {
            const trx = await DatabaseService.beginTransaction();
            
            expect(trx).toBeDefined();
            expect(typeof trx.commit).toBe('function');
            expect(typeof trx.rollback).toBe('function');

            await trx.commit();
        });

        it('should handle transaction commit', async () => {
            const trx = await DatabaseService.beginTransaction();
            
            // Create a test table
            await trx.schema.createTable('test_table', (table) => {
                table.increments('id');
                table.string('name');
            });

            // Insert test data
            await trx('test_table').insert({ name: 'test' });
            
            await trx.commit();

            // Verify data persists after commit
            const result = await DatabaseService.getKnex()('test_table').select('*');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('test');
        });

        it('should handle transaction rollback', async () => {
            const trx = await DatabaseService.beginTransaction();
            
            // Create a test table
            await trx.schema.createTable('test_table', (table) => {
                table.increments('id');
                table.string('name');
            });

            // Insert test data
            await trx('test_table').insert({ name: 'test' });
            
            await trx.rollback();

            // Verify data does not persist after rollback
            await expect(
                DatabaseService.getKnex()('test_table').select('*')
            ).rejects.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should throw error when accessing database before initialization', () => {
            expect(() => DatabaseService.getKnex())
                .toThrow('Database not initialized. Call initialize() first.');
        });

        it('should handle failed transactions', async () => {
            await DatabaseService.initialize('development');
            const trx = await DatabaseService.beginTransaction();

            try {
                // Attempt invalid operation
                await trx.raw('SELECT * FROM nonexistent_table');
                await trx.commit();
            } catch (error) {
                await trx.rollback();
                expect(error).toBeDefined();
            }
        });

        it('should handle connection errors gracefully', async () => {
            // Mock connection error
            jest.spyOn(DatabaseService, 'getKnex').mockImplementationOnce(() => ({
                raw: jest.fn().mockRejectedValueOnce(new Error('Connection lost'))
            }));

            await expect(DatabaseService.initialize('testing'))
                .rejects
                .toThrow('Connection lost');

            expect(DatabaseService.isConnected()).toBe(false);
        });
    });

    describe('Environment Management', () => {
        it('should identify development environment correctly', async () => {
            await DatabaseService.initialize('development');
            expect(DatabaseService.getEnvironment()).toBe('development');
        });

        it('should identify production environment correctly', async () => {
            // Mock successful PostgreSQL connection
            const mockPgKnex = {
                raw: jest.fn().mockResolvedValue(true),
                destroy: jest.fn().mockResolvedValue(undefined)
            };
            jest.spyOn(DatabaseService, 'getKnex').mockReturnValue(mockPgKnex);

            await DatabaseService.initialize('production');
            expect(DatabaseService.getEnvironment()).toBe('production');
        });

        it('should handle environment switching', async () => {
            await DatabaseService.initialize('development');
            expect(DatabaseService.getEnvironment()).toBe('development');

            await DatabaseService.close();

            // Mock successful PostgreSQL connection for production
            const mockPgKnex = {
                raw: jest.fn().mockResolvedValue(true),
                destroy: jest.fn().mockResolvedValue(undefined)
            };
            jest.spyOn(DatabaseService, 'getKnex').mockReturnValue(mockPgKnex);

            await DatabaseService.initialize('production');
            expect(DatabaseService.getEnvironment()).toBe('production');
        });
    });
});