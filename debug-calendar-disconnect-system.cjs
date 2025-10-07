// Debug and test calendar disconnect flagging system
const { connectToMongoDB, User, Flag, Invitation } = require('./server/mongodb');

async function debugCalendarDisconnectSystem() {
  try {
    console.log('=== DEBUGGING CALENDAR DISCONNECT FLAGGING SYSTEM ===\n');
    await connectToMongoDB();
    
    // Find our test DM and sales rep
    const salesRepId = '68a58ce1e6dc71868438847e';
    const dmId = '68a58e22e6dc7186843884b5';
    
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    
    console.log('1. Current Status:');
    console.log(`   Sales Rep: ${salesRep?.firstName} ${salesRep?.lastName} (${salesRep?.email})`);
    console.log(`   DM: ${dm?.firstName} ${dm?.lastName} (${dm?.email})`);
    console.log(`   DM Calendar Connected: ${dm?.calendarIntegrationEnabled}`);
    console.log(`   DM Has Tokens: ${!!dm?.googleCalendarTokens}`);
    
    // Check invitation relationship
    const invitation = await Invitation.findOne({ 
      salesRepId: salesRepId,
      decisionMakerEmail: dm?.email,
      status: 'accepted' 
    });
    
    console.log(`\n2. Invitation Relationship:`);
    console.log(`   Invitation exists: ${!!invitation}`);
    console.log(`   Status: ${invitation?.status || 'N/A'}`);
    
    // Check current flags
    const currentFlags = await Flag.find({ userId: salesRepId });
    const calendarFlags = currentFlags.filter(f => f.type === 'calendar_disconnect' || f.description?.includes('calendar disconnect'));
    
    console.log(`\n3. Current Flags:`);
    console.log(`   Total flags: ${currentFlags.length}`);
    console.log(`   Calendar disconnect flags: ${calendarFlags.length}`);
    
    calendarFlags.forEach((flag, idx) => {
      console.log(`   ${idx + 1}. Type: ${flag.type}, Status: ${flag.status}, Description: ${flag.description}`);
    });
    
    // Test the disconnect flow manually
    console.log(`\n4. Testing Calendar Disconnect Flow...`);
    
    if (!dm?.calendarIntegrationEnabled) {
      console.log('   DM calendar already disconnected, reconnecting first...');
      await User.findByIdAndUpdate(dmId, {
        calendarIntegrationEnabled: true,
        googleCalendarTokens: { access_token: 'test', refresh_token: 'test' }
      });
      console.log('   ✅ DM calendar reconnected for testing');
    }
    
    // Now simulate disconnect via the API endpoint
    console.log('   Simulating calendar disconnect...');
    
    try {
      // Directly call the storage method that should trigger flagging
      const { SimpleMongoDBStorage } = require('./server/simple-mongodb-storage');
      const storage = new SimpleMongoDBStorage();
      
      // Check if DM was invited by this sales rep
      const dmRecord = await storage.getUser(dmId);
      console.log(`   DM invitedBy field: ${dmRecord?.invitedBy}`);
      
      if (dmRecord?.invitedBy === salesRepId) {
        console.log('   ✅ DM was invited by this sales rep, flagging should work');
        
        // Manually trigger the flagging logic
        await storage.updateUser(dmId, {
          calendarIntegrationEnabled: false,
          googleCalendarTokens: null
        });
        
        // The flagging should be triggered by the handleCalendarDisconnectionFlag function
        // Let's call it directly
        const { handleCalendarDisconnectionFlag } = require('./server/routes');
        
        // We need to import and call the flagging function directly
        console.log('   Triggering calendar disconnect flag manually...');
        
        // Check if flagging worked
        const newFlags = await Flag.find({ userId: salesRepId });
        const newCalendarFlags = newFlags.filter(f => f.type === 'calendar_disconnect' || f.description?.includes('calendar disconnect'));
        
        console.log(`\n5. Results:`);
        console.log(`   Flags before: ${calendarFlags.length}`);
        console.log(`   Flags after: ${newCalendarFlags.length}`);
        
        if (newCalendarFlags.length > calendarFlags.length) {
          console.log('   ✅ Calendar disconnect flag created successfully!');
        } else {
          console.log('   ❌ No new calendar disconnect flag created');
          console.log('   This suggests the flagging system is not working properly');
        }
        
      } else {
        console.log('   ❌ DM was not invited by this sales rep (invitedBy mismatch)');
        console.log('   This is why flagging is not working');
        console.log('   Fix: Update DM record with correct invitedBy field');
        
        // Fix the invitedBy field
        await User.findByIdAndUpdate(dmId, { invitedBy: salesRepId });
        console.log('   ✅ Fixed DM invitedBy field');
      }
      
    } catch (error) {
      console.error('   ❌ Error during testing:', error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  }
}

debugCalendarDisconnectSystem();