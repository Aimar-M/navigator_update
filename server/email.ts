// import nodemailer from 'nodemailer'; // COMMENTED OUT - Using Gmail API only
import { sendEmailViaGmailAPI, getGmailAPIStatus } from './gmail-api';
import { safeErrorLog } from './error-logger';

// SMTP CODE COMMENTED OUT - Using Gmail API only
/*
// Create transporter with hardcoded credentials for info@navigatortrips.com
let transporter: nodemailer.Transporter | null = null;

try {
  // Try multiple Gmail configurations that might work with Railway
  const gmailConfigs = [
    // Config 1: Standard Gmail with service
    {
      service: 'gmail',
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'tpmp jfoc emgr nbgm',
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      pool: false,
      retryAttempts: 0,
      tls: { rejectUnauthorized: false }
    },
    // Config 2: Explicit host/port with STARTTLS
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'tpmp jfoc emgr nbgm',
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      pool: false,
      retryAttempts: 0,
      tls: { rejectUnauthorized: false }
    },
    // Config 3: SSL port 465
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'info@navigatortrips.com',
        pass: 'tpmp jfoc emgr nbgm',
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      pool: false,
      retryAttempts: 0,
      tls: { rejectUnauthorized: false }
    }
  ];

  // Try each configuration until one works
  for (let i = 0; i < gmailConfigs.length; i++) {
    try {
      console.log(`📧 [EMAIL] Trying Gmail config ${i + 1}/${gmailConfigs.length}...`);
      transporter = nodemailer.createTransport(gmailConfigs[i] as any);
      
      // Quick test connection
      await transporter.verify();
      console.log(`✅ [EMAIL] Gmail config ${i + 1} working!`);
      break;
    } catch (error: any) {
      console.log(`❌ [EMAIL] Gmail config ${i + 1} failed:`, error.message);
      if (i === gmailConfigs.length - 1) {
        throw error; // All configs failed
      }
    }
  }

  // Verify transporter configuration with retry
  const verifyConnection = async () => {
    try {
      await transporter!.verify();
      console.log('✅ SMTP server is ready to send emails from info@navigatortrips.com');
      return true;
    } catch (error: any) {
      console.error('❌ SMTP connection failed:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          command: error.command
        });
        console.log('💡 Troubleshooting tips:');
        console.log('   1. Check if the app password is correct');
        console.log('   2. Ensure 2FA is enabled on the email account');
        console.log('   3. Try generating a new app password from Gmail settings');
        console.log('   4. Check if the Gmail account has any restrictions');
      }
      console.warn('⚠️ Email functionality will be disabled');
      transporter = null;
      return false;
    }
  };

  // Skip initial verification completely for fastest startup
  console.log('📧 SMTP transporter created, ready for email sending');
} catch (error) {
  console.error('❌ Error creating SMTP transporter:', error);
  console.warn('⚠️ Email functionality will be disabled');
  transporter = null;
}
*/

// Health check function for production monitoring
export function getEmailStatus() {
  const gmailAPIStatus = getGmailAPIStatus();
  return {
    configured: gmailAPIStatus.configured,
    ready: gmailAPIStatus.configured,
    smtpConfigured: false, // SMTP disabled
    gmailAPIConfigured: gmailAPIStatus.configured,
    timestamp: new Date().toISOString()
  };
}

// Pre-warm the email connection for faster first email - COMMENTED OUT (SMTP disabled)
/*
export async function preWarmEmailConnection() {
  if (transporter) {
    try {
      await transporter.verify();
      console.log('✅ Email connection pre-warmed successfully');
    } catch (error) {
      console.log('⚠️ Email pre-warming skipped for faster startup');
    }
  }
}
*/

// Gmail API doesn't need pre-warming
export async function preWarmEmailConnection() {
  // Gmail API ready - no pre-warming needed
}


export async function sendEmail(to: string, subject: string, html: string) {
  // Check Gmail API status
  const gmailAPIStatus = getGmailAPIStatus();
  
  // Only use Gmail API - no SMTP fallback
  if (!gmailAPIStatus.configured) {
    const error = new Error('Gmail API not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY environment variables.');
    safeErrorLog('❌ [EMAIL] Gmail API not configured - email sending disabled', error);
    throw error;
  }

  try {
    return await sendEmailViaGmailAPI(to, subject, html);
  } catch (error: any) {
    safeErrorLog('❌ [EMAIL] Gmail API failed', error);
    throw error;
  }
}
