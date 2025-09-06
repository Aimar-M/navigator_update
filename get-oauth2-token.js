const { google } = require('googleapis');
const readline = require('readline');

// OAuth2 setup for Gmail API - using existing credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID', // Use existing OAuth2 Client ID
  process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET', // Use same secret for both user auth and email sending
  process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/auth/google/callback` : 'http://localhost:3000/auth/google/callback'
);

// Gmail API scopes
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function getRefreshToken() {
  try {
    console.log('🔐 Getting OAuth2 refresh token for Gmail API...');
    console.log('🔍 Using your existing OAuth2 credentials:');
    console.log(`   Client ID: ${oauth2Client._clientId ? 'SET' : 'NOT SET'}`);
    console.log(`   Client Secret: ${oauth2Client._clientSecret ? 'SET' : 'NOT SET'}`);
    console.log(`   Redirect URI: ${oauth2Client._redirectUri}`);
    
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('\n📋 Follow these steps:');
    console.log('1. Open this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. Sign in with info@navigatortrips.com');
    console.log('3. Grant permissions to the app (Gmail send permission)');
    console.log('4. Copy the authorization code from the callback URL');
    console.log('\n5. Paste the authorization code below:');

    // Get authorization code from user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const authCode = await new Promise((resolve) => {
      rl.question('Authorization code: ', resolve);
    });

    rl.close();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    oauth2Client.setCredentials(tokens);

    console.log('\n✅ Success! Gmail API permissions added to your existing OAuth2 setup!');
    console.log('\n📧 Add these NEW environment variables to Railway:');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
    console.log('\n💡 Note: You already have GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set up!');

    // Test Gmail API
    console.log('\n🧪 Testing Gmail API...');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log('✅ Gmail API test successful!');
      console.log(`📧 Email: ${profile.data.emailAddress}`);
      console.log(`📊 Messages: ${profile.data.messagesTotal}`);
    } catch (error) {
      console.log('⚠️ Gmail API test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error getting refresh token:', error.message);
  }
}

getRefreshToken();