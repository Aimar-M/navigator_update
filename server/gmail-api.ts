import { google } from 'googleapis';
import { safeErrorLog } from './error-logger';

// Gmail API configuration
const gmail = google.gmail({ version: 'v1' });

// Create OAuth2 client for Gmail API using existing credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET, // Use same secret for both user auth and email sending
  process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/auth/google/callback` : 'http://localhost:3000/auth/google/callback'
);

// Set OAuth2 credentials for Gmail API
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    access_token: process.env.GOOGLE_ACCESS_TOKEN
  });
  
  // Auto-refresh access token when it expires
  oauth2Client.on('tokens', (tokens) => {
    // Token refresh handled automatically - no logging needed
  });
}

// Alternative: Use service account with domain-wide delegation (if available)
let serviceAccountAuth: any = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccountAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });
  } catch (error) {
    safeErrorLog('⚠️ [GMAIL-API] Service account auth failed', error);
  }
}

// Function to send email via Gmail API
export async function sendEmailViaGmailAPI(to: string, subject: string, html: string) {
  try {
    // Check which authentication method to use
    const hasOAuth2 = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
    const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    if (!hasOAuth2 && !hasServiceAccount) {
      throw new Error('No Gmail API authentication configured. Need either OAuth2 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) or Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY)');
    }

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

    // Choose authentication method
    const authMethod = hasOAuth2 ? oauth2Client : serviceAccountAuth;

    // Send the email
    const response = await gmail.users.messages.send({
      auth: authMethod,
      userId: 'me', // Use 'me' for the authenticated user
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
      response: 'Gmail API success'
    };

  } catch (error: any) {
    safeErrorLog('❌ [GMAIL-API] Failed to send email via Gmail API', error);
    throw error;
  }
}

// Health check function
export function getGmailAPIStatus() {
  // Check OAuth2 credentials
  const hasOAuth2ClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasOAuth2ClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const hasOAuth2RefreshToken = !!process.env.GOOGLE_REFRESH_TOKEN;
  const hasOAuth2AccessToken = !!process.env.GOOGLE_ACCESS_TOKEN;
  const oauth2Configured = hasOAuth2ClientId && hasOAuth2ClientSecret && hasOAuth2RefreshToken;
  
  // Check Service Account credentials
  const hasServiceAccountEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const serviceAccountConfigured = hasServiceAccountEmail && hasServiceAccountKey;
  
  // Overall configuration status
  const configured = oauth2Configured || serviceAccountConfigured;
  
  return {
    configured,
    ready: configured,
    oauth2Configured,
    serviceAccountConfigured,
    hasOAuth2ClientId,
    hasOAuth2ClientSecret,
    hasOAuth2RefreshToken,
    hasOAuth2AccessToken,
    hasServiceAccountEmail,
    hasServiceAccountKey,
    timestamp: new Date().toISOString()
  };
}
