import nodemailer from 'nodemailer';

console.log('🔍 Testing Alternative Gmail Configurations...\n');

// Test different Gmail configurations
const configs = [
  {
    name: 'Gmail SMTP (Port 587)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'fdyn bfuv ykxh tqry'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
    }
  },
  {
    name: 'Gmail SMTP (Port 465)',
    config: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'fdyn bfuv ykxh tqry'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
    }
  },
  {
    name: 'Gmail SMTP (Port 587 with TLS)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'fdyn bfuv ykxh tqry'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
    }
  }
];

async function testConfig(configName, config) {
  console.log(`\n🧪 Testing: ${configName}`);
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Secure: ${config.secure}`);
  console.log(`  User: ${config.auth.user}`);
  
  const transporter = nodemailer.createTransporter(config);
  
  try {
    console.log('  🔍 Testing connection...');
    await transporter.verify();
    console.log('  ✅ Connection successful!');
    
    // Try sending a test email
    console.log('  📧 Testing email sending...');
    const testEmail = {
      from: `"Navigator" <info@navigatortrips.com>`,
      to: 'info@navigatortrips.com',
      subject: `🧪 Test - ${configName}`,
      text: `This is a test email using ${configName} configuration.`
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('  ✅ Email sent successfully!');
    console.log(`  📧 Message ID: ${info.messageId}`);
    return { success: true, config: configName };
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    return { success: false, config: configName, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Testing all Gmail configurations...\n');
  
  const results = [];
  
  for (const config of configs) {
    const result = await testConfig(config.name, config.config);
    results.push(result);
  }
  
  console.log('\n📊 Results Summary:');
  console.log('==================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful configurations:');
    successful.forEach(r => console.log(`  - ${r.config}`));
    
    console.log('\n🎉 Recommendation:');
    console.log(`Use the "${successful[0].config}" configuration.`);
    
    const workingConfig = configs.find(c => c.name === successful[0].config);
    console.log('\n📋 Working configuration:');
    console.log(`SMTP_HOST=${workingConfig.config.host}`);
    console.log(`SMTP_PORT=${workingConfig.config.port}`);
    console.log(`SMTP_USER=${workingConfig.config.auth.user}`);
    console.log(`SMTP_PASS=${workingConfig.config.auth.pass}`);
    console.log(`SMTP_SECURE=${workingConfig.config.secure}`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed configurations:');
    failed.forEach(r => console.log(`  - ${r.config}: ${r.error}`));
  }
  
  if (successful.length === 0) {
    console.log('\n❌ All configurations failed.');
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Check if the app password is correct');
    console.log('2. Ensure 2-Factor Authentication is enabled on the Gmail account');
    console.log('3. Try generating a new app password');
    console.log('4. Check if the Gmail account has any restrictions');
    console.log('5. Verify the email address is correct');
  }
}

runAllTests().catch(console.error);
