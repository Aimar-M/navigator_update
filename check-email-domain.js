import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

console.log('🔍 Checking navigatortrips.com domain and email configuration...\n');

async function checkDomain() {
  const domain = 'navigatortrips.com';
  
  try {
    console.log(`📧 Checking MX records for ${domain}...`);
    const mxRecords = await resolveMx(domain);
    console.log('✅ MX records found:');
    mxRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.exchange} (priority: ${record.priority})`);
    });
    
    console.log('\n📧 Checking TXT records for ${domain}...');
    const txtRecords = await resolveTxt(domain);
    console.log('✅ TXT records found:');
    txtRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.join('')}`);
    });
    
    console.log('\n📧 Checking SPF records...');
    const spfRecords = txtRecords.filter(record => 
      record.join('').toLowerCase().includes('v=spf1')
    );
    
    if (spfRecords.length > 0) {
      console.log('✅ SPF record found:');
      spfRecords.forEach(record => console.log(`  ${record.join('')}`));
    } else {
      console.log('⚠️ No SPF record found. This might affect email delivery.');
    }
    
    console.log('\n📧 Checking DMARC records...');
    const dmarcRecords = await resolveTxt('_dmarc.' + domain).catch(() => []);
    if (dmarcRecords.length > 0) {
      console.log('✅ DMARC record found:');
      dmarcRecords.forEach(record => console.log(`  ${record.join('')}`));
    } else {
      console.log('⚠️ No DMARC record found. This might affect email delivery.');
    }
    
    console.log('\n🎉 Domain configuration looks good!');
    
  } catch (error) {
    console.error('❌ Error checking domain:', error.message);
    console.log('\n💡 This might indicate:');
    console.log('1. Domain DNS issues');
    console.log('2. Network connectivity problems');
    console.log('3. DNS resolution issues');
  }
}

async function checkGmailAccount() {
  console.log('\n📧 Checking Gmail account configuration...');
  
  // Test if we can connect to Gmail SMTP
  const nodemailer = await import('nodemailer');
  
  const transporter = nodemailer.default.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'info@navigatortrips.com',
      pass: 'fdyn bfuv ykxh tqry'
    }
  });
  
  try {
    console.log('🔍 Testing Gmail SMTP connection...');
    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!');
    console.log('✅ The Gmail account and app password are working correctly.');
  } catch (error) {
    console.error('❌ Gmail SMTP connection failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Gmail Account Issues:');
      console.log('1. The app password might be incorrect');
      console.log('2. 2-Factor Authentication might not be enabled');
      console.log('3. The email address might be wrong');
      console.log('4. The Gmail account might not exist');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Gmail Authentication Issues:');
      console.log('1. The app password might be expired or revoked');
      console.log('2. The Gmail account might have restrictions');
      console.log('3. There might be security alerts on the account');
    }
  }
}

async function runChecks() {
  await checkDomain();
  await checkGmailAccount();
  
  console.log('\n📋 Summary:');
  console.log('If domain checks passed but Gmail connection failed:');
  console.log('- The issue is with the Gmail account configuration');
  console.log('- Check 2-Factor Authentication and App Password settings');
  console.log('');
  console.log('If both domain and Gmail checks failed:');
  console.log('- There might be network or DNS issues');
  console.log('- Try from a different network or location');
}

runChecks().catch(console.error);
