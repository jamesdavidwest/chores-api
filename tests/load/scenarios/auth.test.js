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
    auth_flow: CONFIG.scenarios.constant,
  },
};

// Test setup - register and login a test user
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
      return {
        token: extractToken(loginRes),
        user: testUser,
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
  
  // Test group: Authentication endpoints
  const requests = {
    profile: {
      method: 'GET',
      url: `${CONFIG.baseUrl}/api/auth/profile`,
      headers: authHeaders,
    },
    refreshToken: {
      method: 'POST',
      url: `${CONFIG.baseUrl}/api/auth/refresh`,
      headers: authHeaders,
    },
    updateProfile: {
      method: 'PUT',
      url: `${CONFIG.baseUrl}/api/auth/profile`,
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Updated',
        lastName: 'User',
      }),
    },
  };

  // Execute requests in batch
  const responses = http.batch(requests);
  
  // Check responses
  checkResponse(responses.profile, 200);
  checkResponse(responses.refreshToken, 200);
  checkResponse(responses.updateProfile, 200);

  // Random sleep between requests to simulate real user behavior
  sleep(getRandomSleep());
}

// Test teardown - cleanup test data
export function teardown(data) {
  if (data?.token && data?.user) {
    const deleteUrl = `${CONFIG.baseUrl}/api/auth/profile`;
    http.del(deleteUrl, null, {
      headers: getAuthHeaders(data.token),
    });
  }
}