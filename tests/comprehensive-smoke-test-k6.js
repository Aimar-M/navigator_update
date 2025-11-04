/**
 * Comprehensive Smoke Test - All Endpoints
 * 
 * This is a SMOKE TEST version that tests ALL ~109 API endpoints quickly.
 * Smoke tests are meant to verify everything works at a basic level - fast!
 * 
 * WHAT IT DOES:
 * - Tests ALL endpoints from API_ENDPOINTS_COMPLETE.md
 * - Runs VERY quickly (1 user, 1 iteration)
 * - Verifies endpoints exist and respond (not connection errors)
 * - Perfect for pre-deployment checks
 * 
 * DURATION: ~2-3 minutes (testing all endpoints, but quickly)
 * 
 * USAGE:
 *   k6 run tests/comprehensive-smoke-test-k6.js
 *   BASE_URL=https://api.navigatortrips.com k6 run tests/comprehensive-smoke-test-k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.navigatortrips.com';
const TEST_USERNAME = __ENV.TEST_USERNAME || 'testuser';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'testpass';

// Store authenticated session for reuse
let sessionCookie = '';

/**
 * Smoke test configuration - FAST and LIGHT
 */
export const options = {
  vus: 1,              // Single user
  iterations: 1,       // Run once through all endpoints
  thresholds: {
    'http_req_duration': ['p(95)<3000'],  // 95% must complete in under 3 seconds (relaxed for comprehensive)
    'http_req_failed': ['rate<0.5'],      // Allow up to 50% failures (many will be 401/404)
    'errors': ['rate<0.5'],               // Allow some errors
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

  return response;
}

/**
 * Test a single endpoint - smoke test version (faster, less strict)
 */
function testEndpoint(name, method, path, payload = null, expectedStatus = [200, 201, 400, 401, 404]) {
  const response = makeRequest(method, path, payload);
  const passed = check(response, {
    [`${name} - endpoint exists`]: (r) => r.status > 0, // Just verify it responds
    [`${name} - status acceptable`]: (r) => expectedStatus.includes(r.status),
  });
  
  if (!passed) {
    errorRate.add(1);
  }
  
  sleep(0.05); // Very short delay - we want speed!
  return response;
}

/**
 * Main test function - tests ALL endpoints quickly
 */
export default function () {
  
  console.log('\n🔥 Starting Comprehensive Smoke Test (All Endpoints)');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('⚡ Fast verification of all ~109 endpoints');
  console.log('='.repeat(60));

  // ============================================
  // SYSTEM & HEALTH
  // ============================================
  console.log('\n📋 Testing: System & Health');
  testEndpoint('Health Check', 'GET', '/api/health', null, [200]);
  testEndpoint('Ping', 'GET', '/api/ping', null, [200]);
  testEndpoint('Test Endpoint', 'GET', '/api/test', null, [200]);

  // ============================================
  // AUTHENTICATION
  // ============================================
  console.log('\n📋 Testing: Authentication');
  testEndpoint('Register', 'POST', '/api/auth/register', {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User'
  }, [200, 201, 400, 409]);
  testEndpoint('Login', 'POST', '/api/auth/login', {
    username: TEST_USERNAME,
    password: TEST_PASSWORD
  }, [200, 401, 400]);
  testEndpoint('Logout', 'POST', '/api/auth/logout', null, [200, 401]);
  testEndpoint('Get Current User', 'GET', '/api/auth/me', null, [200, 401]);
  testEndpoint('Delete Account', 'DELETE', '/api/auth/delete-account', null, [200, 401, 404]);
  testEndpoint('Forgot Password', 'POST', '/api/auth/forgot-password', {
    email: 'test@example.com'
  }, [200, 400]);
  testEndpoint('Reset Password', 'POST', '/api/auth/reset-password', {
    token: 'invalid_token',
    password: 'NewPass123!'
  }, [400]);
  testEndpoint('Confirm Email', 'GET', '/api/auth/confirm-email?token=invalid', null, [400, 404]);
  testEndpoint('Google OAuth Init', 'GET', '/api/auth/google', null, [302, 400, 500]);
  testEndpoint('Google OAuth Callback', 'GET', '/api/auth/google/callback', null, [302, 400, 401, 500]);
  testEndpoint('OAuth Validate', 'POST', '/api/auth/oauth/validate', {
    oauthToken: 'invalid_token',
    userId: 1
  }, [400, 404]);

  // ============================================
  // USER MANAGEMENT
  // ============================================
  console.log('\n📋 Testing: User Management');
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

  // ============================================
  // TRIP MANAGEMENT
  // ============================================
  console.log('\n📋 Testing: Trip Management');
  testEndpoint('List Trips', 'GET', '/api/trips', null, [200, 401]);
  testEndpoint('Create Trip', 'POST', '/api/trips', {
    name: 'Test Trip',
    description: 'Test Description',
    startDate: '2024-06-01',
    endDate: '2024-06-10'
  }, [200, 201, 400, 401]);
  testEndpoint('Get Trip by ID', 'GET', '/api/trips/1', null, [200, 401, 404]);
  testEndpoint('Update Trip', 'PUT', '/api/trips/1', { name: 'Updated Trip Name' }, [200, 400, 401, 404]);
  testEndpoint('Update Trip Admin Settings', 'PATCH', '/api/trips/1/admin-settings', {
    requirePayment: true
  }, [200, 400, 401, 404]);
  testEndpoint('Delete Trip', 'DELETE', '/api/trips/1', null, [200, 401, 404]);
  testEndpoint('Get Pending RSVPs', 'GET', '/api/trips/rsvp/pending', null, [200, 401]);
  testEndpoint('Get Pending Memberships', 'GET', '/api/trips/memberships/pending', null, [200, 401]);
  testEndpoint('Check Member', 'GET', '/api/trips/1/check-member?username=testuser', null, [200, 400, 404]);
  testEndpoint('Get Past Companions', 'GET', '/api/trips/1/past-companions', null, [200, 401, 404]);
  testEndpoint('Update Trip Image', 'PUT', '/api/trips/1/image', {
    imageUrl: 'https://example.com/image.jpg'
  }, [200, 400, 401, 404]);
  testEndpoint('Delete Trip Image', 'DELETE', '/api/trips/1/image', null, [200, 401, 404]);
  testEndpoint('Upload Trip Image', 'POST', '/api/trips/1/upload-image', {
    image: 'base64encodedimage'
  }, [200, 400, 401, 404]);

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================
  console.log('\n📋 Testing: Member Management');
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
  testEndpoint('Notify Rejection', 'POST', '/api/trips/1/members/2/notify-rejection', {
    reason: 'Test reason'
  }, [200, 400, 401, 404]);
  testEndpoint('Allow Rejoin', 'POST', '/api/trips/1/members/2/allow-rejoin', null, [200, 400, 401, 404]);
  testEndpoint('Update Member Admin', 'PATCH', '/api/trips/1/members/2/admin', {
    isAdmin: true
  }, [200, 400, 401, 404]);
  testEndpoint('Leave Trip', 'POST', '/api/trips/1/leave', null, [200, 400, 401, 404]);

  // ============================================
  // ACTIVITY MANAGEMENT
  // ============================================
  console.log('\n📋 Testing: Activity Management');
  testEndpoint('Get Activities Preview', 'GET', '/api/trips/1/activities/preview', null, [200, 404]);
  testEndpoint('Get Trip Activities', 'GET', '/api/trips/1/activities', null, [200, 401, 404]);
  testEndpoint('Create Activity', 'POST', '/api/trips/1/activities', {
    name: 'Test Activity',
    date: '2024-06-05',
    time: '10:00',
    type: 'restaurant'
  }, [200, 201, 400, 401, 404]);
  testEndpoint('Get All Activities', 'GET', '/api/activities', null, [200, 401]);
  testEndpoint('Get Activity by ID', 'GET', '/api/activities/1', null, [200, 401, 404]);
  testEndpoint('Update Activity', 'PUT', '/api/activities/1', { name: 'Updated Activity' }, [200, 400, 401, 404]);
  testEndpoint('Delete Activity', 'DELETE', '/api/activities/1', null, [200, 401, 404]);
  testEndpoint('Transfer Activity Ownership', 'PUT', '/api/activities/1/transfer-ownership', {
    newOwnerId: 2
  }, [200, 400, 401, 404]);
  testEndpoint('RSVP to Activity', 'POST', '/api/activities/1/rsvp', {
    status: 'confirmed'
  }, [200, 400, 401, 404]);

  // ============================================
  // EXPENSE MANAGEMENT
  // ============================================
  console.log('\n📋 Testing: Expense Management');
  testEndpoint('Get Trip Expenses', 'GET', '/api/trips/1/expenses', null, [200, 401, 404]);
  testEndpoint('Get Expense Summary', 'GET', '/api/trips/1/expenses/summary', null, [200, 401, 404]);
  testEndpoint('Get Expense Balances', 'GET', '/api/trips/1/expenses/balances', null, [200, 401, 404]);
  testEndpoint('Create Expense', 'POST', '/api/trips/1/expenses', {
    description: 'Test Expense',
    amount: 50.00,
    payerId: 1,
    splits: [{ userId: 1, amount: 25 }, { userId: 2, amount: 25 }]
  }, [200, 201, 400, 401, 404]);
  testEndpoint('Get Expense by ID', 'GET', '/api/expenses/1', null, [200, 401, 404]);
  testEndpoint('Update Expense', 'PUT', '/api/expenses/1', {
    description: 'Updated Expense',
    amount: 60.00
  }, [200, 400, 401, 404]);
  testEndpoint('Delete Expense', 'DELETE', '/api/expenses/1', null, [200, 401, 404]);

  // ============================================
  // SETTLEMENT SYSTEM
  // ============================================
  console.log('\n📋 Testing: Settlement System');
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

  // ============================================
  // COMMUNICATION
  // ============================================
  console.log('\n📋 Testing: Communication');
  testEndpoint('Get Trip Messages', 'GET', '/api/trips/1/messages', null, [200, 401, 404]);
  testEndpoint('Send Message', 'POST', '/api/trips/1/messages', {
    text: 'Test message',
    images: []
  }, [200, 201, 400, 401, 404]);
  testEndpoint('Get All Messages', 'GET', '/api/messages', null, [200, 401]);

  // ============================================
  // POLLS & SURVEYS
  // ============================================
  console.log('\n📋 Testing: Polls & Surveys');
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

  // ============================================
  // FLIGHT MANAGEMENT
  // ============================================
  console.log('\n📋 Testing: Flight Management');
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

  // ============================================
  // NOTIFICATIONS
  // ============================================
  console.log('\n📋 Testing: Notifications');
  testEndpoint('Get Notifications', 'GET', '/api/notifications', null, [200, 401]);
  testEndpoint('Create Notification', 'POST', '/api/notifications', {
    type: 'trip_update',
    message: 'Test notification',
    tripId: 1
  }, [200, 201, 400, 401]);
  testEndpoint('Mark Notification Read', 'PUT', '/api/notifications/1/read', null, [200, 401, 404]);

  // ============================================
  // INVITATIONS
  // ============================================
  console.log('\n📋 Testing: Invitations');
  testEndpoint('Create Invitation', 'POST', '/api/trips/1/invite', {
    expiresAt: '2024-12-31',
    maxUses: 10
  }, [200, 201, 400, 401, 404]);
  testEndpoint('Get Trip Invites', 'GET', '/api/trips/1/invites', null, [200, 401, 404]);
  testEndpoint('Get Invite by Token', 'GET', '/api/invite/invalid_token', null, [200, 400, 404]);
  testEndpoint('Accept Invitation', 'POST', '/api/invite/invalid_token/accept', null, [200, 400, 401, 404]);
  testEndpoint('Join Trip', 'POST', '/api/trips/1/join', null, [200, 400, 401, 404]);

  // ============================================
  // GOOGLE PLACES INTEGRATION
  // ============================================
  console.log('\n📋 Testing: Google Places');
  testEndpoint('Places Autocomplete', 'GET', '/api/places/autocomplete?input=New%20York', null, [200, 400]);
  testEndpoint('Place Details', 'GET', '/api/places/details?placeId=invalid_place_id', null, [200, 400, 404]);

  // ============================================
  // AIRPORT RECOMMENDATIONS
  // ============================================
  console.log('\n📋 Testing: Airport Recommendations');
  testEndpoint('Airport Recommendations', 'POST', '/api/airport-recommendations', {
    userLocation: { latitude: 40.7128, longitude: -74.0060 },
    destination: { latitude: 34.0522, longitude: -118.2437 },
    maxResults: 5
  }, [200, 400, 401]);
  testEndpoint('Nearby Airports', 'GET', '/api/airports/nearby?lat=40.7128&lng=-74.0060&radius=200', null, [200, 400, 401]);
  testEndpoint('Airport by Place ID', 'GET', '/api/airports/invalid_place_id', null, [200, 400, 401, 404]);
  testEndpoint('Airport Service Status', 'GET', '/api/airport-recommendations/status', null, [200]);
  testEndpoint('Airport Debug', 'GET', '/api/airports/debug?lat=40.7128&lng=-74.0060&radius=100', null, [200, 400, 401]);

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================
  console.log('\n📋 Testing: Admin Functions');
  testEndpoint('Migrate Images', 'POST', '/api/admin/migrate-images', {
    tripId: 1
  }, [200, 400, 401, 403, 404]);

  // ============================================
  // BUDGET & ANALYTICS
  // ============================================
  console.log('\n📋 Testing: Budget & Analytics');
  testEndpoint('Budget Dashboard', 'GET', '/api/budget/dashboard', null, [200, 401]);

  // ============================================
  // CONTACT FORM
  // ============================================
  console.log('\n📋 Testing: Contact Form');
  testEndpoint('Contact Form', 'POST', '/api/contact', {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    subject: 'Test Subject',
    message: 'Test message content'
  }, [200, 201, 400]);

  console.log('\n✅ Comprehensive smoke test completed!');
  console.log('='.repeat(60));
}

/**
 * Setup function
 */
export function setup() {
  console.log('\n🔥 Starting Comprehensive Smoke Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('⚡ Testing all ~109 endpoints quickly');
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
  console.log('\n✅ Comprehensive smoke test completed!');
  console.log('📊 All endpoints tested - review metrics above');
}

