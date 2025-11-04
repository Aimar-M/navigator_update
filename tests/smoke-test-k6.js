/**
 * K6 Smoke Test
 * 
 * WHAT IS A SMOKE TEST?
 * A smoke test is a quick, minimal test that verifies the most critical functionality
 * of your application is working. Think of it like a health check on steroids - it
 * tests that your core APIs respond correctly and that nothing is catastrophically broken.
 * 
 * WHEN TO USE:
 * - Before deploying new code
 * - After a deployment to verify it worked
 * - When you suspect something might be wrong
 * - As part of your CI/CD pipeline
 * 
 * WHAT THIS TEST DOES:
 * - Verifies your server is accessible
 * - Tests critical public endpoints (health, contact form)
 * - Checks that authentication endpoints exist
 * - Validates response times are reasonable
 * - Ensures proper error handling (404s work correctly)
 * 
 * DURATION: Usually completes in 10-30 seconds
 * 
 * USAGE:
 *   k6 run tests/smoke-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/smoke-test-k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics to track
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Configuration - reads from environment variable or uses default
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Smoke tests run quickly with minimal load
// Only 1 virtual user, running a few iterations
export const options = {
  vus: 1,              // 1 virtual user (just checking if things work)
  iterations: 1,       // Run once
  thresholds: {
    // These are the pass/fail criteria
    'http_req_duration': ['p(95)<2000'],  // 95% of requests must complete in under 2 seconds
    'http_req_failed': ['rate<0.1'],      // Less than 10% of requests can fail
    'errors': ['rate<0'],                 // Zero custom errors allowed
  },
};

/**
 * Main test function - runs for each iteration
 * This simulates what a user would do to verify your app works
 */
export default function () {
  
  // ============================================
  // TEST 1: Health Check Endpoint
  // ============================================
  // API: GET /api/health
  // Purpose: Basic server health check
  // Expected: 200 OK with status information
  // Why it matters: If this fails, your server isn't running or is broken
  
  const healthCheck = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'health_check' },
  });
  
  const healthCheckPassed = check(healthCheck, {
    'health check returns 200': (r) => r.status === 200,
    'health check is fast (< 500ms)': (r) => r.timings.duration < 500,
    'health check has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch {
        return false;
      }
    },
  });
  
  if (!healthCheckPassed) {
    errorRate.add(1);
    console.error(`❌ Health check failed: ${healthCheck.status}`);
  }
  
  responseTime.add(healthCheck.timings.duration);
  sleep(0.5); // Small delay between requests

  // ============================================
  // TEST 2: Contact Form Endpoint
  // ============================================
  // API: POST /api/contact
  // Purpose: Tests that the contact form submission works
  // Expected: 200 or 201 OK
  // Why it matters: This is a critical public-facing feature
  
  const contactPayload = {
    firstName: 'SmokeTest',
    lastName: 'User',
    email: 'smoketest@example.com',
    subject: 'Smoke Test Submission',
    message: 'This is an automated smoke test to verify the contact form works.',
  };

  const contactResponse = http.post(
    `${BASE_URL}/api/contact`,
    JSON.stringify(contactPayload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'contact_form' },
    }
  );
  
  const contactPassed = check(contactResponse, {
    'contact form accepts requests': (r) => r.status === 200 || r.status === 201,
    'contact form responds quickly (< 1000ms)': (r) => r.timings.duration < 1000,
  });
  
  if (!contactPassed) {
    errorRate.add(1);
    console.error(`❌ Contact form failed: ${contactResponse.status}`);
  }
  
  responseTime.add(contactResponse.timings.duration);
  sleep(0.5);

  // ============================================
  // TEST 3: Authentication Endpoint Structure
  // ============================================
  // API: POST /api/auth/login
  // Purpose: Verifies the login endpoint exists and responds
  // Expected: 401 (unauthorized) or 400 (bad request) - NOT 404
  // Why it matters: If it returns 404, the route doesn't exist at all
  
  const loginPayload = {
    username: 'nonexistent_user',
    password: 'wrong_password',
  };

  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_login' },
    }
  );
  
  const loginPassed = check(loginResponse, {
    'login endpoint exists (not 404)': (r) => r.status !== 404,
    'login endpoint responds quickly (< 1000ms)': (r) => r.timings.duration < 1000,
  });
  
  if (!loginPassed) {
    errorRate.add(1);
    console.error(`❌ Login endpoint check failed: ${loginResponse.status}`);
  }
  
  responseTime.add(loginResponse.timings.duration);
  sleep(0.5);

  // ============================================
  // TEST 4: Trips API Endpoint Structure
  // ============================================
  // API: GET /api/trips
  // Purpose: Verifies the trips endpoint exists (should require auth)
  // Expected: 401 (unauthorized) - NOT 404
  // Why it matters: If it returns 404, the route doesn't exist
  
  const tripsResponse = http.get(`${BASE_URL}/api/trips`, {
    tags: { name: 'trips_list' },
  });
  
  const tripsPassed = check(tripsResponse, {
    'trips endpoint exists (not 404)': (r) => r.status !== 404,
    'trips endpoint responds quickly (< 1000ms)': (r) => r.timings.duration < 1000,
  });
  
  if (!tripsPassed) {
    errorRate.add(1);
    console.error(`❌ Trips endpoint check failed: ${tripsResponse.status}`);
  }
  
  responseTime.add(tripsResponse.timings.duration);
  sleep(0.5);

  // ============================================
  // TEST 5: Invalid Route Handling (404 Test)
  // ============================================
  // API: GET /api/nonexistent-endpoint-12345
  // Purpose: Verifies your app handles invalid routes correctly
  // Expected: 404 Not Found
  // Why it matters: Proper error handling is important for security and UX
  
  const invalidRouteResponse = http.get(
    `${BASE_URL}/api/nonexistent-endpoint-12345`,
    { tags: { name: 'invalid_route' } }
  );
  
  const invalidRoutePassed = check(invalidRouteResponse, {
    'invalid routes return 404': (r) => r.status === 404,
  });
  
  if (!invalidRoutePassed) {
    errorRate.add(1);
    console.error(`❌ Invalid route handling failed: ${invalidRouteResponse.status}`);
  }
  
  responseTime.add(invalidRouteResponse.timings.duration);
}

/**
 * Setup function - runs ONCE before all tests
 * Good place to verify the server is accessible
 */
export function setup() {
  console.log('\n🔥 Starting Smoke Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('='.repeat(50));
  
  // Verify server is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`❌ Server not accessible at ${BASE_URL}. Is it running?`);
  }
  
  console.log('✅ Server is accessible\n');
  return { baseUrl: BASE_URL };
}

/**
 * Teardown function - runs ONCE after all tests
 * Good place for cleanup (though we don't need any here)
 */
export function teardown(data) {
  console.log('\n✅ Smoke tests completed!');
}

