// Test calendar disconnect flagging system
const { connectToMongoDB, User, Flag, Invitation } = require('./server/mongodb');

async function testCalendarDisconnectFlagging() {
  try {
    console.log('=== TESTING CALENDAR DISCONNECT FLAGGING ===\n');
    await connectToMongoDB();
    
    // Find a DM who has connected calendar and accepted invitation
    const dmId = '68a58e22e6dc7186843884b5';
    const dm = await User.findById(dmId);
    
    if (!dm) {
      console.log('❌ DM not found');
      return;
    }
    
    console.log('1. DM Details:');
    console.log(`   Name: ${dm.firstName} ${dm.lastName}`);
    console.log(`   Email: ${dm.email}`);
    console.log(`   Calendar Connected: ${dm.calendarIntegrationEnabled}`);
    console.log(`   Has Google Tokens: ${!!dm.googleCalendarTokens}`);
    
    // Check invitation relationship
    const invitation = await Invitation.findOne({ 
      decisionMakerEmail: dm.email,
      status: 'accepted' 
    }).populate('salesRepId');
    
    if (!invitation) {
      console.log('❌ No accepted invitation found for this DM');
      return;
    }
    
    console.log('\n2. Invitation Details:');
    console.log(`   Sales Rep: ${invitation.salesRepId.firstName} ${invitation.salesRepId.lastName}`);
    console.log(`   Sales Rep ID: ${invitation.salesRepId._id}`);
    console.log(`   Status: ${invitation.status}`);
    
    // Check existing flags
    const existingFlags = await Flag.find({
      userId: invitation.salesRepId._id,
      type: 'calendar_disconnect',
      metadata: { dmId: dmId }
    });
    
    console.log('\n3. Existing Flags:');
    console.log(`   Calendar disconnect flags: ${existingFlags.length}`);
    existingFlags.forEach((flag, idx) => {
      console.log(`   ${idx + 1}. Status: ${flag.status}, Created: ${flag.createdAt}`);
    });
    
    // Test the flagging logic manually
    console.log('\n4. Testing calendar disconnect flagging...');
    
    if (dm.calendarIntegrationEnabled) {
      // Simulate calendar disconnect
      console.log('   Simulating calendar disconnect...');
      
      // Update DM calendar status to disconnected
      await User.findByIdAndUpdate(dmId, {
        calendarIntegrationEnabled: false,
        googleCalendarTokens: null
      });
      
      console.log('   DM calendar disconnected');
      
      // Now test if flagging system detects this
      // This should trigger when DM accesses calendar toggle
      const response = await fetch('http://localhost:5000/api/calendar/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-for-dm'
        },
        body: JSON.stringify({
          enabled: false,
          userId: dmId
        })
      });
      
      if (response.ok) {
        console.log('   ✅ Calendar toggle API responded successfully');
      } else {
        console.log('   ⚠️ Calendar toggle API failed, checking logs...');
      }
      
      // Check if flag was created
      const newFlags = await Flag.find({
        userId: invitation.salesRepId._id,
        type: 'calendar_disconnect',
        metadata: { dmId: dmId }
      });
      
      console.log(`\n5. Result: Found ${newFlags.length} calendar disconnect flags`);
      
      if (newFlags.length > existingFlags.length) {
        console.log('   ✅ New flag created successfully');
      } else {
        console.log('   ❌ No new flag created - system may not be working');
      }
      
    } else {
      console.log('   DM already has calendar disconnected');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testCalendarDisconnectFlagging();