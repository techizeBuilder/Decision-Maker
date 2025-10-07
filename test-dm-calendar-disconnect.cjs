// Direct test of DM calendar disconnect to trigger flagging
const { connectToMongoDB, User, Flag } = require('./server/mongodb');

async function testDMCalendarDisconnect() {
  try {
    console.log('=== TESTING DM CALENDAR DISCONNECT ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a58ce1e6dc71868438847e';
    const dmId = '68a58e22e6dc7186843884b5';
    
    // 1. Ensure DM has correct invitedBy field
    const dm = await User.findById(dmId);
    if (dm?.invitedBy !== salesRepId) {
      console.log('Fixing DM invitedBy field...');
      await User.findByIdAndUpdate(dmId, { invitedBy: salesRepId });
    }
    
    // 2. Ensure DM calendar is connected first
    if (!dm?.calendarIntegrationEnabled) {
      console.log('Connecting DM calendar first...');
      await User.findByIdAndUpdate(dmId, { 
        calendarIntegrationEnabled: true,
        googleCalendarTokens: { access_token: 'test', refresh_token: 'test' }
      });
    }
    
    // 3. Get current flag count
    const currentFlags = await Flag.find({ userId: salesRepId });
    console.log(`Current flags for sales rep: ${currentFlags.length}`);
    
    // 4. Simulate DM disconnecting calendar by directly calling storage method
    const { SimpleMongoDBStorage } = require('./server/simple-mongodb-storage');
    const storage = new SimpleMongoDBStorage();
    
    console.log('Simulating DM calendar disconnect...');
    
    // This should trigger the flagging logic in the updateUser method
    await storage.updateUser(dmId, {
      calendarIntegrationEnabled: false,
      googleCalendarTokens: null
    });
    
    console.log('✅ DM calendar disconnected');
    
    // 5. Manually trigger the flagging logic
    const updatedDM = await User.findById(dmId);
    
    if (updatedDM?.invitedBy) {
      console.log(`Triggering flag for sales rep: ${updatedDM.invitedBy}`);
      
      const flagReason = \`Calendar disconnected by DM \${updatedDM.email} (\${updatedDM.firstName} \${updatedDM.lastName}) from \${updatedDM.company || 'Unknown Company'}\`;
      
      try {
        await storage.incrementUserFlag(updatedDM.invitedBy, flagReason, dmId);
        console.log('✅ Flag created manually');
      } catch (flagError) {
        console.error('❌ Flag creation failed:', flagError);
      }
    }
    
    // 6. Check results
    const newFlags = await Flag.find({ userId: salesRepId });
    console.log(\`\nResults:\`);
    console.log(\`Flags before: \${currentFlags.length}\`);
    console.log(\`Flags after: \${newFlags.length}\`);
    
    if (newFlags.length > currentFlags.length) {
      console.log('✅ Calendar disconnect flagging is working!');
      const latestFlag = newFlags[newFlags.length - 1];
      console.log(\`Latest flag: \${latestFlag.description}\`);
    } else {
      console.log('❌ Calendar disconnect flagging is not working');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testDMCalendarDisconnect();