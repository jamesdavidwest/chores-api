const DatabaseService = require('../../../src/services/DatabaseService');
const InstanceService = require('../../../src/services/InstanceService');
const AppError = require('../../../src/utils/AppError');

describe('InstanceService Integration', () => {
    let knex;
    const instanceService = new InstanceService();

    beforeAll(async () => {
        // Initialize database with test configuration
        await DatabaseService.initialize('testing');
        knex = DatabaseService.getKnex();
        
        // Create instances table if it doesn't exist
        const hasTable = await knex.schema.hasTable('instances');
        if (!hasTable) {
            await knex.schema.createTable('instances', (table) => {
                table.increments('id');
                table.string('type').notNullable();
                table.string('status').defaultTo('active');
                table.integer('parent_id').references('id').inTable('instances');
                table.jsonb('metadata').defaultTo('{}');
                table.specificType('tags', 'text[]');
                table.string('created_by');
                table.timestamp('archived_at');
                table.timestamps(true, true);
            });
        }
    });

    afterAll(async () => {
        await knex.schema.dropTableIfExists('instances');
        await DatabaseService.close();
    });

    beforeEach(async () => {
        // Clear instances table before each test
        await knex('instances').truncate();
    });

    describe('Instance Creation', () => {
        it('should create instance with all fields', async () => {
            const instanceData = {
                type: 'test',
                status: 'active',
                metadata: { key: 'value' },
                tags: ['tag1', 'tag2'],
                created_by: 'test-user'
            };

            const instance = await instanceService.create(instanceData);

            expect(instance).toMatchObject(instanceData);
            expect(instance.id).toBeDefined();
            expect(instance.created_at).toBeDefined();
            expect(instance.updated_at).toBeDefined();
            expect(instance.archived_at).toBeNull();
        });

        it('should create parent-child relationship', async () => {
            // Create parent
            const parentData = {
                type: 'parent',
                metadata: { isParent: true }
            };
            const parent = await instanceService.create(parentData);

            // Create child
            const childData = {
                type: 'child',
                parentId: parent.id,
                metadata: { isChild: true }
            };
            const child = await instanceService.create(childData);

            expect(child.parentId).toBe(parent.id);

            // Verify parent's metadata was updated
            const updatedParent = await instanceService.getById(parent.id);
            expect(updatedParent.metadata.childInstances).toContain(child.id);
        });

        it('should handle multiple children for same parent', async () => {
            const parent = await instanceService.create({
                type: 'parent',
                metadata: { isParent: true }
            });

            const childPromises = Array.from({ length: 3 }, (_, i) => 
                instanceService.create({
                    type: 'child',
                    parentId: parent.id,
                    metadata: { childIndex: i }
                })
            );

            const children = await Promise.all(childPromises);
            const updatedParent = await instanceService.getById(parent.id);

            expect(children).toHaveLength(3);
            children.forEach(child => {
                expect(updatedParent.metadata.childInstances).toContain(child.id);
            });
        });

        it('should handle creation with arrays in metadata', async () => {
            const instanceData = {
                type: 'test',
                metadata: {
                    array: [1, 2, 3],
                    nested: { array: ['a', 'b', 'c'] }
                }
            };

            const instance = await instanceService.create(instanceData);
            expect(instance.metadata).toEqual(instanceData.metadata);
        });
    });

    describe('Instance Retrieval', () => {
        let testInstances;

        beforeEach(async () => {
            testInstances = await Promise.all([
                instanceService.create({
                    type: 'type1',
                    status: 'active',
                    tags: ['tag1', 'tag2'],
                    metadata: { order: 1 }
                }),
                instanceService.create({
                    type: 'type2',
                    status: 'active',
                    tags: ['tag2', 'tag3'],
                    metadata: { order: 2 }
                }),
                instanceService.create({
                    type: 'type1',
                    status: 'archived',
                    tags: ['tag1', 'tag3'],
                    metadata: { order: 3 },
                    archived_at: new Date()
                })
            ]);
        });

        it('should list instances with pagination', async () => {
            const result = await instanceService.list(1, 2);

            expect(result.data).toHaveLength(2);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 2,
                total: 3,
                totalPages: 2
            });
        });

        it('should filter by type', async () => {
            const result = await instanceService.list(1, 10, { type: 'type1' });

            expect(result.data).toHaveLength(2);
            result.data.forEach(instance => {
                expect(instance.type).toBe('type1');
            });
        });

        it('should filter by status', async () => {
            const result = await instanceService.list(1, 10, { status: 'active' });

            expect(result.data).toHaveLength(2);
            result.data.forEach(instance => {
                expect(instance.status).toBe('active');
            });
        });

        it('should filter by tags', async () => {
            const result = await instanceService.list(1, 10, {
                tags: ['tag1']
            });

            expect(result.data).toHaveLength(2);
            result.data.forEach(instance => {
                expect(instance.tags).toEqual(
                    expect.arrayContaining(['tag1'])
                );
            });
        });
    });

    describe('Instance Updates', () => {
        let testInstance;

        beforeEach(async () => {
            testInstance = await instanceService.create({
                type: 'test',
                status: 'active',
                metadata: { original: true },
                tags: ['original']
            });
        });

        it('should update basic fields', async () => {
            const updateData = {
                status: 'modified',
                tags: ['updated'],
                metadata: { updated: true }
            };

            const updated = await instanceService.update(testInstance.id, updateData);

            expect(updated).toMatchObject(updateData);
            expect(updated.id).toBe(testInstance.id);
            expect(updated.type).toBe(testInstance.type);
            expect(new Date(updated.updated_at).getTime())
                .toBeGreaterThan(new Date(testInstance.updated_at).getTime());
        });

        it('should handle parent reassignment', async () => {
            // Create two potential parents
            const [parent1, parent2] = await Promise.all([
                instanceService.create({ type: 'parent1' }),
                instanceService.create({ type: 'parent2' })
            ]);

            // Create child with first parent
            const child = await instanceService.create({
                type: 'child',
                parentId: parent1.id
            });

            // Reassign to second parent
            const updated = await instanceService.update(child.id, {
                parentId: parent2.id
            });

            // Verify new parent relationship
            expect(updated.parentId).toBe(parent2.id);

            // Verify old parent's metadata was updated
            const oldParent = await instanceService.getById(parent1.id);
            expect(oldParent.metadata.childInstances || []).not.toContain(child.id);

            // Verify new parent's metadata was updated
            const newParent = await instanceService.getById(parent2.id);
            expect(newParent.metadata.childInstances).toContain(child.id);
        });

        it('should merge metadata correctly', async () => {
            const update1 = {
                metadata: {
                    key1: 'value1',
                    nested: { a: 1 }
                }
            };
            const update2 = {
                metadata: {
                    key2: 'value2',
                    nested: { b: 2 }
                }
            };

            await instanceService.update(testInstance.id, update1);
            const finalUpdate = await instanceService.update(testInstance.id, update2);

            expect(finalUpdate.metadata).toEqual({
                key2: 'value2',
                nested: { b: 2 }
            });
        });
    });

    describe('Instance Deletion', () => {
        it('should delete instance and update parent', async () => {
            // Create parent with child
            const parent = await instanceService.create({ type: 'parent' });
            const child = await instanceService.create({
                type: 'child',
                parentId: parent.id
            });

            // Delete child
            await instanceService.delete(child.id);

            // Verify child is deleted
            await expect(instanceService.getById(child.id))
                .rejects
                .toThrow(AppError);

            // Verify parent's metadata is updated
            const updatedParent = await instanceService.getById(parent.id);
            expect(updatedParent.metadata.childInstances || []).not.toContain(child.id);
        });

        it('should handle deletion of parent with children', async () => {
            // Create parent with multiple children
            const parent = await instanceService.create({ type: 'parent' });
            const children = await Promise.all([
                instanceService.create({ type: 'child', parentId: parent.id }),
                instanceService.create({ type: 'child', parentId: parent.id })
            ]);

            // Delete parent
            await instanceService.delete(parent.id);

            // Verify parent is deleted
            await expect(instanceService.getById(parent.id))
                .rejects
                .toThrow(AppError);

            // Verify children still exist but without parent reference
            for (const child of children) {
                const updatedChild = await instanceService.getById(child.id);
                expect(updatedChild.parentId).toBeNull();
            }
        });
    });

    describe('Archive Operations', () => {
        let testInstance;

        beforeEach(async () => {
            testInstance = await instanceService.create({
                type: 'test',
                status: 'active',
                metadata: { important: 'data' }
            });
        });

        it('should archive and restore instance', async () => {
            // Archive
            const archived = await instanceService.archive(testInstance.id);
            expect(archived.status).toBe('archived');
            expect(archived.archived_at).toBeDefined();
            expect(archived.metadata).toEqual(testInstance.metadata);

            // Restore
            const restored = await instanceService.restore(testInstance.id);
            expect(restored.status).toBe('active');
            expect(restored.archived_at).toBeNull();
            expect(restored.metadata).toEqual(testInstance.metadata);
        });

        it('should handle archive of instance with children', async () => {
            const parent = await instanceService.create({ type: 'parent' });
            const child = await instanceService.create({
                type: 'child',
                parentId: parent.id
            });

            // Archive parent
            const archived = await instanceService.archive(parent.id);
            expect(archived.status).toBe('archived');

            // Child should still be accessible
            const childAfterParentArchive = await instanceService.getById(child.id);
            expect(childAfterParentArchive.parentId).toBe(parent.id);
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent updates', async () => {
            const instance = await instanceService.create({ type: 'test' });

            // Perform multiple concurrent updates
            const updates = Array.from({ length: 5 }, (_, i) => 
                instanceService.update(instance.id, {
                    metadata: { updateNumber: i }
                })
            );

            const results = await Promise.all(updates);
            
            // Verify all updates succeeded and the last one persisted
            const finalInstance = await instanceService.getById(instance.id);
            expect(finalInstance.metadata.updateNumber).toBeDefined();
        });

        it('should handle concurrent child assignments', async () => {
            const parent = await instanceService.create({ type: 'parent' });

            // Create multiple children concurrently
            const childCreations = Array.from({ length: 5 }, () =>
                instanceService.create({
                    type: 'child',
                    parentId: parent.id
                })
            );

            const children = await Promise.all(childCreations);
            
            // Verify all children were assigned correctly
            const updatedParent = await instanceService.getById(parent.id);
            children.forEach(child => {
                expect(updatedParent.metadata.childInstances).toContain(child.id);
            });
        });
    });
});