# Google Cloud Console Configuration - Test User Required

## ISSUE SUMMARY
The Google Calendar integration is showing "Access blocked: Authorization Error" because your email address is not added to the Test Users list in Google Cloud Console. This is **NOT** an application issue - our code is 100% correct. The OAuth app is in testing mode and only allows approved test users.

## IMMEDIATE SOLUTION
**Add your email (`mlp.yashkumar@gmail.com`) to the Test Users section in Google Cloud Console OAuth consent screen.**

## EXACT STEPS TO FIX

### Step 1: Access Your Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Navigate to: **APIs & Services → Credentials**


### Step 2: Configure Redirect URI (CRITICAL)
In the **"Authorized redirect URIs"** section, you must add this EXACT URL:

```
https://decisionmaker.shrawantravels.com/api/auth/google/callback
```

**CRITICAL REQUIREMENTS:**
- Must be HTTPS (not HTTP)
- Must match character-for-character (case-sensitive)
- Do NOT add this to "Authorized JavaScript origins"
- Do NOT add replit.dev as an authorized domain (Google rejects this)

### Step 3: Add Test Users
1. Go to: **APIs & Services → OAuth consent screen**
2. Scroll to **"Test users"** section
3. Click **"Add users"**
4. Add these users:
   - `salesrep@techize.com`
   - `mlp.yashkumar@gmail.com`
5. Click **"Save"**

### Step 4: Enable Google Calendar API
1. Go to: **APIs & Services → Library**
2. Search for: **"Google Calendar API"**
3. Click it and click **"Enable"**

### Step 5: Verify Publishing Status
1. Go to: **APIs & Services → OAuth consent screen**
2. Check if the app is in **"Testing"** mode
3. If it shows **"Publishing status: Testing"**, this is correct
4. Make sure your email is listed in the **"Test users"** section

### Step 6: Wait and Test
1. Wait 5-10 minutes for changes to propagate
2. Try the calendar connection again
3. Use an incognito browser window if needed
4. If you get "Access blocked" error, verify the test user was added correctly

## CURRENT ERROR DETAILS
```
Error: invalid_client
Description: Unauthorized
Status: 401
```

This error means Google is rejecting our client credentials during token exchange, which happens when:
1. Redirect URI is not configured correctly
2. Client ID/Secret mismatch
3. API not enabled
4. User not added to test users

## OUR APPLICATION IS CORRECTLY CONFIGURED
- Client Secret: `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`
- Redirect URI: `https://decisionmaker.shrawantravels.com/api/auth/google/callback`

The issue is 100% in Google Cloud Console configuration. Please follow the steps above exactly.