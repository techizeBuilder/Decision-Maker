import { OAuth2Client } from 'google-auth-library';

async function verifyGoogleConfig() {
  console.log('=== Google Cloud Console Configuration Verification ===\n');
  
  // Our current configuration
  const CLIENT_ID = '917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com';
  const CLIENT_SECRET = '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';
  const REDIRECT_URI = 'https://decisionmaker.shrawantravels.com/api/auth/google/callback';
  
  console.log('Current Configuration:');
  console.log('- Client ID:', CLIENT_ID);
  console.log('- Client Secret:', CLIENT_SECRET);
  console.log('- Redirect URI:', REDIRECT_URI);
  console.log('');
  
  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  
  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    prompt: 'consent',
    state: 'test-user-id'
  });
  
  console.log('✓ OAuth2 Client created successfully');
  console.log('✓ Auth URL generated successfully');
  console.log('');
  
  console.log('NEXT STEPS:');
  console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials');
  console.log('2. Find OAuth 2.0 Client ID:', CLIENT_ID);
  console.log('3. Add this EXACT redirect URI:');
  console.log('   ', REDIRECT_URI);
  console.log('4. Go to OAuth consent screen and add test user: salesrep@techize.com');
  console.log('5. Enable Google Calendar API in the API Library');
  console.log('');
  
  console.log('Test Auth URL (use this to test manually):');
  console.log(authUrl);
  console.log('');
  
  console.log('Expected Error Until Fixed:');
  console.log('- Error: invalid_client');
  console.log('- Description: Unauthorized');
  console.log('- Status: 401');
  console.log('');
  
  console.log('This error means Google Cloud Console is NOT configured correctly.');
  console.log('Follow the steps above to fix the configuration.');
}

verifyGoogleConfig().catch(console.error);