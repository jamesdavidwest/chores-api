import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG } from '../config.js';
import {
  checkResponse,
  generateRandomUser,
  getAuthHeaders,
  getRandomSleep,
  extractToken,
  logProgress,
  handleError
} from '../helpers.js';

export const options = {
  thresholds: CONFIG.thresholds,
  scenarios: {
    events_flow: CONFIG.scenarios.constant,
  },
};

// Helper function to generate random event data
function generateRandomEvent() {
  const timestamp = new Date().getTime();
  return {
    title: `Event ${timestamp}`,
    description: `Test event description ${timestamp}`,
    startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + (2 * 86400000)).toISOString(), // Day after tomorrow
    type: 'TEST_EVENT',
    status: 'DRAFT',
    priority: Math.floor(Math.random() * 3) + 1,
    metadata: {
      location: 'Test Location',
      maxParticipants: 100,
      tags: ['test', 'load-testing']
    }
  };
}

// Test setup - create test user and get auth token
export function setup() {
  const testUser = generateRandomUser();
  const registerUrl = `${CONFIG.baseUrl}/api/auth/register`;
  const registerRes = http.post(registerUrl, JSON.stringify(testUser), {
    headers: CONFIG.headers,
  });
  
  if (registerRes.status === 201) {
    const loginUrl = `${CONFIG.baseUrl}/api/auth/login`;
    const loginRes = http.post(loginUrl, JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }), { headers: CONFIG.headers });
    
    if (loginRes.status === 200) {
      // Create some initial events for testing
      const token = extractToken(loginRes);
      const authHeaders = getAuthHeaders(token);
      const events = [];
      
      for (let i = 0; i < 5; i++) {
        const eventData = generateRandomEvent();
        const createEventRes = http.post(
          `${CONFIG.baseUrl}/api/events`,
          JSON.stringify(eventData),
          { headers: authHeaders }
        );
        
        if (createEventRes.status === 201) {
          events.push(JSON.parse(createEventRes.body).data);
        }
      }
      
      return {
        token,
        user: testUser,
        events
      };
    }
  }
  
  handleError(new Error('Setup failed'), 'setup');
  return null;
}

export default function (data) {
  const token = data?.token;
  if (!token) {
    handleError(new Error('No token available'), 'main');
    return;
  }

  const authHeaders = getAuthHeaders(token);
  const eventIds = data.events.map(e => e.id);
  
  // Randomly select operation to perform
  const operations = [
    { weight: 0.4, fn: listEvents },      // 40% probability
    { weight: 0.2, fn: createEvent },     // 20% probability
    { weight: 0.2, fn: readEvent },       // 20% probability
    { weight: 0.1, fn: updateEvent },     // 10% probability
    { weight: 0.1, fn: deleteEvent }      // 10% probability
  ];
  
  const random = Math.random();
  let sum = 0;
  
  for (const op of operations) {
    sum += op.weight;
    if (random <= sum) {
      op.fn(authHeaders, eventIds);
      break;
    }
  }
  
  // Random sleep between requests to simulate real user behavior
  sleep(getRandomSleep());
}

// Operation functions
function listEvents(headers) {
  const params = {
    page: 1,
    limit: 10,
    sort: 'startDate',
    order: 'desc'
  };
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const response = http.get(
    `${CONFIG.baseUrl}/api/events?${queryString}`,
    { headers }
  );
  
  checkResponse(response, 200);
}

function createEvent(headers) {
  const eventData = generateRandomEvent();
  const response = http.post(
    `${CONFIG.baseUrl}/api/events`,
    JSON.stringify(eventData),
    { headers }
  );
  
  checkResponse(response, 201);
}

function readEvent(headers, eventIds) {
  if (!eventIds.length) return;
  
  const randomId = eventIds[Math.floor(Math.random() * eventIds.length)];
  const response = http.get(
    `${CONFIG.baseUrl}/api/events/${randomId}`,
    { headers }
  );
  
  checkResponse(response, 200);
}

function updateEvent(headers, eventIds) {
  if (!eventIds.length) return;
  
  const randomId = eventIds[Math.floor(Math.random() * eventIds.length)];
  const updateData = {
    title: `Updated Event ${Date.now()}`,
    status: 'PUBLISHED'
  };
  
  const response = http.put(
    `${CONFIG.baseUrl}/api/events/${randomId}`,
    JSON.stringify(updateData),
    { headers }
  );
  
  checkResponse(response, 200);
}

function deleteEvent(headers, eventIds) {
  if (!eventIds.length) return;
  
  const randomId = eventIds[Math.floor(Math.random() * eventIds.length)];
  const response = http.del(
    `${CONFIG.baseUrl}/api/events/${randomId}`,
    null,
    { headers }
  );
  
  checkResponse(response, 204);
}

// Test teardown - cleanup test data
export function teardown(data) {
  if (data?.token) {
    const headers = getAuthHeaders(data.token);
    
    // Delete all test events
    if (data.events) {
      data.events.forEach(event => {
        http.del(
          `${CONFIG.baseUrl}/api/events/${event.id}`,
          null,
          { headers }
        );
      });
    }
    
    // Delete test user
    http.del(`${CONFIG.baseUrl}/api/auth/profile`, null, { headers });
  }
}