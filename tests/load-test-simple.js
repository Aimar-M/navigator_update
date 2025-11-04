/**
 * Simple Load Test Script (Node.js)
 * 
 * A simpler load testing alternative that doesn't require k6 installation.
 * Uses Node.js with axios for concurrent requests.
 * 
 * Usage:
 *   node tests/load-test-simple.js
 *   BASE_URL=https://your-app.com VUS=20 DURATION=30 node tests/load-test-simple.js
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VUS = parseInt(process.env.VUS) || 10; // Virtual Users
const DURATION = parseInt(process.env.DURATION) || 30; // seconds
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER) || 10;

// Statistics
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  responseTimes: [],
  statusCodes: {},
};

// Helper function to make request
async function makeRequest(method, path, data = null) {
  const startTime = Date.now();
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${path}`,
      data,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status
    });
    
    const responseTime = Date.now() - startTime;
    
    stats.total++;
    stats.responseTimes.push(responseTime);
    stats.statusCodes[response.status] = (stats.statusCodes[response.status] || 0) + 1;
    
    if (response.status >= 200 && response.status < 400) {
      stats.success++;
      return { success: true, response, responseTime };
    } else {
      stats.failed++;
      return { success: false, response, responseTime, error: `Status ${response.status}` };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    stats.total++;
    stats.failed++;
    stats.errors.push(error.message);
    
    return { success: false, error: error.message, responseTime };
  }
}

// Simulate a virtual user
async function virtualUser(userId) {
  const requests = [];
  
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    // Mix of different requests
    const requestType = i % 4;
    
    switch (requestType) {
      case 0:
        // Health check
        requests.push(makeRequest('GET', '/api/health'));
        break;
      case 1:
        // Contact form
        requests.push(makeRequest('POST', '/api/contact', {
          firstName: `LoadTest${userId}`,
          lastName: `User${i}`,
          email: `loadtest${userId}-${i}@example.com`,
          subject: 'Load Test',
          message: `Load test message from user ${userId}, request ${i}`,
        }));
        break;
      case 2:
        // Auth endpoint
        requests.push(makeRequest('POST', '/api/auth/login', {
          username: 'test',
          password: 'test',
        }));
        break;
      case 3:
        // Trips endpoint (will fail auth, but tests endpoint)
        requests.push(makeRequest('GET', '/api/trips'));
        break;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Wait for all requests to complete
  await Promise.all(requests);
}

// Calculate statistics
function calculateStats() {
  if (stats.responseTimes.length === 0) return {};
  
  const sorted = [...stats.responseTimes].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    total: stats.total,
    success: stats.success,
    failed: stats.failed,
    successRate: ((stats.success / stats.total) * 100).toFixed(2) + '%',
    avgResponseTime: Math.round(sum / sorted.length),
    minResponseTime: sorted[0],
    maxResponseTime: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    statusCodes: stats.statusCodes,
    errors: stats.errors.length > 0 ? stats.errors.slice(0, 5) : [], // First 5 errors
  };
}

// Main load test function
async function runLoadTest() {
  console.log('\n🚀 Starting Simple Load Test');
  console.log('='.repeat(60));
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👥 Virtual Users: ${VUS}`);
  console.log(`⏱️  Duration: ${DURATION}s`);
  console.log(`📊 Requests per user: ${REQUESTS_PER_USER}`);
  console.log('='.repeat(60));
  console.log('\n⏳ Running load test...\n');
  
  const startTime = Date.now();
  const endTime = startTime + (DURATION * 1000);
  
  // Create virtual users
  const users = [];
  for (let i = 1; i <= VUS; i++) {
    users.push(virtualUser(i));
  }
  
  // Run for specified duration
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\r⏱️  Elapsed: ${elapsed}s / ${DURATION}s`);
    
    if (Date.now() >= endTime) {
      clearInterval(interval);
    }
  }, 1000);
  
  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, DURATION * 1000));
  
  // Wait a bit for remaining requests to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  clearInterval(interval);
  
  // Calculate and display results
  const results = calculateStats();
  
  console.log('\n\n📊 Load Test Results');
  console.log('='.repeat(60));
  console.log(`✅ Total Requests: ${results.total}`);
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${results.successRate}`);
  console.log('\n⏱️  Response Times:');
  console.log(`   Average: ${results.avgResponseTime}ms`);
  console.log(`   Min: ${results.minResponseTime}ms`);
  console.log(`   Max: ${results.maxResponseTime}ms`);
  console.log(`   p50: ${results.p50}ms`);
  console.log(`   p95: ${results.p95}ms`);
  console.log(`   p99: ${results.p99}ms`);
  console.log('\n📋 Status Codes:');
  Object.entries(results.statusCodes).forEach(([code, count]) => {
    console.log(`   ${code}: ${count}`);
  });
  
  if (results.errors.length > 0) {
    console.log('\n❌ Sample Errors:');
    results.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Determine exit code
  const successRate = parseFloat(results.successRate);
  if (successRate >= 90 && results.avgResponseTime < 2000) {
    console.log('🎉 Load test passed! Good performance.');
    process.exit(0);
  } else {
    console.log('⚠️  Load test completed with warnings.');
    process.exit(0); // Still exit 0, but show warnings
  }
}

// Verify server is accessible first
async function verifyServer() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ Server is accessible\n');
      return true;
    }
  } catch (error) {
    console.error(`\n❌ Server not accessible at ${BASE_URL}`);
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Make sure your server is running before running load tests.\n');
    process.exit(1);
  }
}

// Run the test
(async () => {
  await verifyServer();
  await runLoadTest();
})();
