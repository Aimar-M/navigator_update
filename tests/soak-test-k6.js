/**
 * K6 Soak Test
 * 
 * WHAT IS A SOAK TEST?
 * A soak test runs your application under moderate, sustained load for an extended
 * period of time (often hours). It's designed to find issues that only appear over
 * time, like memory leaks, database connection pool exhaustion, or resource leaks.
 * 
 * WHEN TO USE:
 * - To find memory leaks or resource leaks
 * - To test database connection pool stability
 * - To verify system stability over long periods
 * - Before deploying to production (especially critical systems)
 * 
 * WHAT THIS TEST DOES:
 * - Runs moderate load for an extended period
 * - Monitors for gradual performance degradation
 * - Identifies memory/resource leaks
 * - Tests database connection handling over time
 * 
 * ⚠️  NOTE: Soak tests run for a LONG time!
 * - Default duration: 30 minutes (adjustable)
 * - Can run for hours in production scenarios
 * - Make sure you have monitoring in place
 * 
 * DURATION: 30 minutes to several hours
 * 
 * USAGE:
 *   k6 run tests/soak-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/soak-test-k6.js
 *   DURATION=2h BASE_URL=https://api.navigatortrips.com k6 run tests/soak-test-k6.js
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
const SOAK_DURATION = __ENV.DURATION || '30m'; // Default: 30 minutes

/**
 * SOAK TEST SCENARIO: Sustained Moderate Load
 * 
 * This configuration runs moderate, steady load for an extended period:
 * 1. Ramp up to 20 users over 2 minutes (gentle start)
 * 2. Sustain 20 users for the soak duration (the main test)
 * 3. Ramp down to 0 over 2 minutes (gentle end)
 * 
 * The key is steady, moderate load - not spikes. We want to see if
 * performance degrades gradually over time (indicating a leak).
 * 
 * Adjust DURATION environment variable to change soak time:
 *   DURATION=1h k6 run tests/soak-test-k6.js  (1 hour)
 *   DURATION=2h k6 run tests/soak-test-k6.js  (2 hours)
 */
export const options = {
  stages: [
    { duration: '2m', target: 20 },              // Ramp up to 20 users over 2 minutes
    { duration: SOAK_DURATION, target: 20 },    // Sustain 20 users for soak duration
    { duration: '2m', target: 0 },               // Ramp down over 2 minutes
  ],
  thresholds: {
    // Soak tests should maintain consistent performance
    // Watch for gradual degradation over time
    'http_req_duration': ['p(95)<3000'],  // 95% under 3 seconds (slightly relaxed for long test)
    'http_req_failed': ['rate<0.05'],     // Less than 5% failures
    'errors': ['rate<0.05'],              // Less than 5% custom errors
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
 * Main test function - simulates realistic user behavior
 * Real users don't hit APIs constantly, so we include realistic pauses
 */
export default function () {
  
  // Simulate a realistic user session with pauses between actions
  
  // 1. Health Check (lightweight, frequent)
  // API: GET /api/health
  const healthCheck = makeRequest('GET', '/api/health', null, { scenario: 'soak' });
  
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check is consistent': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(2); // Realistic pause between actions

  // 2. Contact Form (occasional use)
  // API: POST /api/contact
  // Note: Use sparingly in soak tests to avoid email spam
  if (__ITER % 10 === 0) { // Only every 10th iteration
    const contactPayload = {
      firstName: `SoakTest${__VU}`,
      lastName: `User${__ITER}`,
      email: `soaktest-${__VU}-${__ITER}@example.com`,
      subject: 'Soak Test Contact',
      message: `Soak test message from VU ${__VU}, iteration ${__ITER}`,
    };

    const contactResponse = makeRequest('POST', '/api/contact', contactPayload, { scenario: 'soak' });
    
    check(contactResponse, {
      'contact form accepts requests': (r) => r.status === 200 || r.status === 201,
    }) || errorRate.add(1);
  }
  
  sleep(3); // Longer pause - users don't constantly submit forms

  // 3. Auth Endpoint (common but not constant)
  // API: POST /api/auth/login
  const loginPayload = {
    username: 'testuser',
    password: 'testpass',
  };

  const loginResponse = makeRequest('POST', '/api/auth/login', loginPayload, { scenario: 'soak' });
  
  check(loginResponse, {
    'login endpoint responds': (r) => r.status !== 404,
  }) || errorRate.add(1);
  
  sleep(2);

  // 4. Trips Endpoint (frequently accessed)
  // API: GET /api/trips
  const tripsResponse = makeRequest('GET', '/api/trips', null, { scenario: 'soak' });
  
  check(tripsResponse, {
    'trips endpoint responds': (r) => r.status !== 404,
    'trips endpoint performance consistent': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  sleep(5); // Users browse for a bit before next action

  // 5. Auth Me Endpoint (frequently checked in sessions)
  // API: GET /api/auth/me
  const meResponse = makeRequest('GET', '/api/auth/me', null, { scenario: 'soak' });
  
  check(meResponse, {
    'auth/me endpoint responds': (r) => r.status !== 404,
  }) || errorRate.add(1);
  
  sleep(3); // Realistic session pause
}

/**
 * Setup function
 */
export function setup() {
  console.log('\n🌊 Starting Soak Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Soak Duration: ${SOAK_DURATION}`);
  console.log('📊 Test Configuration:');
  console.log('   - Ramp up to 20 users over 2 minutes');
  console.log(`   - Sustain 20 users for ${SOAK_DURATION} (main test)`);
  console.log('   - Ramp down to 0 over 2 minutes');
  console.log('='.repeat(50));
  console.log('💡 This test runs for an extended period.');
  console.log('💡 Monitor for gradual performance degradation over time.');
  console.log('💡 Watch for memory leaks or connection pool exhaustion.\n');
  
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
  console.log('\n✅ Soak test completed!');
  console.log('📊 Review the metrics to identify:');
  console.log('   - Did response times gradually increase? (possible leak)');
  console.log('   - Did error rates increase over time? (resource exhaustion)');
  console.log('   - Are there any patterns in the metrics?');
}

