const { OAuth2Client } = require('google-auth-library');

// Test the exact OAuth flow that's failing
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'https://decisionmaker.shrawantravels.com/api/auth/google/callback';

console.log('Testing OAuth Flow Configuration:');
console.log('================================');
console.log('Client ID:', clientId);
console.log('Client Secret:', clientSecret ? 'Present' : 'Missing');
console.log('Redirect URI:', redirectUri);

// Create OAuth2 client exactly like in the app
const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

console.log('\nOAuth2 Client Properties:');
console.log('Client ID:', oauth2Client._clientId);
console.log('Client Secret:', oauth2Client._clientSecret ? 'Present' : 'Missing');
console.log('Redirect URI:', oauth2Client.redirectUri);

// Generate auth URL to test
const scopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

try {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: 'test-user-id',
    prompt: 'consent'
  });
  
  console.log('\nAuth URL generated successfully');
  console.log('Length:', authUrl.length);
  console.log('Contains client_id:', authUrl.includes(clientId));
  console.log('Contains redirect_uri:', authUrl.includes(encodeURIComponent(redirectUri)));
  
} catch (error) {
  console.error('Error generating auth URL:', error);
}

// Test the specific configuration that Google expects
console.log('\n=== GOOGLE CLOUD CONSOLE REQUIREMENTS ===');
console.log('1. Authorized redirect URIs must include:');
console.log('   ', redirectUri);
console.log('2. Authorized domains must include:');
console.log('   - replit.dev');
console.log('   - janeway.replit.dev');
console.log('   - decisionmaker.shrawantravels.com');
console.log('3. Client ID should be:', clientId);
console.log('4. OAuth consent screen should have test users added');