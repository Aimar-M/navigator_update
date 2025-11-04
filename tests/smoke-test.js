/**
 * Smoke Test Suite
 * 
 * Quick tests to verify basic application functionality.
 * These tests check critical endpoints to ensure the app is working.
 * 
 * Usage:
 *   node tests/smoke-test.js
 *   BASE_URL=https://your-app.com node tests/smoke-test.js
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds
const VERBOSE = process.env.VERBOSE !== 'false';

// Test results tracking
let passed = 0;
let failed = 0;
const errors = [];

// Helper function to make requests with timeout
async function makeRequest(method, path, data = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const config = {
      method,
      url,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true, // Don't throw on any status code
      ...(data && { data })
    };
    
    const response = await axios(config);
    return response;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused - is the server running at ${BASE_URL}?`);
    }
    throw error;
  }
}

// Test helper
function test(name, fn) {
  return async () => {
    try {
      if (VERBOSE) console.log(`\n🧪 Testing: ${name}`);
      await fn();
      passed++;
      if (VERBOSE) console.log(`✅ PASS: ${name}`);
    } catch (error) {
      failed++;
      const errorMsg = error.message || String(error);
      errors.push({ test: name, error: errorMsg });
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${errorMsg}`);
    }
  };
}

// Smoke Tests
const tests = [
  // 1. Health Check
  test('Health Check Endpoint', async () => {
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    if (!response.data.status) {
      throw new Error('Health check response missing status field');
    }
    
    if (VERBOSE) {
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Uptime: ${response.data.uptime}s`);
      console.log(`   Environment: ${response.data.environment}`);
    }
  }),

  // 2. Contact Form Endpoint (Public)
  test('Contact Form Endpoint', async () => {
    const response = await makeRequest('POST', '/api/contact', {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      subject: 'Smoke Test',
      message: 'This is a smoke test message'
    });
    
    // Should accept the request (200 or 201)
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  }),

  // 3. Authentication Endpoints Structure
  test('Auth Endpoints Exist', async () => {
    // Test that auth endpoints respond (even if with 401/400)
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'nonexistent',
      password: 'test'
    });
    
    // Should get 401 (unauthorized) or 400 (bad request), not 404 (not found)
    if (loginResponse.status === 404) {
      throw new Error('Auth endpoint not found - route may be missing');
    }
    
    if (VERBOSE) {
      console.log(`   Login endpoint responds with: ${loginResponse.status}`);
    }
  }),

  // 4. Trips API Structure
  test('Trips API Structure', async () => {
    // Test that trips endpoint exists (should require auth, so 401 is expected)
    const response = await makeRequest('GET', '/api/trips');
    
    // Should get 401 (unauthorized), not 404 (not found)
    if (response.status === 404) {
      throw new Error('Trips endpoint not found - route may be missing');
    }
    
    if (VERBOSE) {
      console.log(`   Trips endpoint responds with: ${response.status}`);
    }
  }),

  // 5. WebSocket Server (if applicable)
  test('Server Responds to Requests', async () => {
    const startTime = Date.now();
    const response = await makeRequest('GET', '/api/health');
    const responseTime = Date.now() - startTime;
    
    if (response.status !== 200) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    if (responseTime > 5000) {
      throw new Error(`Response time too slow: ${responseTime}ms`);
    }
    
    if (VERBOSE) {
      console.log(`   Response time: ${responseTime}ms`);
    }
  }),

  // 6. CORS Headers (if applicable)
  test('CORS Configuration', async () => {
    const response = await makeRequest('OPTIONS', '/api/health');
    
    // Should handle OPTIONS request (not 404)
    if (response.status === 404) {
      throw new Error('CORS not configured - OPTIONS request failed');
    }
    
    if (VERBOSE) {
      console.log(`   CORS responds with: ${response.status}`);
    }
  }),

  // 7. Invalid Route Handling
  test('404 Handling for Invalid Routes', async () => {
    const response = await makeRequest('GET', '/api/nonexistent-endpoint-12345');
    
    // Should return 404 for non-existent routes
    if (response.status !== 404) {
      throw new Error(`Expected 404 for invalid route, got ${response.status}`);
    }
    
    if (VERBOSE) {
      console.log(`   Invalid route correctly returns 404`);
    }
  }),
];

// Run all tests
async function runSmokeTests() {
  console.log('\n🔥 Starting Smoke Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  for (const testFn of tests) {
    await testFn();
  }
  
  const duration = Date.now() - startTime;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  
  if (errors.length > 0) {
    console.log('\n❌ Failures:');
    errors.forEach(({ test, error }) => {
      console.log(`   • ${test}: ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (failed === 0) {
    console.log('🎉 All smoke tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Smoke tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests
runSmokeTests().catch(error => {
  console.error('\n💥 Fatal error running smoke tests:', error);
  process.exit(1);
});
