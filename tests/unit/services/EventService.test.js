const EventService = require('../../../src/services/EventService');
const DatabaseService = require('../../../src/services/DatabaseService');
const AppError = require('../../../src/utils/AppError');
const { ErrorTypes } = require('../../../src/utils/errorTypes');

// Mock DatabaseService
jest.mock('../../../src/services/DatabaseService', () => ({
    getKnex: jest.fn()
}));

describe('EventService', () => {
    let mockKnex;
    let mockTransaction;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock transaction object
        mockTransaction = {
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined)
        };

        // Create mock Knex querybuilder
        mockKnex = jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            whereBetween: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            first: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            modify: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            transaction: jest.fn().mockImplementation(fn => {
                if (fn) {
                    return fn(mockTransaction);
                }
                return Promise.resolve(mockTransaction);
            })
        });

        // Set up DatabaseService mock
        DatabaseService.getKnex.mockReturnValue(mockKnex);
    });

    describe('Event Creation', () => {
        it('should create a single event successfully', async () => {
            const eventData = {
                title: 'Test Event',
                description: 'Test Description',
                start_date: new Date(),
                end_date: new Date()
            };

            const mockCreatedEvent = { id: 1, ...eventData };
            mockKnex().insert().returning.mockResolvedValue([mockCreatedEvent]);

            const result = await EventService.createEvent(eventData);

            expect(result).toEqual(mockCreatedEvent);
            expect(mockKnex).toHaveBeenCalledWith('events');
            expect(mockKnex().insert).toHaveBeenCalledWith(eventData);
        });

        it('should create multiple events in a transaction', async () => {
            const events = [
                { title: 'Event 1', description: 'Description 1' },
                { title: 'Event 2', description: 'Description 2' }
            ];

            mockTransaction[EventService.tableName] = jest.fn().mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                returning: jest.fn().mockImplementation((event) => 
                    Promise.resolve([{ id: Math.random(), ...event }])
                )
            });

            const result = await EventService.createManyEvents(events);

            expect(result).toHaveLength(events.length);
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
        });

        it('should handle creation errors appropriately', async () => {
            const eventData = { title: 'Test Event' };
            const dbError = new Error('Database error');
            dbError.code = '23505'; // Duplicate entry error

            mockKnex().insert().returning.mockRejectedValue(dbError);

            await expect(EventService.createEvent(eventData))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Event Retrieval', () => {
        it('should get event by ID successfully', async () => {
            const mockEvent = { id: 1, title: 'Test Event' };
            mockKnex().where().first.mockResolvedValue(mockEvent);

            const result = await EventService.getEventById(1);

            expect(result).toEqual(mockEvent);
            expect(mockKnex().where).toHaveBeenCalledWith({ id: 1 });
        });

        it('should handle non-existent event retrieval', async () => {
            mockKnex().where().first.mockResolvedValue(null);

            await expect(EventService.getEventById(999))
                .rejects
                .toThrow(AppError);
        });

        it('should get events with pagination and filters', async () => {
            const mockEvents = [
                { id: 1, title: 'Event 1' },
                { id: 2, title: 'Event 2' }
            ];
            const mockCount = { total: '2' };

            mockKnex().modify().orderBy().limit().offset.mockResolvedValue(mockEvents);
            mockKnex().count().first.mockResolvedValue(mockCount);

            const options = {
                page: 1,
                limit: 10,
                startDate: new Date(),
                endDate: new Date(),
                type: 'TEST',
                status: 'ACTIVE'
            };

            const result = await EventService.getEvents(options);

            expect(result.data).toEqual(mockEvents);
            expect(result.pagination).toBeDefined();
            expect(result.pagination.total).toBe(2);
        });

        it('should get events by date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');
            const mockEvents = [
                { id: 1, title: 'Event in range' }
            ];

            mockKnex().whereBetween().orderBy.mockResolvedValue(mockEvents);

            const result = await EventService.getEventsByDateRange(startDate, endDate);

            expect(result).toEqual(mockEvents);
            expect(mockKnex().whereBetween).toHaveBeenCalledWith(
                'start_date',
                [startDate, endDate]
            );
        });

        it('should search events by query', async () => {
            const searchQuery = 'test';
            const mockEvents = [
                { id: 1, title: 'Test Event' }
            ];

            mockKnex().where().orWhere().orderBy.mockResolvedValue(mockEvents);

            const result = await EventService.searchEvents(searchQuery);

            expect(result).toEqual(mockEvents);
            expect(mockKnex().where).toHaveBeenCalled();
            expect(mockKnex().orWhere).toHaveBeenCalled();
        });
    });

    describe('Event Updates', () => {
        it('should update event successfully', async () => {
            const updateData = { title: 'Updated Event' };
            const mockUpdatedEvent = { id: 1, ...updateData };

            mockKnex().where().update().returning.mockResolvedValue([mockUpdatedEvent]);

            const result = await EventService.updateEvent(1, updateData);

            expect(result).toEqual(mockUpdatedEvent);
            expect(mockKnex().where).toHaveBeenCalledWith({ id: 1 });
            expect(mockKnex().update).toHaveBeenCalledWith(updateData);
        });

        it('should handle update of non-existent event', async () => {
            mockKnex().where().update().returning.mockResolvedValue([]);

            await expect(EventService.updateEvent(999, { title: 'New Title' }))
                .rejects
                .toThrow(AppError);
        });

        it('should handle update validation errors', async () => {
            const dbError = new Error('Validation error');
            dbError.code = '23503'; // Foreign key violation

            mockKnex().where().update().returning.mockRejectedValue(dbError);

            await expect(EventService.updateEvent(1, { invalid: 'data' }))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Event Deletion', () => {
        it('should delete event successfully', async () => {
            mockKnex().where().delete.mockResolvedValue(1);

            const result = await EventService.deleteEvent(1);

            expect(result).toBe(true);
            expect(mockKnex().where).toHaveBeenCalledWith({ id: 1 });
        });

        it('should handle deletion of non-existent event', async () => {
            mockKnex().where().delete.mockResolvedValue(0);

            await expect(EventService.deleteEvent(999))
                .rejects
                .toThrow(AppError);
        });

        it('should handle deletion errors', async () => {
            const dbError = new Error('Database error');
            mockKnex().where().delete.mockRejectedValue(dbError);

            await expect(EventService.deleteEvent(1))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('Error Handling', () => {
        it('should handle duplicate entry errors', async () => {
            const dbError = new Error('Duplicate entry');
            dbError.code = '23505';
            dbError.detail = 'Key already exists';

            mockKnex().insert().returning.mockRejectedValue(dbError);

            await expect(EventService.createEvent({ title: 'Duplicate' }))
                .rejects
                .toThrow(AppError);
        });

        it('should handle foreign key violation errors', async () => {
            const dbError = new Error('Foreign key violation');
            dbError.code = '23503';
            dbError.detail = 'Referenced record does not exist';

            mockKnex().insert().returning.mockRejectedValue(dbError);

            await expect(EventService.createEvent({ invalid_ref: 999 }))
                .rejects
                .toThrow(AppError);
        });

        it('should handle general database errors', async () => {
            const dbError = new Error('General database error');
            dbError.code = 'UNKNOWN';

            mockKnex().insert().returning.mockRejectedValue(dbError);

            await expect(EventService.createEvent({ title: 'Test' }))
                .rejects
                .toThrow(AppError);
        });

        it('should pass through AppErrors unchanged', async () => {
            const appError = new AppError(
                ErrorTypes.VALIDATION_ERROR,
                'EventService',
                'createEvent',
                { message: 'Custom error' }
            );

            mockKnex().insert().returning.mockRejectedValue(appError);

            await expect(EventService.createEvent({ title: 'Test' }))
                .rejects
                .toThrow(appError);
        });
    });
});