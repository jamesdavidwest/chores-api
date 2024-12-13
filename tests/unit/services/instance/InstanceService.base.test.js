const InstanceService = require('../../../../src/services/InstanceService');
const DatabaseService = require('../../../../src/services/DatabaseService');
const TransactionManager = require('../../../../src/utils/TransactionManager');
const AppError = require('../../../../src/utils/AppError');
const { ErrorTypes } = require('../../../../src/utils/errorTypes');

// Mock dependencies
jest.mock('../../../../src/services/DatabaseService');
jest.mock('../../../../src/utils/TransactionManager');

// Shared test setup
const setupTest = () => {
    const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined)
    };

    const mockKnex = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis()
    });

    DatabaseService.getKnex.mockReturnValue(mockKnex);
    mockKnex.fn = {
        now: jest.fn().mockReturnValue(new Date('2024-01-01T00:00:00Z'))
    };

    return { mockKnex, mockTransaction };
};

module.exports = {
    setupTest,
    InstanceService,
    DatabaseService,
    TransactionManager,
    AppError,
    ErrorTypes
};