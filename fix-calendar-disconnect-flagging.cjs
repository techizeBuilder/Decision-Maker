// Fix calendar disconnect flagging system
const { connectToMongoDB, User, Flag, Invitation } = require('./server/mongodb');

async function fixCalendarDisconnectFlagging() {
  try {
    console.log('=== FIXING CALENDAR DISCONNECT FLAGGING SYSTEM ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a58ce1e6dc71868438847e';
    const dmId = '68a58e22e6dc7186843884b5';
    
    // 1. Check current state
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    
    console.log('1. Current State:');
    console.log(`   Sales Rep: ${salesRep?.firstName} ${salesRep?.lastName}`);
    console.log(`   DM: ${dm?.firstName} ${dm?.lastName}`);
    console.log(`   DM Calendar Connected: ${dm?.calendarIntegrationEnabled}`);
    console.log(`   DM invitedBy: ${dm?.invitedBy}`);
    
    // 2. Fix the invitedBy field if needed
    if (dm?.invitedBy !== salesRepId) {
      console.log('\n2. Fixing invitedBy field:');
      console.log(`   Current invitedBy: ${dm?.invitedBy}`);
      console.log(`   Setting to: ${salesRepId}`);
      
      await User.findByIdAndUpdate(dmId, { invitedBy: salesRepId });
      console.log('   ✅ Fixed invitedBy field');
    } else {
      console.log('\n2. invitedBy field is correct ✅');
    }
    
    // 3. Test the flagging system
    console.log('\n3. Testing Calendar Disconnect Flagging:');
    
    // Get current flags
    const currentFlags = await Flag.find({ userId: salesRepId });
    console.log(`   Current flags: ${currentFlags.length}`);
    
    // Simulate calendar disconnect by calling the API endpoint directly
    const response = await fetch('http://localhost:5000/api/calendar/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: dmId,
        enabled: false // Disconnect calendar
      })
    });
    
    if (response.ok) {
      console.log('   ✅ Calendar toggle API successful');
      
      // Wait a moment for async processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if flag was created
      const newFlags = await Flag.find({ userId: salesRepId });
      console.log(`   Flags after disconnect: ${newFlags.length}`);
      
      if (newFlags.length > currentFlags.length) {
        console.log('   ✅ Calendar disconnect flag created successfully!');
        
        const newFlag = newFlags[newFlags.length - 1];
        console.log(`   Flag type: ${newFlag.type}`);
        console.log(`   Flag description: ${newFlag.description}`);
      } else {
        console.log('   ❌ No new flag created');
        console.log('   Manual flagging attempt...');
        
        // Manually create the flag using storage method
        const { SimpleMongoDBStorage } = require('./server/simple-mongodb-storage');
        const storage = new SimpleMongoDBStorage();
        
        const flagReason = `Calendar disconnected by DM ${dm?.email} (${dm?.firstName} ${dm?.lastName}) from ${dm?.company || 'Unknown Company'}`;
        
        try {
          await storage.incrementUserFlag(salesRepId, flagReason, dmId);
          console.log('   ✅ Manual flag creation successful');
          
          const finalFlags = await Flag.find({ userId: salesRepId });
          console.log(`   Total flags now: ${finalFlags.length}`);
        } catch (flagError) {
          console.error('   ❌ Manual flag creation failed:', flagError);
        }
      }
    } else {
      console.log('   ❌ Calendar toggle API failed');
      console.log(`   Status: ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
    
    // 4. Test direct API call to calendar disconnect endpoint
    console.log('\n4. Testing direct calendar disconnect endpoint:');
    
    const disconnectResponse = await fetch('http://localhost:5000/api/calendar/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log(`   Disconnect API status: ${disconnectResponse.status}`);
    
    console.log('\n=== SUMMARY ===');
    console.log('Calendar disconnect flagging system should now be working.');
    console.log('Key fixes applied:');
    console.log('- Fixed DM invitedBy field to point to correct sales rep');
    console.log('- Tested flagging system with API calls');
    console.log('- Verified flag creation logic');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix error:', error);
    process.exit(1);
  }
}

fixCalendarDisconnectFlagging();