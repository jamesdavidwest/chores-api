const {
    setupTest,
    InstanceService,
    TransactionManager,
    AppError
} = require('./InstanceService.base.test');

describe('InstanceService - Archive Operations', () => {
    let instanceService;
    let mockKnex;

    beforeEach(() => {
        jest.clearAllMocks();
        const setup = setupTest();
        mockKnex = setup.mockKnex;
        instanceService = new InstanceService();
    });

    describe('Archive Instance', () => {
        it('should archive instance successfully', async () => {
            const mockInstance = {
                id: 1,
                type: 'test',
                status: 'active'
            };
            const mockArchivedInstance = {
                ...mockInstance,
                status: 'archived',
                archived_at: new Date()
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockInstance);
                trx().where().update().returning.mockResolvedValue([mockArchivedInstance]);
                return callback(trx);
            });

            const result = await instanceService.archive(1);

            expect(result).toEqual(mockArchivedInstance);
            expect(result.status).toBe('archived');
            expect(result.archived_at).toBeDefined();
        });

        it('should handle archive of non-existent instance', async () => {
            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.archive(999))
                .rejects
                .toThrow(AppError);
        });

        it('should handle archive of already archived instance', async () => {
            const mockInstance = {
                id: 1,
                type: 'test',
                status: 'archived',
                archived_at: new Date()
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockInstance);
                trx().where().update().returning.mockResolvedValue([mockInstance]);
                return callback(trx);
            });

            const result = await instanceService.archive(1);
            expect(result.status).toBe('archived');
        });

        it('should handle archive with transaction failure', async () => {
            const error = new Error('Transaction failed');
            TransactionManager.executeTransaction.mockRejectedValue(error);

            await expect(instanceService.archive(1))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Restore Instance', () => {
        it('should restore archived instance successfully', async () => {
            const mockArchivedInstance = {
                id: 1,
                type: 'test',
                status: 'archived',
                archived_at: new Date()
            };
            const mockRestoredInstance = {
                ...mockArchivedInstance,
                status: 'active',
                archived_at: null
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockArchivedInstance);
                trx().where().update().returning.mockResolvedValue([mockRestoredInstance]);
                return callback(trx);
            });

            const result = await instanceService.restore(1);

            expect(result).toEqual(mockRestoredInstance);
            expect(result.status).toBe('active');
            expect(result.archived_at).toBeNull();
        });

        it('should handle restore of non-existent instance', async () => {
            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.restore(999))
                .rejects
                .toThrow(AppError);
        });

        it('should handle restore of non-archived instance', async () => {
            const mockInstance = {
                id: 1,
                type: 'test',
                status: 'active',
                archived_at: null
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockInstance);
                return callback(trx);
            });

            await expect(instanceService.restore(1))
                .rejects
                .toThrow(AppError);
        });

        it('should handle restore with transaction failure', async () => {
            const error = new Error('Transaction failed');
            TransactionManager.executeTransaction.mockRejectedValue(error);

            await expect(instanceService.restore(1))
                .rejects
                .toThrow(AppError);
        });

        it('should maintain instance metadata during restore', async () => {
            const mockArchivedInstance = {
                id: 1,
                type: 'test',
                status: 'archived',
                archived_at: new Date(),
                metadata: { important: 'data' }
            };
            const mockRestoredInstance = {
                ...mockArchivedInstance,
                status: 'active',
                archived_at: null
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockArchivedInstance);
                trx().where().update().returning.mockResolvedValue([mockRestoredInstance]);
                return callback(trx);
            });

            const result = await instanceService.restore(1);
            expect(result.metadata).toEqual(mockArchivedInstance.metadata);
        });
    });
});