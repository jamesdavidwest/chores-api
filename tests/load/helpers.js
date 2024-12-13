import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const successRate = new Rate('success');

// Helper function to check response
export function checkResponse(res, expectedStatus = 200) {
  const checks = {
    'status is correct': res.status === expectedStatus,
    'response is not empty': res.body.length > 0,
    'response is valid JSON': isValidJson(res.body),
  };
  
  // Record success/failure rates
  successRate.add(Object.values(checks).every(v => v));
  errorRate.add(!Object.values(checks).every(v => v));
  
  return check(res, checks);
}

// Helper function to validate JSON
function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Helper function to generate random user data
export function generateRandomUser() {
  const timestamp = new Date().getTime();
  return {
    email: `user_${timestamp}@example.com`,
    password: `password_${timestamp}`,
    firstName: `First${timestamp}`,
    lastName: `Last${timestamp}`,
  };
}

// Helper function to generate authentication headers
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// Helper function for sleep time with jitter
export function getRandomSleep(min = 1, max = 5) {
  return Math.random() * (max - min) + min;
}

// Helper function to extract token from response
export function extractToken(loginResponse) {
  const body = JSON.parse(loginResponse.body);
  return body.data?.accessToken;
}

// Helper function to log test progress
export function logProgress(scenario, vu, iter) {
  console.log(`[${scenario}] VU: ${vu}, Iteration: ${iter}`);
}

// Helper function for error handling
export function handleError(error, context) {
  console.error(`Error in ${context}:`, error.message);
  errorRate.add(1);
  return null;
}