/**
 * Load Test Script (k6)
 * 
 * This script performs load testing on your Navigator application.
 * k6 is a modern load testing tool built for developers.
 * 
 * Installation:
 *   Windows: choco install k6
 *   Mac: brew install k6
 *   Linux: See https://k6.io/docs/getting-started/installation/
 * 
 * Usage:
 *   k6 run tests/load-test.js
 *   k6 run --vus 10 --duration 30s tests/load-test.js
 *   BASE_URL=https://your-app.com k6 run tests/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestsCounter = new Counter('requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = parseInt(__ENV.VUS) || 10; // Virtual Users
const DURATION = __ENV.DURATION || '30s';

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 users
    { duration: '30s', target: 10 },  // Stay at 10 users
    { duration: '10s', target: 20 },  // Ramp up to 20 users
    { duration: '30s', target: 20 },  // Stay at 20 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate should be less than 10%
    errors: ['rate<0.1'],              // Custom error rate should be less than 10%
  },
};

// Test data - you may want to create test users for authenticated endpoints
const testCredentials = {
  username: __ENV.TEST_USERNAME || 'testuser',
  password: __ENV.TEST_PASSWORD || 'testpass',
};

// Helper function to make authenticated request
function makeAuthenticatedRequest(method, path, payload = null) {
  const url = `${BASE_URL}${path}`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: path },
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(payload), params);
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(payload), params);
  } else {
    response = http.request(method, url, JSON.stringify(payload), params);
  }

  requestsCounter.add(1);
  responseTime.add(response.timings.duration);

  return response;
}

// Main test function
export default function () {
  // 1. Health Check (Public)
  const healthCheck = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'health' },
  });
  
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
    'health check has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(0.5);

  // 2. Contact Form (Public)
  const contactPayload = {
    firstName: `LoadTest${__VU}`,
    lastName: `User${__ITER}`,
    email: `loadtest${__VU}-${__ITER}@example.com`,
    subject: 'Load Test',
    message: `This is a load test message from VU ${__VU}, iteration ${__ITER}`,
  };

  const contactResponse = makeAuthenticatedRequest('POST', '/api/contact', contactPayload);
  
  check(contactResponse, {
    'contact form status is 200/201': (r) => r.status === 200 || r.status === 201,
    'contact form response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(0.5);

  // 3. Auth Endpoint (Login attempt - will fail but tests endpoint)
  const loginPayload = {
    username: testCredentials.username,
    password: testCredentials.password,
  };

  const loginResponse = makeAuthenticatedRequest('POST', '/api/auth/login', loginPayload);
  
  check(loginResponse, {
    'auth endpoint exists (not 404)': (r) => r.status !== 404,
    'auth endpoint response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(0.5);

  // 4. Trips Endpoint (Unauthenticated - should return 401)
  const tripsResponse = makeAuthenticatedRequest('GET', '/api/trips');
  
  check(tripsResponse, {
    'trips endpoint exists (not 404)': (r) => r.status !== 404,
    'trips endpoint response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);
}

// Setup function - runs once before the test
export function setup() {
  console.log(`🚀 Starting load test`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${VUS}`);
  console.log(`⏱️  Duration: ${DURATION}`);
  
  // Verify server is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Server not accessible at ${BASE_URL}`);
  }
  
  return { baseUrl: BASE_URL };
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('\n✅ Load test completed');
}
