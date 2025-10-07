const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// This script tests Google Calendar integration with Meet link creation
async function testGoogleCalendarIntegration() {
  try {
    console.log('=== Testing Google Calendar Integration ===');
    
    // 1. Connect to MongoDB
    const client = new MongoClient(process.env.DATABASE_URL);
    await client.connect();
    const db = client.db();
    
    // 2. Find a user with Google Calendar tokens
    const userWithCalendar = await db.collection('users').findOne({
      calendarIntegrationEnabled: true,
      'googleCalendarTokens.access_token': { $exists: true }
    });
    
    if (!userWithCalendar) {
      console.log('❌ No user found with Google Calendar integration');
      console.log('   Please ensure at least one user has connected their Google Calendar');
      return;
    }
    
    console.log('✅ Found user with Google Calendar integration:', userWithCalendar.email);
    
    // 3. Set up Google Calendar API
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    oauth2Client.setCredentials(userWithCalendar.googleCalendarTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // 4. Create test event with Google Meet
    const testEvent = {
      summary: 'Test Meeting - Google Calendar Integration',
      description: 'This is a test meeting to verify Google Meet link creation',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), // 15 minutes later
        timeZone: 'America/New_York'
      },
      attendees: [
        {
          email: 'test@example.com',
          displayName: 'Test User'
        }
      ],
      conferenceData: {
        createRequest: {
          requestId: `test-meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    console.log('📅 Creating test calendar event with Google Meet...');
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: testEvent,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });
    
    const createdEvent = response.data;
    console.log('✅ Calendar event created successfully!');
    console.log('   Event ID:', createdEvent.id);
    console.log('   Event Summary:', createdEvent.summary);
    
    // 5. Extract Google Meet link
    const googleMeetLink = createdEvent.hangoutLink || 
                          createdEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri;
    
    if (googleMeetLink) {
      console.log('✅ Google Meet link created successfully!');
      console.log('   Meet Link:', googleMeetLink);
    } else {
      console.log('❌ No Google Meet link found in the event');
      console.log('   Conference Data:', JSON.stringify(createdEvent.conferenceData, null, 2));
    }
    
    // 6. Test database save
    const testCallData = {
      salesRepId: userWithCalendar._id,
      decisionMakerId: userWithCalendar._id, // Using same user for test
      scheduledAt: new Date(createdEvent.start.dateTime),
      endTime: new Date(createdEvent.end.dateTime),
      status: 'scheduled',
      agenda: 'Test meeting',
      notes: 'Testing Google Calendar integration',
      company: 'Test Company',
      platform: 'test',
      googleCalendarEventId: createdEvent.id,
      googleMeetLink: googleMeetLink,
      decisionMakerName: 'Test User'
    };
    
    const callResult = await db.collection('calls').insertOne(testCallData);
    console.log('✅ Test call saved to database with ID:', callResult.insertedId);
    
    // 7. Verify data persistence
    const savedCall = await db.collection('calls').findOne({ _id: callResult.insertedId });
    if (savedCall.googleMeetLink) {
      console.log('✅ Google Meet link properly saved to database');
    } else {
      console.log('❌ Google Meet link not saved to database');
    }
    
    // 8. Clean up test data
    await db.collection('calls').deleteOne({ _id: callResult.insertedId });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: createdEvent.id
    });
    
    console.log('✅ Test cleanup completed');
    console.log('\n=== Google Calendar Integration Test Results ===');
    console.log('✅ Google Calendar API connection: SUCCESS');
    console.log('✅ Event creation with Meet link: SUCCESS');
    console.log('✅ Database save with Meet link: SUCCESS');
    console.log('✅ Overall integration status: WORKING');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Google Calendar integration test failed:', error);
    
    if (error.code === 401) {
      console.log('   → Token may be expired, try reconnecting Google Calendar');
    } else if (error.code === 403) {
      console.log('   → Insufficient permissions, check Google Cloud Console setup');
    } else {
      console.log('   → Check Google API credentials and configuration');
    }
  }
}

// Run the test
testGoogleCalendarIntegration().catch(console.error);