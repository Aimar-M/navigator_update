// Quick email test script
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'tpmp jfoc emgr nbgm',
      },
      connectionTimeout: 5000,
      greetingTimeout: 3000,
      socketTimeout: 10000,
      pool: false,
      retryDelay: 500,
      retryAttempts: 1,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('📧 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: '"Navigator Test" <info@navigatortrips.com>',
      to: 'muhirwa.aimar@gmail.com',
      subject: 'Test Email - Navigator',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP is working.</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error command:', error.command);
  }
}

testEmail();
