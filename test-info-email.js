import nodemailer from 'nodemailer';

// Test configuration for info@navigatortrips.com
const testConfig = {
  host: 'smtp.gmail.com', // Assuming Gmail based on the app password format
  port: 587,
  secure: false,
  auth: {
    user: 'info@navigatortrips.com',
    pass: 'fdyn bfuv ykxh tqry'
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
};

console.log('🚀 Testing info@navigatortrips.com Email Configuration...\n');
console.log('📧 SMTP Configuration:');
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
    return false;
  }
}

// Test email sending
async function testEmailSending() {
  try {
    console.log('\n📧 Testing email sending from info@navigatortrips.com...');
    
    const testEmail = {
      from: `"Navigator" <info@navigatortrips.com>`,
      to: 'info@navigatortrips.com', // Send to self for testing
      subject: '🧪 Navigator Email Test - info@navigatortrips.com',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Test</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { background: #044674; color: white; padding: 20px; text-align: center; border-radius: 10px; }
            .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 10px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚢 Navigator</h1>
            <p>Email Configuration Test</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <div class="success">
              <strong>✅ Success!</strong> Your Navigator emails are now being sent from info@navigatortrips.com
            </div>
            <p>This is a test email to verify that your new email configuration is working correctly.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>From: info@navigatortrips.com</li>
              <li>To: info@navigatortrips.com</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
              <li>SMTP Host: ${testConfig.host}</li>
              <li>SMTP Port: ${testConfig.port}</li>
            </ul>
            <p>If you received this email, your new email configuration is working perfectly! 🎉</p>
            <p><strong>Next steps:</strong></p>
            <ul>
              <li>Update your environment variables in Railway dashboard</li>
              <li>Deploy the updated code</li>
              <li>Test the password reset and email confirmation features</li>
            </ul>
          </div>
        </body>
        </html>
      `,
      text: 'This is a test email from Navigator (info@navigatortrips.com). Your new email configuration is working correctly!'
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
    console.log('\n❌ Cannot proceed with email tests due to connection failure');
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure the app password is correct');
    console.log('2. Ensure 2-Factor Authentication is enabled on the Gmail account');
    console.log('3. Check that the email address is correct');
    console.log('4. Verify the SMTP host and port are correct');
    process.exit(1);
  }
  
  const emailOk = await testEmailSending();
  
  console.log('\n📊 Test Results:');
  console.log(`  Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Email Sending: ${emailOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionOk && emailOk) {
    console.log('\n🎉 All tests passed! Your new email configuration is working correctly.');
    console.log('\n📋 Environment Variables to Set in Railway:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_USER=info@navigatortrips.com');
    console.log('SMTP_PASS=fdyn bfuv ykxh tqry');
    console.log('SMTP_PORT=587');
    console.log('\n🚀 Ready to deploy!');
  } else {
    console.log('\n❌ Some tests failed. Please check your configuration.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);
