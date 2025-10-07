const { OAuth2Client } = require('google-auth-library');

console.log('=== FINAL OAUTH DEBUGGING ===');

// Let's check if the issue is with how we're creating the OAuth2Client
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'https://decisionmaker.shrawantravels.com/api/auth/google/callback';

console.log('Creating OAuth2Client with different configurations...');

// Method 1: Exactly like in our app
console.log('\n1. Standard configuration:');
const client1 = new OAuth2Client(clientId, clientSecret, redirectUri);
console.log('Client ID:', client1._clientId);
console.log('Client Secret present:', !!client1._clientSecret);
console.log('Redirect URI:', client1.redirectUri);

// Method 2: Using options object
console.log('\n2. Options object configuration:');
const client2 = new OAuth2Client({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri
});
console.log('Client ID:', client2._clientId);
console.log('Client Secret present:', !!client2._clientSecret);
console.log('Redirect URI:', client2.redirectUri);

// Method 3: Set redirect URI separately
console.log('\n3. Set redirect URI separately:');
const client3 = new OAuth2Client(clientId, clientSecret);
client3.redirectUri = redirectUri;
console.log('Client ID:', client3._clientId);
console.log('Client Secret present:', !!client3._clientSecret);
console.log('Redirect URI:', client3.redirectUri);



// Let's also test the URL generation
const authUrl = client1.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
  state: 'test-user',
  prompt: 'consent'
});

console.log('\n=== GENERATED AUTH URL ANALYSIS ===');
console.log('Full URL:', authUrl);
const urlObj = new URL(authUrl);
console.log('Host:', urlObj.host);
console.log('Pathname:', urlObj.pathname);
console.log('Client ID in URL:', urlObj.searchParams.get('client_id'));
console.log('Redirect URI in URL:', decodeURIComponent(urlObj.searchParams.get('redirect_uri')));

// Final check - let's verify the redirect URI format
console.log('\n=== REDIRECT URI VERIFICATION ===');
console.log('Our redirect URI:', redirectUri);
console.log('URL-encoded version:', encodeURIComponent(redirectUri));
console.log('In auth URL:', urlObj.searchParams.get('redirect_uri'));
console.log('Match when decoded:', decodeURIComponent(urlObj.searchParams.get('redirect_uri')) === redirectUri);