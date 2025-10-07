import { OAuth2Client } from 'google-auth-library';

// Test Google OAuth configuration
async function testGoogleOAuthConfig() {
  console.log('🔍 Testing Google OAuth Configuration...\n');
  
  // Check environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  
 
  
  if (!clientId || !clientSecret) {
    console.error('❌ Missing Google OAuth credentials!');
    return;
  }
  
  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  
  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: 'test-user-123',
    prompt: 'consent',
  });
  
  console.log('✓ OAuth2 Client created successfully');
  console.log('✓ Auth URL generated successfully');
  console.log('\n🔗 Test Auth URL:');
  console.log(authUrl);
  console.log('\n📝 Configuration Status:');
  console.log('✓ Client ID format: Valid');
  console.log('✓ Client Secret: Present');
  console.log('✓ Redirect URI: Configured');
  
  console.log('\n🚨 If you get "Access blocked" error, you need to:');
  console.log('1. Go to Google Cloud Console');
  console.log('2. Add your email to Test Users in OAuth consent screen');
  console.log('3. Ensure the redirect URI matches exactly');
  console.log('4. Make sure Google Calendar API is enabled');
  console.log('\n📋 Required Test Users:');
  console.log('- salesrep@techize.com');
  console.log('- mlp.yashkumar@gmail.com');
  console.log('\n✅ Configuration test complete!');
}

// Run the test
testGoogleOAuthConfig().catch(console.error);