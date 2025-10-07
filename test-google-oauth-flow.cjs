const { OAuth2Client } = require('google-auth-library');

async function testGoogleOAuthFlow() {
  console.log('=== TESTING GOOGLE OAUTH FLOW ===');
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = 'https://decisionmaker.shrawantravels.com/api/auth/google/callback';
  
  // Create OAuth2 client exactly like in the app
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  
  console.log('OAuth2 Client Configuration:');
  console.log('Client ID:', oauth2Client._clientId);
  console.log('Client Secret:', oauth2Client._clientSecret ? 'Present' : 'Missing');
  console.log('Redirect URI:', oauth2Client.redirectUri);
  
  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state: 'test-user-id',
    prompt: 'consent'
  });
  
  console.log('\nGenerated Auth URL:');
  console.log('URL:', authUrl);
  console.log('Length:', authUrl.length);
  
  // Parse URL to check parameters
  const url = new URL(authUrl);
  console.log('\nURL Parameters:');
  console.log('client_id:', url.searchParams.get('client_id'));
  console.log('redirect_uri:', url.searchParams.get('redirect_uri'));
  console.log('response_type:', url.searchParams.get('response_type'));
  console.log('scope:', url.searchParams.get('scope'));
  console.log('state:', url.searchParams.get('state'));
  console.log('access_type:', url.searchParams.get('access_type'));
  console.log('prompt:', url.searchParams.get('prompt'));
  
  // Test token exchange (this will fail without a real code, but let's see the error)
  console.log('\n=== TESTING TOKEN EXCHANGE ===');
  try {
    // This will fail but we can see the error format
    await oauth2Client.getToken('fake-code');
  } catch (error) {
    console.log('Expected error (using fake code):');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error response:', error.response?.data);
    
    // Check if it's the same error we're seeing
    if (error.response?.data?.error === 'invalid_client') {
      console.log('\n⚠️  SAME ERROR AS IN APP - This confirms the issue is with Google Cloud Console configuration');
    } else {
      console.log('\n✓ Different error - This suggests our OAuth client is configured correctly');
    }
  }
}

testGoogleOAuthFlow().catch(console.error);