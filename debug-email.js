import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Debugging Email Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
console.log(`  SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '***' : 'NOT SET'}`);
console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || '587'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Test with hardcoded credentials
console.log('\n🧪 Testing with hardcoded credentials...');

const testConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'info@navigatortrips.com',
    pass: 'fdyn bfuv ykxh tqry'
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
};

console.log('📧 Test Configuration:');
console.log(`  Host: ${testConfig.host}`);
console.log(`  Port: ${testConfig.port}`);
console.log(`  User: ${testConfig.auth.user}`);
console.log(`  Pass: ${testConfig.auth.pass ? '***' : 'NOT SET'}`);

// Create transporter
const transporter = nodemailer.createTransporter(testConfig);

// Test connection
async function testConnection() {
  try {
    console.log('\n🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('Full error:', error);
    
    // Provide specific troubleshooting based on error
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting: Invalid login');
      console.log('1. Check if the app password is correct');
      console.log('2. Ensure 2-Factor Authentication is enabled');
      console.log('3. Make sure the email address is correct');
    } else if (error.message.includes('Connection timeout')) {
      console.log('\n💡 Troubleshooting: Connection timeout');
      console.log('1. Check your internet connection');
      console.log('2. Verify the SMTP host is correct');
      console.log('3. Try a different port (465 with secure: true)');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Troubleshooting: Authentication failed');
      console.log('1. The app password might be incorrect');
      console.log('2. Try generating a new app password');
      console.log('3. Check if the Gmail account has any restrictions');
    }
    
    return false;
  }
}

// Test email sending
async function testEmailSending() {
  try {
    console.log('\n📧 Testing email sending...');
    
    const testEmail = {
      from: `"Navigator" <info@navigatortrips.com>`,
      to: 'info@navigatortrips.com',
      subject: '🧪 Debug Test - Navigator Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Debug Test</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { background: #044674; color: white; padding: 20px; text-align: center; border-radius: 10px; }
            .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚢 Navigator</h1>
            <p>Debug Test</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>This is a debug test email to verify the configuration.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>From: info@navigatortrips.com</li>
              <li>To: info@navigatortrips.com</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
              <li>SMTP Host: ${testConfig.host}</li>
              <li>SMTP Port: ${testConfig.port}</li>
            </ul>
            <p>If you received this email, the configuration is working! 🎉</p>
          </div>
        </body>
        </html>
      `,
      text: 'This is a debug test email from Navigator.'
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📧 Response: ${info.response}`);
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ Connection failed. Cannot proceed with email test.');
    return;
  }
  
  const emailOk = await testEmailSending();
  
  console.log('\n📊 Test Results:');
  console.log(`  Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Email Sending: ${emailOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionOk && emailOk) {
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update your environment variables in Railway:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_USER=info@navigatortrips.com');
    console.log('   SMTP_PASS=fdyn bfuv ykxh tqry');
    console.log('   SMTP_PORT=587');
    console.log('2. Deploy the updated code');
  } else {
    console.log('\n❌ Some tests failed. Please check the error messages above.');
  }
}

// Run the tests
runTests().catch(console.error);
