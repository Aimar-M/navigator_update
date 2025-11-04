# Quick Start Guide - K6 Performance Testing

**New to k6? Start here!** This is a simplified guide to get you running tests immediately.

## Prerequisites

1. **Install k6:**
   - Windows: `choco install k6` (or download from k6.io)
   - Mac: `brew install k6`
   - Verify: `k6 version`

2. **Know your server URL:**
   - Production: `https://api.navigatortrips.com`
   - Local: `http://localhost:3000`

## The 5 Test Types (Simple Explanation)

1. **🔥 Smoke Test** - "Is it working?" (30 seconds)
2. **🚀 Load Test** - "Can it handle normal traffic?" (4 minutes)
3. **💥 Stress Test** - "What's the breaking point?" (8 minutes) ⚠️
4. **🌊 Soak Test** - "Does it leak memory over time?" (30+ minutes)
5. **📋 Comprehensive API Test** - "Do ALL endpoints work?" (2-5 minutes) - Tests all ~109 endpoints

## Run Your First Test (Windows PowerShell)

```powershell
# Step 1: Set your production URL
$env:BASE_URL="https://api.navigatortrips.com"

# Step 2: Run a smoke test (safest, quickest)
npm run test:smoke:k6
```

**That's it!** You should see output showing all the tests passing.

## All Commands

```powershell
# Set URL once (you can reuse this for all tests)
$env:BASE_URL="https://api.navigatortrips.com"

# Run tests
npm run test:smoke:k6      # Quick health check
npm run test:load:k6       # Normal traffic test
npm run test:stress:k6     # Push to limits (be careful!)
npm run test:soak:k6       # Long-term test (takes 30+ minutes)
npm run test:all-apis:k6   # Test ALL ~109 endpoints
```

## What Each Test Does

### 🔥 Smoke Test
- Tests: Health check, contact form, basic endpoints
- Load: 1 user, runs once
- Duration: ~30 seconds
- **Safe for production anytime**

### 🚀 Load Test
- Tests: Multiple endpoints under normal load
- Load: Gradually increases from 5 to 20 users
- Duration: ~4 minutes
- **Safe for production (moderate load)**

### 💥 Stress Test
- Tests: System under extreme load
- Load: Aggressively increases from 10 to 150 users
- Duration: ~8 minutes
- **⚠️ Can overwhelm production - use carefully!**

### 🌊 Soak Test
- Tests: Long-term stability and memory leaks
- Load: Sustains 20 users for extended period
- Duration: 30 minutes (default, can be longer)
- **Safe for production (moderate sustained load)**

### 📋 Comprehensive API Test
- Tests: ALL ~109 API endpoints from your documentation
- Load: 1 user, runs through all endpoints once
- Duration: 2-5 minutes
- **Safe for production - verifies all endpoints exist**

## Understanding Results

Look for these in the output:

✅ **Good signs:**
- `checks: 100.00%` - All checks passed
- `http_req_failed: 0.00%` - No failed requests
- `http_req_duration p(95) < 2000ms` - Fast response times

⚠️ **Warning signs:**
- `http_req_failed > 10%` - Too many failures
- `http_req_duration p(95) > 5000ms` - Very slow responses
- `checks < 90%` - Many checks failing

## Next Steps

1. ✅ Test endpoints in Postman first (see [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md))
2. ✅ Run smoke test - verify everything works
3. ✅ Run comprehensive API test - verify all ~109 endpoints exist
4. ✅ Run load test - see how it handles traffic
5. 📖 Read [K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md) for detailed explanations
6. 🔍 Monitor Railway dashboard while tests run

## Need More Details?

See the complete guide: **[K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md)**

That guide includes:
- Complete API documentation
- Detailed explanations of each test
- Troubleshooting guide
- Best practices
- Understanding all the metrics

---

**Ready? Run your first test now!**

```powershell
$env:BASE_URL="https://api.navigatortrips.com"; npm run test:smoke:k6
```

