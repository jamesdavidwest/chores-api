/**
 * Database Performance Benchmark Scenarios
 */

const BenchmarkSuiteManager = require('../BenchmarkSuiteManager');
const DatabaseService = require('../../../src/services/DatabaseService');
const config = require('../config');

const manager = new BenchmarkSuiteManager();
const db = new DatabaseService();

// Helper function to generate test data
function generateTestData(count) {
  return Array(count).fill().map((_, index) => ({
    title: `Test Event ${index}`,
    description: `Description for test event ${index}`,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000), // +1 day
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}

// Helper function to run multiple queries in parallel
async function runParallelQueries(queryFn, count) {
  const promises = Array(count).fill().map(() => queryFn());
  return Promise.all(promises);
}

// Register database benchmarks
manager.registerBenchmark('db-insert-performance', async () => {
  const testData = generateTestData(1000);
  
  // Batch insert test
  await db.transaction(async (trx) => {
    for (const batch of chunks(testData, 100)) {
      await trx('events').insert(batch);
    }
  });
});

manager.registerBenchmark('db-select-performance', async () => {
  // Simple select
  await runParallelQueries(
    () => db.knex('events').select('*').limit(100),
    20
  );

  // Complex select with joins
  await runParallelQueries(
    () => db.knex('events')
      .select('events.*', 'users.name as createdBy')
      .leftJoin('users', 'events.createdById', 'users.id')
      .where('events.status', 'active')
      .orderBy('events.startDate', 'desc')
      .limit(50),
    20
  );
});

manager.registerBenchmark('db-update-performance', async () => {
  // Get some test event IDs
  const events = await db.knex('events')
    .select('id')
    .limit(1000);

  // Parallel updates
  await runParallelQueries(
    async () => {
      const eventId = events[Math.floor(Math.random() * events.length)].id;
      return db.knex('events')
        .where('id', eventId)
        .update({
          status: 'updated',
          updatedAt: new Date()
        });
    },
    50
  );
});

manager.registerBenchmark('db-transaction-performance', async () => {
  // Complex transaction with multiple operations
  await runParallelQueries(
    async () => {
      await db.transaction(async (trx) => {
        // Insert new event
        const [eventId] = await trx('events')
          .insert(generateTestData(1)[0])
          .returning('id');

        // Create related records
        await trx('instances').insert({
          eventId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 3600000),
          status: 'scheduled'
        });

        // Update event status
        await trx('events')
          .where('id', eventId)
          .update({ status: 'scheduled' });
      });
    },
    20
  );
});

// Helper function to split array into chunks
function chunks(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function runDatabaseBenchmarks() {
  try {
    // Load previous baselines if they exist
    const insertBaseline = await manager.loadBaseline('db-insert-performance');
    const selectBaseline = await manager.loadBaseline('db-select-performance');
    const updateBaseline = await manager.loadBaseline('db-update-performance');
    const transactionBaseline = await manager.loadBaseline('db-transaction-performance');

    // Set baselines if they exist
    if (insertBaseline) manager.setBaseline('db-insert-performance', insertBaseline);
    if (selectBaseline) manager.setBaseline('db-select-performance', selectBaseline);
    if (updateBaseline) manager.setBaseline('db-update-performance', updateBaseline);
    if (transactionBaseline) manager.setBaseline('db-transaction-performance', transactionBaseline);

    // Run all benchmarks
    const results = await manager.runAll();

    // If no baselines exist, set current results as baselines
    if (!insertBaseline) await manager.setBaseline('db-insert-performance', results.get('db-insert-performance'));
    if (!selectBaseline) await manager.setBaseline('db-select-performance', results.get('db-select-performance'));
    if (!updateBaseline) await manager.setBaseline('db-update-performance', results.get('db-update-performance'));
    if (!transactionBaseline) await manager.setBaseline('db-transaction-performance', results.get('db-transaction-performance'));

    return results;
  } catch (error) {
    console.error('Error running database benchmarks:', error);
    throw error;
  } finally {
    // Clean up test data if needed
    await db.knex('events').where('title', 'like', 'Test Event%').delete();
  }
}

module.exports = {
  manager,
  runDatabaseBenchmarks
};