const TestUtils = require('../../utils/testUtils');
const EventService = require('../../../src/services/EventService');
const AppError = require('../../../src/utils/AppError');

describe('EventService', () => {
  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
  });

  afterEach(async () => {
    await TestUtils.cleanupTestDatabase();
  });

  describe('createEvent', () => {
    it('should create an event with valid data', async () => {
      const mockEvent = TestUtils.generateMockEvent();
      const result = await EventService.createEvent(mockEvent);
      
      expect(result).toMatchObject({
        title: mockEvent.title,
        description: mockEvent.description,
        startDate: mockEvent.startDate,
        endDate: mockEvent.endDate,
        status: mockEvent.status,
        createdBy: mockEvent.createdBy
      });
    });

    it('should handle validation errors for missing required fields', async () => {
      const invalidEvent = {
        title: '',
        description: 'Test Description'
      };

      await expect(
        EventService.createEvent(invalidEvent)
      ).rejects.toThrow(AppError);
    });

    it('should handle validation errors for invalid dates', async () => {
      const invalidEvent = TestUtils.generateMockEvent({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2023-12-31')
      });

      await expect(
        EventService.createEvent(invalidEvent)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getEvent', () => {
    it('should retrieve an existing event', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const result = await EventService.getEvent(mockEvent.id);
      
      expect(result).toMatchObject({
        id: mockEvent.id,
        title: mockEvent.title,
        description: mockEvent.description
      });
    });

    it('should throw error for non-existent event', async () => {
      const nonExistentId = 'non-existent-id';
      
      await expect(
        EventService.getEvent(nonExistentId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateEvent', () => {
    it('should update an existing event', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const result = await EventService.updateEvent(mockEvent.id, updates);
      
      expect(result).toMatchObject({
        id: mockEvent.id,
        ...updates
      });
    });

    it('should handle validation errors for invalid updates', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      const invalidUpdates = {
        status: 'INVALID_STATUS'
      };

      await expect(
        EventService.updateEvent(mockEvent.id, invalidUpdates)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an existing event', async () => {
      const mockEvent = await TestUtils.createTestEvent();
      await EventService.deleteEvent(mockEvent.id);
      
      await expect(
        EventService.getEvent(mockEvent.id)
      ).rejects.toThrow(AppError);
    });

    it('should handle deletion of non-existent event', async () => {
      const nonExistentId = 'non-existent-id';
      
      await expect(
        EventService.deleteEvent(nonExistentId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('listEvents', () => {
    it('should return paginated list of events', async () => {
      // Create multiple test events
      await Promise.all([
        TestUtils.createTestEvent(),
        TestUtils.createTestEvent(),
        TestUtils.createTestEvent()
      ]);

      const result = await EventService.listEvents({ page: 1, limit: 2 });
      
      expect(result).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String)
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

    it('should filter events by status', async () => {
      await TestUtils.createTestEvent({ status: 'DRAFT' });
      await TestUtils.createTestEvent({ status: 'PUBLISHED' });
      
      const result = await EventService.listEvents({ 
        status: 'PUBLISHED'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('PUBLISHED');
    });
  });
});