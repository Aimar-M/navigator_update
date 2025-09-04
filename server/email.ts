import nodemailer from 'nodemailer';

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ Missing SMTP environment variables:', missingVars);
  console.warn('Email functionality will be disabled. Please set the following environment variables:');
  missingVars.forEach(varName => console.warn(`  - ${varName}`));
  
  // In production, don't crash the server, just warn
  if (process.env.NODE_ENV === 'production') {
    console.warn('🚨 Server will start but email functionality will be disabled');
  } else {
    console.error('❌ Development mode: Server cannot start without SMTP configuration');
    process.exit(1);
  }
}

// Create transporter only if all required variables are present
let transporter: nodemailer.Transporter | null = null;

if (missingVars.length === 0) {
  transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
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
      console.log('✅ SMTP server is ready to send emails');
    }
  });
} else {
  console.warn('⚠️ No SMTP transporter created due to missing configuration');
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