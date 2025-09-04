import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

console.log('🔍 Checking navigatortrips.com domain configuration...\n');

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
    console.log('\n💡 If email is still not working, the issue might be:');
    console.log('1. Gmail app password configuration');
    console.log('2. 2-Factor Authentication not enabled');
    console.log('3. Gmail account restrictions');
    console.log('4. Network/firewall issues');
    
  } catch (error) {
    console.error('❌ Error checking domain:', error.message);
    console.log('\n💡 This might indicate:');
    console.log('1. Domain DNS issues');
    console.log('2. Network connectivity problems');
    console.log('3. DNS resolution issues');
  }
}

checkDomain();
