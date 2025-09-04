import nodemailer from 'nodemailer';

console.log('🔍 Quick Email Configuration Test\n');

// Test the exact configuration that should work
const config = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'info@navigatortrips.com',
    pass: 'fdyn bfuv ykxh tqry'
  }
};

console.log('📧 Testing Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  User: ${config.auth.user}`);
console.log(`  Pass: ${config.auth.pass ? '***' : 'NOT SET'}`);

const transporter = nodemailer.createTransporter(config);

async function testEmail() {
  try {
    console.log('\n🔍 Testing connection...');
    await transporter.verify();
    console.log('✅ Connection successful!');
    
    console.log('\n📧 Sending test email...');
    const result = await transporter.sendMail({
      from: '"Navigator" <info@navigatortrips.com>',
      to: 'info@navigatortrips.com',
      subject: '🧪 Quick Test - Navigator Email',
      text: 'This is a quick test to verify the email configuration is working.'
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log('\n🎉 Email configuration is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    // Provide specific troubleshooting based on error
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Issue: Invalid login credentials');
      console.log('Solutions:');
      console.log('1. Check if the app password is correct');
      console.log('2. Ensure 2-Factor Authentication is enabled on the Gmail account');
      console.log('3. Try generating a new app password');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Issue: Authentication failed');
      console.log('Solutions:');
      console.log('1. The app password might be incorrect');
      console.log('2. Check if the Gmail account has any restrictions');
      console.log('3. Verify the email address is correct');
    } else if (error.message.includes('Connection timeout')) {
      console.log('\n💡 Issue: Connection timeout');
      console.log('Solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Try a different port (465 with secure: true)');
      console.log('3. Check firewall settings');
    } else {
      console.log('\n💡 General troubleshooting:');
      console.log('1. Check if the Gmail account exists');
      console.log('2. Ensure 2-Factor Authentication is enabled');
      console.log('3. Verify the app password was generated correctly');
      console.log('4. Check if there are any Gmail account restrictions');
    }
  }
}

testEmail();
