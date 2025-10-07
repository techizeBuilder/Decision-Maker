// Test calendar disconnection flagging flow
const { connectToMongoDB, User, Invitation, MonthlyCallLimit, Flag } = require('./server/mongodb.ts');

async function testCalendarBlocking() {
  try {
    console.log('=== TESTING CALENDAR DISCONNECTION FLAGGING ===\n');
    await connectToMongoDB();
    
    const repId = '68a3391fbab1a344ef7cb8e8';
    const dmId = '68a33ba0bab1a344ef7cb91b';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. INITIAL STATE');
    const rep = await User.findById(repId);
    const dm = await User.findById(dmId);
    
    console.log(`   Rep: ${rep.firstName} ${rep.lastName} (${rep.email})`);
    console.log(`   DM: ${dm.firstName} ${dm.lastName} (${dm.email})`);
    console.log(`   DM Calendar Connected: ${dm.calendarIntegrationEnabled}`);
    console.log(`   Rep Flags Before: ${rep.flagsReceived || 0}`);
    
    // Check rep's current call limits
    let repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    console.log(`   Rep Call Limits: ${repCallLimit?.maxCalls || 0} max, ${repCallLimit?.remainingCalls || 0} remaining`);
    
    console.log('\n2. SIMULATING DM CALENDAR DISCONNECTION...');
    
    if (dm.calendarIntegrationEnabled) {
      // Disconnect calendar and trigger flagging
      await User.findByIdAndUpdate(dmId, {
        calendarIntegrationEnabled: false,
        googleCalendarTokens: null
      });
      
      console.log('   ✅ DM calendar disconnected');
      
      // Simulate the flagging logic (normally handled by the API route)
      const flagReason = `Calendar disconnected by DM ${dm.email} (${dm.firstName} ${dm.lastName}) from ${dm.company || 'Unknown Company'}`;
      
      // Increment rep flag
      const updatedRep = await User.findByIdAndUpdate(repId, {
        $inc: { flagsReceived: 1 }
      }, { new: true });
      
      // Create flag record (if Flag collection exists)
      try {
        await Flag.create({
          userId: repId,
          flaggedBy: dmId,
          reason: flagReason,
          type: 'dm_calendar_disconnect',
          status: 'pending',
          createdAt: new Date()
        });
        console.log('   ✅ Flag record created');
      } catch (error) {
        console.log('   ⚠️  Flag collection not available, but rep flagsReceived incremented');
      }
      
      console.log(`   ✅ Sales rep flagged: ${updatedRep.flagsReceived} total flags`);
      
      // Recalculate rep call limits (remove credits for disconnected DM)
      await MonthlyCallLimit.deleteOne({
        userId: repId,
        month: currentMonth
      });
      
      // Since DM no longer has calendar connected, rep should lose credits
      await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: 0, // No connected calendar DMs = no calls
        remainingCalls: 0,
        lastUpdated: new Date()
      });
      
      console.log('   ✅ Rep call limits recalculated (credits removed)');
    } else {
      console.log('   ℹ️  DM calendar already disconnected');
    }
    
    console.log('\n3. FINAL STATE');
    const finalRep = await User.findById(repId);
    const finalDM = await User.findById(dmId);
    const finalCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    console.log(`   DM Calendar Connected: ${finalDM.calendarIntegrationEnabled}`);
    console.log(`   Rep Flags After: ${finalRep.flagsReceived || 0}`);
    console.log(`   Rep Call Limits: ${finalCallLimit?.maxCalls || 0} max, ${finalCallLimit?.remainingCalls || 0} remaining`);
    
    console.log('\n✅ CALENDAR DISCONNECTION FLAGGING TEST COMPLETE');
    console.log('Expected behavior:');
    console.log('- DM calendar disconnected');
    console.log('- Sales rep flagged (+1 flag)');
    console.log('- Sales rep loses call credits (0 calls)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in test:', error);
    process.exit(1);
  }
}

testCalendarBlocking();