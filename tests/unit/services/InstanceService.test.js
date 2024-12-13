const TestUtils = require('../../utils/testUtils');
const InstanceService = require('../../../src/services/InstanceService');
const AppError = require('../../../src/utils/AppError');

describe('InstanceService', () => {
  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
  });

  afterEach(async () => {
    await TestUtils.cleanupTestDatabase();
  });

  describe('createInstance', () => {
    it('should create an instance with valid data', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const mockInstance = TestUtils.generateMockInstance(mockEvent.id);
      
      const result = await InstanceService.createInstance(mockInstance);
      
      expect(result).toMatchObject({
        eventId: mockEvent.id,
        status: mockInstance.status,
        data: mockInstance.data
      });
    });

    it('should handle validation errors for invalid event ID', async () => {
      const mockInstance = TestUtils.generateMockInstance('invalid-event-id');
      
      await expect(
        InstanceService.createInstance(mockInstance)
      ).rejects.toThrow(AppError);
    });

    it('should handle validation errors for invalid status', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const invalidInstance = TestUtils.generateMockInstance(mockEvent.id, {
        status: 'INVALID_STATUS'
      });

      await expect(
        InstanceService.createInstance(invalidInstance)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getInstance', () => {
    it('should retrieve an existing instance', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const mockInstance = await TestUtils.createTestInstance(mockEvent.id);
      
      const result = await InstanceService.getInstance(mockInstance.id);
      
      expect(result).toMatchObject({
        id: mockInstance.id,
        eventId: mockEvent.id,
        status: mockInstance.status
      });
    });

    it('should throw error for non-existent instance', async () => {
      await expect(
        InstanceService.getInstance('non-existent-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateInstance', () => {
    it('should update instance status', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const mockInstance = await TestUtils.createTestInstance(mockEvent.id);
      
      const updates = {
        status: 'COMPLETED',
        data: JSON.stringify({ updated: true })
      };

      const result = await InstanceService.updateInstance(mockInstance.id, updates);
      
      expect(result).toMatchObject({
        id: mockInstance.id,
        status: updates.status,
        data: updates.data
      });
    });

    it('should validate status transitions', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const mockInstance = await TestUtils.createTestInstance(mockEvent.id, {
        status: 'COMPLETED'
      });

      const invalidUpdate = {
        status: 'PENDING'
      };

      await expect(
        InstanceService.updateInstance(mockInstance.id, invalidUpdate)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteInstance', () => {
    it('should delete an existing instance', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const mockInstance = await TestUtils.createTestInstance(mockEvent.id);
      
      await InstanceService.deleteInstance(mockInstance.id);
      
      await expect(
        InstanceService.getInstance(mockInstance.id)
      ).rejects.toThrow(AppError);
    });

    it('should handle deletion of non-existent instance', async () => {
      await expect(
        InstanceService.deleteInstance('non-existent-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('listInstances', () => {
    it('should return paginated list of instances', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      
      // Create multiple test instances
      await Promise.all([
        TestUtils.createTestInstance(mockEvent.id),
        TestUtils.createTestInstance(mockEvent.id),
        TestUtils.createTestInstance(mockEvent.id)
      ]);

      const result = await InstanceService.listInstances({
        page: 1,
        limit: 2
      });
      
      expect(result).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            eventId: mockEvent.id
          })
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          hasMore: true
        }
      });
    });

    it('should filter instances by status', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      
      await TestUtils.createTestInstance(mockEvent.id, { status: 'PENDING' });
      await TestUtils.createTestInstance(mockEvent.id, { status: 'COMPLETED' });
      
      const result = await InstanceService.listInstances({
        status: 'COMPLETED'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('COMPLETED');
    });

    it('should filter instances by eventId', async () => {
      const mockEvent1 = await TestUtils.createTestEvent();
      const mockEvent2 = await TestUtils.createTestEvent();
      
      await TestUtils.createTestInstance(mockEvent1.id);
      await TestUtils.createTestInstance(mockEvent2.id);
      
      const result = await InstanceService.listInstances({
        eventId: mockEvent1.id
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].eventId).toBe(mockEvent1.id);
    });
  });
});