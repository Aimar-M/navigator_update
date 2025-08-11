import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required SMTP environment variables:', missingVars);
  console.error('Please set the following environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

console.log('✅ All required SMTP environment variables are set');
console.log('📧 SMTP Configuration:');
console.log(`  Host: ${process.env.SMTP_HOST}`);
console.log(`  Port: ${process.env.SMTP_PORT || '587'}`);
console.log(`  User: ${process.env.SMTP_USER}`);
console.log(`  Pass: ${process.env.SMTP_PASS ? '***' : 'NOT SET'}`);

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
});

// Test connection
async function testConnection() {
  try {
    console.log('\n🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

// Test email sending
async function testEmailSending() {
  try {
    console.log('\n📧 Testing email sending...');
    
    const testEmail = {
      from: `"Navigator01" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: '🧪 Navigator Email Test',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Test</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; }
            .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚢 Navigator</h1>
            <p>Email Test Successful!</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>This is a test email to verify that your Navigator email configuration is working correctly.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Timestamp: ${new Date().toISOString()}</li>
              <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              <li>SMTP Port: ${process.env.SMTP_PORT || '587'}</li>
            </ul>
            <p>If you received this email, your email configuration is working perfectly! 🎉</p>
          </div>
        </body>
        </html>
      `,
      text: 'This is a test email from Navigator. Your email configuration is working correctly!'
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
  console.log('🚀 Starting Navigator Email Tests...\n');
  
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ Cannot proceed with email tests due to connection failure');
    process.exit(1);
  }
  
  const emailOk = await testEmailSending();
  
  console.log('\n📊 Test Results:');
  console.log(`  Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Email Sending: ${emailOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionOk && emailOk) {
    console.log('\n🎉 All tests passed! Your email configuration is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please check your configuration.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error); 