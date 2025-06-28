const https = require('https');
const http = require('http');

const BASE_URL = process.env.RAILWAY_URL || 'https://your-app.railway.app';

function testEndpoint(path, method = 'GET', data = null, useHttps = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const options = {
      hostname: url.hostname,
      port: useHttps ? 443 : 80,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Debug-Script/1.0'
      },
      timeout: 10000 // 10 second timeout
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const client = useHttps ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log(`✅ ${method} ${path} - Status: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        console.log('Response:', body);
        console.log('---');
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Error testing ${method} ${path}:`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error(`⏰ Timeout testing ${method} ${path}`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runDebugTests() {
  console.log('🔍 Railway Debug Tests');
  console.log('=====================');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('');

  const tests = [
    // Basic connectivity tests
    { path: '/', method: 'GET', description: 'Root endpoint' },
    { path: '/api', method: 'GET', description: 'API root' },
    { path: '/api/health', method: 'GET', description: 'Health check' },
    { path: '/api/ping', method: 'GET', description: 'Ping endpoint' },
    
    // Test with trailing slash
    { path: '/api/health/', method: 'GET', description: 'Health check with trailing slash' },
    
    // Test different methods
    { path: '/api/health', method: 'POST', description: 'Health check with POST' },
    { path: '/api/health', method: 'OPTIONS', description: 'Health check with OPTIONS' },
    
    // Test non-existent endpoints
    { path: '/api/nonexistent', method: 'GET', description: 'Non-existent endpoint' },
    { path: '/health', method: 'GET', description: 'Health without /api prefix' },
  ];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.description}`);
      await testEndpoint(test.path, test.method);
    } catch (error) {
      console.log(`❌ Failed: ${test.description} - ${error.message}`);
    }
    console.log('');
  }

  // Test with different protocols
  console.log('🌐 Testing HTTP vs HTTPS...');
  try {
    await testEndpoint('/api/health', 'GET', null, false); // HTTP
  } catch (error) {
    console.log('❌ HTTP failed (expected if Railway only supports HTTPS)');
  }

  console.log('\n📊 Summary:');
  console.log('If you see 404 errors, check:');
  console.log('1. Railway deployment logs');
  console.log('2. Environment variables in Railway dashboard');
  console.log('3. Port configuration');
  console.log('4. Route mounting in server code');
}

// Also test with curl-like output
function testWithCurl() {
  console.log('\n🔧 Curl commands to test manually:');
  console.log(`curl -v ${BASE_URL}/api/health`);
  console.log(`curl -v ${BASE_URL}/api/ping`);
  console.log(`curl -v ${BASE_URL}/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'`);
}

runDebugTests().then(() => {
  testWithCurl();
}).catch(console.error); 