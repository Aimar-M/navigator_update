import fetch from 'node-fetch';

console.log('🧪 Testing Forgot Password Endpoint');
console.log('===================================');

async function testForgotPassword() {
  try {
    console.log('🔄 Sending forgot password request...');
    
    const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'muhirwa.aimar@gmail.com'
      })
    });
    
    const result = await response.json();
    
    console.log('📧 Response Status:', response.status);
    console.log('📧 Response Body:', result);
    
    if (response.ok) {
      console.log('✅ Forgot password request successful!');
      if (result.resetUrl) {
        console.log('🔗 Reset URL provided:', result.resetUrl);
      }
    } else {
      console.log('❌ Forgot password request failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testForgotPassword();
