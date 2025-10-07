// Simulate DM calendar disconnect to test flagging
const { connectToMongoDB, User } = require('./server/mongodb');

async function simulateDMCalendarDisconnect() {
  try {
    console.log('=== SIMULATING DM CALENDAR DISCONNECT ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a58ce1e6dc71868438847e';
    const dmId = '68a58e22e6dc7186843884b5';
    
    // 1. Ensure DM is properly connected to sales rep
    const dm = await User.findById(dmId);
    console.log('1. Current DM state:');
    console.log(`   Email: ${dm?.email}`);
    console.log(`   InvitedBy: ${dm?.invitedBy}`);
    console.log(`   Calendar: ${dm?.calendarIntegrationEnabled}`);
    
    // 2. Fix invitedBy if needed
    if (dm?.invitedBy?.toString() !== salesRepId) {
      console.log('   Fixing invitedBy field...');
      await User.findByIdAndUpdate(dmId, { invitedBy: salesRepId });
      console.log('   ✅ Fixed');
    } else {
      console.log('   ✅ InvitedBy is correct');
    }
    
    // 3. Connect calendar first if not connected
    if (!dm?.calendarIntegrationEnabled) {
      console.log('\n2. Connecting DM calendar first...');
      await User.findByIdAndUpdate(dmId, {
        calendarIntegrationEnabled: true,
        googleCalendarTokens: { access_token: 'test', refresh_token: 'test' }
      });
      console.log('   ✅ Calendar connected');
    } else {
      console.log('\n2. Calendar already connected');
    }
    
    // 4. Test the debug endpoint
    console.log('\n3. Testing calendar disconnection flagging...');
    
    const testResponse = await fetch('http://localhost:5000/api/debug/test-calendar-disconnection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dmId: dmId,
        salesRepId: salesRepId
      })
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('   ✅ Debug endpoint successful');
      console.log('   Response:', result.message);
    } else {
      const error = await testResponse.text();
      console.log('   ❌ Debug endpoint failed');
      console.log('   Status:', testResponse.status);
      console.log('   Error:', error);
    }
    
    // 5. Now disconnect the calendar normally
    console.log('\n4. Disconnecting calendar normally...');
    await User.findByIdAndUpdate(dmId, {
      calendarIntegrationEnabled: false,
      googleCalendarTokens: null
    });
    console.log('   ✅ Calendar disconnected');
    
    console.log('\n=== TESTING COMPLETE ===');
    console.log('The calendar disconnection flagging system has been tested.');
    console.log('Check the sales rep dashboard to see if the flag appears.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

simulateDMCalendarDisconnect();