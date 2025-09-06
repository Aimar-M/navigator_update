# OAuth2 Setup for Gmail API

## ✅ Step 1: You Already Have OAuth2 Credentials!

Great news! You already have OAuth2 credentials set up for user authentication. We just need to create separate credentials for email sending.

### **What You Already Have:**
- ✅ `GOOGLE_CLIENT_ID` - Your OAuth2 Client ID (for user authentication)
- ✅ `GOOGLE_CLIENT_SECRET` - Your OAuth2 Client Secret (for user authentication)
- ✅ `BACKEND_URL` - Your backend URL for redirects

### **What We Need to Add:**
- 🔄 `GOOGLE_CLIENT_SECRET_EMAILS` - Separate secret for email sending
- 🔄 `GOOGLE_REFRESH_TOKEN` - For Gmail API access
- 🔄 `GOOGLE_ACCESS_TOKEN` - For Gmail API access

## Step 2: Enable Gmail API (if not already enabled)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project: `navigatorv2`

2. **Enable Gmail API**
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API"
   - Click **Enable** (if not already enabled)

## Step 3: Create Email OAuth2 Credentials

You need to create a separate OAuth2 client for email sending:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project: `navigatorv2`

2. **Create New OAuth2 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Choose **Web application**
   - Name: `Navigator Email API`
   - **Authorized redirect URIs**: Same as your existing one
   - Click **Create**

3. **Copy the Client Secret**
   - Copy the **Client Secret** (not the Client ID - use the same one)
   - This will be your `GOOGLE_CLIENT_SECRET_EMAILS`

## Step 4: Get Refresh Token

1. **Edit the script**
   ```bash
   # Open get-oauth2-token.js and replace:
   'YOUR_CLIENT_SECRET_EMAILS' → your new email Client Secret
   ```

2. **Run the script**
   ```bash
   node get-oauth2-token.js
   ```

3. **Follow the prompts**
   - The script will show your credentials status
   - Open the generated URL in your browser
   - Sign in with `info@navigatortrips.com`
   - Grant **Gmail send permissions**
   - Copy the authorization code from the callback URL
   - Paste it in the terminal

4. **Copy the output**
   - The script will output your environment variables
   - Copy them for Railway setup

## Step 5: Add to Railway

Add these **NEW** environment variables to your Railway project:
```
GOOGLE_CLIENT_SECRET_EMAILS=your-email-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_ACCESS_TOKEN=your-access-token
```

**Note:** You already have `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set up for user authentication!

## Step 4: Test

1. **Deploy to Railway**
2. **Test password reset** - it should now work with Gmail API
3. **Check logs** for success messages

## Troubleshooting

- **"Access blocked"**: Make sure you're signed in with `info@navigatortrips.com`
- **"Invalid client"**: Check your Client ID and Secret
- **"Redirect URI mismatch"**: Ensure the redirect URI matches exactly
- **"Scope not authorized"**: Make sure Gmail API is enabled

## Security Notes

- **Never commit** the refresh token to git
- **Keep credentials** secure in Railway environment variables
- **Refresh tokens** don't expire (unless revoked)
- **Access tokens** expire after 1 hour (automatically refreshed)
