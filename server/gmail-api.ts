import { google } from 'googleapis';

console.log('📧 Gmail API module loaded successfully');

// Gmail API configuration
const gmail = google.gmail({ version: 'v1' });

// Create OAuth2 client with app credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || 'your-client-id',
  process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

// Set credentials (you'll need to get these from Gmail API)
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN || 'your-refresh-token',
  access_token: process.env.GOOGLE_ACCESS_TOKEN || 'your-access-token'
});

// Use service account (recommended for server-to-server)
const serviceAccountAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'navigator-email-service@navigatorv2.iam.gserviceaccount.com',
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n') || 'your-private-key',
  },
  scopes: ['https://www.googleapis.com/auth/gmail.send'],
});

// Function to send email via Gmail API
export async function sendEmailViaGmailAPI(to: string, subject: string, html: string) {
  try {
    console.log('🚀 [GMAIL-API] Starting Gmail API email send');
    console.log('🚀 [GMAIL-API] Parameters:', { to, subject, htmlLength: html.length });

    // Create the email message
    const message = {
      to: to,
      from: 'Navigator <info@navigatortrips.com>',
      subject: subject,
      html: html,
    };

    // Encode the email message
    const encodedMessage = Buffer.from(
      `To: ${message.to}\r\n` +
      `From: ${message.from}\r\n` +
      `Subject: ${message.subject}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `MIME-Version: 1.0\r\n` +
      `\r\n` +
      `${message.html}`
    ).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

    console.log('📧 [GMAIL-API] Message encoded, sending via Gmail API...');

    // Send the email
    const response = await gmail.users.messages.send({
      auth: serviceAccountAuth,
      userId: 'me', // Use 'me' for the authenticated user
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('✅ [GMAIL-API] Email sent successfully via Gmail API');
    console.log('📧 [GMAIL-API] Message ID:', response.data.id);
    console.log('📧 [GMAIL-API] Thread ID:', response.data.threadId);

    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
      response: 'Gmail API success'
    };

  } catch (error: any) {
    console.error('❌ [GMAIL-API] Failed to send email via Gmail API:', error.message);
    console.error('❌ [GMAIL-API] Error details:', {
      code: error.code,
      status: error.status,
      response: error.response?.data,
      stack: error.stack?.substring(0, 200) + '...'
    });
    throw error;
  }
}

// Health check function
export function getGmailAPIStatus() {
  return {
    configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    ready: true,
    timestamp: new Date().toISOString()
  };
}
