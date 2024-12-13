const {
    setupTest,
    InstanceService
} = require('./InstanceService.base.test');

describe('InstanceService - Listing Operations', () => {
    let instanceService;
    let mockKnex;

    beforeEach(() => {
        jest.clearAllMocks();
        const setup = setupTest();
        mockKnex = setup.mockKnex;
        instanceService = new InstanceService();
    });

    describe('List Instances', () => {
        it('should list instances with pagination', async () => {
            const mockInstances = [
                { id: 1, type: 'test', status: 'active' },
                { id: 2, type: 'test', status: 'active' }
            ];
            const mockCount = [{ count: '2' }];

            mockKnex().clone().count.mockResolvedValue(mockCount);
            mockKnex().orderBy().offset().limit.mockResolvedValue(mockInstances);

            const result = await instanceService.list(1, 10);

            expect(result.data).toEqual(mockInstances);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1
            });
        });

        it('should apply filters correctly', async () => {
            const filters = {
                type: 'test',
                status: 'active',
                createdBy: 'user1',
                tags: ['tag1', 'tag2']
            };

            mockKnex().clone().count.mockResolvedValue([{ count: '0' }]);
            mockKnex().orderBy().offset().limit.mockResolvedValue([]);

            await instanceService.list(1, 10, filters);

            expect(mockKnex().where).toHaveBeenCalledWith('type', filters.type);
            expect(mockKnex().where).toHaveBeenCalledWith('status', filters.status);
            expect(mockKnex().where).toHaveBeenCalledWith('created_by', filters.createdBy);
            expect(mockKnex().whereRaw).toHaveBeenCalledWith(
                'tags && ?::text[]',
                [filters.tags]
            );
        });

        it('should handle empty results', async () => {
            mockKnex().clone().count.mockResolvedValue([{ count: '0' }]);
            mockKnex().orderBy().offset().limit.mockResolvedValue([]);

            const result = await instanceService.list(1, 10);

            expect(result.data).toEqual([]);
            expect(result.pagination.total).toBe(0);
            expect(result.pagination.totalPages).toBe(0);
        });

        it('should ignore undefined filters', async () => {
            const filters = {
                type: undefined,
                status: null,
                createdBy: undefined,
                tags: undefined
            };

            mockKnex().clone().count.mockResolvedValue([{ count: '0' }]);
            mockKnex().orderBy().offset().limit.mockResolvedValue([]);

            await instanceService.list(1, 10, filters);

            expect(mockKnex().where).not.toHaveBeenCalled();
            expect(mockKnex().whereRaw).not.toHaveBeenCalled();
        });

        it('should handle listing with negative page numbers', async () => {
            mockKnex().clone().count.mockResolvedValue([{ count: '0' }]);
            mockKnex().orderBy().offset().limit.mockResolvedValue([]);

            const result = await instanceService.list(-1, 10);

            expect(mockKnex().offset).toHaveBeenCalledWith(0);
        });

        it('should handle listing with zero limit', async () => {
            mockKnex().clone().count.mockResolvedValue([{ count: '10' }]);
            mockKnex().orderBy().offset().limit.mockResolvedValue([]);

            const result = await instanceService.list(1, 0);

            expect(result.pagination.totalPages).toBe(Infinity);
        });
    });
});