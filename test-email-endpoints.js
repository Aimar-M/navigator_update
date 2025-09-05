import fetch from 'node-fetch';

console.log('🧪 Testing Email Endpoints');
console.log('===========================');

async function testForgotPassword() {
  console.log('\n🔐 Testing Forgot Password...');
  try {
    const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'muhirwa.aimar@gmail.com' })
    });
    
    const result = await response.json();
    console.log('📧 Status:', response.status);
    console.log('📧 Response:', result);
    
    if (response.ok) {
      console.log('✅ Forgot password request successful!');
      if (result.resetUrl) {
        console.log('🔗 Reset URL provided:', result.resetUrl);
      }
    } else {
      console.log('❌ Forgot password request failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testRegistration() {
  console.log('\n📝 Testing Registration (Email Confirmation)...');
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        password: 'Test123!@#',
        name: 'Test User'
      })
    });
    
    const result = await response.json();
    console.log('📧 Status:', response.status);
    console.log('📧 Response:', result);
    
    if (response.ok) {
      console.log('✅ Registration successful! Email confirmation should be sent.');
    } else {
      console.log('❌ Registration failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting email endpoint tests...\n');
  
  await testForgotPassword();
  await testRegistration();
  
  console.log('\n📋 Test Summary:');
  console.log('If both tests show success, emails should be sent to:');
  console.log('1. Forgot password: muhirwa.aimar@gmail.com');
  console.log('2. Registration: test@example.com (check server logs for actual email)');
}

runTests().catch(console.error);
