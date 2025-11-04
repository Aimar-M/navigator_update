/**
 * K6 Spike Test
 * 
 * WHAT IS A SPIKE TEST?
 * A spike test suddenly and dramatically increases load to see how your system
 * handles unexpected traffic surges (like a viral post, flash sale, or sudden
 * marketing campaign). Then it quickly drops the load.
 * 
 * WHEN TO USE:
 * - To test how your system handles sudden traffic spikes
 * - Before major marketing campaigns or launches
 * - To test auto-scaling behavior
 * - To find if your system can recover from overload
 * 
 * WHAT THIS TEST DOES:
 * - Starts with normal load
 * - Suddenly spikes to 2000 users (MASSIVE spike)
 * - Then drops back down
 * - Repeats the spike pattern
 * - Tests if system recovers
 * 
 * ⚠️  EXTREME WARNING: This test uses 2000 virtual users!
 * - This will create EXTREME load on your server
 * - Only run during off-peak hours or on staging
 * - Monitor your Railway dashboard closely
 * - Be ready to stop the test (Ctrl+C)
 * - This may impact your server performance significantly
 * 
 * DURATION: ~10-15 minutes
 * 
 * USAGE:
 *   k6 run tests/spike-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/spike-test-k6.js
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
 * SPIKE TEST SCENARIO: Sudden Load Spikes
 * 
 * This creates sudden dramatic spikes in traffic:
 * 1. Normal load: 10 users for 1 minute (baseline)
 * 2. SPIKE: Suddenly jump to 2000 users for 1 minute (MASSIVE SPIKE!)
 * 3. Drop: Quickly drop to 10 users for 1 minute (recovery)
 * 4. SPIKE AGAIN: Jump back to 2000 users for 1 minute
 * 5. Drop: Back to 10 users
 * 6. SPIKE AGAIN: One more spike to 2000 users
 * 7. Recovery: Ramp down to 0
 * 
 * This pattern tests how your system handles sudden traffic surges.
 */
export const options = {
  stages: [
    { duration: '1m', target: 10 },      // Baseline: 10 users
    { duration: '10s', target: 2000 },   // SPIKE: Sudden jump to 2000 users (10 seconds ramp)
    { duration: '1m', target: 2000 },    // Hold at 2000 users for 1 minute
    { duration: '10s', target: 10 },     // Drop: Quickly back to 10 users
    { duration: '1m', target: 10 },      // Recovery: 10 users for 1 minute
    { duration: '10s', target: 2000 },   // SPIKE AGAIN: Jump to 2000 users
    { duration: '1m', target: 2000 },    // Hold at 2000 users
    { duration: '10s', target: 10 },     // Drop again
    { duration: '1m', target: 10 },      // Recovery
    { duration: '10s', target: 2000 },   // FINAL SPIKE: One more time
    { duration: '1m', target: 2000 },    // Hold at peak
    { duration: '30s', target: 0 },      // Final recovery: ramp down
  ],
  thresholds: {
    // Spike tests have very relaxed thresholds - we expect degradation
    'http_req_duration': ['p(95)<10000'],  // 95% under 10 seconds (very relaxed)
    'http_req_failed': ['rate<0.5'],       // Allow up to 50% failures during spikes
  },
};

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, path, payload = null, tags = {}) {
  const baseUrl = BASE_URL.startsWith('http') ? BASE_URL : `https://${BASE_URL}`;
  const url = `${baseUrl}${path}`;
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
  } else if (method === 'DELETE') {
    response = http.del(url, null, params);
  } else if (method === 'PATCH') {
    response = http.patch(url, JSON.stringify(payload), params);
  } else {
    response = http.request(method, url, JSON.stringify(payload), params);
  }

  requestsCounter.add(1);
  responseTime.add(response.timings.duration);

  return response;
}

/**
 * Test a single endpoint
 */
function testEndpoint(name, method, path, payload = null, expectedStatus = [200, 201, 400, 401, 404]) {
  const response = makeRequest(method, path, payload, { test: 'spike' });
  const passed = check(response, {
    [`${name} - responds`]: (r) => r.status > 0,
    [`${name} - status acceptable`]: (r) => expectedStatus.includes(r.status),
  });
  
  if (!passed) {
    errorRate.add(1);
  }
  
  sleep(0.05); // Very short delay for spike test
  return response;
}

/**
 * Main test function - tests ALL endpoints under spike load
 * Each virtual user tests different endpoint groups to distribute load
 */
export default function () {
  
  // Each virtual user tests different endpoint groups
  // This distributes the 2000 users across all ~109 endpoints
  const userIndex = __VU;
  const iteration = __ITER;
  const endpointGroup = (userIndex + iteration) % 18; // 18 main categories
  
  switch (endpointGroup) {
    case 0:
      // System & Health
      testEndpoint('Health Check', 'GET', '/api/health', null, [200]);
      testEndpoint('Ping', 'GET', '/api/ping', null, [200]);
      testEndpoint('Test Endpoint', 'GET', '/api/test', null, [200]);
      break;
      
    case 1:
      // Authentication - All endpoints
      testEndpoint('Register', 'POST', '/api/auth/register', {
        username: `spike_${Date.now()}_${__VU}`,
        email: `spike_${Date.now()}_${__VU}@example.com`,
        password: 'TestPass123!',
        name: 'Spike Test User'
      }, [200, 201, 400, 409]);
      testEndpoint('Login', 'POST', '/api/auth/login', {
        username: 'testuser',
        password: 'testpass'
      }, [200, 401, 400]);
      testEndpoint('Get Current User', 'GET', '/api/auth/me', null, [200, 401]);
      testEndpoint('Logout', 'POST', '/api/auth/logout', null, [200, 401]);
      testEndpoint('Delete Account', 'DELETE', '/api/auth/delete-account', null, [200, 401, 404]);
      testEndpoint('Forgot Password', 'POST', '/api/auth/forgot-password', {
        email: 'test@example.com'
      }, [200, 400]);
      testEndpoint('Reset Password', 'POST', '/api/auth/reset-password', {
        token: 'invalid_token',
        password: 'NewPass123!'
      }, [400]);
      testEndpoint('Confirm Email', 'GET', '/api/auth/confirm-email?token=invalid', null, [400, 404]);
      break;
      
    case 2:
      // User Management - All endpoints
      testEndpoint('Validate Username', 'GET', '/api/users/validate?username=testuser', null, [200, 400, 401]);
      testEndpoint('Get User by ID', 'GET', '/api/users/1', null, [200, 401, 404]);
      testEndpoint('Get User Stats', 'GET', '/api/users/stats', null, [200, 401]);
      testEndpoint('Get User Stats by ID', 'GET', '/api/users/1/stats', null, [200, 401, 404]);
      testEndpoint('Update Profile', 'PUT', '/api/users/profile', { name: 'Updated Name' }, [200, 401]);
      testEndpoint('Change Password', 'PUT', '/api/users/password', {
        currentPassword: 'old',
        newPassword: 'new'
      }, [200, 400, 401]);
      testEndpoint('Upload Avatar', 'POST', '/api/users/avatar', {
        avatar: 'https://example.com/avatar.png'
      }, [200, 400, 401]);
      break;
      
    case 3:
      // Trip Management - List/Create
      testEndpoint('List Trips', 'GET', '/api/trips', null, [200, 401]);
      testEndpoint('Create Trip', 'POST', '/api/trips', {
        name: 'Spike Test Trip',
        description: 'Test',
        startDate: '2024-06-01',
        endDate: '2024-06-10'
      }, [200, 201, 400, 401]);
      testEndpoint('Get Trip by ID', 'GET', '/api/trips/1', null, [200, 401, 404]);
      testEndpoint('Get Pending RSVPs', 'GET', '/api/trips/rsvp/pending', null, [200, 401]);
      testEndpoint('Get Pending Memberships', 'GET', '/api/trips/memberships/pending', null, [200, 401]);
      testEndpoint('Check Member', 'GET', '/api/trips/1/check-member?username=testuser', null, [200, 400, 404]);
      break;
      
    case 4:
      // Trip Management - Updates/Other
      testEndpoint('Update Trip', 'PUT', '/api/trips/1', { name: 'Updated' }, [200, 400, 401, 404]);
      testEndpoint('Update Trip Admin Settings', 'PATCH', '/api/trips/1/admin-settings', {
        requirePayment: true
      }, [200, 400, 401, 404]);
      testEndpoint('Delete Trip', 'DELETE', '/api/trips/1', null, [200, 401, 404]);
      testEndpoint('Get Past Companions', 'GET', '/api/trips/1/past-companions', null, [200, 401, 404]);
      testEndpoint('Update Trip Image', 'PUT', '/api/trips/1/image', {
        imageUrl: 'https://example.com/image.jpg'
      }, [200, 400, 401, 404]);
      testEndpoint('Delete Trip Image', 'DELETE', '/api/trips/1/image', null, [200, 401, 404]);
      testEndpoint('Upload Trip Image', 'POST', '/api/trips/1/upload-image', {
        image: 'base64encodedimage'
      }, [200, 400, 401, 404]);
      break;
      
    case 5:
      // Member Management - All endpoints
      testEndpoint('Get Trip Members', 'GET', '/api/trips/1/members', null, [200, 401, 404]);
      testEndpoint('Add Member', 'POST', '/api/trips/1/members', { username: 'newmember' }, [200, 201, 400, 401, 404]);
      testEndpoint('Update Member', 'PUT', '/api/trips/1/members/2', { isAdmin: false }, [200, 400, 401, 404]);
      testEndpoint('Remove Member', 'DELETE', '/api/trips/1/members/2', null, [200, 401, 404]);
      testEndpoint('Check Removal Eligibility', 'GET', '/api/trips/1/members/2/removal-eligibility', null, [200, 401, 404]);
      testEndpoint('Update Member RSVP', 'PUT', '/api/trips/1/members/2/rsvp', {
        rsvpStatus: 'confirmed'
      }, [200, 400, 401, 404]);
      testEndpoint('Request Payment', 'POST', '/api/trips/1/members/2/payment', {
        amount: 100,
        description: 'Test payment'
      }, [200, 400, 401, 404]);
      testEndpoint('Confirm Payment', 'POST', '/api/trips/1/members/2/confirm-payment', {
        paymentId: 1
      }, [200, 400, 401, 404]);
      testEndpoint('Reject Payment', 'POST', '/api/trips/1/members/2/reject-payment', null, [200, 400, 401, 404]);
      testEndpoint('Update Member Admin', 'PATCH', '/api/trips/1/members/2/admin', {
        isAdmin: true
      }, [200, 400, 401, 404]);
      testEndpoint('Leave Trip', 'POST', '/api/trips/1/leave', null, [200, 400, 401, 404]);
      break;
      
    case 6:
      // Activity Management - All endpoints
      testEndpoint('Get Activities Preview', 'GET', '/api/trips/1/activities/preview', null, [200, 404]);
      testEndpoint('Get Trip Activities', 'GET', '/api/trips/1/activities', null, [200, 401, 404]);
      testEndpoint('Get All Activities', 'GET', '/api/activities', null, [200, 401]);
      testEndpoint('Get Activity by ID', 'GET', '/api/activities/1', null, [200, 401, 404]);
      testEndpoint('Create Activity', 'POST', '/api/trips/1/activities', {
        name: 'Test Activity',
        date: '2024-06-05',
        time: '10:00',
        type: 'restaurant'
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Update Activity', 'PUT', '/api/activities/1', { name: 'Updated Activity' }, [200, 400, 401, 404]);
      testEndpoint('Delete Activity', 'DELETE', '/api/activities/1', null, [200, 401, 404]);
      testEndpoint('Transfer Activity Ownership', 'PUT', '/api/activities/1/transfer-ownership', {
        newOwnerId: 2
      }, [200, 400, 401, 404]);
      testEndpoint('RSVP to Activity', 'POST', '/api/activities/1/rsvp', {
        status: 'confirmed'
      }, [200, 400, 401, 404]);
      break;
      
    case 7:
      // Expense Management - All endpoints
      testEndpoint('Get Trip Expenses', 'GET', '/api/trips/1/expenses', null, [200, 401, 404]);
      testEndpoint('Get Expense Summary', 'GET', '/api/trips/1/expenses/summary', null, [200, 401, 404]);
      testEndpoint('Get Expense Balances', 'GET', '/api/trips/1/expenses/balances', null, [200, 401, 404]);
      testEndpoint('Get Expense by ID', 'GET', '/api/expenses/1', null, [200, 401, 404]);
      testEndpoint('Create Expense', 'POST', '/api/trips/1/expenses', {
        description: 'Test Expense',
        amount: 50.00,
        payerId: 1,
        splits: [{ userId: 1, amount: 25 }, { userId: 2, amount: 25 }]
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Update Expense', 'PUT', '/api/expenses/1', {
        description: 'Updated Expense',
        amount: 60.00
      }, [200, 400, 401, 404]);
      testEndpoint('Delete Expense', 'DELETE', '/api/expenses/1', null, [200, 401, 404]);
      break;
      
    case 9:
      // Settlement System - All endpoints
      testEndpoint('Get Trip Settlements', 'GET', '/api/trips/1/settlements', null, [200, 401, 404]);
      testEndpoint('Initiate Settlement', 'POST', '/api/trips/1/settlements/initiate', {
        payerId: 1,
        payeeId: 2,
        amount: 25.00
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Get Settlement Options', 'GET', '/api/trips/1/settlement-options/2', null, [200, 401, 404]);
      testEndpoint('Get Optimized Settlements', 'GET', '/api/settlements/1/optimized', null, [200, 401, 404]);
      testEndpoint('Get User Recommendations', 'GET', '/api/settlements/1/user-recommendations/2', null, [200, 401, 404]);
      testEndpoint('Confirm Settlement', 'POST', '/api/settlements/1/confirm', null, [200, 400, 401, 404]);
      testEndpoint('Reject Settlement', 'POST', '/api/settlements/1/reject', null, [200, 400, 401, 404]);
      testEndpoint('Get Pending Settlements', 'GET', '/api/settlements/pending', null, [200, 401]);
      break;
      
    case 10:
      // Communication - All endpoints
      testEndpoint('Get Trip Messages', 'GET', '/api/trips/1/messages', null, [200, 401, 404]);
      testEndpoint('Send Message', 'POST', '/api/trips/1/messages', {
        text: 'Spike test message',
        images: []
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Get All Messages', 'GET', '/api/messages', null, [200, 401]);
      break;
      
    case 11:
      // Polls & Surveys - All endpoints
      testEndpoint('Get Trip Polls', 'GET', '/api/trips/1/polls', null, [200, 401, 404]);
      testEndpoint('Create Poll', 'POST', '/api/trips/1/polls', {
        question: 'Where should we eat?',
        options: ['Option 1', 'Option 2']
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Vote on Poll', 'POST', '/api/polls/1/vote', { optionId: 1 }, [200, 400, 401, 404]);
      testEndpoint('Remove Vote', 'DELETE', '/api/polls/1/votes/1', null, [200, 401, 404]);
      testEndpoint('Get Survey', 'GET', '/api/trips/1/survey', null, [200, 401, 404]);
      testEndpoint('Create Survey', 'POST', '/api/trips/1/survey', {
        questions: [{ question: 'Test question', type: 'text' }]
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Respond to Survey', 'POST', '/api/survey/1/respond', {
        responses: [{ questionId: 1, answer: 'Test answer' }]
      }, [200, 400, 401, 404]);
      break;
      
    case 12:
      // Flight Management - All endpoints
      testEndpoint('Get Trip Flights', 'GET', '/api/trips/1/flights', null, [200, 401, 404]);
      testEndpoint('Add Flight', 'POST', '/api/trips/1/flights', {
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        departureDate: '2024-06-01',
        arrivalDate: '2024-06-01'
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Search Flights', 'GET', '/api/flights/search?origin=JFK&destination=LAX&date=2024-06-01', null, [200, 400, 401]);
      testEndpoint('Update Flight', 'PUT', '/api/flights/1', {
        departureDate: '2024-06-02'
      }, [200, 400, 401, 404]);
      testEndpoint('Delete Flight', 'DELETE', '/api/flights/1', null, [200, 401, 404]);
      break;
      
    case 13:
      // Notifications - All endpoints
      testEndpoint('Get Notifications', 'GET', '/api/notifications', null, [200, 401]);
      testEndpoint('Create Notification', 'POST', '/api/notifications', {
        type: 'trip_update',
        message: 'Test notification',
        tripId: 1
      }, [200, 201, 400, 401]);
      testEndpoint('Mark Notification Read', 'PUT', '/api/notifications/1/read', null, [200, 401, 404]);
      break;
      
    case 14:
      // Invitations - All endpoints
      testEndpoint('Create Invitation', 'POST', '/api/trips/1/invite', {
        expiresAt: '2024-12-31',
        maxUses: 10
      }, [200, 201, 400, 401, 404]);
      testEndpoint('Get Trip Invites', 'GET', '/api/trips/1/invites', null, [200, 401, 404]);
      testEndpoint('Get Invite by Token', 'GET', '/api/invite/invalid_token', null, [200, 400, 404]);
      testEndpoint('Accept Invitation', 'POST', '/api/invite/invalid_token/accept', null, [200, 400, 401, 404]);
      testEndpoint('Join Trip', 'POST', '/api/trips/1/join', null, [200, 400, 401, 404]);
      break;
      
    case 15:
      // Google Places - All endpoints
      testEndpoint('Places Autocomplete', 'GET', '/api/places/autocomplete?input=New%20York', null, [200, 400]);
      testEndpoint('Place Details', 'GET', '/api/places/details?placeId=invalid_place_id', null, [200, 400, 404]);
      break;
      
    case 16:
      // Airport Recommendations - All endpoints
      testEndpoint('Airport Recommendations', 'POST', '/api/airport-recommendations', {
        userLocation: { latitude: 40.7128, longitude: -74.0060 },
        destination: { latitude: 34.0522, longitude: -118.2437 },
        maxResults: 5
      }, [200, 400, 401]);
      testEndpoint('Nearby Airports', 'GET', '/api/airports/nearby?lat=40.7128&lng=-74.0060&radius=200', null, [200, 400, 401]);
      testEndpoint('Airport by Place ID', 'GET', '/api/airports/invalid_place_id', null, [200, 400, 401, 404]);
      testEndpoint('Airport Service Status', 'GET', '/api/airport-recommendations/status', null, [200]);
      testEndpoint('Airport Debug', 'GET', '/api/airports/debug?lat=40.7128&lng=-74.0060&radius=100', null, [200, 400, 401]);
      break;
      
    case 17:
      // Budget, Contact, and Admin - All endpoints
      testEndpoint('Budget Dashboard', 'GET', '/api/budget/dashboard', null, [200, 401]);
      testEndpoint('Contact Form', 'POST', '/api/contact', {
        firstName: `Spike${__VU}`,
        lastName: `Test${__ITER}`,
        email: `spike_${__VU}_${__ITER}@example.com`,
        subject: 'Spike Test',
        message: 'Spike test message'
      }, [200, 201, 400]);
      testEndpoint('Migrate Images', 'POST', '/api/admin/migrate-images', {
        tripId: 1
      }, [200, 400, 401, 403, 404]);
      break;
  }
  
  sleep(0.1); // Minimal delay between endpoint groups
}

/**
 * Setup function
 */
export function setup() {
  console.log('\n💥 Starting COMPREHENSIVE SPIKE TEST with 2000 Virtual Users');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('⚠️  EXTREME WARNING: This test uses 2000 concurrent users!');
  console.log('📊 Testing ALL ~109 API endpoints under spike load');
  console.log('📊 Test Pattern:');
  console.log('   - Baseline: 10 users (1 min)');
  console.log('   - SPIKE 1: Jump to 2000 users (1 min)');
  console.log('   - Recovery: Drop to 10 users (1 min)');
  console.log('   - SPIKE 2: Jump to 2000 users (1 min)');
  console.log('   - Recovery: Drop to 10 users (1 min)');
  console.log('   - SPIKE 3: Jump to 2000 users (1 min)');
  console.log('   - Final recovery');
  console.log('='.repeat(60));
  console.log('🚨 This will create EXTREME load on your server!');
  console.log('🚨 All ~109 endpoints will be tested during spikes!');
  console.log('🚨 Monitor Railway dashboard closely!');
  console.log('🚨 Press Ctrl+C to stop if needed!');
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
  console.log('\n✅ Comprehensive spike test completed!');
  console.log('📊 All ~109 endpoints were tested under spike load');
  console.log('📊 Review the metrics to see:');
  console.log('   - How did the system handle sudden spikes?');
  console.log('   - Did response times spike dramatically?');
  console.log('   - Did the system recover between spikes?');
  console.log('   - Which endpoints struggled most during spikes?');
  console.log('   - At what point did performance degrade?');
}

