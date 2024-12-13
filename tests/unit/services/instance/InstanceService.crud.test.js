const {
    setupTest,
    InstanceService,
    TransactionManager,
    AppError
} = require('./InstanceService.base.test');

describe('InstanceService - CRUD Operations', () => {
    let instanceService;
    let mockKnex;

    beforeEach(() => {
        jest.clearAllMocks();
        const setup = setupTest();
        mockKnex = setup.mockKnex;
        instanceService = new InstanceService();
    });

    describe('Create Instance', () => {
        it('should create instance with basic data', async () => {
            const instanceData = {
                type: 'test',
                status: 'active',
                metadata: { key: 'value' }
            };
            const mockCreatedInstance = { id: 1, ...instanceData };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().insert().returning.mockResolvedValue([mockCreatedInstance]);
                return callback(trx);
            });

            const result = await instanceService.create(instanceData);

            expect(result).toEqual(mockCreatedInstance);
            expect(TransactionManager.executeTransaction).toHaveBeenCalled();
        });

        it('should handle child instance creation', async () => {
            const childData = {
                type: 'child',
                parentId: 1,
                metadata: { key: 'value' }
            };
            const mockParent = { id: 1, type: 'parent' };
            const mockChild = { id: 2, ...childData };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().insert().returning.mockResolvedValue([mockChild]);
                trx().where().first.mockResolvedValue(mockParent);
                trx().where().update.mockResolvedValue([mockParent]);
                return callback(trx);
            });

            const result = await instanceService.create(childData);

            expect(result).toEqual(mockChild);
            expect(TransactionManager.executeTransaction).toHaveBeenCalled();
        });

        it('should handle parent not found error', async () => {
            const childData = {
                type: 'child',
                parentId: 999,
                metadata: { key: 'value' }
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().insert().returning.mockResolvedValue([{ id: 2, ...childData }]);
                trx().where().first.mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.create(childData))
                .rejects
                .toThrow(AppError);
        });

        it('should handle transaction failure', async () => {
            const instanceData = { type: 'test' };
            const error = new Error('Transaction failed');

            TransactionManager.executeTransaction.mockRejectedValue(error);

            await expect(instanceService.create(instanceData))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Update Instance', () => {
        it('should update instance basic data', async () => {
            const updateData = {
                status: 'updated',
                metadata: { updated: true }
            };
            const mockInstance = { id: 1, ...updateData };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockInstance);
                trx().where().update().returning.mockResolvedValue([mockInstance]);
                return callback(trx);
            });

            const result = await instanceService.update(1, updateData);

            expect(result).toEqual(mockInstance);
            expect(TransactionManager.executeTransaction).toHaveBeenCalled();
        });

        it('should handle parent ID changes', async () => {
            const currentInstance = {
                id: 1,
                parentId: 1,
                type: 'child'
            };
            const updateData = {
                parentId: 2
            };
            const mockOldParent = { id: 1, type: 'parent' };
            const mockNewParent = { id: 2, type: 'parent' };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first
                    .mockResolvedValueOnce(currentInstance)
                    .mockResolvedValueOnce(mockOldParent)
                    .mockResolvedValueOnce(mockNewParent);
                trx().where().update().returning.mockResolvedValue([
                    { ...currentInstance, ...updateData }
                ]);
                return callback(trx);
            });

            const result = await instanceService.update(1, updateData);

            expect(result.parentId).toBe(updateData.parentId);
            expect(TransactionManager.executeTransaction).toHaveBeenCalled();
        });

        it('should handle instance not found', async () => {
            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.update(999, { status: 'updated' }))
                .rejects
                .toThrow(AppError);
        });

        it('should handle metadata updates', async () => {
            const currentInstance = {
                id: 1,
                type: 'test',
                metadata: { original: true }
            };
            const updateData = {
                metadata: { updated: true }
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(currentInstance);
                trx().where().update().returning.mockResolvedValue([
                    { ...currentInstance, ...updateData }
                ]);
                return callback(trx);
            });

            const result = await instanceService.update(1, updateData);
            expect(result.metadata).toEqual(updateData.metadata);
        });
    });

    describe('Delete Instance', () => {
        it('should delete instance', async () => {
            const mockInstance = { id: 1, type: 'test' };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(mockInstance);
                trx().where().del.mockResolvedValue(1);
                return callback(trx);
            });

            const result = await instanceService.delete(1);
            expect(result).toBe(true);
            expect(TransactionManager.executeTransaction).toHaveBeenCalled();
        });

        it('should handle deletion of child instance', async () => {
            const mockChild = {
                id: 2,
                type: 'child',
                parentId: 1
            };
            const mockParent = { id: 1, type: 'parent' };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first
                    .mockResolvedValueOnce(mockChild)
                    .mockResolvedValueOnce(mockParent);
                trx().where().del.mockResolvedValue(1);
                return callback(trx);
            });

            const result = await instanceService.delete(2);
            expect(result).toBe(true);
            expect(TransactionManager.executeTransaction).toHaveBeenCalled();
        });

        it('should handle instance not found', async () => {
            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first.mockResolvedValue(null);
                return callback(trx);
            });

            await expect(instanceService.delete(999))
                .rejects
                .toThrow(AppError);
        });

        it('should handle parent not found during child deletion', async () => {
            const mockChild = {
                id: 2,
                type: 'child',
                parentId: 1
            };

            TransactionManager.executeTransaction.mockImplementation(async (callback) => {
                const trx = mockKnex;
                trx().where().first
                    .mockResolvedValueOnce(mockChild)
                    .mockResolvedValueOnce(null);
                return callback(trx);
            });

            await expect(instanceService.delete(2))
                .rejects
                .toThrow(AppError);
        });

        it('should handle deletion with transaction failure', async () => {
            const mockInstance = { id: 1, type: 'test' };
            const error = new Error('Transaction failed');

            TransactionManager.executeTransaction.mockRejectedValue(error);

            await expect(instanceService.delete(1))
                .rejects
                .toThrow(AppError);
        });
    });
});