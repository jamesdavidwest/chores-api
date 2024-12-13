const {
    setupTest,
    InstanceService,
    TransactionManager,
    AppError,
    ErrorTypes
} = require('./InstanceService.base.test');

describe('InstanceService - Error Handling', () => {
    let instanceService;
    let mockKnex;

    beforeEach(() => {
        jest.clearAllMocks();
        const setup = setupTest();
        mockKnex = setup.mockKnex;
        instanceService = new InstanceService();
    });

    describe('Database Error Handling', () => {
        it('should handle duplicate entry errors', async () => {
            const dbError = new Error('Duplicate entry');
            dbError.code = '23505';
            dbError.detail = 'Key already exists';
            dbError.constraint = 'unique_constraint';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test' }))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.DUPLICATE_ENTRY,
                    details: expect.objectContaining({
                        constraint: 'unique_constraint'
                    })
                });
        });

        it('should handle foreign key violation errors', async () => {
            const dbError = new Error('Foreign key violation');
            dbError.code = '23503';
            dbError.detail = 'Referenced record does not exist';
            dbError.constraint = 'fk_constraint';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test' }))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.VALIDATION_ERROR,
                    details: expect.objectContaining({
                        constraint: 'fk_constraint'
                    })
                });
        });

        it('should handle JSON validation errors', async () => {
            const dbError = new Error('Invalid JSON');
            dbError.code = '22P02';
            dbError.message = 'Invalid input syntax for type json';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test', metadata: 'invalid' }))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.VALIDATION_ERROR,
                    details: expect.objectContaining({
                        message: 'Invalid JSON data'
                    })
                });
        });

        it('should handle transaction deadlock errors', async () => {
            const dbError = new Error('Deadlock detected');
            dbError.code = '40P01';
            dbError.message = 'Deadlock detected';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test' }))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.TRANSACTION_ERROR,
                    details: expect.objectContaining({
                        message: 'Deadlock detected'
                    })
                });
        });

        it('should handle general database errors', async () => {
            const dbError = new Error('Unknown database error');
            dbError.code = 'UNKNOWN';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test' }))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.DB_ERROR
                });
        });
    });

    describe('Input Validation Errors', () => {
        it('should handle missing required fields', async () => {
            const instanceData = {}; // Missing required type field

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                const error = new Error('Not null violation');
                error.code = '23502';
                throw error;
            });

            await expect(instanceService.create(instanceData))
                .rejects
                .toThrow(AppError);
        });

        it('should handle invalid data types', async () => {
            const instanceData = {
                type: 123, // Should be string
                metadata: 'not-an-object' // Should be object
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                const error = new Error('Invalid input syntax');
                error.code = '22P02';
                throw error;
            });

            await expect(instanceService.create(instanceData))
                .rejects
                .toThrow(AppError);
        });

        it('should handle invalid status transitions', async () => {
            const mockInstance = {
                id: 1,
                type: 'test',
                status: 'completed'
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockInstance);
                return callback(trx);
            });

            await expect(instanceService.archive(1))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Not Found Errors', () => {
        it('should handle instance not found in getById', async () => {
            mockKnex().where().first.mockResolvedValue(null);

            await expect(instanceService.getById(999))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.NOT_FOUND,
                    details: expect.objectContaining({
                        resource: 'Instance',
                        id: 999
                    })
                });
        });

        it('should handle parent not found in child creation', async () => {
            const childData = {
                type: 'child',
                parentId: 999
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().insert().returning.mockResolvedValue([{ id: 1, ...childData }]);
                trx().where().first.mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.create(childData))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.NOT_FOUND,
                    details: expect.objectContaining({
                        resource: 'Parent Instance'
                    })
                });
        });

        it('should handle old parent not found in parent update', async () => {
            const currentInstance = {
                id: 1,
                parentId: 999,
                type: 'child'
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first
                    .mockResolvedValueOnce(currentInstance)
                    .mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.update(1, { parentId: 2 }))
                .rejects
                .toMatchObject({
                    type: ErrorTypes.NOT_FOUND
                });
        });
    });

    describe('Concurrent Modification Handling', () => {
        it('should handle concurrent updates', async () => {
            const dbError = new Error('Concurrent update detected');
            dbError.code = '40001';
            dbError.message = 'Could not serialize access due to concurrent update';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.update(1, { status: 'updated' }))
                .rejects
                .toThrow(AppError);
        });

        it('should handle transaction timeouts', async () => {
            const dbError = new Error('Transaction timeout');
            dbError.code = '40P02';
            dbError.message = 'Lock timeout';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.update(1, { status: 'updated' }))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Error Context Information', () => {
        it('should include method name in error details', async () => {
            const dbError = new Error('Test error');
            dbError.code = 'TEST';

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test' }))
                .rejects
                .toMatchObject({
                    method: 'create'
                });
        });

        it('should include relevant parameters in error details', async () => {
            const instanceId = 999;
            mockKnex().where().first.mockResolvedValue(null);

            await expect(instanceService.getById(instanceId))
                .rejects
                .toMatchObject({
                    details: expect.objectContaining({
                        id: instanceId
                    })
                });
        });

        it('should maintain error chain for nested errors', async () => {
            const originalError = new Error('Original error');
            const dbError = new Error('Database error');
            dbError.code = 'TEST';
            dbError.cause = originalError;

            TransactionManager.executeTransaction.mockRejectedValue(dbError);

            await expect(instanceService.create({ type: 'test' }))
                .rejects
                .toMatchObject({
                    details: expect.objectContaining({
                        message: dbError.message
                    })
                });
        });
    });
});