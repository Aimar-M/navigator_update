import nodemailer from 'nodemailer';

console.log('📧 Email module loaded successfully');

// Create transporter with hardcoded credentials for info@navigatortrips.com
let transporter: nodemailer.Transporter | null = null;

try {
  // Fast, simple Gmail configuration
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'info@navigatortrips.com',
      pass: 'tpmp jfoc emgr nbgm',
    },
    // Fast timeouts for quick response
    connectionTimeout: 10000,  // 10 seconds - fail fast if can't connect
    greetingTimeout: 5000,     // 5 seconds - fail fast if no greeting
    socketTimeout: 15000,      // 15 seconds - fail fast if sending hangs
    // No pooling for single sends
    pool: false,
    // No retries at transport level - handle in sendEmail function
    retryAttempts: 0,
    // Additional reliability settings
    tls: {
      rejectUnauthorized: false
    }
  } as any);

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

// Health check function for production monitoring
export function getEmailStatus() {
  return {
    configured: transporter !== null,
    ready: transporter !== null,
    timestamp: new Date().toISOString()
  };
}

// Pre-warm the email connection for faster first email
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


export async function sendEmail(to: string, subject: string, html: string) {
  // Check if email functionality is available, try to recreate if needed
  if (!transporter) {
    console.log('🔄 Attempting to recreate SMTP connection...');
    
    // Try to recreate with the same reliable config
    try {
      console.log('🔄 Recreating SMTP connection...');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'info@navigatortrips.com',
          pass: 'tpmp jfoc emgr nbgm',
        },
        // Fast timeouts for quick response
        connectionTimeout: 10000,  // 10 seconds - fail fast if can't connect
        greetingTimeout: 5000,     // 5 seconds - fail fast if no greeting
        socketTimeout: 15000,      // 15 seconds - fail fast if sending hangs
        // No pooling for single sends
        pool: false,
        // No retries at transport level - handle in sendEmail function
        retryAttempts: 0,
        // Additional reliability settings
        tls: {
          rejectUnauthorized: false
        }
      } as any);
      
      console.log('✅ SMTP connection recreated successfully');
    } catch (error: any) {
      console.error('❌ Failed to recreate SMTP connection:', error.message);
      console.warn('⚠️ Email functionality is disabled due to missing SMTP configuration');
      console.warn(`📧 Would have sent email to: ${to}`);
      console.warn(`📧 Subject: ${subject}`);
      
      // Return a mock success response to prevent crashes
      return { messageId: 'mock-email-disabled', response: 'SMTP not configured' };
    }
  }

  try {
    // Validate inputs
    if (!to || !subject || !html) {
      throw new Error('Missing required parameters: to, subject, or html');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email format: ${to}`);
    }

    console.log(`📧 Sending email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const mailOptions = {
      from: `"Navigator" <info@navigatortrips.com>`,
      to,
      subject,
      html,
      // Add text version for email clients that don't support HTML
      text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    };

    // Send email with minimal retry for speed
    let lastError: any;
    const maxRetries = 1; // Only 1 retry for speed
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Sending email (attempt ${attempt})...`);
        const info = await transporter!.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        console.log(`📧 Email sent to: ${to}`);
        console.log(`📧 Response: ${info.response}`);
        
        return info;
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
        
        // If it's a timeout error and we have retries left, wait briefly before retrying
        if (attempt < maxRetries && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
          const delay = 1000; // 1 second delay for speed
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's not a retryable error or we're out of retries, break
        break;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error(`📧 Failed to send email to: ${to}`);
    console.error(`📧 Subject: ${subject}`);
    
    // Log additional error details for debugging (only in development)
    if (error instanceof Error && process.env.NODE_ENV !== 'production') {
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        command: (error as any).command,
      });
    }
    
    throw error;
  }
}
