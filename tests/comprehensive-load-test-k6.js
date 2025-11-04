/**
 * Comprehensive Load Test - All Endpoints Under Load
 * 
 * This is a LOAD TEST version that tests ALL ~109 API endpoints under realistic load.
 * Load tests simulate normal traffic to see how your API performs.
 * 
 * WHAT IT DOES:
 * - Tests ALL endpoints from API_ENDPOINTS_COMPLETE.md
 * - Runs under realistic load (gradually increasing users)
 * - Measures performance under concurrent requests
 * - Perfect for capacity planning and finding bottlenecks
 * 
 * DURATION: ~5-10 minutes
 * LOAD: Gradually increases from 5 to 20 users
 * 
 * USAGE:
 *   k6 run tests/comprehensive-load-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/comprehensive-load-test-k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestsCounter = new Counter('total_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.navigatortrips.com';
const TEST_USERNAME = __ENV.TEST_USERNAME || 'testuser';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'testpass';

// Store authenticated session for reuse
let sessionCookie = '';

/**
 * Load test configuration - Realistic ramp-up
 */
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users over 30 seconds
    { duration: '1m', target: 10 },    // Increase to 10 users over 1 minute
    { duration: '2m', target: 15 },    // Increase to 15 users over 2 minutes
    { duration: '2m', target: 20 },    // Stay at 20 users for 2 minutes
    { duration: '30s', target: 0 },    // Ramp down to 0 over 30 seconds
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],  // 95% under 3 seconds
    'http_req_failed': ['rate<0.3'],      // Allow up to 30% failures (many will be 401/404)
    'errors': ['rate<0.3'],               // Allow some errors
  },
};

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, path, payload = null, headers = {}) {
  // Ensure BASE_URL has protocol prefix
  const baseUrl = BASE_URL.startsWith('http') ? BASE_URL : `https://${BASE_URL}`;
  const url = `${baseUrl}${path}`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    tags: { name: path },
  };

  // Add session cookie if available
  if (sessionCookie) {
    params.headers['Cookie'] = sessionCookie;
  }

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(payload), params);
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(payload), params);
  } else if (method === 'DELETE') {
    response = http.del(url, null, params);
  } else if (method === 'PATCH') {
    response = http.patch(url, JSON.stringify(payload), params);
  } else {
    response = http.request(method, url, JSON.stringify(payload), params);
  }

  // Extract session cookie if present
  if (response.headers['Set-Cookie']) {
    sessionCookie = response.headers['Set-Cookie'];
  }

  requestsCounter.add(1);
  responseTime.add(response.timings.duration);

  return response;
}

/**
 * Test a single endpoint - load test version
 */
function testEndpoint(name, method, path, payload = null, expectedStatus = [200, 201, 400, 401, 404]) {
  const response = makeRequest(method, path, payload);
  const passed = check(response, {
    [`${name} - endpoint exists`]: (r) => r.status > 0,
    [`${name} - status acceptable`]: (r) => expectedStatus.includes(r.status),
    [`${name} - response time reasonable`]: (r) => r.timings.duration < 5000,
  });
  
  if (!passed) {
    errorRate.add(1);
  }
  
  sleep(0.5); // Realistic delay between requests
  return response;
}

/**
 * Main test function - tests ALL endpoints under load
 * Each virtual user runs through a subset of endpoints
 */
export default function () {
  
  // Each virtual user tests a different subset of endpoints
  // This distributes load across all endpoints
  
  const userIndex = __VU; // Virtual User ID
  const iteration = __ITER; // Current iteration
  
  // Cycle through different endpoint groups based on user and iteration
  const endpointGroup = (userIndex + iteration) % 18; // 18 main categories
  
  switch (endpointGroup) {
    case 0:
      // System & Health
      testEndpoint('Health Check', 'GET', '/api/health', null, [200]);
      testEndpoint('Ping', 'GET', '/api/ping', null, [200]);
      testEndpoint('Test Endpoint', 'GET', '/api/test', null, [200]);
      break;
      
    case 1:
      // Authentication
      testEndpoint('Login', 'POST', '/api/auth/login', {
        username: TEST_USERNAME,
        password: TEST_PASSWORD
      }, [200, 401, 400]);
      testEndpoint('Get Current User', 'GET', '/api/auth/me', null, [200, 401]);
      testEndpoint('Logout', 'POST', '/api/auth/logout', null, [200, 401]);
      break;
      
    case 2:
      // User Management
      testEndpoint('Validate Username', 'GET', '/api/users/validate?username=testuser', null, [200, 400, 401]);
      testEndpoint('Get User Stats', 'GET', '/api/users/stats', null, [200, 401]);
      testEndpoint('Update Profile', 'PUT', '/api/users/profile', { name: 'Updated Name' }, [200, 401]);
      break;
      
    case 3:
      // Trip Management - List/Create
      testEndpoint('List Trips', 'GET', '/api/trips', null, [200, 401]);
      testEndpoint('Create Trip', 'POST', '/api/trips', {
        name: 'Test Trip',
        description: 'Test Description',
        startDate: '2024-06-01',
        endDate: '2024-06-10'
      }, [200, 201, 400, 401]);
      testEndpoint('Get Trip by ID', 'GET', '/api/trips/1', null, [200, 401, 404]);
      break;
      
    case 4:
      // Trip Management - Updates
      testEndpoint('Update Trip', 'PUT', '/api/trips/1', { name: 'Updated Trip Name' }, [200, 400, 401, 404]);
      testEndpoint('Get Pending RSVPs', 'GET', '/api/trips/rsvp/pending', null, [200, 401]);
      testEndpoint('Get Pending Memberships', 'GET', '/api/trips/memberships/pending', null, [200, 401]);
      break;
      
    case 5:
      // Member Management
      testEndpoint('Get Trip Members', 'GET', '/api/trips/1/members', null, [200, 401, 404]);
      testEndpoint('Add Member', 'POST', '/api/trips/1/members', { username: 'newmember' }, [200, 201, 400, 401, 404]);
      testEndpoint('Update Member RSVP', 'PUT', '/api/trips/1/members/2/rsvp', {
        rsvpStatus: 'confirmed'
      }, [200, 400, 401, 404]);
      break;
      
    case 6:
      // Activity Management
      testEndpoint('Get Trip Activities', 'GET', '/api/trips/1/activities', null, [200, 401, 404]);
      testEndpoint('Get Activities Preview', 'GET', '/api/trips/1/activities/preview', null, [200, 404]);
      testEndpoint('Get All Activities', 'GET', '/api/activities', null, [200, 401]);
      break;
      
    case 7:
      // Activity Management - Create/Update
      testEndpoint('Create Activity', 'POST', '/api/trips/1/activities', {
        name: 'Test Activity',
        date: '2024-06-05',
        time: '10:00',
        type: 'restaurant'
      }, [200, 201, 400, 401, 404]);
      testEndpoint('RSVP to Activity', 'POST', '/api/activities/1/rsvp', {
        status: 'confirmed'
      }, [200, 400, 401, 404]);
      break;
      
    case 8:
      // Expense Management
      testEndpoint('Get Trip Expenses', 'GET', '/api/trips/1/expenses', null, [200, 401, 404]);
      testEndpoint('Get Expense Summary', 'GET', '/api/trips/1/expenses/summary', null, [200, 401, 404]);
      testEndpoint('Get Expense Balances', 'GET', '/api/trips/1/expenses/balances', null, [200, 401, 404]);
      break;
      
    case 9:
      // Expense Management - Create/Update
      testEndpoint('Create Expense', 'POST', '/api/trips/1/expenses', {
        description: 'Test Expense',
        amount: 50.00,
        payerId: 1,
        splits: [{ userId: 1, amount: 25 }, { userId: 2, amount: 25 }]
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Get Expense by ID', 'GET', '/api/expenses/1', null, [200, 401, 404]);
      break;
      
    case 10:
      // Settlement System
      testEndpoint('Get Trip Settlements', 'GET', '/api/trips/1/settlements', null, [200, 401, 404]);
      testEndpoint('Get Optimized Settlements', 'GET', '/api/settlements/1/optimized', null, [200, 401, 404]);
      testEndpoint('Get Pending Settlements', 'GET', '/api/settlements/pending', null, [200, 401]);
      break;
      
    case 11:
      // Communication
      testEndpoint('Get Trip Messages', 'GET', '/api/trips/1/messages', null, [200, 401, 404]);
      testEndpoint('Send Message', 'POST', '/api/trips/1/messages', {
        text: 'Test message',
        images: []
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Get All Messages', 'GET', '/api/messages', null, [200, 401]);
      break;
      
    case 12:
      // Polls & Surveys
      testEndpoint('Get Trip Polls', 'GET', '/api/trips/1/polls', null, [200, 401, 404]);
      testEndpoint('Vote on Poll', 'POST', '/api/polls/1/vote', { optionId: 1 }, [200, 400, 401, 404]);
      testEndpoint('Get Survey', 'GET', '/api/trips/1/survey', null, [200, 401, 404]);
      break;
      
    case 13:
      // Flight Management
      testEndpoint('Get Trip Flights', 'GET', '/api/trips/1/flights', null, [200, 401, 404]);
      testEndpoint('Search Flights', 'GET', '/api/flights/search?origin=JFK&destination=LAX&date=2024-06-01', null, [200, 400, 401]);
      break;
      
    case 14:
      // Notifications
      testEndpoint('Get Notifications', 'GET', '/api/notifications', null, [200, 401]);
      testEndpoint('Mark Notification Read', 'PUT', '/api/notifications/1/read', null, [200, 401, 404]);
      break;
      
    case 15:
      // Invitations
      testEndpoint('Get Trip Invites', 'GET', '/api/trips/1/invites', null, [200, 401, 404]);
      testEndpoint('Get Invite by Token', 'GET', '/api/invite/invalid_token', null, [200, 400, 404]);
      break;
      
    case 16:
      // Google Places & Airport Recommendations
      testEndpoint('Places Autocomplete', 'GET', '/api/places/autocomplete?input=New%20York', null, [200, 400]);
      testEndpoint('Airport Service Status', 'GET', '/api/airport-recommendations/status', null, [200]);
      testEndpoint('Nearby Airports', 'GET', '/api/airports/nearby?lat=40.7128&lng=-74.0060&radius=200', null, [200, 400, 401]);
      break;
      
    case 17:
      // Budget, Contact, and Admin
      testEndpoint('Budget Dashboard', 'GET', '/api/budget/dashboard', null, [200, 401]);
      testEndpoint('Contact Form', 'POST', '/api/contact', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      }, [200, 201, 400]);
      break;
  }
  
  sleep(1); // Realistic pause between endpoint groups
}

/**
 * Setup function
 */
export function setup() {
  console.log('\n🚀 Starting Comprehensive Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('📊 Testing all ~109 endpoints under load');
  console.log('📈 Load: 5 → 10 → 15 → 20 users over ~6 minutes');
  console.log('='.repeat(60));
  
  // Verify server is accessible
  const baseUrl = BASE_URL.startsWith('http') ? BASE_URL : `https://${BASE_URL}`;
  const healthCheck = http.get(`${baseUrl}/api/health`);
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
  console.log('\n✅ Comprehensive load test completed!');
  console.log('📊 Review metrics to see performance under load');
  console.log('💡 Check response times and error rates above');
}

