# Postman Testing Guide for Navigator API

This guide helps you test all Navigator API endpoints using Postman before running automated k6 tests.

## Why Test with Postman First?

- **Interactive Testing:** See responses immediately
- **Easy Authentication:** Test login and session handling
- **Explore Endpoints:** Understand request/response formats
- **Debug Issues:** Identify problems before automation
- **Documentation:** Create a Postman collection for your team

---

## Setup

### 1. Import Environment Variables

Create a Postman environment with these variables:

| Variable | Initial Value | Current Value | Description |
|----------|---------------|---------------|-------------|
| `base_url` | `https://api.navigatortrips.com` | `https://api.navigatortrips.com` | Base API URL |
| `api_base` | `{{base_url}}/api` | `{{base_url}}/api` | Full API base path |
| `session_cookie` | (empty) | (auto-filled) | Session cookie from login |
| `user_id` | (empty) | (auto-filled) | Current user ID |
| `trip_id` | (empty) | (set manually) | Test trip ID |
| `activity_id` | (empty) | (set manually) | Test activity ID |
| `expense_id` | (empty) | (set manually) | Test expense ID |

### 2. Create Environment

1. Click **Environments** in Postman sidebar
2. Click **+** to create new environment
3. Name it "Navigator Production" or "Navigator Local"
4. Add all variables above
5. Save and select it

---

## Testing Flow

### Step 1: Test Public Endpoints (No Auth Required)

Start with endpoints that don't require authentication:

#### Health Check
```
GET {{api_base}}/health
```
**Expected:** 200 OK with server status

#### Ping
```
GET {{api_base}}/ping
```
**Expected:** 200 OK with `{ message: 'pong', timestamp: ... }`

#### Contact Form
```
POST {{api_base}}/contact
Body (JSON):
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "subject": "Test Subject",
  "message": "Test message"
}
```
**Expected:** 200/201 OK

#### Validate Username
```
GET {{api_base}}/users/validate?username=testuser
```
**Expected:** 200 OK with validation result

---

### Step 2: Authentication Setup

#### Register User (if needed)
```
POST {{api_base}}/auth/register
Body (JSON):
{
  "username": "testuser_unique",
  "email": "test_unique@example.com",
  "password": "TestPass123!",
  "name": "Test User"
}
```
**Expected:** 200/201 OK with user object

#### Login
```
POST {{api_base}}/auth/login
Body (JSON):
{
  "username": "your_username",
  "password": "your_password"
}
```
**OR**
```
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

**Important:** After successful login:
1. Go to **Tests** tab in Postman
2. Add this script to save session cookie:
```javascript
// Save session cookie
const cookies = pm.response.headers.get("Set-Cookie");
if (cookies) {
    // Extract session cookie value
    const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
    if (sessionMatch) {
        pm.environment.set("session_cookie", `connect.sid=${sessionMatch[1]}`);
        console.log("Session cookie saved");
    }
}

// Save user ID
const response = pm.response.json();
if (response.user && response.user.id) {
    pm.environment.set("user_id", response.user.id);
}
```

**Expected:** 200 OK with user object and token

#### Get Current User (verify auth works)
```
GET {{api_base}}/auth/me
Headers:
Cookie: {{session_cookie}}
```
**Expected:** 200 OK with current user

---

### Step 3: Test Authenticated Endpoints

Once authenticated, test protected endpoints. Add the session cookie to headers:

**For all authenticated requests, add to Headers:**
```
Cookie: {{session_cookie}}
```

#### User Management
```
GET {{api_base}}/users/{{user_id}}
GET {{api_base}}/users/stats
PUT {{api_base}}/users/profile
Body: { "name": "Updated Name" }
```

#### Trip Management
```
GET {{api_base}}/trips
POST {{api_base}}/trips
Body: {
  "name": "Test Trip",
  "description": "Test Description",
  "startDate": "2024-06-01",
  "endDate": "2024-06-10"
}

GET {{api_base}}/trips/{{trip_id}}
PUT {{api_base}}/trips/{{trip_id}}
DELETE {{api_base}}/trips/{{trip_id}}
```

**Save Trip ID:** After creating a trip, add to **Tests** tab:
```javascript
const response = pm.response.json();
if (response.id) {
    pm.environment.set("trip_id", response.id);
}
```

#### Member Management
```
GET {{api_base}}/trips/{{trip_id}}/members
POST {{api_base}}/trips/{{trip_id}}/members
Body: { "username": "newmember" }

PUT {{api_base}}/trips/{{trip_id}}/members/{{user_id}}/rsvp
Body: { "rsvpStatus": "confirmed" }
```

#### Activities
```
GET {{api_base}}/trips/{{trip_id}}/activities
POST {{api_base}}/trips/{{trip_id}}/activities
Body: {
  "name": "Test Activity",
  "date": "2024-06-05",
  "time": "10:00",
  "type": "restaurant"
}
```

#### Expenses
```
GET {{api_base}}/trips/{{trip_id}}/expenses
POST {{api_base}}/trips/{{trip_id}}/expenses
Body: {
  "description": "Test Expense",
  "amount": 50.00,
  "payerId": {{user_id}},
  "splits": [
    { "userId": {{user_id}}, "amount": 25 }
  ]
}
```

---

## Postman Collection Structure

Organize your collection like this:

```
Navigator API Collection
├── 1. System & Health
│   ├── Health Check
│   ├── Ping
│   └── Test Endpoint
├── 2. Authentication
│   ├── Register
│   ├── Login ⭐ (save session cookie here)
│   ├── Logout
│   ├── Get Current User
│   ├── Forgot Password
│   └── Reset Password
├── 3. User Management
│   ├── Validate Username
│   ├── Get User Profile
│   ├── Update Profile
│   └── Change Password
├── 4. Trip Management
│   ├── List Trips
│   ├── Create Trip ⭐ (save trip_id here)
│   ├── Get Trip Details
│   ├── Update Trip
│   └── Delete Trip
├── 5. Member Management
│   ├── Get Members
│   ├── Add Member
│   └── Update RSVP
├── 6. Activities
│   ├── List Activities
│   ├── Create Activity ⭐ (save activity_id here)
│   └── RSVP to Activity
├── 7. Expenses
│   ├── List Expenses
│   ├── Create Expense ⭐ (save expense_id here)
│   └── Get Balances
└── 8. More Categories...
    └── (Continue with all endpoint categories)
```

---

## Useful Postman Scripts

### Auto-Save Session Cookie (add to Login request Tests tab)
```javascript
const cookies = pm.response.headers.get("Set-Cookie");
if (cookies) {
    const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
    if (sessionMatch) {
        pm.environment.set("session_cookie", `connect.sid=${sessionMatch[1]}`);
        console.log("✅ Session cookie saved");
    }
}
```

### Auto-Save IDs (add to Create requests Tests tab)
```javascript
const response = pm.response.json();
if (response.id) {
    const resourceType = pm.info.requestName.toLowerCase();
    if (resourceType.includes('trip')) {
        pm.environment.set("trip_id", response.id);
        console.log("✅ Trip ID saved:", response.id);
    } else if (resourceType.includes('activity')) {
        pm.environment.set("activity_id", response.id);
        console.log("✅ Activity ID saved:", response.id);
    } else if (resourceType.includes('expense')) {
        pm.environment.set("expense_id", response.id);
        console.log("✅ Expense ID saved:", response.id);
    }
}
```

### Check Authentication (add to protected endpoints Tests tab)
```javascript
if (pm.response.code === 401) {
    console.log("❌ Authentication failed - check session cookie");
    pm.environment.unset("session_cookie");
}
```

---

## Testing Checklist

Use this checklist to ensure you test all endpoints:

### ✅ Public Endpoints
- [ ] Health check
- [ ] Ping
- [ ] Contact form
- [ ] Validate username
- [ ] Register
- [ ] Login
- [ ] Forgot password
- [ ] Reset password
- [ ] Confirm email
- [ ] Google OAuth init
- [ ] Get invite by token

### ✅ Authenticated Endpoints
- [ ] Get current user
- [ ] Get user profile
- [ ] Update profile
- [ ] Change password
- [ ] Upload avatar
- [ ] List trips
- [ ] Create trip
- [ ] Get trip details
- [ ] Update trip
- [ ] Delete trip
- [ ] Get trip members
- [ ] Add member
- [ ] Update member RSVP
- [ ] Get activities
- [ ] Create activity
- [ ] Update activity
- [ ] RSVP to activity
- [ ] Get expenses
- [ ] Create expense
- [ ] Get balances
- [ ] Get settlements
- [ ] Initiate settlement
- [ ] Get messages
- [ ] Send message
- [ ] Get polls
- [ ] Create poll
- [ ] Vote on poll
- [ ] Get notifications
- [ ] Create invitation
- [ ] Accept invitation
- [ ] Get flights
- [ ] Add flight
- [ ] Search flights
- [ ] Budget dashboard

---

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** 
- Make sure you've logged in first
- Check that session cookie is set in environment
- Add `Cookie: {{session_cookie}}` to request headers

### Issue: 404 Not Found
**Solution:**
- Verify the endpoint path matches documentation
- Check that IDs exist (trip_id, activity_id, etc.)
- Ensure you're using the correct HTTP method

### Issue: 400 Bad Request
**Solution:**
- Check request body format (must be valid JSON)
- Verify required fields are included
- Check data types match expected format

### Issue: Session Expired
**Solution:**
- Re-run the Login request to get a new session cookie
- Session cookies typically last 24 hours

---

## Export for Team Sharing

1. Click **...** on your collection
2. Select **Export**
3. Choose **Collection v2.1**
4. Save as `Navigator_API.postman_collection.json`
5. Share with your team!

You can also export your environment:
1. Click **...** on your environment
2. Select **Export**
3. Save as `Navigator_Environment.postman_environment.json`
4. **Note:** Remove sensitive values before sharing!

---

## Next Steps

After testing in Postman:

1. ✅ Verify all endpoints work as expected
2. ✅ Note any issues or unexpected responses
3. ✅ Document required IDs and test data
4. ✅ Run comprehensive k6 test: `npm run test:all-apis:k6`
5. ✅ Compare Postman results with k6 results

---

## Reference

- Complete API documentation: `API_ENDPOINTS_COMPLETE.md`
- k6 testing guide: `K6_TESTING_GUIDE.md`
- Production base URL: `https://api.navigatortrips.com`

---

**Happy Testing! 🚀**

