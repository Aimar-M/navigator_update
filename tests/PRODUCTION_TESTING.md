# Production Testing Guide

This guide explains how to test your production environment (Railway backend + Vercel frontend).

## Important Notes

⚠️ **Always test against Railway backend URL**, not Vercel frontend URL
- Railway hosts your API endpoints (`/api/*`)
- Vercel hosts your React frontend
- Tests need to hit the Railway backend directly

## Finding Your Railway Backend URL

1. Go to your Railway dashboard
2. Select your backend service
3. Click on the "Settings" tab
4. Find your "Public Domain" or "Custom Domain"
5. Copy the URL (e.g., `https://your-app.railway.app` or `https://api.yourdomain.com`)

## Running Smoke Tests Against Production

Quick verification that production endpoints are working:

```bash
# Replace with your actual Railway backend URL
BASE_URL=https://your-app.railway.app npm run test:smoke
```

**Example:**
```bash
BASE_URL=https://navigator-api.railway.app npm run test:smoke
```

### What Smoke Tests Check

✅ Health check endpoint  
✅ Contact form endpoint  
✅ Authentication endpoints  
✅ Trips API endpoints  
✅ Response times (< 5 seconds)  
✅ CORS configuration  
✅ 404 handling  

## Running Load Tests Against Production

⚠️ **Warning**: Load tests generate real traffic. Start with conservative settings.

### Option 1: Simple Load Test (No k6 Required)

```bash
# Conservative load test (10 users, 30 seconds)
BASE_URL=https://your-app.railway.app npm run test:load

# Custom load test
BASE_URL=https://your-app.railway.app VUS=20 DURATION=60 npm run test:load
```

**Parameters:**
- `VUS`: Virtual users (default: 10)
- `DURATION`: Test duration in seconds (default: 30)
- `REQUESTS_PER_USER`: Requests per user (default: 10)

### Option 2: Professional Load Test (k6)

Requires k6 installation first:
- **Windows**: `choco install k6`
- **Mac**: `brew install k6`
- **Linux**: See [k6 docs](https://k6.io/docs/getting-started/installation/)

```bash
# Basic load test
BASE_URL=https://your-app.railway.app npm run test:load:k6

# Custom load test
BASE_URL=https://your-app.railway.app VUS=20 DURATION=60s npm run test:load:k6
```

## Quick Test Commands

### Test Production Health
```bash
BASE_URL=https://your-app.railway.app npm run test:smoke
```

### Light Load Test (Safe for Production)
```bash
BASE_URL=https://your-app.railway.app VUS=5 DURATION=30 npm run test:load
```

### Medium Load Test (Monitor Your Dashboard)
```bash
BASE_URL=https://your-app.railway.app VUS=20 DURATION=60 npm run test:load
```

### Heavy Load Test (Only if Railway Plan Supports It)
```bash
BASE_URL=https://your-app.railway.app VUS=50 DURATION=120 npm run test:load
```

## Environment-Specific Testing

### Development (Local)
```bash
BASE_URL=http://localhost:3000 npm run test:smoke
```

### Staging (if you have one)
```bash
BASE_URL=https://staging-api.railway.app npm run test:smoke
```

### Production
```bash
BASE_URL=https://your-app.railway.app npm run test:smoke
```

## What to Monitor During Load Tests

While running load tests, monitor:

1. **Railway Dashboard**
   - CPU usage
   - Memory usage
   - Request rate
   - Error rate

2. **Response Times**
   - Average should be < 500ms
   - p95 should be < 2s
   - p99 should be < 5s

3. **Success Rate**
   - Should be > 95%
   - Monitor for 5xx errors

4. **Database Performance**
   - Connection pool usage
   - Query performance (if you have DB monitoring)

## Troubleshooting

### Connection Refused
```
Error: Connection refused - is the server running?
```
**Solution**: Check your Railway backend URL. Make sure it's the backend, not frontend.

### Timeout Errors
```
Error: timeout of 10000ms exceeded
```
**Solution**: Your backend might be slow or overloaded. Check Railway metrics.

### CORS Errors
**Solution**: Verify CORS is configured to allow requests from your domain.

### 404 Errors
**Solution**: Make sure you're using the correct base URL and endpoint paths exist.

## Best Practices

1. ✅ **Always run smoke tests first** before load tests
2. ✅ **Start with low VUS** and gradually increase
3. ✅ **Monitor Railway dashboard** during tests
4. ✅ **Test during off-peak hours** if possible
5. ✅ **Set up alerts** on Railway for high error rates
6. ⚠️ **Be careful with heavy load tests** - they can cost money on Railway

## Expected Results

### Good Performance
- ✅ Success rate > 95%
- ✅ Average response time < 500ms
- ✅ p95 response time < 2s
- ✅ No 5xx errors

### Needs Attention
- ⚠️ Success rate < 90%
- ⚠️ Average response time > 1s
- ⚠️ p95 response time > 3s
- ⚠️ Frequent 5xx errors

