/**
 * K6 Load Test
 * 
 * WHAT IS A LOAD TEST?
 * A load test simulates realistic user traffic to see how your application performs
 * under normal expected load. It helps you answer: "Can my app handle the traffic
 * I expect to get?" You gradually increase load to see how performance changes.
 * 
 * WHEN TO USE:
 * - Before going to production
 * - After major code changes
 * - To establish performance baselines
 * - When planning capacity (how many servers do I need?)
 * 
 * WHAT THIS TEST DOES:
 * - Gradually ramps up virtual users (like more people using your app)
 * - Tests a realistic mix of API endpoints
 * - Measures response times, error rates, and throughput
 * - Helps you find performance bottlenecks before users do
 * 
 * DURATION: Typically 1-5 minutes
 * 
 * USAGE:
 *   k6 run tests/load-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/load-test-k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics to track
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestsCounter = new Counter('total_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * LOAD TEST SCENARIO: Gradual Ramp-Up
 * 
 * This configuration gradually increases load to simulate real-world usage:
 * 1. Start with 5 users for 30 seconds (warm-up)
 * 2. Increase to 20 users over 1 minute (gradual ramp-up)
 * 3. Stay at 20 users for 2 minutes (sustained load)
 * 4. Gradually decrease to 0 over 30 seconds (cool-down)
 * 
 * Adjust these numbers based on your expected traffic!
 */
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users over 30 seconds
    { duration: '1m', target: 20 },    // Increase to 20 users over 1 minute
    { duration: '2m', target: 20 },    // Stay at 20 users for 2 minutes
    { duration: '30s', target: 0 },    // Ramp down to 0 over 30 seconds
  ],
  thresholds: {
    // Performance thresholds - test fails if these aren't met
    'http_req_duration': ['p(95)<2000'],  // 95% of requests must complete in under 2 seconds
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests can fail
    'errors': ['rate<0.05'],              // Less than 5% custom errors
  },
};

/**
 * Helper function to make HTTP requests with consistent error tracking
 */
function makeRequest(method, path, payload = null, tags = {}) {
  const url = `${BASE_URL}${path}`;
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: path, ...tags },
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

/**
 * Main test function - simulates what a real user would do
 * Each virtual user runs this function repeatedly
 */
export default function () {
  
  // ============================================
  // SCENARIO: Public User Browsing
  // ============================================
  
  // 1. Health Check (Public - no auth required)
  // API: GET /api/health
  // Expected: 200 OK
  // Why: This endpoint should handle the most traffic
  const healthCheck = makeRequest('GET', '/api/health', null, { scenario: 'public_browse' });
  
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check is fast (< 500ms)': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  sleep(1); // Simulate user thinking time

  // 2. Contact Form Submission (Public)
  // API: POST /api/contact
  // Expected: 200/201 OK
  // Why: Important public-facing feature
  const contactPayload = {
    firstName: `LoadTestUser${__VU}`,  // __VU = current virtual user ID
    lastName: `Iteration${__ITER}`,    // __ITER = current iteration number
    email: `loadtest-${__VU}-${__ITER}@example.com`,
    subject: 'Load Test Contact Form',
    message: `Automated load test message from virtual user ${__VU}, iteration ${__ITER}`,
  };

  const contactResponse = makeRequest('POST', '/api/contact', contactPayload, { scenario: 'public_browse' });
  
  check(contactResponse, {
    'contact form accepts requests': (r) => r.status === 200 || r.status === 201,
    'contact form responds in time (< 1s)': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);

  // ============================================
  // SCENARIO: Authenticated User Actions
  // ============================================
  // Note: These will likely return 401 (unauthorized) unless you provide
  // valid test credentials. That's OK - we're testing that the endpoints
  // exist and respond quickly, even when unauthenticated.
  
  // 3. Attempt Login (will fail but tests endpoint)
  // API: POST /api/auth/login
  // Expected: 401 (unauthorized) or 400 (bad request), NOT 404
  // Why: One of the most frequently used endpoints
  const loginPayload = {
    username: 'testuser',
    password: 'testpass',
  };

  const loginResponse = makeRequest('POST', '/api/auth/login', loginPayload, { scenario: 'auth' });
  
  check(loginResponse, {
    'login endpoint exists (not 404)': (r) => r.status !== 404,
    'login responds quickly (< 1s)': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);

  // 4. Get User Profile (requires auth - will return 401)
  // API: GET /api/auth/me
  // Expected: 401 (unauthorized), NOT 404
  // Why: Frequently accessed by logged-in users
  const meResponse = makeRequest('GET', '/api/auth/me', null, { scenario: 'auth' });
  
  check(meResponse, {
    'auth/me endpoint exists (not 404)': (r) => r.status !== 404,
    'auth/me responds quickly (< 1s)': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);

  // 5. List Trips (requires auth - will return 401)
  // API: GET /api/trips
  // Expected: 401 (unauthorized), NOT 404
  // Why: Core feature of the application
  const tripsResponse = makeRequest('GET', '/api/trips', null, { scenario: 'trips' });
  
  check(tripsResponse, {
    'trips endpoint exists (not 404)': (r) => r.status !== 404,
    'trips responds quickly (< 1s)': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(2); // Longer pause between major actions
}

/**
 * Setup function - runs ONCE before the test starts
 */
export function setup() {
  console.log('\n🚀 Starting Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('📊 Test Configuration:');
  console.log('   - Ramp up to 5 users over 30 seconds');
  console.log('   - Increase to 20 users over 1 minute');
  console.log('   - Sustain 20 users for 2 minutes');
  console.log('   - Ramp down to 0 over 30 seconds');
  console.log('='.repeat(50));
  
  // Verify server is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`❌ Server not accessible at ${BASE_URL}`);
  }
  
  console.log('✅ Server is accessible\n');
  return { baseUrl: BASE_URL };
}

/**
 * Teardown function - runs ONCE after the test completes
 */
export function teardown(data) {
  console.log('\n✅ Load test completed!');
  console.log('📊 Check the metrics above for performance details.');
}

