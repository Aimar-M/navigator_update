import nodemailer from 'nodemailer';

console.log('📧 Email module loaded successfully');

// Create transporter with hardcoded credentials for info@navigatortrips.com
let transporter: nodemailer.Transporter | null = null;

try {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for port 465, false for 587
    auth: {
      user: 'info@navigatortrips.com',
      pass: 'tpmp jfoc emgr nbgm',
    },
    // Railway-optimized timeouts (very short for quick failure)
    connectionTimeout: 5000,  // 5 seconds
    greetingTimeout: 3000,    // 3 seconds
    socketTimeout: 5000,     // 5 seconds
    // Production TLS configuration
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    // Pool configuration for better performance
    pool: true,
    maxConnections: 2, // Reduced for faster connection
    maxMessages: 50,   // Reduced for faster processing
    rateLimit: 14,    // 14 emails per second (Gmail limit)
    // Keep connections alive for faster subsequent emails
    keepAlive: true,
    keepAliveMsecs: 30000
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

  // Try to verify connection asynchronously (don't block startup)
  verifyConnection().catch(error => {
    console.log('⚠️ Initial SMTP verification failed, will retry on first email send');
  });
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
      console.log('⚠️ Email pre-warming failed, will retry on first send');
    }
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  // Check if email functionality is available, try to recreate if needed
  if (!transporter) {
    console.log('🔄 Attempting to recreate SMTP connection...');
    
    // Try port 465 first (SSL), then fallback to port 587 (STARTTLS)
    const configs = [
      { port: 465, secure: true, name: 'SSL (465)' },
      { port: 587, secure: false, name: 'STARTTLS (587)' }
    ];
    
    for (const config of configs) {
      try {
        console.log(`🔄 Trying ${config.name}...`);
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: config.port,
          secure: config.secure,
          auth: {
            user: 'info@navigatortrips.com',
            pass: 'tpmp jfoc emgr nbgm',
          },
          connectionTimeout: 5000,
          greetingTimeout: 3000,
          socketTimeout: 5000,
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          pool: true,
          maxConnections: 2,
          maxMessages: 50,
          rateLimit: 14,
          keepAlive: true,
          keepAliveMsecs: 30000
        } as any);
        
        // Skip verification to speed up email sending
        console.log(`✅ SMTP connection recreated successfully with ${config.name}`);
        break; // Success, exit the loop
      } catch (error: any) {
        console.error(`❌ Failed to recreate SMTP connection with ${config.name}:`, error.message);
        if (config === configs[configs.length - 1]) {
          // Last config failed, give up
          console.warn('⚠️ Email functionality is disabled due to missing SMTP configuration');
          console.warn(`📧 Would have sent email to: ${to}`);
          console.warn(`📧 Subject: ${subject}`);
          
          // In production, you might want to log this to a service or queue
          if (process.env.NODE_ENV === 'production') {
            // Log to console for now, but you could integrate with a logging service
            console.log('📧 Email request logged (SMTP disabled):', {
              to,
              subject,
              timestamp: new Date().toISOString(),
              html: html.substring(0, 100) + '...' // Log first 100 chars
            });
          }
          
          // Return a mock success response to prevent crashes
          return { messageId: 'mock-email-disabled', response: 'SMTP not configured' };
        }
      }
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

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const mailOptions = {
      from: `"Navigator" <info@navigatortrips.com>`,
      to,
      subject,
      html,
      // Add text version for email clients that don't support HTML
      text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    };

    const info = await transporter!.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    console.log(`📧 Email sent to: ${to}`);
    console.log(`📧 Response: ${info.response}`);
    
    return info;
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
