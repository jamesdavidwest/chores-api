const DatabaseService = require('../../../src/services/DatabaseService');
const LoggerService = require('../../../src/services/LoggerService');

describe('DatabaseService Integration', () => {
    let testTableName;

    beforeAll(async () => {
        // Initialize with test configuration
        await DatabaseService.initialize('testing');
    });

    beforeEach(async () => {
        // Create a unique test table name for each test
        testTableName = `test_table_${Date.now()}`;
        
        // Create test table
        await DatabaseService.getKnex().schema.createTable(testTableName, (table) => {
            table.increments('id');
            table.string('name').notNullable();
            table.timestamp('created_at').defaultTo(DatabaseService.getKnex().fn.now());
        });
    });

    afterEach(async () => {
        // Cleanup test table
        if (testTableName) {
            await DatabaseService.getKnex().schema.dropTableIfExists(testTableName);
        }
    });

    afterAll(async () => {
        await DatabaseService.close();
    });

    describe('Basic CRUD Operations', () => {
        it('should perform insert operations correctly', async () => {
            const testData = { name: 'test_record' };
            
            const [id] = await DatabaseService.getKnex()(testTableName).insert(testData);
            expect(id).toBeDefined();

            const result = await DatabaseService.getKnex()(testTableName)
                .where({ id })
                .first();
            
            expect(result.name).toBe(testData.name);
        });

        it('should perform bulk insert operations', async () => {
            const testData = [
                { name: 'record1' },
                { name: 'record2' },
                { name: 'record3' }
            ];

            const ids = await DatabaseService.getKnex()(testTableName).insert(testData);
            expect(ids).toHaveLength(testData.length);

            const results = await DatabaseService.getKnex()(testTableName).select('*');
            expect(results).toHaveLength(testData.length);
        });

        it('should perform update operations correctly', async () => {
            const [id] = await DatabaseService.getKnex()(testTableName)
                .insert({ name: 'original' });

            await DatabaseService.getKnex()(testTableName)
                .where({ id })
                .update({ name: 'updated' });

            const result = await DatabaseService.getKnex()(testTableName)
                .where({ id })
                .first();
            
            expect(result.name).toBe('updated');
        });

        it('should perform delete operations correctly', async () => {
            const [id] = await DatabaseService.getKnex()(testTableName)
                .insert({ name: 'to_delete' });

            await DatabaseService.getKnex()(testTableName)
                .where({ id })
                .delete();

            const result = await DatabaseService.getKnex()(testTableName)
                .where({ id })
                .first();
            
            expect(result).toBeUndefined();
        });
    });

    describe('Transaction Management', () => {
        it('should handle complex transactions successfully', async () => {
            const trx = await DatabaseService.beginTransaction();

            try {
                // Multiple operations in single transaction
                const [id1] = await trx(testTableName).insert({ name: 'transaction_test_1' });
                const [id2] = await trx(testTableName).insert({ name: 'transaction_test_2' });

                await trx(testTableName)
                    .where({ id: id1 })
                    .update({ name: 'updated_1' });

                await trx.commit();

                const results = await DatabaseService.getKnex()(testTableName)
                    .whereIn('id', [id1, id2]);
                
                expect(results).toHaveLength(2);
                expect(results.find(r => r.id === id1).name).toBe('updated_1');
                expect(results.find(r => r.id === id2).name).toBe('transaction_test_2');
            } catch (error) {
                await trx.rollback();
                throw error;
            }
        });

        it('should handle nested transactions', async () => {
            const outerTrx = await DatabaseService.beginTransaction();

            try {
                const [id1] = await outerTrx(testTableName)
                    .insert({ name: 'outer_transaction' });

                // Start nested transaction
                const innerTrx = await outerTrx.transaction();
                
                const [id2] = await innerTrx(testTableName)
                    .insert({ name: 'inner_transaction' });

                await innerTrx.commit();
                await outerTrx.commit();

                const results = await DatabaseService.getKnex()(testTableName)
                    .whereIn('id', [id1, id2]);
                
                expect(results).toHaveLength(2);
            } catch (error) {
                await outerTrx.rollback();
                throw error;
            }
        });

        it('should handle transaction rollbacks correctly', async () => {
            const trx = await DatabaseService.beginTransaction();

            try {
                await trx(testTableName).insert({ name: 'to_rollback' });
                
                // Simulate error
                throw new Error('Test rollback');
            } catch (error) {
                await trx.rollback();
            }

            const results = await DatabaseService.getKnex()(testTableName).select('*');
            expect(results).toHaveLength(0);
        });

        it('should maintain transaction isolation', async () => {
            const trx1 = await DatabaseService.beginTransaction();
            const trx2 = await DatabaseService.beginTransaction();

            try {
                // Transaction 1 inserts data
                const [id1] = await trx1(testTableName).insert({ name: 'isolation_test_1' });

                // Transaction 2 shouldn't see transaction 1's data
                const result = await trx2(testTableName).where({ id: id1 }).first();
                expect(result).toBeUndefined();

                // Commit both transactions
                await trx1.commit();
                await trx2.commit();

                // Now the data should be visible
                const finalResult = await DatabaseService.getKnex()(testTableName)
                    .where({ id: id1 })
                    .first();
                expect(finalResult).toBeDefined();
                expect(finalResult.name).toBe('isolation_test_1');
            } catch (error) {
                await trx1.rollback();
                await trx2.rollback();
                throw error;
            }
        });
    });

    describe('Query Operations', () => {
        it('should handle complex queries correctly', async () => {
            // Insert test data
            await DatabaseService.getKnex()(testTableName).insert([
                { name: 'test1' },
                { name: 'test2' },
                { name: 'other1' }
            ]);

            // Complex query with where, like, orderBy
            const results = await DatabaseService.getKnex()(testTableName)
                .where('name', 'like', 'test%')
                .orderBy('name', 'desc')
                .select('*');

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('test2');
            expect(results[1].name).toBe('test1');
        });

        it('should handle aggregate functions', async () => {
            // Insert test data
            await DatabaseService.getKnex()(testTableName).insert([
                { name: 'group1' },
                { name: 'group1' },
                { name: 'group2' }
            ]);

            const results = await DatabaseService.getKnex()(testTableName)
                .select('name')
                .count('id as count')
                .groupBy('name')
                .orderBy('name');

            expect(results).toHaveLength(2);
            expect(results.find(r => r.name === 'group1').count).toBe(2);
            expect(results.find(r => r.name === 'group2').count).toBe(1);
        });

        it('should handle joins correctly', async () => {
            // Create related table
            const relatedTableName = `${testTableName}_related`;
            await DatabaseService.getKnex().schema.createTable(relatedTableName, (table) => {
                table.increments('id');
                table.integer('test_id').unsigned().references('id').inTable(testTableName);
                table.string('detail');
            });

            try {
                // Insert test data
                const [testId] = await DatabaseService.getKnex()(testTableName)
                    .insert({ name: 'join_test' });

                await DatabaseService.getKnex()(relatedTableName).insert({
                    test_id: testId,
                    detail: 'related_detail'
                });

                // Test join query
                const results = await DatabaseService.getKnex()(testTableName)
                    .select(
                        `${testTableName}.name`,
                        `${relatedTableName}.detail`
                    )
                    .leftJoin(
                        relatedTableName,
                        `${testTableName}.id`,
                        `${relatedTableName}.test_id`
                    );

                expect(results).toHaveLength(1);
                expect(results[0].name).toBe('join_test');
                expect(results[0].detail).toBe('related_detail');
            } finally {
                // Cleanup related table
                await DatabaseService.getKnex().schema.dropTableIfExists(relatedTableName);
            }
        });

        it('should handle complex subqueries', async () => {
            // Insert test data
            await DatabaseService.getKnex()(testTableName).insert([
                { name: 'subq1' },
                { name: 'subq2' },
                { name: 'subq3' }
            ]);

            const results = await DatabaseService.getKnex()(testTableName)
                .where('id', 'in', 
                    DatabaseService.getKnex()(testTableName)
                        .where('name', 'like', 'subq%')
                        .select('id')
                )
                .orderBy('name');

            expect(results).toHaveLength(3);
            expect(results.map(r => r.name)).toEqual(['subq1', 'subq2', 'subq3']);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle constraint violations', async () => {
            // Create table with unique constraint
            const uniqueTableName = `${testTableName}_unique`;
            await DatabaseService.getKnex().schema.createTable(uniqueTableName, (table) => {
                table.increments('id');
                table.string('name').unique();
            });

            try {
                // Insert first record
                await DatabaseService.getKnex()(uniqueTableName)
                    .insert({ name: 'unique_name' });

                // Attempt to insert duplicate
                await expect(
                    DatabaseService.getKnex()(uniqueTableName)
                        .insert({ name: 'unique_name' })
                ).rejects.toThrow();
            } finally {
                await DatabaseService.getKnex().schema.dropTableIfExists(uniqueTableName);
            }
        });

        it('should handle large datasets efficiently', async () => {
            // Insert large number of records
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                name: `bulk_test_${i}`
            }));

            const startTime = Date.now();
            
            await DatabaseService.getKnex()(testTableName)
                .insert(largeDataset);

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            const count = await DatabaseService.getKnex()(testTableName).count('* as count').first();
            expect(count.count).toBe(1000);
            expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle concurrent operations correctly', async () => {
            // Create multiple concurrent operations
            const operations = Array.from({ length: 10 }, async (_, i) => {
                const trx = await DatabaseService.beginTransaction();
                try {
                    await trx(testTableName).insert({ name: `concurrent_${i}` });
                    await trx.commit();
                } catch (error) {
                    await trx.rollback();
                    throw error;
                }
            });

            await Promise.all(operations);

            const results = await DatabaseService.getKnex()(testTableName)
                .where('name', 'like', 'concurrent_%')
                .orderBy('name');

            expect(results).toHaveLength(10);
        });
    });

    describe('Connection Management', () => {
        it('should handle connection pool under load', async () => {
            const concurrentQueries = Array.from({ length: 50 }, async () => {
                return DatabaseService.getKnex()(testTableName).select('*');
            });

            await expect(Promise.all(concurrentQueries)).resolves.toBeDefined();
        });

        it('should maintain connection after heavy queries', async () => {
            // Run some heavy queries
            await DatabaseService.getKnex()(testTableName)
                .insert(Array.from({ length: 100 }, (_, i) => ({ name: `heavy_${i}` })));

            await DatabaseService.getKnex()(testTableName)
                .where('name', 'like', 'heavy_%')
                .delete();

            // Connection should still be valid
            expect(DatabaseService.isConnected()).toBe(true);
            const result = await DatabaseService.getKnex().raw('SELECT 1');
            expect(result).toBeDefined();
        });
    });
});