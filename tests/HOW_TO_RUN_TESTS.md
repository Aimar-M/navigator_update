# How to Run Tests - Quick Guide

This is a simple step-by-step guide to run your k6 tests.

## Prerequisites

1. **Install k6** (if not already installed)
   ```powershell
   # Windows (PowerShell - if you have Chocolatey)
   choco install k6
   
   # Or download from: https://k6.io/docs/getting-started/installation/
   ```

2. **Verify k6 is installed**
   ```powershell
   k6 version
   ```
   You should see something like: `k6 v0.xx.x`

## Running Tests (Windows PowerShell)

### Option 1: Quick Test (Smoke Test)

This is the fastest test - just checks if basic endpoints work:

```powershell
# Set your production URL
$env:BASE_URL="https://api.navigatortrips.com"

# Run smoke test
npm run test:smoke:k6
```

**That's it!** This takes about 30 seconds.

---

### Option 2: Test ALL Endpoints (Comprehensive)

This tests all ~109 API endpoints:

```powershell
# Set your production URL
$env:BASE_URL="https://api.navigatortrips.com"

# Run comprehensive test
npm run test:all-apis:k6
```

This takes 2-5 minutes and tests every endpoint.

---

### Option 3: Load Test

Test how your API handles normal traffic:

```powershell
$env:BASE_URL="https://api.navigatortrips.com"
npm run test:load:k6
```

This takes about 4 minutes.

---

### Option 4: Stress Test (Be Careful!)

Find your API's breaking point:

```powershell
$env:BASE_URL="https://api.navigatortrips.com"
npm run test:stress:k6
```

⚠️ **Warning:** This pushes your server hard - use carefully!

---

## Setting Environment Variables (Easy Way)

Instead of typing `$env:BASE_URL="..."` every time, set it once:

```powershell
# Set it once in your current PowerShell session
$env:BASE_URL="https://api.navigatortrips.com"

# Now you can run any test without repeating it
npm run test:smoke:k6
npm run test:all-apis:k6
npm run test:load:k6
# etc...
```

---

## All Available Test Commands

| Command | What It Does | Duration |
|---------|--------------|----------|
| `npm run test:smoke:k6` | Quick health check | ~30 seconds |
| `npm run test:all-apis:k6` | Tests all ~109 endpoints | ~2-5 minutes |
| `npm run test:load:k6` | Normal traffic test | ~4 minutes |
| `npm run test:stress:k6` | Push to limits ⚠️ | ~8 minutes |
| `npm run test:soak:k6` | Long-term stability | 30+ minutes |

---

## Testing with Authentication

If you want to test authenticated endpoints with real credentials:

```powershell
$env:BASE_URL="https://api.navigatortrips.com"
$env:TEST_USERNAME="your_username"
$env:TEST_PASSWORD="your_password"
npm run test:all-apis:k6
```

**Note:** Only the comprehensive test uses these credentials. Other tests use fake credentials (which is fine - they're just checking endpoints exist).

---

## Testing Local Server

If you're running the server locally:

```powershell
$env:BASE_URL="http://localhost:3000"
npm run test:smoke:k6
```

---

## Understanding the Output

When you run a test, you'll see output like this:

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: tests/comprehensive-api-test-k6.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 10m30s max duration
           ✓ default: 1 iterations for each of 1 VUs

     ✓ Health Check - responds (not connection error)
     ✓ Health Check - status in expected range
     ✓ Login - responds (not connection error)
     ... (more checks)

     checks.........................: 95.00% ✓ 190        ✗ 10
     http_req_duration..............: avg=245ms    p(95)=1200ms
     http_req_failed................: 15.00% ✓ 30         ✗ 170
     http_reqs......................: 200     10/s
```

**Key things to look for:**
- ✅ **checks:** Should be high (80%+ is good for comprehensive test since some will fail without auth)
- ✅ **http_req_failed:** Some failures are expected (401/404 are normal without proper setup)
- ✅ **http_req_duration:** Should be reasonable (< 2000ms for p95)

---

## Common Issues

### Issue: "k6: command not found"
**Solution:** k6 is not installed. Install it using the commands at the top.

### Issue: "Connection refused" or "timeout"
**Solution:** 
- Make sure your server is running
- Check the BASE_URL is correct
- For production: use `https://api.navigatortrips.com`
- For local: use `http://localhost:3000`

### Issue: "Server not accessible"
**Solution:** The health check failed. Verify:
- Server is running
- URL is correct
- You have internet connection (for production)

---

## Quick Start: Your First Test

Here's the absolute simplest way to get started:

```powershell
# 1. Make sure k6 is installed
k6 version

# 2. Set your production URL
$env:BASE_URL="https://api.navigatortrips.com"

# 3. Run the quick smoke test
npm run test:smoke:k6
```

If that works, you're all set! Try the comprehensive test next:

```powershell
npm run test:all-apis:k6
```

---

## Need More Help?

- **Complete Guide:** See `tests/K6_TESTING_GUIDE.md`
- **Postman Testing:** See `tests/POSTMAN_TESTING_GUIDE.md`
- **Quick Reference:** See `tests/QUICK_START.md`
- **API Documentation:** See `API_ENDPOINTS_COMPLETE.md`

---

**Happy Testing! 🚀**

