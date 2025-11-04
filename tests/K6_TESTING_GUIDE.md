# Complete K6 Testing Guide for Navigator

This guide provides comprehensive documentation for running k6 performance tests on the Navigator API. Everything you need to know as a beginner!

## Table of Contents

1. [What is K6?](#what-is-k6)
2. [Installation](#installation)
3. [Types of Tests](#types-of-tests)
4. [API Endpoints Being Tested](#api-endpoints-being-tested)
5. [Running Tests](#running-tests)
6. [Understanding Results](#understanding-results)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## What is K6?

**K6** is a modern, open-source load testing tool designed for developers. It:
- Uses JavaScript (so you can read and modify the test scripts)
- Provides detailed performance metrics
- Runs from the command line
- Is built by Grafana Labs (trusted in the industry)

**Why we use it:** It gives us detailed insights into how our API performs under different conditions, helping us find problems before real users do.

---

## Installation

### Windows (PowerShell)

If you have Chocolatey:
```powershell
choco install k6
```

If you don't have Chocolatey, download from:
https://k6.io/docs/getting-started/installation/

### Mac

```bash
brew install k6
```

### Linux

See the official guide: https://k6.io/docs/getting-started/installation/

### Verify Installation

```bash
k6 version
```

You should see something like: `k6 v0.xx.x`

---

## Types of Tests

We have **4 different types of tests**, each serving a different purpose:

### 1. 🔥 Smoke Test (`smoke-test-k6.js`)

**What it does:** Quick check that basic functionality works

**When to use:**
- Before deploying code
- After a deployment to verify it worked
- When you suspect something might be broken
- In CI/CD pipelines

**What it tests:**
- Server is accessible
- Critical endpoints respond correctly
- Response times are reasonable
- Error handling works

**Duration:** ~10-30 seconds

**Load:** Very light (1 user, 1 iteration)

---

### 2. 🚀 Load Test (`load-test-k6.js`)

**What it does:** Tests how your app performs under **normal expected traffic**

**When to use:**
- Before going to production
- After major code changes
- To establish performance baselines
- When planning server capacity

**What it tests:**
- Gradual increase in users
- Response times under load
- Error rates
- Throughput (requests per second)

**Duration:** ~4 minutes (adjustable)

**Load:** Moderate, realistic ramp-up (5 → 20 users)

---

### 3. 💥 Stress Test (`stress-test-k6.js`)

**What it does:** Pushes your app **beyond normal limits** to find breaking points

**When to use:**
- To find maximum capacity
- Before major launches/marketing campaigns
- To identify bottlenecks
- To test auto-scaling

**What it tests:**
- How system behaves under extreme load
- Where performance degrades
- Point of failure
- Recovery after load

**Duration:** ~8 minutes

**Load:** Aggressive (10 → 50 → 100 → 150 users)

**⚠️ Warning:** Can overwhelm your server! Monitor closely.

---

### 4. 🌊 Soak Test (`soak-test-k6.js`)

**What it does:** Runs **moderate, sustained load** for extended periods to find memory leaks

**When to use:**
- To find memory/resource leaks
- To test database connection pool stability
- To verify long-term stability
- Before production deployment

**What it tests:**
- Memory usage over time
- Database connection handling
- Gradual performance degradation
- Resource leaks

**Duration:** 30 minutes to several hours (default: 30 min)

**Load:** Moderate, sustained (20 users for extended period)

---

### 5. 📋 Comprehensive API Test (`comprehensive-api-test-k6.js`)

**What it does:** Tests **ALL ~109 API endpoints** from your API documentation

**When to use:**
- To verify all endpoints exist and respond
- After major API changes
- To ensure no endpoints were accidentally broken
- Before deploying API updates

**What it tests:**
- All documented endpoints from `API_ENDPOINTS_COMPLETE.md`
- Endpoint availability (not 404)
- Response structure
- Authentication requirements

**Duration:** ~2-5 minutes

**Load:** 1 user, runs through all endpoints once

**⚠️ Note:** Many endpoints will return 401/404 without proper authentication or test data setup. This is expected and helps verify authentication requirements.

---

## API Endpoints Being Tested

Here's a complete list of all the APIs our tests hit, what they do, and what to expect:

### Public Endpoints (No Authentication Required)

#### 1. `GET /api/health`
- **Purpose:** Health check endpoint
- **Expected Response:** 200 OK
- **Response Body:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 12345,
    "environment": "production",
    "email": {...},
    "database": "connected",
    "version": "1.0.0"
  }
  ```
- **What we test:** Status is 200, response time < 500ms
- **Used in:** All test types (most frequently hit endpoint)

#### 2. `POST /api/contact`
- **Purpose:** Contact form submission
- **Expected Response:** 200 or 201 OK
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "subject": "Question",
    "message": "Hello, I have a question..."
  }
  ```
- **What we test:** Request is accepted, response time < 1000ms
- **Used in:** Smoke, Load, Stress, Soak tests

#### 3. `GET /api/ping`
- **Purpose:** Simple ping endpoint
- **Expected Response:** 200 OK
- **Used in:** Some tests for quick connectivity check

---

### Authentication Endpoints

#### 4. `POST /api/auth/login`
- **Purpose:** User login
- **Expected Response:** 
  - 200 OK (if credentials are valid)
  - 401 Unauthorized (if credentials are invalid)
  - 400 Bad Request (if request is malformed)
  - **NOT 404** (which would mean the endpoint doesn't exist)
- **Request Body:**
  ```json
  {
    "username": "testuser",
    "password": "testpass"
  }
  ```
- **What we test:** Endpoint exists (not 404), responds quickly
- **Used in:** All test types (will return 401 in tests since we use fake credentials)

#### 5. `GET /api/auth/me`
- **Purpose:** Get current logged-in user information
- **Expected Response:** 
  - 200 OK (if authenticated)
  - 401 Unauthorized (if not authenticated - this is expected in our tests)
- **What we test:** Endpoint exists, responds quickly
- **Used in:** Load, Soak tests

#### 6. `POST /api/auth/logout`
- **Purpose:** Log out current user
- **Expected Response:** 200 OK or 401 Unauthorized
- **Used in:** Not currently tested, but available

#### 7. `POST /api/auth/register`
- **Purpose:** Register a new user
- **Expected Response:** 200/201 OK or 400 Bad Request
- **Used in:** Not currently tested (to avoid creating test accounts)

---

### Trip Management Endpoints

#### 8. `GET /api/trips`
- **Purpose:** List all trips for the current user
- **Expected Response:** 
  - 200 OK with array of trips (if authenticated)
  - 401 Unauthorized (if not authenticated - expected in our tests)
- **Response Body (when authenticated):**
  ```json
  [
    {
      "id": 1,
      "name": "Summer Trip",
      "description": "...",
      "startDate": "2024-06-01",
      "endDate": "2024-06-10",
      ...
    }
  ]
  ```
- **What we test:** Endpoint exists (not 404), responds quickly
- **Used in:** All test types

#### 9. `POST /api/trips`
- **Purpose:** Create a new trip
- **Expected Response:** 201 Created or 401 Unauthorized
- **Used in:** Not currently tested (to avoid creating test data)

#### 10. `GET /api/trips/:id`
- **Purpose:** Get details of a specific trip
- **Expected Response:** 200 OK or 401/404
- **Used in:** Not currently tested (requires valid trip ID)

---

### Other Available Endpoints (Not Currently Tested)

The following endpoints exist but aren't included in our k6 tests (to avoid creating/modifying data):

**Member Management:**
- `GET /api/trips/:id/members` - Get trip members
- `POST /api/trips/:id/members` - Add member to trip
- `DELETE /api/trips/:id/members/:userId` - Remove member

**Activity Management:**
- `GET /api/trips/:id/activities` - Get trip activities
- `POST /api/trips/:id/activities` - Create activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

**Expense Management:**
- `GET /api/trips/:id/expenses` - Get trip expenses
- `POST /api/trips/:id/expenses` - Create expense
- `GET /api/trips/:id/expenses/balances` - Get expense balances

**Communication:**
- `GET /api/trips/:id/messages` - Get chat messages
- `POST /api/trips/:id/messages` - Send message
- `GET /api/trips/:id/polls` - Get polls
- `POST /api/trips/:id/polls` - Create poll

**Settlements:**
- `GET /api/trips/:id/settlements` - Get settlements
- `POST /api/trips/:id/settlements/initiate` - Create settlement

**And many more...** See `DEVELOPER_DOCUMENTATION.md` for the full API list.

---

## Running Tests

### Prerequisites

1. **K6 installed** (see Installation section above)
2. **Server accessible** - Your production server at `https://api.navigatortrips.com` or your local server
3. **Environment variable** - Set `BASE_URL` to point to your server

### Quick Start: Production Testing

All examples below are for testing your **production server** (`https://api.navigatortrips.com`).

#### Windows PowerShell

**Smoke Test:**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:smoke:k6
```

**Load Test:**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:load:k6
```

**Stress Test:**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:stress:k6
```

**Soak Test (30 minutes):**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:soak:k6
```

**Soak Test (1 hour):**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; $env:DURATION="1h"; npm run test:soak:k6
```

#### Mac/Linux Bash

**Smoke Test:**
```bash
BASE_URL=https://api.navigatortrips.com npm run test:smoke:k6
```

**Load Test:**
```bash
BASE_URL=https://api.navigatortrips.com npm run test:load:k6
```

**Stress Test:**
```bash
BASE_URL=https://api.navigatortrips.com npm run test:stress:k6
```

**Soak Test (30 minutes):**
```bash
BASE_URL=https://api.navigatortrips.com npm run test:soak:k6
```

**Soak Test (2 hours):**
```bash
BASE_URL=https://api.navigatortrips.com DURATION=2h npm run test:soak:k6
```

**Comprehensive API Test (all endpoints):**
```bash
BASE_URL=https://api.navigatortrips.com npm run test:all-apis:k6
```

### Alternative: Direct K6 Commands

You can also run k6 directly:

**Smoke Test:**
```bash
BASE_URL=https://api.navigatortrips.com k6 run tests/smoke-test-k6.js
```

**Load Test:**
```bash
BASE_URL=https://api.navigatortrips.com k6 run tests/load-test-k6.js
```

**Stress Test:**
```bash
BASE_URL=https://api.navigatortrips.com k6 run tests/stress-test-k6.js
```

**Soak Test:**
```bash
BASE_URL=https://api.navigatortrips.com k6 run tests/soak-test-k6.js
```

### Testing Local Development Server

If you're running the server locally on `http://localhost:3000`:

**Windows PowerShell:**
```powershell
$env:BASE_URL="http://localhost:3000"; npm run test:smoke:k6
```

**Mac/Linux:**
```bash
BASE_URL=http://localhost:3000 npm run test:smoke:k6
```

### Setting Environment Variables Once (PowerShell)

To avoid typing the BASE_URL every time:

```powershell
# Set it once
$env:BASE_URL="https://api.navigatortrips.com"

# Now you can run tests without repeating it
npm run test:smoke:k6
npm run test:load:k6
npm run test:stress:k6
npm run test:soak:k6
```

---

## Understanding Results

### What You'll See During a Test

When you run a k6 test, you'll see output like this:

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: tests/smoke-test-k6.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 10m30s max duration
           ✓ default: 1 iterations for each of 1 VUs (maxDuration: 10m30s, gracefulStop: 30s)

     ✓ health check returns 200
     ✓ health check is fast (< 500ms)
     ✓ health check has status field
     ✓ contact form accepts requests
     ✓ contact form responds in time (< 1s)
     ... (more checks)

     checks.........................: 100.00% ✓ 15        ✗ 0
     data_received..................: 12 kB   2.0 kB/s
     data_sent......................: 1.7 kB  274 B/s
     http_req_blocked...............: avg=2.5ms    min=0s      med=0s      max=15ms    p(90)=10ms    p(95)=15ms
     http_req_connecting............: avg=1.2ms    min=0s      med=0s      max=8ms     p(90)=5ms     p(95)=8ms
     http_req_duration..............: avg=245ms    min=120ms   med=230ms   max=890ms   p(90)=420ms   p(95)=450ms
       { expected_response:true }...: avg=245ms    min=120ms   med=230ms   max=890ms   p(90)=420ms   p(95)=450ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 6
     http_reqs......................: 6       1.0/s
     iteration_duration.............: avg=2.5s     min=2.1s    med=2.3s    max=3.2s    p(90)=3.0s    p(95)=3.1s
     iterations.....................: 1       0.17/s
     vus............................: 1       min=1      max=1
     vus_max........................: 1       min=1      max=1
```

### Key Metrics Explained

#### Checks
- **What it means:** Percentage of checks that passed
- **Good value:** 100% (all checks passed)
- **Example:** `100.00% ✓ 15 ✗ 0` means 15 checks passed, 0 failed

#### http_req_duration
- **What it means:** How long each HTTP request took to complete
- **Important values:**
  - `avg`: Average response time
  - `p(95)`: 95th percentile (95% of requests completed in this time or faster)
  - `p(99)`: 99th percentile (99% of requests completed in this time or faster)
- **Good values:**
  - Average < 500ms for simple endpoints
  - p(95) < 2000ms
- **Bad values:**
  - Average > 2000ms
  - p(95) > 5000ms

#### http_req_failed
- **What it means:** Percentage of requests that failed
- **Good value:** < 5% (less than 5% failures)
- **Bad value:** > 10% (more than 10% failures)
- **Example:** `0.00% ✓ 0 ✗ 6` means 0% failed (0 failed, 6 succeeded)

#### http_reqs
- **What it means:** Total number of HTTP requests made
- **Also shows:** Requests per second (rate)
- **Example:** `6 1.0/s` means 6 total requests at a rate of 1 request per second

#### iterations
- **What it means:** Number of times the test function ran
- **Example:** `1 0.17/s` means 1 iteration completed

#### vus (Virtual Users)
- **What it means:** Number of simulated users
- **During ramp-up:** This number increases
- **Example:** `1 min=1 max=1` means 1 virtual user throughout

### What Good Results Look Like

#### Smoke Test Success ✅
```
checks.........................: 100.00% ✓ 15 ✗ 0
http_req_failed................: 0.00%   ✓ 0  ✗ 6
http_req_duration..............: avg=245ms p(95)=450ms
```
**Interpretation:** All checks passed, no failures, fast response times.

#### Load Test Success ✅
```
checks.........................: 98.50% ✓ 1970 ✗ 30
http_req_failed................: 2.00%   ✓ 40   ✗ 1960
http_req_duration..............: avg=420ms p(95)=1200ms
```
**Interpretation:** Mostly good, small failure rate acceptable, reasonable response times.

#### Stress Test (Expected Degradation) ⚠️
```
checks.........................: 85.00% ✓ 1700 ✗ 300
http_req_failed................: 15.00% ✓ 300  ✗ 1700
http_req_duration..............: avg=2500ms p(95)=8000ms
```
**Interpretation:** Expected degradation under extreme load. Note when failures started increasing.

### Thresholds (Pass/Fail Criteria)

Each test has **thresholds** - criteria that must be met or the test "fails":

**Example from smoke test:**
- `http_req_duration: ['p(95)<2000']` - 95% of requests must complete in under 2 seconds
- `http_req_failed: ['rate<0.1']` - Less than 10% of requests can fail

If thresholds aren't met, k6 will mark the test as failed:
```
✗ http_req_duration: p(95)=2500ms (threshold: p(95)<2000ms)
```

---

## Best Practices

### 1. **Start Small, Scale Up**
- Always run smoke tests first
- Then load tests
- Only run stress tests when you understand your baseline
- Run soak tests overnight or during low-traffic periods

### 2. **Monitor Your Server**
While running tests, watch your server metrics:
- **Railway Dashboard:** CPU, memory, request rate, error rate
- **Database:** Connection count, query performance
- **Logs:** Error messages, slow queries

### 3. **Production Testing Guidelines**
- ⚠️ **Stress tests can overwhelm production** - run during low-traffic periods
- ✅ **Smoke tests are safe** - run anytime
- ✅ **Load tests are relatively safe** - start with low VU counts
- ✅ **Soak tests are safe** - moderate load over long periods

### 4. **Test Environment Variables**
Use environment variables to easily switch between environments:

```powershell
# Production
$env:BASE_URL="https://api.navigatortrips.com"

# Staging (if you have one)
$env:BASE_URL="https://staging-api.navigatortrips.com"

# Local
$env:BASE_URL="http://localhost:3000"
```

### 5. **Adjust Test Parameters**
You can modify test files to adjust:
- Number of virtual users
- Test duration
- Ramp-up speed
- Thresholds

**Example:** To make load test lighter, edit `load-test-k6.js`:
```javascript
stages: [
  { duration: '30s', target: 5 },    // Start with 5 instead of 20
  { duration: '1m', target: 10 },    // Max 10 instead of 20
  // ...
],
```

### 6. **Run Tests Regularly**
- Run smoke tests in CI/CD pipeline
- Run load tests after major deployments
- Run stress tests before major launches
- Run soak tests weekly/monthly to catch leaks

---

## Troubleshooting

### Problem: "Connection refused"

**Error:**
```
ERRO[0001] Get "http://localhost:3000/api/health": dial tcp [::1]:3000: connect: connection refused
```

**Solution:**
- Make sure your server is running
- Check the BASE_URL is correct
- For production, use `https://api.navigatortrips.com`

### Problem: "Server not accessible"

**Error:**
```
❌ Server not accessible at https://api.navigatortrips.com
```

**Solution:**
- Verify the URL is correct
- Check if the server is down (visit in browser)
- Check your internet connection
- Verify you're testing the right environment

### Problem: "High error rate"

**Symptoms:**
```
http_req_failed................: 25.00% ✓ 250 ✗ 750
```

**Possible causes:**
1. Server is overloaded
2. Server is down or restarting
3. Database connection issues
4. Rate limiting kicking in

**Solution:**
- Check server logs
- Reduce number of virtual users
- Check Railway dashboard for server status
- Verify database connectivity

### Problem: "Slow response times"

**Symptoms:**
```
http_req_duration..............: avg=5000ms p(95)=12000ms
```

**Possible causes:**
1. Server resources exhausted (CPU/memory)
2. Database queries are slow
3. Network latency
4. Server needs scaling

**Solution:**
- Check Railway dashboard for resource usage
- Review slow database queries
- Consider scaling up your server
- Optimize database indexes

### Problem: "Test takes too long"

**For soak tests:** This is normal! Soak tests are designed to run for hours.

**For other tests:**
- Check if stages are configured correctly
- Verify the duration settings
- Press `Ctrl+C` to stop early (not recommended, but possible)

### Problem: "All requests return 401"

**This is normal!** Our tests don't use real authentication credentials, so endpoints that require auth will return 401 (Unauthorized). We're testing that:
- The endpoints exist (not 404)
- They respond quickly
- Error handling works correctly

401 responses are **expected** and **not a problem** for our test scenarios.

---

## Quick Reference Card

### Test Types Cheat Sheet

| Test Type | Command | Duration | Load | Use Case |
|-----------|---------|----------|------|----------|
| 🔥 Smoke | `npm run test:smoke:k6` | ~30s | 1 user | Quick health check |
| 🚀 Load | `npm run test:load:k6` | ~4m | 5→20 users | Normal traffic test |
| 💥 Stress | `npm run test:stress:k6` | ~8m | 10→150 users | Find limits |
| 🌊 Soak | `npm run test:soak:k6` | 30m+ | 20 users sustained | Find leaks |
| 📋 All APIs | `npm run test:all-apis:k6` | ~2-5m | 1 user | Test all endpoints |

### Production Testing Commands (PowerShell)

```powershell
# Set once
$env:BASE_URL="https://api.navigatortrips.com"

# Run tests
npm run test:smoke:k6      # Quick check
npm run test:load:k6       # Normal load
npm run test:stress:k6     # Find limits (be careful!)
npm run test:soak:k6       # Long-term stability
```

### Key Metrics to Watch

- **http_req_failed < 5%** ✅ Good
- **http_req_duration p(95) < 2000ms** ✅ Good
- **checks > 95%** ✅ Good

---

## Next Steps

1. ✅ Install k6
2. ✅ Run a smoke test against production
3. ✅ Review the results
4. ✅ Run a load test
5. ✅ Monitor your Railway dashboard during tests
6. ✅ Adjust test parameters as needed
7. ✅ Add tests to your CI/CD pipeline

---

## Additional Resources

- [K6 Official Documentation](https://k6.io/docs/)
- [K6 JavaScript API Reference](https://k6.io/docs/javascript-api/)
- [Performance Testing Best Practices](https://k6.io/docs/test-types/)
- [Navigator API Documentation](./DEVELOPER_DOCUMENTATION.md)

---

## Questions?

If you have questions or issues:
1. Check the Troubleshooting section above
2. Review the test file comments (they explain what each part does)
3. Check K6 documentation
4. Review server logs and Railway dashboard

---

**Happy Testing! 🚀**

