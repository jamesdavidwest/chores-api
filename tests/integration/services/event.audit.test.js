const EventService = require('../../../src/services/EventService');
const DatabaseService = require('../../../src/services/DatabaseService');
const AppError = require('../../../src/utils/AppError');

describe('Event Audit Logging Integration Tests', () => {
    beforeAll(async () => {
        // Initialize database with test configuration
        await DatabaseService.initialize('testing');
        
        // Ensure tables exist and are in correct state
        const knex = DatabaseService.getKnex();
        
        // Check and create events table if needed
        const hasEventsTable = await knex.schema.hasTable('events');
        if (!hasEventsTable) {
            await knex.schema.createTable('events', (table) => {
                table.increments('id').primary();
                table.string('title').notNullable();
                table.text('description');
                table.string('type');
                table.string('status').defaultTo('DRAFT');
                table.timestamp('start_date');
                table.timestamp('end_date');
                table.integer('parent_id').references('id').inTable('events').onDelete('CASCADE');
                table.jsonb('hierarchy_path').defaultTo('[]');
                table.integer('user_id').references('id').inTable('users');
                table.timestamp('created_at').defaultTo(knex.fn.now());
                table.timestamp('updated_at').defaultTo(knex.fn.now());
            });
        }

        // Check and create audit log table if needed
        const hasAuditTable = await knex.schema.hasTable('event_audit_log');
        if (!hasAuditTable) {
            await knex.schema.createTable('event_audit_log', (table) => {
                table.increments('id').primary();
                table.integer('event_id').references('id').inTable('events').onDelete('CASCADE').notNullable();
                table.string('action').notNullable();
                table.jsonb('old_data');
                table.jsonb('new_data');
                table.integer('user_id').references('id').inTable('users');
                table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
                
                table.index('event_id');
                table.index('action');
                table.index('created_at');
                table.index('user_id');
            });
        }
    });

    beforeEach(async () => {
        // Clean up tables before each test
        const knex = DatabaseService.getKnex();
        await knex('event_audit_log').truncate();
        await knex('events').truncate();
    });

    afterAll(async () => {
        await DatabaseService.close();
    });

    describe('Create Event Audit Logging', () => {
        it('should create audit log entry when creating event', async () => {
            const eventData = {
                title: 'Test Event',
                description: 'Test Description',
                type: 'TEST',
                status: 'DRAFT',
                user_id: 1
            };

            const event = await EventService.createEvent(eventData);

            // Get audit log entry
            const auditLogs = await EventService.getEventAuditHistory(event.id);
            
            expect(auditLogs).toHaveLength(1);
            expect(auditLogs[0]).toMatchObject({
                event_id: event.id,
                action: 'CREATE',
                user_id: eventData.user_id
            });

            const newData = JSON.parse(auditLogs[0].new_data);
            expect(newData).toMatchObject(eventData);
        });

        it('should create audit logs for bulk event creation', async () => {
            const eventsData = [
                {
                    title: 'Event 1',
                    type: 'TEST',
                    user_id: 1
                },
                {
                    title: 'Event 2',
                    type: 'TEST',
                    user_id: 1
                }
            ];

            const events = await EventService.createManyEvents(eventsData);
            
            // Get all audit logs
            const knex = DatabaseService.getKnex();
            const auditLogs = await knex('event_audit_log')
                .whereIn('event_id', events.map(e => e.id))
                .orderBy('created_at', 'asc');

            expect(auditLogs).toHaveLength(2);
            auditLogs.forEach((log, index) => {
                expect(log.action).toBe('CREATE');
                expect(log.user_id).toBe(eventsData[index].user_id);
                
                const newData = JSON.parse(log.new_data);
                expect(newData.title).toBe(eventsData[index].title);
            });
        });
    });

    describe('Update Event Audit Logging', () => {
        it('should create audit log entry when updating event', async () => {
            // Create initial event
            const event = await EventService.createEvent({
                title: 'Original Title',
                description: 'Original Description',
                type: 'TEST',
                status: 'DRAFT',
                user_id: 1
            });

            // Update event
            const updateData = {
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'ACTIVE',
                user_id: 1
            };

            await EventService.updateEvent(event.id, updateData);

            // Get audit logs
            const auditLogs = await EventService.getEventAuditHistory(event.id);
            
            expect(auditLogs).toHaveLength(2); // CREATE + UPDATE
            
            const updateLog = auditLogs.find(log => log.action === 'UPDATE');
            expect(updateLog).toBeDefined();
            
            const oldData = JSON.parse(updateLog.old_data);
            const newData = JSON.parse(updateLog.new_data);

            expect(oldData.title).toBe('Original Title');
            expect(newData.title).toBe('Updated Title');
            expect(oldData.status).toBe('DRAFT');
            expect(newData.status).toBe('ACTIVE');
        });

        it('should track multiple updates in audit log', async () => {
            // Create event
            const event = await EventService.createEvent({
                title: 'Initial Title',
                status: 'DRAFT',
                user_id: 1
            });

            // Perform multiple updates
            const updates = [
                { title: 'First Update', status: 'IN_PROGRESS', user_id: 1 },
                { title: 'Second Update', status: 'REVIEW', user_id: 2 },
                { title: 'Final Update', status: 'COMPLETE', user_id: 1 }
            ];

            for (const update of updates) {
                await EventService.updateEvent(event.id, update);
            }

            // Get audit logs
            const auditLogs = await EventService.getEventAuditHistory(event.id);
            
            expect(auditLogs).toHaveLength(4); // 1 CREATE + 3 UPDATEs
            
            const updateLogs = auditLogs
                .filter(log => log.action === 'UPDATE')
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            updates.forEach((update, index) => {
                const newData = JSON.parse(updateLogs[index].new_data);
                expect(newData.title).toBe(update.title);
                expect(newData.status).toBe(update.status);
                expect(updateLogs[index].user_id).toBe(update.user_id);
            });
        });
    });

    describe('Delete Event Audit Logging', () => {
        it('should create audit log entry when deleting event', async () => {
            // Create event
            const event = await EventService.createEvent({
                title: 'Event to Delete',
                type: 'TEST',
                user_id: 1
            });

            // Delete event
            await EventService.deleteEvent(event.id);

            // Get audit logs (need to use DatabaseService directly since event is deleted)
            const knex = DatabaseService.getKnex();
            const auditLogs = await knex('event_audit_log')
                .where({ event_id: event.id })
                .orderBy('created_at', 'desc');

            expect(auditLogs).toHaveLength(2); // CREATE + DELETE
            
            const deleteLog = auditLogs.find(log => log.action === 'DELETE');
            expect(deleteLog).toBeDefined();
            expect(deleteLog.user_id).toBe(event.user_id);
            
            const oldData = JSON.parse(deleteLog.old_data);
            expect(oldData.title).toBe('Event to Delete');
            expect(deleteLog.new_data).toBeNull();
        });

        it('should maintain audit logs after event deletion', async () => {
            // Create event with updates
            const event = await EventService.createEvent({
                title: 'Initial Title',
                status: 'DRAFT',
                user_id: 1
            });

            await EventService.updateEvent(event.id, {
                title: 'Updated Title',
                status: 'ACTIVE',
                user_id: 1
            });

            // Delete event
            await EventService.deleteEvent(event.id);

            // Verify all audit logs exist
            const knex = DatabaseService.getKnex();
            const auditLogs = await knex('event_audit_log')
                .where({ event_id: event.id })
                .orderBy('created_at', 'asc');

            expect(auditLogs).toHaveLength(3); // CREATE + UPDATE + DELETE
            expect(auditLogs.map(log => log.action)).toEqual(['CREATE', 'UPDATE', 'DELETE']);
        });
    });

    describe('Audit Log Retrieval', () => {
        it('should retrieve audit history in chronological order', async () => {
            // Create event with multiple updates
            const event = await EventService.createEvent({
                title: 'Test Event',
                status: 'DRAFT',
                user_id: 1
            });

            await EventService.updateEvent(event.id, {
                status: 'IN_PROGRESS',
                user_id: 1
            });

            await EventService.updateEvent(event.id, {
                status: 'COMPLETE',
                user_id: 1
            });

            const auditLogs = await EventService.getEventAuditHistory(event.id);
            
            expect(auditLogs).toHaveLength(3);
            expect(auditLogs[0].action).toBe('COMPLETE');
            expect(auditLogs[1].action).toBe('IN_PROGRESS');
            expect(auditLogs[2].action).toBe('CREATE');
        });

        it('should handle audit history for non-existent event', async () => {
            const auditLogs = await EventService.getEventAuditHistory(99999);
            expect(auditLogs).toHaveLength(0);
        });
    });

    describe('Transaction Integrity', () => {
        it('should rollback both event and audit log creation on error', async () => {
            const knex = DatabaseService.getKnex();
            
            try {
                await EventService.createEvent({
                    title: 'Test Event',
                    type: 'TEST',
                    user_id: 'invalid-user-id' // This should cause a foreign key violation
                });
            } catch (error) {
                // Expected to fail
            }

            // Verify no event or audit log was created
            const eventCount = await knex('events').count('id as count').first();
            const auditCount = await knex('event_audit_log').count('id as count').first();

            expect(eventCount.count).toBe(0);
            expect(auditCount.count).toBe(0);
        });

        it('should rollback both event update and audit log on error', async () => {
            // Create initial event
            const event = await EventService.createEvent({
                title: 'Original Title',
                type: 'TEST',
                user_id: 1
            });

            const originalTitle = event.title;

            try {
                await EventService.updateEvent(event.id, {
                    title: 'New Title',
                    user_id: 'invalid-user-id' // This should cause a foreign key violation
                });
            } catch (error) {
                // Expected to fail
            }

            // Verify event wasn't updated
            const updatedEvent = await EventService.getEventById(event.id);
            expect(updatedEvent.title).toBe(originalTitle);

            // Verify only the creation audit log exists
            const auditLogs = await EventService.getEventAuditHistory(event.id);
            expect(auditLogs).toHaveLength(1);
            expect(auditLogs[0].action).toBe('CREATE');
        });
    });
});
