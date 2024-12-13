const EventService = require('../../../src/services/EventService');
const DatabaseService = require('../../../src/services/DatabaseService');
const AppError = require('../../../src/utils/AppError');

describe('EventService Integration', () => {
    beforeAll(async () => {
        // Initialize database with test configuration
        await DatabaseService.initialize('testing');
        
        // Create events table if it doesn't exist
        const knex = DatabaseService.getKnex();
        const hasTable = await knex.schema.hasTable('events');
        
        if (!hasTable) {
            await knex.schema.createTable('events', (table) => {
                table.increments('id');
                table.string('title').notNullable();
                table.text('description');
                table.string('type');
                table.string('status').defaultTo('DRAFT');
                table.timestamp('start_date');
                table.timestamp('end_date');
                table.timestamp('created_at').defaultTo(knex.fn.now());
                table.timestamp('updated_at').defaultTo(knex.fn.now());
            });
        }
    });

    afterAll(async () => {
        // Clean up test database
        const knex = DatabaseService.getKnex();
        await knex.schema.dropTableIfExists('events');
        await DatabaseService.close();
    });

    beforeEach(async () => {
        // Clear events table before each test
        await DatabaseService.getKnex()('events').truncate();
    });

    describe('Event Creation', () => {
        it('should create a single event with all fields', async () => {
            const eventData = {
                title: 'Integration Test Event',
                description: 'Test Description',
                type: 'TEST',
                status: 'ACTIVE',
                start_date: new Date('2024-01-01'),
                end_date: new Date('2024-01-02')
            };

            const event = await EventService.createEvent(eventData);

            expect(event).toMatchObject(eventData);
            expect(event.id).toBeDefined();
            expect(event.created_at).toBeDefined();
            expect(event.updated_at).toBeDefined();
        });

        it('should create multiple events in a transaction', async () => {
            const events = [
                {
                    title: 'Event 1',
                    description: 'Description 1',
                    type: 'TEST',
                    start_date: new Date()
                },
                {
                    title: 'Event 2',
                    description: 'Description 2',
                    type: 'TEST',
                    start_date: new Date()
                }
            ];

            const createdEvents = await EventService.createManyEvents(events);

            expect(createdEvents).toHaveLength(2);
            expect(createdEvents[0].title).toBe('Event 1');
            expect(createdEvents[1].title).toBe('Event 2');
        });

        it('should rollback transaction on error during bulk creation', async () => {
            const events = [
                { title: 'Valid Event' },
                { title: null } // This should cause a validation error
            ];

            await expect(EventService.createManyEvents(events))
                .rejects
                .toThrow();

            // Verify no events were created
            const allEvents = await DatabaseService.getKnex()('events').select('*');
            expect(allEvents).toHaveLength(0);
        });
    });

    describe('Event Retrieval', () => {
        let testEvents;

        beforeEach(async () => {
            // Create test events
            testEvents = await EventService.createManyEvents([
                {
                    title: 'Past Event',
                    type: 'TEST',
                    status: 'COMPLETED',
                    start_date: new Date('2023-01-01'),
                    end_date: new Date('2023-01-02')
                },
                {
                    title: 'Current Event',
                    type: 'TEST',
                    status: 'ACTIVE',
                    start_date: new Date('2024-01-01'),
                    end_date: new Date('2024-12-31')
                },
                {
                    title: 'Future Event',
                    type: 'SPECIAL',
                    status: 'DRAFT',
                    start_date: new Date('2025-01-01'),
                    end_date: new Date('2025-01-02')
                }
            ]);
        });

        it('should get event by ID', async () => {
            const event = await EventService.getEventById(testEvents[0].id);
            expect(event).toMatchObject(testEvents[0]);
        });

        it('should throw error for non-existent event ID', async () => {
            await expect(EventService.getEventById(9999))
                .rejects
                .toThrow(AppError);
        });

        it('should get events with pagination', async () => {
            const result = await EventService.getEvents({
                page: 1,
                limit: 2
            });

            expect(result.data).toHaveLength(2);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 2,
                total: 3,
                totalPages: 2
            });
        });

        it('should filter events by date range', async () => {
            const result = await EventService.getEvents({
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31')
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].title).toBe('Current Event');
        });

        it('should filter events by type', async () => {
            const result = await EventService.getEvents({
                type: 'SPECIAL'
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].title).toBe('Future Event');
        });

        it('should filter events by status', async () => {
            const result = await EventService.getEvents({
                status: 'COMPLETED'
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].title).toBe('Past Event');
        });

        it('should get events by date range directly', async () => {
            const events = await EventService.getEventsByDateRange(
                new Date('2024-01-01'),
                new Date('2024-12-31')
            );

            expect(events).toHaveLength(1);
            expect(events[0].title).toBe('Current Event');
        });

        it('should get events by type with pagination', async () => {
            const events = await EventService.getEventsByType('TEST', {
                limit: 1,
                offset: 0
            });

            expect(events).toHaveLength(1);
            expect(events[0].type).toBe('TEST');
        });

        it('should search events by title', async () => {
            const events = await EventService.searchEvents('Current');
            expect(events).toHaveLength(1);
            expect(events[0].title).toBe('Current Event');
        });

        it('should search events by description', async () => {
            // Create an event with searchable description
            await EventService.createEvent({
                title: 'Search Test',
                description: 'Searchable content here',
                type: 'TEST'
            });

            const events = await EventService.searchEvents('Searchable');
            expect(events).toHaveLength(1);
            expect(events[0].description).toContain('Searchable');
        });
    });

    describe('Event Updates', () => {
        let testEvent;

        beforeEach(async () => {
            testEvent = await EventService.createEvent({
                title: 'Update Test Event',
                description: 'Original Description',
                type: 'TEST',
                status: 'DRAFT'
            });
        });

        it('should update event fields', async () => {
            const updateData = {
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'ACTIVE'
            };

            const updatedEvent = await EventService.updateEvent(testEvent.id, updateData);

            expect(updatedEvent).toMatchObject(updateData);
            expect(updatedEvent.id).toBe(testEvent.id);
        });

        it('should handle partial updates', async () => {
            const updateData = {
                status: 'ACTIVE'
            };

            const updatedEvent = await EventService.updateEvent(testEvent.id, updateData);

            expect(updatedEvent.status).toBe('ACTIVE');
            expect(updatedEvent.title).toBe(testEvent.title);
            expect(updatedEvent.description).toBe(testEvent.description);
        });

        it('should throw error when updating non-existent event', async () => {
            await expect(
                EventService.updateEvent(9999, { title: 'New Title' })
            ).rejects.toThrow(AppError);
        });

        it('should maintain created_at timestamp on update', async () => {
            const updateData = {
                title: 'Updated Title'
            };

            const updatedEvent = await EventService.updateEvent(testEvent.id, updateData);

            expect(new Date(updatedEvent.created_at).getTime())
                .toBe(new Date(testEvent.created_at).getTime());
        });

        it('should update updated_at timestamp', async () => {
            const originalUpdatedAt = new Date(testEvent.updated_at).getTime();

            // Wait a moment to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 1000));

            const updatedEvent = await EventService.updateEvent(testEvent.id, {
                title: 'New Title'
            });

            expect(new Date(updatedEvent.updated_at).getTime())
                .toBeGreaterThan(originalUpdatedAt);
        });
    });

    describe('Event Deletion', () => {
        let testEvent;

        beforeEach(async () => {
            testEvent = await EventService.createEvent({
                title: 'Delete Test Event',
                type: 'TEST'
            });
        });

        it('should delete event successfully', async () => {
            const result = await EventService.deleteEvent(testEvent.id);
            expect(result).toBe(true);

            // Verify event is deleted
            await expect(
                EventService.getEventById(testEvent.id)
            ).rejects.toThrow(AppError);
        });

        it('should throw error when deleting non-existent event', async () => {
            await expect(
                EventService.deleteEvent(9999)
            ).rejects.toThrow(AppError);
        });

        it('should delete event and maintain referential integrity', async () => {
            // First, create some related data if needed
            // Then delete the event and verify related data is handled appropriately
            const result = await EventService.deleteEvent(testEvent.id);
            expect(result).toBe(true);

            // Verify all related data is properly handled
            const eventsCount = await DatabaseService.getKnex()('events')
                .where({ id: testEvent.id })
                .count('id as count')
                .first();
            
            expect(eventsCount.count).toBe(0);
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent event creation', async () => {
            const concurrentCreations = Array.from({ length: 10 }, (_, i) => 
                EventService.createEvent({
                    title: `Concurrent Event ${i}`,
                    type: 'TEST'
                })
            );

            const events = await Promise.all(concurrentCreations);
            expect(events).toHaveLength(10);
            expect(new Set(events.map(e => e.id)).size).toBe(10); // All IDs should be unique
        });

        it('should handle concurrent updates', async () => {
            const testEvent = await EventService.createEvent({
                title: 'Concurrent Update Test',
                type: 'TEST'
            });

            const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
                EventService.updateEvent(testEvent.id, {
                    title: `Updated Title ${i}`
                })
            );

            const results = await Promise.all(concurrentUpdates);
            expect(results).toHaveLength(5);
            
            // Verify final state
            const finalEvent = await EventService.getEventById(testEvent.id);
            expect(finalEvent.title).toMatch(/^Updated Title \d$/);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty update data', async () => {
            const testEvent = await EventService.createEvent({
                title: 'Empty Update Test',
                type: 'TEST'
            });

            const updatedEvent = await EventService.updateEvent(testEvent.id, {});
            expect(updatedEvent).toMatchObject(testEvent);
        });

        it('should handle special characters in search', async () => {
            await EventService.createEvent({
                title: 'Special @#$% Characters',
                type: 'TEST'
            });

            const searchResults = await EventService.searchEvents('@#$%');
            expect(searchResults).toHaveLength(1);
        });

        it('should handle maximum length titles', async () => {
            const longTitle = 'A'.repeat(255); // Assuming VARCHAR(255)
            const event = await EventService.createEvent({
                title: longTitle,
                type: 'TEST'
            });

            expect(event.title).toBe(longTitle);
        });

        it('should handle date objects and ISO strings', async () => {
            const dateObj = new Date();
            const isoString = dateObj.toISOString();

            const event1 = await EventService.createEvent({
                title: 'Date Object Test',
                start_date: dateObj,
                type: 'TEST'
            });

            const event2 = await EventService.createEvent({
                title: 'ISO String Test',
                start_date: isoString,
                type: 'TEST'
            });

            expect(new Date(event1.start_date)).toEqual(dateObj);
            expect(new Date(event2.start_date)).toEqual(new Date(isoString));
        });
    });
});