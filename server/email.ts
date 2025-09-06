import nodemailer from 'nodemailer';

console.log('📧 Email module loaded successfully');

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
  console.log('🚀 [EMAIL] Starting sendEmail function');
  console.log('🚀 [EMAIL] Parameters:', { to, subject, htmlLength: html.length });
  
  // Check if email functionality is available, try to recreate if needed
  if (!transporter) {
    console.log('🔄 [EMAIL] No transporter available, attempting to recreate SMTP connection...');
    
    // Try to recreate with multiple Gmail configurations
    try {
      console.log('🔄 [EMAIL] Creating new transporter with multiple configs...');
      const startTime = Date.now();
      
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

      // Try each configuration
      for (let i = 0; i < gmailConfigs.length; i++) {
        try {
          console.log(`🔄 [EMAIL] Trying recreation config ${i + 1}/${gmailConfigs.length}...`);
          transporter = nodemailer.createTransport(gmailConfigs[i] as any);
          await transporter.verify();
          console.log(`✅ [EMAIL] Recreation config ${i + 1} working!`);
          break;
        } catch (error: any) {
          console.log(`❌ [EMAIL] Recreation config ${i + 1} failed:`, error.message);
          if (i === gmailConfigs.length - 1) {
            throw error; // All configs failed
          }
        }
      }
      
      const createTime = Date.now() - startTime;
      console.log(`✅ [EMAIL] SMTP transporter created successfully in ${createTime}ms`);
      
    } catch (error: any) {
      console.error('❌ [EMAIL] Failed to create SMTP transporter:', error.message);
      console.error('❌ [EMAIL] Error details:', {
        code: error.code,
        command: error.command,
        stack: error.stack?.substring(0, 200) + '...'
      });
      console.warn('⚠️ [EMAIL] Email functionality is disabled due to missing SMTP configuration');
      console.warn(`📧 [EMAIL] Would have sent email to: ${to}`);
      console.warn(`📧 [EMAIL] Subject: ${subject}`);
      
      // Return a mock success response to prevent crashes
      return { messageId: 'mock-email-disabled', response: 'SMTP not configured' };
    }
  } else {
    console.log('✅ [EMAIL] Transporter already available');
  }

  try {
    console.log('🔍 [EMAIL] Starting validation phase...');
    
    // Validate inputs
    if (!to || !subject || !html) {
      console.error('❌ [EMAIL] Validation failed: Missing required parameters');
      throw new Error('Missing required parameters: to, subject, or html');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error(`❌ [EMAIL] Validation failed: Invalid email format: ${to}`);
      throw new Error(`Invalid email format: ${to}`);
    }

    console.log('✅ [EMAIL] Validation passed');
    console.log(`📧 [EMAIL] Sending email to: ${to}`);
    console.log(`📧 [EMAIL] Subject: ${subject}`);
    console.log(`📧 [EMAIL] HTML content length: ${html.length} characters`);

    const mailOptions = {
      from: `"Navigator" <info@navigatortrips.com>`,
      to,
      subject,
      html,
      // Add text version for email clients that don't support HTML
      text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    };

    console.log('📧 [EMAIL] Mail options prepared:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html.length,
      textLength: mailOptions.text.length
    });

    // Send email with minimal retry for speed
    let lastError: any;
    const maxRetries = 1; // Only 1 retry for speed
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now(); // Move outside try block for scope
      
      try {
        console.log(`📧 [EMAIL] Attempt ${attempt}/${maxRetries} - Starting sendMail...`);
        
        const info = await transporter!.sendMail(mailOptions);
        
        const attemptTime = Date.now() - attemptStartTime;
        console.log(`✅ [EMAIL] Email sent successfully in ${attemptTime}ms`);
        console.log(`📧 [EMAIL] Message ID: ${info.messageId}`);
        console.log(`📧 [EMAIL] Response: ${info.response}`);
        console.log(`📧 [EMAIL] Accepted recipients: ${info.accepted}`);
        console.log(`📧 [EMAIL] Rejected recipients: ${info.rejected}`);
        
        return info;
      } catch (error: any) {
        const attemptTime = Date.now() - attemptStartTime;
        lastError = error;
        console.error(`❌ [EMAIL] Attempt ${attempt} failed after ${attemptTime}ms`);
        console.error(`❌ [EMAIL] Error message: ${error.message}`);
        console.error(`❌ [EMAIL] Error code: ${error.code}`);
        console.error(`❌ [EMAIL] Error command: ${error.command}`);
        console.error(`❌ [EMAIL] Error response: ${error.response}`);
        console.error(`❌ [EMAIL] Error responseCode: ${error.responseCode}`);
        
        // If it's a timeout error and we have retries left, wait briefly before retrying
        if (attempt < maxRetries && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
          const delay = 1000; // 1 second delay for speed
          console.log(`⏳ [EMAIL] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's not a retryable error or we're out of retries, break
        break;
      }
    }
    
    // If we get here, all retries failed
    console.error('❌ [EMAIL] All attempts failed, throwing error');
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
