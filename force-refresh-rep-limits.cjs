// Force refresh sales rep call limits to fix credits issue
const { connectToMongoDB, User, MonthlyCallLimit } = require('./server/mongodb.ts');

async function forceRefreshRepLimits() {
  try {
    console.log('=== FORCING REP CALL LIMITS REFRESH ===\n');
    await connectToMongoDB();
    
    const repId = '68a3f49d1438d4ddc172ebdf';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. Deleting existing call limits');
    await MonthlyCallLimit.deleteOne({
      userId: repId,
      month: currentMonth
    });
    console.log('   ✅ Deleted existing limits');
    
    console.log('\n2. Checking DMs invited by rep');
    const invitedDMs = await User.find({ invitedBy: repId, role: 'decision_maker' });
    console.log(`   Found ${invitedDMs.length} invited DMs:`);
    
    invitedDMs.forEach((dm, index) => {
      console.log(`   ${index + 1}. ${dm.firstName} ${dm.lastName} - Calendar: ${dm.calendarIntegrationEnabled || false}`);
    });
    
    const connectedCalendarDMs = invitedDMs.filter(dm => dm.calendarIntegrationEnabled);
    console.log(`   Connected calendar DMs: ${connectedCalendarDMs.length}`);
    
    console.log('\n3. Creating new call limits based on connected DMs');
    const expectedCalls = connectedCalendarDMs.length > 0 ? 5 : 0; // Basic plan gets 5 calls if DMs have calendar
    
    await MonthlyCallLimit.create({
      userId: repId,
      userRole: 'sales_rep',
      month: currentMonth,
      totalCalls: 0,
      maxCalls: expectedCalls,
      remainingCalls: expectedCalls,
      lastUpdated: new Date()
    });
    
    console.log(`   ✅ Created new limits: ${expectedCalls} calls`);
    
    console.log('\n4. Verification');
    const finalLimits = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    console.log(`   Final limits: ${finalLimits.maxCalls} max, ${finalLimits.remainingCalls} remaining`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceRefreshRepLimits();