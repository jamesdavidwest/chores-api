export const CONFIG = {
  // Base URL for the API
  baseUrl: __ENV.API_URL || 'http://localhost:3000',
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Load test thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
  
  // Test scenarios
  scenarios: {
    // Constant load test
    constant: {
      duration: '5m',
      vus: 50,
      target: 50,
    },
    
    // Ramp-up test
    rampUp: {
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
    },
    
    // Stress test
    stress: {
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
    },
    
    // Spike test
    spike: {
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '1m', target: 200 },  // Spike to 200 users
        { duration: '2m', target: 50 },   // Scale back to 50 users
        { duration: '1m', target: 0 },    // Ramp down to 0
      ],
    },
  },
};