const https = require('https');

const BASE_URL = process.env.RAILWAY_URL || 'https://your-app.railway.app';

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log(`${method} ${path} - Status: ${res.statusCode}`);
        console.log('Response:', body);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', (err) => {
      console.error(`Error testing ${method} ${path}:`, err.message);
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test health endpoint
    await testEndpoint('/api/health');
    
    // Test login endpoint (should return 400 for invalid data)
    await testEndpoint('/api/auth/login', 'POST', { username: 'test', password: 'test' });
    
    console.log('\n✅ API tests completed!');
  } catch (error) {
    console.error('\n❌ API tests failed:', error);
  }
}

runTests(); 