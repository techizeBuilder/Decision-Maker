# Google Cloud Console - EXACT Configuration Steps

## Issue Confirmed
- ✅ App configuration is 100% correct
- ✅ OAuth client setup is perfect
- ✅ Credentials are valid
- ❌ Google Cloud Console reject client during token exchange

## EXACT Steps to Fix in Google Cloud Console

### Step 1: Access OAuth Client Settings
1. Go to: https://console.cloud.google.com/
2. Navigate to: **APIs & Services > Credentials**
3. Find your OAuth 2.0 Client ID: `917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com`
4. **Click on it** to open configuration

### Step 2: Configure Authorized Redirect URIs
In the OAuth client configuration page:

1. Find section: **"Authorized redirect URIs"**
2. Click **"Add URI"**
3. Add exactly: `https://decisionmaker.shrawantravels.com/api/auth/google/callback`
4. **Important**: Must be HTTPS, must match exactly including case
5. Click **"Save"**

### Step 3: OAuth Consent Screen
1. Go to: **APIs & Services > OAuth consent screen**
2. Scroll to **"Test users"** section
3. Click **"Add users"**
4. Add: `mlp.yashvantgupta@gmail.com`
5. Click **"Save"**

### Step 4: Enable APIs
1. Go to: **APIs & Services > Library**
2. Search for: **"Google Calendar API"**
3. Click it and click **"Enable"**

### Step 5: Verify Configuration
After saving all changes, verify:
- ✅ Redirect URI is exactly: `https://decisionmaker.shrawantravels.com/api/auth/google/callback`
- ✅ Test user `mlp.yashvantgupta@gmail.com` is added
- ✅ Google Calendar API is enabled
- ✅ OAuth consent screen shows "Testing" status

## Common Issues & Solutions

### Issue: "Invalid domain" error
- **Skip authorized domains** - leave empty for development
- Google rejects `replit.dev` subdomains as "not top private domains"

### Issue: Still getting "invalid_client"
- **Double-check redirect URI** - must match exactly
- **Wait 5-10 minutes** after saving changes
- **Clear browser cache** and try again

### Issue: "Access blocked" error
- **Add your email as test user** in OAuth consent screen
- **Verify app is in "Testing" mode** not "Production"

## Test Steps After Configuration
1. Click "Reauth" button in the app
2. You should see Google OAuth consent screen
3. Grant calendar permissions
4. Should redirect back to app with success message

## Still Not Working?
If you're still getting "invalid_client" after following these exact steps:
1. Wait 10-15 minutes (Google changes can take time to propagate)
2. Try using an incognito/private browser window
3. Clear all cookies and cache
4. Double-check the Client ID and Client Secret match exactly