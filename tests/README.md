# Testing Guide

This directory contains smoke tests and load tests for the Navigator application.

## 🚀 Quick Start (K6 Tests - Recommended)

**For comprehensive k6 testing with detailed documentation, see: [K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md)**

### Quick Commands (Windows PowerShell)

```powershell
# Set your production URL once
$env:BASE_URL="https://api.navigatortrips.com"

# Run tests
npm run test:smoke:k6      # Quick health check (~30 seconds)
npm run test:load:k6       # Normal load test (~4 minutes)
npm run test:stress:k6     # Find breaking points (~8 minutes) ⚠️
npm run test:soak:k6       # Long-term stability (30+ minutes)
```

### What's Available

- ✅ **Smoke Test** (`smoke-test-k6.js`) - Quick health check
- ✅ **Load Test** (`load-test-k6.js`) - Normal traffic simulation
- ✅ **Stress Test** (`stress-test-k6.js`) - Find maximum capacity
- ✅ **Soak Test** (`soak-test-k6.js`) - Find memory leaks over time
- ✅ **Comprehensive API Test** (`comprehensive-api-test-k6.js`) - Tests ALL ~109 endpoints

**👉 See [K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md) for complete documentation!**

### Testing with Postman First

Before running k6 tests, you may want to test endpoints manually in Postman:
**👉 See [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md) for Postman setup and testing!**

---

## Overview (Legacy Node.js Tests)

### Smoke Tests
**Purpose**: Quick verification that your application's critical endpoints are working.  
**Use Case**: Run before deployments, after deployments, or when you suspect issues.  
**Duration**: Usually completes in 10-30 seconds.

### Load Tests
**Purpose**: Measure how your application performs under various load conditions.  
**Use Case**: Before going to production, after performance optimizations, or during capacity planning.  
**Duration**: Configurable, typically 30-60 seconds.

**Note**: We now recommend using k6 tests (see above) for better metrics and insights.

## Production Environment

**Backend URL**: `https://api.navigatortrips.com` (Railway)  
**Frontend URL**: Vercel (for reference only - tests run against backend)

⚠️ **Important**: Always test against the **Railway backend URL**, not the Vercel frontend URL. Tests need to hit the API endpoints directly.

## Smoke Tests

Smoke tests verify that critical endpoints respond correctly and the application is healthy.

### Running Smoke Tests

**Local development:**
```bash
npm run test:smoke
```
```powershell
# Windows PowerShell
npm run test:smoke
```

**Against production:**
```bash
# Bash/Linux/Mac
BASE_URL=https://api.navigatortrips.com npm run test:smoke
```
```powershell
# Windows PowerShell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:smoke
```

**Against staging (if you have one):**
```bash
BASE_URL=https://your-staging-url.com npm run test:smoke
```

**With verbose output:**
```bash
# Bash/Linux/Mac
VERBOSE=true BASE_URL=https://api.navigatortrips.com npm run test:smoke
```
```powershell
# Windows PowerShell
$env:VERBOSE="true"; $env:BASE_URL="https://api.navigatortrips.com"; npm run test:smoke
```

### What Smoke Tests Check

1. ✅ Health check endpoint responds correctly
2. ✅ Contact form endpoint accepts requests
3. ✅ Authentication endpoints exist and respond
4. ✅ Trips API endpoints are accessible
5. ✅ Response times are reasonable (< 5 seconds)
6. ✅ CORS is properly configured
7. ✅ Invalid routes return 404 correctly

### Expected Output

```
🔥 Starting Smoke Tests
📍 Base URL: http://localhost:3000
⏱️  Timeout: 10000ms
==================================================

🧪 Testing: Health Check Endpoint
✅ PASS: Health Check Endpoint

...

📊 Test Summary
==================================================
✅ Passed: 7
❌ Failed: 0
⏱️  Duration: 1234ms

🎉 All smoke tests passed!
```

## Load Tests

Load tests measure your application's performance under concurrent load.

### Option 1: Simple Load Test (Node.js - Recommended for Beginners)

This option doesn't require any additional installation and works out of the box.

**Basic usage:**
```bash
npm run test:load
```
```powershell
# Windows PowerShell
npm run test:load
```

**Custom configuration:**
```bash
# Bash/Linux/Mac
BASE_URL=http://localhost:3000 VUS=20 DURATION=60 npm run test:load
```
```powershell
# Windows PowerShell
$env:BASE_URL="http://localhost:3000"; $env:VUS="20"; $env:DURATION="60"; npm run test:load
```

**Parameters:**
- `BASE_URL`: The base URL of your application (default: `http://localhost:3000`)
- `VUS`: Number of virtual users (default: `10`)
- `DURATION`: Test duration in seconds (default: `30`)
- `REQUESTS_PER_USER`: Requests each user makes (default: `10`)

**Production Examples:**

Light load test (safe for production):
```bash
# Bash/Linux/Mac
BASE_URL=https://api.navigatortrips.com VUS=5 DURATION=30 npm run test:load
```
```powershell
# Windows PowerShell
$env:BASE_URL="https://api.navigatortrips.com"; $env:VUS="5"; $env:DURATION="30"; npm run test:load
```

Medium load test (monitor your Railway dashboard):
```bash
# Bash/Linux/Mac
BASE_URL=https://api.navigatortrips.com VUS=20 DURATION=60 npm run test:load
```
```powershell
# Windows PowerShell
$env:BASE_URL="https://api.navigatortrips.com"; $env:VUS="20"; $env:DURATION="60"; npm run test:load
```

**Alternative: Set environment variable once:**
```powershell
# Windows PowerShell - Set once, use multiple times
$env:BASE_URL="https://api.navigatortrips.com"
npm run test:smoke
npm run test:load
```

### Option 2: k6 Load Test (Professional Tool)

k6 is a modern, developer-friendly load testing tool. It provides more detailed metrics and better performance.

**Installation:**

- **Windows**: `choco install k6`
- **Mac**: `brew install k6`
- **Linux**: See [k6 installation guide](https://k6.io/docs/getting-started/installation/)

**Basic usage:**
```bash
npm run test:load:k6
```

**Custom configuration:**
```bash
# Bash/Linux/Mac
BASE_URL=http://localhost:3000 k6 run --vus 20 --duration 60s tests/load-test.js
```
```powershell
# Windows PowerShell
$env:BASE_URL="http://localhost:3000"; k6 run --vus 20 --duration 60s tests/load-test.js
```

**Production testing with k6:**
```bash
# Bash/Linux/Mac
BASE_URL=https://api.navigatortrips.com k6 run --vus 20 --duration 60s tests/load-test.js
```
```powershell
# Windows PowerShell
$env:BASE_URL="https://api.navigatortrips.com"; k6 run --vus 20 --duration 60s tests/load-test.js
```

**k6-specific options:**
```bash
# Run with custom stages
k6 run tests/load-test.js --stage 10s:10,30s:20,10s:0

# Run with custom thresholds
k6 run tests/load-test.js --thresholds http_req_duration=p\(95\)\<1000
```

### What Load Tests Measure

1. **Response Times**: Average, min, max, p50, p95, p99
2. **Success Rate**: Percentage of successful requests
3. **Throughput**: Requests per second
4. **Error Rate**: Failed requests and errors
5. **Status Code Distribution**: Breakdown by HTTP status codes

### Expected Output (Simple Load Test)

```
🚀 Starting Simple Load Test
============================================================
📍 Base URL: http://localhost:3000
👥 Virtual Users: 10
⏱️  Duration: 30s
📊 Requests per user: 10
============================================================

⏳ Running load test...

📊 Load Test Results
============================================================
✅ Total Requests: 100
✅ Successful: 95
❌ Failed: 5
📈 Success Rate: 95.00%

⏱️  Response Times:
   Average: 245ms
   Min: 120ms
   Max: 890ms
   p50: 230ms
   p95: 450ms
   p99: 750ms

📋 Status Codes:
   200: 85
   401: 10
   500: 5

🎉 Load test passed! Good performance.
```

## Interpreting Results

### Smoke Test Results

- **All passed**: Your application is healthy and ready for use
- **Any failed**: Investigate the failing endpoints before deploying

### Load Test Results

**Good Performance:**
- ✅ Success rate > 95%
- ✅ Average response time < 500ms
- ✅ p95 response time < 2 seconds
- ✅ No 5xx errors

**Needs Attention:**
- ⚠️ Success rate < 90%
- ⚠️ Average response time > 1 second
- ⚠️ p95 response time > 3 seconds
- ⚠️ Frequent 5xx errors

**Action Items for Poor Performance:**
1. Check database query performance
2. Review server resource usage (CPU, memory)
3. Optimize slow endpoints
4. Consider database indexing
5. Review connection pool settings
6. Consider horizontal scaling

## Testing Strategy

### Pre-Deployment
1. Run smoke tests locally
2. Run load tests against staging environment
3. Verify results meet your performance criteria

### Post-Deployment (Production)
1. Run smoke tests against production backend (`https://api.navigatortrips.com`)
2. Monitor Railway dashboard metrics (CPU, memory, request rate, error rate)
3. Run periodic load tests to catch regressions
4. Monitor Vercel frontend performance separately

**Quick Production Health Check:**
```powershell
# Windows PowerShell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:smoke
```

**Light Production Load Test:**
```powershell
# Windows PowerShell - Safe for production monitoring
$env:BASE_URL="https://api.navigatortrips.com"; $env:VUS="5"; $env:DURATION="30"; npm run test:load
```

### Continuous Testing
- Integrate smoke tests into your CI/CD pipeline
- Schedule periodic load tests against production
- Set up alerts on Railway for high error rates or slow response times
- Monitor both backend (Railway) and frontend (Vercel) metrics

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Base URL of your application |
| `VUS` | `10` | Number of virtual users (load tests) |
| `DURATION` | `30` | Test duration in seconds (load tests) |
| `VERBOSE` | `false` | Enable verbose output (smoke tests) |
| `TEST_USERNAME` | `testuser` | Test user for authenticated endpoints (k6 only) |
| `TEST_PASSWORD` | `testpass` | Test password for authenticated endpoints (k6 only) |

## Troubleshooting

### Connection Refused
```
Error: Connection refused - is the server running at http://localhost:3000?
```
**Solution**: 
- For local testing: Make sure your server is running before running tests
- For production: Verify you're using the correct backend URL (`https://api.navigatortrips.com`)
- Make sure you're testing the **backend URL** (Railway), not the frontend URL (Vercel)

### Timeout Errors
**Solution**: 
- Increase timeout or check server performance. For smoke tests, timeout is 10 seconds
- Check Railway dashboard for backend performance issues
- Verify database connection if using Neon PostgreSQL
- Check if Railway instance is scaled appropriately for the load

### High Error Rates
**Solution**: 
- Check server logs for errors
- Verify database connectivity
- Check server resource usage
- Review rate limiting settings

### Slow Response Times
**Solution**:
- Optimize database queries
- Add indexes where needed
- Review server configuration
- Consider caching strategies

## Advanced Usage

### Testing Authenticated Endpoints

For more comprehensive testing with authenticated endpoints, you can:

1. Create test users in your database
2. Update the load test scripts to login first
3. Use session cookies for subsequent requests

Example (in load-test-simple.js):
```javascript
// Login first
const loginResponse = await makeRequest('POST', '/api/auth/login', {
  username: 'testuser',
  password: 'testpass'
});

// Extract session cookie
const cookies = loginResponse.headers['set-cookie'];

// Use cookie in subsequent requests
const tripsResponse = await makeRequest('GET', '/api/trips', null, {
  Cookie: cookies
});
```

### Custom Test Scenarios

You can customize the test scripts to:
- Test specific endpoints relevant to your app
- Add different types of requests
- Test with different payload sizes
- Simulate real user workflows

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/test-types/load-testing/)
- [Performance Testing Guide](https://www.artillery.io/docs/guides/performance-testing)

## Production Testing Checklist

Before running production tests:
- ✅ Verify Railway backend is accessible at `https://api.navigatortrips.com`
- ✅ Check Railway dashboard for current metrics
- ✅ Start with smoke tests before load tests
- ✅ Use conservative load test settings (start with low VUS)
- ✅ Monitor Railway dashboard during load tests
- ✅ Be aware of Railway usage/limits for your plan

## Quick Reference: Production Testing Commands

**Smoke Test (Health Check):**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:smoke
```

**Light Load Test (5 users, 30 seconds):**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; $env:VUS="5"; $env:DURATION="30"; npm run test:load
```

**Medium Load Test (20 users, 60 seconds):**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; $env:VUS="20"; $env:DURATION="60"; npm run test:load
```

**With Verbose Output:**
```powershell
$env:BASE_URL="https://api.navigatortrips.com"; $env:VERBOSE="true"; npm run test:smoke
```

## Notes

- Smoke tests are designed to be fast and non-destructive
- Load tests may generate test data (contact form submissions, etc.)
- Consider cleaning up test data after load tests if needed
- Always test against staging/test environments when possible
- Never run aggressive load tests against production without warning
- **Production backend**: Test against `https://api.navigatortrips.com` (Railway)
- **Frontend**: Hosted on Vercel - test separately if needed
