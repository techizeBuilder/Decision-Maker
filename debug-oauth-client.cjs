const { OAuth2Client } = require('google-auth-library');

console.log('=== DEBUGGING OAUTH CLIENT CONFIGURATION ===');

// Test with different redirect URI formats
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const redirectUris = [
  'https://decisionmaker.shrawantravels.com/api/auth/google/callback',
  'http://localhost:5000/api/auth/google/callback',
  'https://localhost:5000/api/auth/google/callback'
];

console.log('Testing different redirect URI configurations:');

redirectUris.forEach((uri, index) => {
  console.log(`\n${index + 1}. Testing: ${uri}`);
  
  try {
    const client = new OAuth2Client(clientId, clientSecret, uri);
    console.log('   ✓ OAuth2Client created successfully');
    console.log('   Client ID:', client._clientId);
    console.log('   Redirect URI:', client.redirectUri);
    
    // Test auth URL generation
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      state: 'test-state'
    });
    console.log('   ✓ Auth URL generated successfully');
    console.log('   URL length:', authUrl.length);
    
  } catch (error) {
    console.log('   ✗ Error:', error.message);
  }
});



// Test if we can create a simple OAuth client
console.log('\n=== SIMPLE OAUTH CLIENT TEST ===');
try {
  const simpleClient = new OAuth2Client();
  console.log('✓ Basic OAuth2Client created');
  
  const configuredClient = new OAuth2Client(clientId, clientSecret);
  console.log('✓ OAuth2Client with credentials created');
  
  const fullClient = new OAuth2Client(clientId, clientSecret, redirectUris[0]);
  console.log('✓ Full OAuth2Client created');
  
} catch (error) {
  console.log('✗ OAuth2Client creation failed:', error.message);
}