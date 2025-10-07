

// Check if the configuration matches expected values
const expectedClientId = '917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com';
const expectedRedirectUri = 'https://decisionmaker.shrawantravels.com/api/auth/google/callback';

console.log('\nValidation:');
console.log('Client ID matches expected:', process.env.GOOGLE_CLIENT_ID === expectedClientId);
console.log('\nExpected values:');
console.log('Client ID:', expectedClientId);
console.log('Redirect URI:', expectedRedirectUri);

// Test the OAuth client configuration
const { OAuth2Client } = require('google-auth-library');
const testOAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  expectedRedirectUri
);

console.log('\nOAuth2 Client Test:');
console.log('Client ID from OAuth2Client:', testOAuth2Client._clientId);
console.log('Redirect URI from OAuth2Client:', testOAuth2Client.redirectUri);
console.log('Client Secret present:', !!testOAuth2Client._clientSecret);