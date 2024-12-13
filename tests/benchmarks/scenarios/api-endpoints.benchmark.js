/**
 * API Endpoints Benchmark Scenarios
 */

const axios = require('axios');
const BenchmarkSuiteManager = require('../BenchmarkSuiteManager');
const config = require('../config');

const manager = new BenchmarkSuiteManager();

// Helper function to simulate user load
async function simulateLoad(endpoint, duration, concurrency) {
  const startTime = Date.now();
  const requests = [];

  while (Date.now() - startTime < duration) {
    // Create concurrent requests
    const batch = Array(concurrency).fill().map(() => 
      axios.get(`http://localhost:${process.env.PORT}${endpoint}`)
        .catch(error => console.error(`Request failed: ${error.message}`))
    );

    requests.push(...batch);
    
    // Wait a small interval between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return Promise.all(requests);
}

// Register endpoint benchmarks
manager.registerBenchmark('auth-endpoints', async () => {
  await simulateLoad('/api/auth/login', 60000, 10); // 1 minute, 10 concurrent users
});

manager.registerBenchmark('events-list', async () => {
  await simulateLoad('/api/events', 60000, 20); // 1 minute, 20 concurrent users
});

manager.registerBenchmark('event-details', async () => {
  // First create some test events
  const eventIds = []; // You would populate this with actual event IDs
  
  for (const id of eventIds) {
    await simulateLoad(`/api/events/${id}`, 30000, 5); // 30 seconds, 5 concurrent users
  }
});

async function runEndpointBenchmarks() {
  try {
    // Load previous baselines if they exist
    const authBaseline = await manager.loadBaseline('auth-endpoints');
    const eventsBaseline = await manager.loadBaseline('events-list');
    const detailsBaseline = await manager.loadBaseline('event-details');

    if (authBaseline) manager.setBaseline('auth-endpoints', authBaseline);
    if (eventsBaseline) manager.setBaseline('events-list', eventsBaseline);
    if (detailsBaseline) manager.setBaseline('event-details', detailsBaseline);

    // Run all benchmarks
    const results = await manager.runAll();

    // If no baselines exist, set current results as baselines
    if (!authBaseline) await manager.setBaseline('auth-endpoints', results.get('auth-endpoints'));
    if (!eventsBaseline) await manager.setBaseline('events-list', results.get('events-list'));
    if (!detailsBaseline) await manager.setBaseline('event-details', results.get('event-details'));

    return results;
  } catch (error) {
    console.error('Error running endpoint benchmarks:', error);
    throw error;
  }
}

module.exports = {
  manager,
  runEndpointBenchmarks
};