import nodemailer from 'nodemailer';

// Create transporter with hardcoded credentials for info@navigatortrips.com
let transporter: nodemailer.Transporter | null = null;

try {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: 'info@navigatortrips.com',
      pass: 'fdyn bfuv ykxh tqry',
    },
    // Add connection timeout and greeting timeout for better reliability
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
  });

  // Verify transporter configuration
  transporter.verify(function(error, success) {
    if (error) {
      console.error('❌ SMTP connection failed:', error);
      console.warn('⚠️ Email functionality will be disabled');
      transporter = null;
    } else {
      console.log('✅ SMTP server is ready to send emails from info@navigatortrips.com');
    }
  });
} catch (error) {
  console.error('❌ Error creating SMTP transporter:', error);
  console.warn('⚠️ Email functionality will be disabled');
  transporter = null;
}

export async function sendEmail(to: string, subject: string, html: string) {
  // Check if email functionality is available
  if (!transporter) {
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

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    console.log(`📧 Email sent to: ${to}`);
    console.log(`📧 Response: ${info.response}`);
    
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error(`📧 Failed to send email to: ${to}`);
    console.error(`📧 Subject: ${subject}`);
    
    // Log additional error details for debugging
    if (error instanceof Error) {
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
