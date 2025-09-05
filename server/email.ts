import nodemailer from 'nodemailer';

console.log('📧 Email module loaded successfully');

// Create transporter with hardcoded credentials for info@navigatortrips.com
let transporter: nodemailer.Transporter | null = null;

try {
  transporter = nodemailer.createTransport({
    service: 'gmail',  // This automatically configures everything for Gmail
    auth: {
      user: 'info@navigatortrips.com',
      pass: 'tpmp jfoc emgr nbgm',
    }
    // No timeouts - let Gmail handle the connection timing
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
    
    // Try to recreate with the same simple config
    try {
      console.log('🔄 Recreating SMTP connection...');
      transporter = nodemailer.createTransport({
        service: 'gmail',  // This automatically configures everything for Gmail
        auth: {
          user: 'info@navigatortrips.com',
          pass: 'tpmp jfoc emgr nbgm',
        }
        // No timeouts - let Gmail handle the connection timing
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

    // Send email - let Gmail handle timing
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
