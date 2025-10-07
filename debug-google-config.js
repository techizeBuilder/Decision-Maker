import { oauth2Client } from './server/google-calendar.js';


// Check if the configuration matches expected values
const expectedClientId = '917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com';
const expectedRedirectUri = 'https://decisionmaker.shrawantravels.com/api/auth/google/callback';

console.log('\nValidation:');
console.log('Client ID matches expected:', process.env.GOOGLE_CLIENT_ID === expectedClientId);
console.log('Redirect URI matches expected:', oauth2Client.redirectUri === expectedRedirectUri);
console.log('\nExpected values:');
console.log('Client ID:', expectedClientId);
console.log('Redirect URI:', expectedRedirectUri);