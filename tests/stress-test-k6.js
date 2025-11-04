/**
 * K6 Stress Test
 * 
 * WHAT IS A STRESS TEST?
 * A stress test pushes your application BEYOND normal expected load to find its
 * breaking point. The goal is to answer: "At what point does my app start to fail
 * or degrade significantly?" This helps you understand your limits and plan scaling.
 * 
 * WHEN TO USE:
 * - To find your application's maximum capacity
 * - Before a major launch or marketing campaign
 * - To identify bottlenecks and failure points
 * - To test auto-scaling configurations
 * 
 * WHAT THIS TEST DOES:
 * - Aggressively ramps up load beyond normal levels
 * - Pushes the system to (and beyond) its limits
 * - Identifies where performance degrades
 * - Finds the point of failure
 * 
 * ⚠️  WARNING: This test can overwhelm your server!
 * - Don't run on production without warning
 * - Monitor your server metrics during the test
 * - Be ready to stop the test if needed (Ctrl+C)
 * 
 * DURATION: Typically 3-10 minutes
 * 
 * USAGE:
 *   k6 run tests/stress-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/stress-test-k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestsCounter = new Counter('total_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * STRESS TEST SCENARIO: Aggressive Load Increase
 * 
 * This configuration aggressively increases load to find breaking points:
 * 1. Start with 10 users for 1 minute (baseline)
 * 2. Ramp up to 50 users over 2 minutes (moderate stress)
 * 3. Increase to 100 users over 2 minutes (high stress)
 * 4. Spike to 150 users for 1 minute (maximum stress)
 * 5. Gradually decrease to 0 (recovery test)
 * 
 * ⚠️  These numbers are aggressive! Adjust based on your server capacity.
 * Start lower if you're not sure: 20 → 50 → 100
 */
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Baseline: 10 users
    { duration: '2m', target: 50 },   // Moderate stress: ramp to 50 users
    { duration: '2m', target: 100 },  // High stress: ramp to 100 users
    { duration: '1m', target: 150 },  // Maximum stress: spike to 150 users
    { duration: '2m', target: 0 },    // Recovery: ramp down to 0
  ],
  thresholds: {
    // Stress tests have relaxed thresholds because we expect some degradation
    'http_req_duration': ['p(95)<5000'],  // 95% under 5 seconds (relaxed for stress)
    'http_req_failed': ['rate<0.3'],      // Allow up to 30% failures (we're testing limits)
  },
};

/**
 * Helper function to make HTTP requests
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
  } else {
    response = http.request(method, url, JSON.stringify(payload), params);
  }

  requestsCounter.add(1);
  responseTime.add(response.timings.duration);

  return response;
}

/**
 * Main test function - creates high-frequency requests to stress the system
 */
export default function () {
  
  // Use shorter sleep times to create more pressure
  // Real users don't hit APIs this fast, but we're stress testing!
  
  // 1. Health Check (should be fast even under stress)
  // API: GET /api/health
  const healthCheck = makeRequest('GET', '/api/health', null, { test: 'stress' });
  
  check(healthCheck, {
    'health check responds (any status)': (r) => r.status > 0,
    'health check completes': (r) => r.timings.duration > 0,
  }) || errorRate.add(1);
  
  sleep(0.5); // Short delay - we want high throughput

  // 2. Contact Form (can generate load on email services)
  // API: POST /api/contact
  const contactPayload = {
    firstName: `StressTest${__VU}`,
    lastName: `User${__ITER}`,
    email: `stresstest-${__VU}-${__ITER}@example.com`,
    subject: 'Stress Test',
    message: `Stress test message from VU ${__VU}, iteration ${__ITER}`,
  };

  const contactResponse = makeRequest('POST', '/api/contact', contactPayload, { test: 'stress' });
  
  check(contactResponse, {
    'contact form responds': (r) => r.status > 0,
  }) || errorRate.add(1);
  
  sleep(0.5);

  // 3. Auth Endpoint (high frequency in real usage)
  // API: POST /api/auth/login
  const loginPayload = {
    username: 'testuser',
    password: 'testpass',
  };

  const loginResponse = makeRequest('POST', '/api/auth/login', loginPayload, { test: 'stress' });
  
  check(loginResponse, {
    'login endpoint responds': (r) => r.status !== 404,
  }) || errorRate.add(1);
  
  sleep(0.5);

  // 4. Trips Endpoint (core feature - should handle stress)
  // API: GET /api/trips
  const tripsResponse = makeRequest('GET', '/api/trips', null, { test: 'stress' });
  
  check(tripsResponse, {
    'trips endpoint responds': (r) => r.status !== 404,
  }) || errorRate.add(1);
  
  sleep(0.5);

  // 5. Multiple rapid requests to same endpoint (stress test pattern)
  // This creates "burst" traffic which can be particularly challenging
  const rapidRequests = [];
  for (let i = 0; i < 3; i++) {
    rapidRequests.push(makeRequest('GET', '/api/health', null, { test: 'burst' }));
  }
  
  // Check all rapid requests completed
  rapidRequests.forEach((response, index) => {
    check(response, {
      [`rapid request ${index + 1} responds`]: (r) => r.status > 0,
    }) || errorRate.add(1);
  });
  
  sleep(1);
}

/**
 * Setup function
 */
export function setup() {
  console.log('\n💥 Starting Stress Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('⚠️  WARNING: This test will push your server to its limits!');
  console.log('📊 Test Configuration:');
  console.log('   - Baseline: 10 users for 1 minute');
  console.log('   - Moderate stress: ramp to 50 users over 2 minutes');
  console.log('   - High stress: ramp to 100 users over 2 minutes');
  console.log('   - Maximum stress: spike to 150 users for 1 minute');
  console.log('   - Recovery: ramp down to 0 over 2 minutes');
  console.log('='.repeat(50));
  console.log('💡 Monitor your server metrics during this test!');
  console.log('💡 Press Ctrl+C to stop the test if needed.\n');
  
  // Verify server is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`❌ Server not accessible at ${BASE_URL}`);
  }
  
  console.log('✅ Server is accessible\n');
  return { baseUrl: BASE_URL };
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('\n✅ Stress test completed!');
  console.log('📊 Review the metrics to see:');
  console.log('   - At what user count did performance degrade?');
  console.log('   - Where did errors start to spike?');
  console.log('   - Did the server recover during ramp-down?');
}

