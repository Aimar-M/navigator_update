# OAuth2 Setup for Gmail API

## ✅ Step 1: You Already Have OAuth2 Credentials!

Great news! You already have OAuth2 credentials set up for user authentication. We just need to add Gmail API permissions to your existing setup.

### **What You Already Have:**
- ✅ `GOOGLE_CLIENT_ID` - Your OAuth2 Client ID
- ✅ `GOOGLE_CLIENT_SECRET` - Your OAuth2 Client Secret  
- ✅ `BACKEND_URL` - Your backend URL for redirects

### **What We Need to Add:**
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

## Step 3: Get Refresh Token (No Editing Needed!)

Since you already have OAuth2 credentials, the script will automatically use them. No editing required!

1. **Run the script**
   ```bash
   node get-oauth2-token.js
   ```

2. **Follow the prompts**
   - The script will show your existing credentials status
   - Open the generated URL in your browser
   - Sign in with `info@navigatortrips.com`
   - Grant **Gmail send permissions** (this is the new part!)
   - Copy the authorization code from the callback URL
   - Paste it in the terminal

3. **Copy the output**
   - The script will output your NEW environment variables
   - You only need to add the refresh token and access token

## Step 4: Add to Railway

Add these **NEW** environment variables to your Railway project:
```
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_ACCESS_TOKEN=your-access-token
```

**Note:** You already have `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set up!

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
