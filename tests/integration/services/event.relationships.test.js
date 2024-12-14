const EventService = require('../../../src/services/EventService');
const DatabaseService = require('../../../src/services/DatabaseService');
const AppError = require('../../../src/utils/AppError');

describe('Event Relationships Integration Tests', () => {
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

    describe('Event Hierarchy Management', () => {
        it('should create parent event with empty hierarchy path', async () => {
            const parentEvent = await EventService.createEvent({
                title: 'Parent Event',
                type: 'TEST',
                status: 'ACTIVE',
                user_id: 1
            });

            expect(parentEvent.parent_id).toBeNull();
            expect(JSON.parse(parentEvent.hierarchy_path)).toEqual([]);
        });

        it('should create child event with correct hierarchy path', async () => {
            const parentEvent = await EventService.createEvent({
                title: 'Parent Event',
                type: 'TEST',
                status: 'ACTIVE',
                user_id: 1
            });

            const childEvent = await EventService.createEvent({
                title: 'Child Event',
                type: 'TEST',
                status: 'ACTIVE',
                parent_id: parentEvent.id,
                user_id: 1
            });

            expect(childEvent.parent_id).toBe(parentEvent.id);
            expect(JSON.parse(childEvent.hierarchy_path)).toEqual([parentEvent.id]);
        });

        it('should create nested hierarchy with correct paths', async () => {
            // Create root event
            const rootEvent = await EventService.createEvent({
                title: 'Root Event',
                type: 'TEST',
                user_id: 1
            });

            // Create level 1 child
            const level1Event = await EventService.createEvent({
                title: 'Level 1 Event',
                type: 'TEST',
                parent_id: rootEvent.id,
                user_id: 1
            });

            // Create level 2 child
            const level2Event = await EventService.createEvent({
                title: 'Level 2 Event',
                type: 'TEST',
                parent_id: level1Event.id,
                user_id: 1
            });

            // Verify hierarchy paths
            expect(JSON.parse(rootEvent.hierarchy_path)).toEqual([]);
            expect(JSON.parse(level1Event.hierarchy_path)).toEqual([rootEvent.id]);
            expect(JSON.parse(level2Event.hierarchy_path)).toEqual([rootEvent.id, level1Event.id]);
        });

        it('should retrieve complete event hierarchy', async () => {
            // Create root event
            const rootEvent = await EventService.createEvent({
                title: 'Root Event',
                type: 'TEST',
                user_id: 1
            });

            // Create two level 1 children
            const [child1, child2] = await Promise.all([
                EventService.createEvent({
                    title: 'Child 1',
                    type: 'TEST',
                    parent_id: rootEvent.id,
                    user_id: 1
                }),
                EventService.createEvent({
                    title: 'Child 2',
                    type: 'TEST',
                    parent_id: rootEvent.id,
                    user_id: 1
                })
            ]);

            // Create level 2 child under child1
            const grandchild = await EventService.createEvent({
                title: 'Grandchild',
                type: 'TEST',
                parent_id: child1.id,
                user_id: 1
            });

            const hierarchy = await EventService.getEventHierarchy(rootEvent.id);

            expect(hierarchy.id).toBe(rootEvent.id);
            expect(hierarchy.children).toHaveLength(2);
            
            const child1Hierarchy = hierarchy.children.find(c => c.id === child1.id);
            expect(child1Hierarchy.children).toHaveLength(1);
            expect(child1Hierarchy.children[0].id).toBe(grandchild.id);
            
            const child2Hierarchy = hierarchy.children.find(c => c.id === child2.id);
            expect(child2Hierarchy.children).toHaveLength(0);
        });

        it('should handle deletion of parent event', async () => {
            // Create parent event
            const parentEvent = await EventService.createEvent({
                title: 'Parent Event',
                type: 'TEST',
                user_id: 1
            });

            // Create child event
            const childEvent = await EventService.createEvent({
                title: 'Child Event',
                type: 'TEST',
                parent_id: parentEvent.id,
                user_id: 1
            });

            // Delete parent event
            await EventService.deleteEvent(parentEvent.id);

            // Verify child event is also deleted (CASCADE)
            await expect(EventService.getEventById(childEvent.id))
                .rejects
                .toThrow(AppError);
        });

        it('should prevent creation of child event with non-existent parent', async () => {
            await expect(
                EventService.createEvent({
                    title: 'Orphan Event',
                    type: 'TEST',
                    parent_id: 999999, // Non-existent parent ID
                    user_id: 1
                })
            ).rejects.toThrow(AppError);
        });

        it('should get all children of an event', async () => {
            // Create parent event
            const parentEvent = await EventService.createEvent({
                title: 'Parent Event',
                type: 'TEST',
                user_id: 1
            });

            // Create multiple children
            const childrenData = [
                { title: 'Child 1', type: 'TEST', parent_id: parentEvent.id, user_id: 1 },
                { title: 'Child 2', type: 'TEST', parent_id: parentEvent.id, user_id: 1 },
                { title: 'Child 3', type: 'TEST', parent_id: parentEvent.id, user_id: 1 }
            ];

            await Promise.all(
                childrenData.map(data => EventService.createEvent(data))
            );

            const children = await EventService.getEventChildren(parentEvent.id);
            
            expect(children).toHaveLength(3);
            expect(children.map(c => c.title)).toEqual(
                expect.arrayContaining(['Child 1', 'Child 2', 'Child 3'])
            );
        });
    });

    describe('Event Filtering with Relationships', () => {
        it('should filter events by parent_id', async () => {
            // Create parent event
            const parentEvent = await EventService.createEvent({
                title: 'Parent Event',
                type: 'TEST',
                user_id: 1
            });

            // Create children and unrelated event
            await Promise.all([
                EventService.createEvent({
                    title: 'Child 1',
                    type: 'TEST',
                    parent_id: parentEvent.id,
                    user_id: 1
                }),
                EventService.createEvent({
                    title: 'Child 2',
                    type: 'TEST',
                    parent_id: parentEvent.id,
                    user_id: 1
                }),
                EventService.createEvent({
                    title: 'Unrelated Event',
                    type: 'TEST',
                    user_id: 1
                })
            ]);

            const result = await EventService.getEvents({
                parent_id: parentEvent.id
            });

            expect(result.data).toHaveLength(2);
            expect(result.data.every(event => event.parent_id === parentEvent.id)).toBe(true);
        });

        it('should filter root events', async () => {
            // Create mix of root and child events
            const parentEvent = await EventService.createEvent({
                title: 'Parent Event',
                type: 'TEST',
                user_id: 1
            });

            await Promise.all([
                EventService.createEvent({
                    title: 'Child Event',
                    type: 'TEST',
                    parent_id: parentEvent.id,
                    user_id: 1
                }),
                EventService.createEvent({
                    title: 'Root Event 1',
                    type: 'TEST',
                    user_id: 1
                }),
                EventService.createEvent({
                    title: 'Root Event 2',
                    type: 'TEST',
                    user_id: 1
                })
            ]);

            const result = await EventService.getEvents({
                parent_id: null
            });

            expect(result.data.length).toBeGreaterThanOrEqual(3);
            expect(result.data.every(event => event.parent_id === null)).toBe(true);
        });
    });
});
