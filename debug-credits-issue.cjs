// Debug why sales rep is not getting credits when DM has calendar connected
const { connectToMongoDB, User, MonthlyCallLimit, Invitation } = require('./server/mongodb.ts');

async function debugCreditsIssue() {
  try {
    console.log('=== DEBUGGING CREDITS ISSUE ===\n');
    await connectToMongoDB();
    
    const repId = '68a3f49d1438d4ddc172ebdf'; // From the JSON data
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. SALES REP ANALYSIS');
    const rep = await User.findById(repId);
    console.log(`   Rep: ${rep.firstName} ${rep.lastName}`);
    console.log(`   Email: ${rep.email}`);
    console.log(`   Package: ${rep.packageType}`);
    console.log(`   Calendar Connected: ${rep.calendarIntegrationEnabled}`);
    
    console.log('\n2. FINDING INVITED DMs');
    const invitedDMs = await User.find({ invitedBy: repId, role: 'decision_maker' });
    console.log(`   Found ${invitedDMs.length} DMs invited by this rep:`);
    
    invitedDMs.forEach((dm, index) => {
      console.log(`   ${index + 1}. ${dm.firstName} ${dm.lastName} (${dm.email})`);
      console.log(`      Calendar Enabled: ${dm.calendarIntegrationEnabled || false}`);
      console.log(`      Has Tokens: ${!!dm.googleCalendarTokens}`);
      console.log(`      Created: ${dm.createdAt}`);
      console.log('');
    });
    
    console.log('3. INVITATION RECORDS');
    const invitations = await Invitation.find({
      $or: [
        { salesRepId: repId },
        { repId: repId }
      ]
    });
    console.log(`   Found ${invitations.length} invitation records:`);
    
    invitations.forEach((inv, index) => {
      console.log(`   ${index + 1}. To: ${inv.decisionMakerEmail || inv.email}`);
      console.log(`      Status: ${inv.status}`);
      console.log(`      DM ID: ${inv.dmId}`);
      console.log('');
    });
    
    console.log('4. CURRENT CALL LIMITS');
    let repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (repCallLimit) {
      console.log(`   Max Calls: ${repCallLimit.maxCalls}`);
      console.log(`   Remaining: ${repCallLimit.remainingCalls}`);
      console.log(`   Total Used: ${repCallLimit.totalCalls}`);
      console.log(`   Last Updated: ${repCallLimit.lastUpdated}`);
    } else {
      console.log('   No call limits found - this might be the issue!');
    }
    
    console.log('\n5. EXPECTED BEHAVIOR');
    const connectedCalendarDMs = invitedDMs.filter(dm => dm.calendarIntegrationEnabled);
    console.log(`   DMs with calendar connected: ${connectedCalendarDMs.length}`);
    console.log(`   Expected calls for basic plan: ${Math.min(5, connectedCalendarDMs.length * 5)}`);
    
    if (connectedCalendarDMs.length > 0) {
      console.log('\n6. FIXING CREDIT ALLOCATION...');
      
      // Delete existing call limit
      await MonthlyCallLimit.deleteOne({
        userId: repId,
        month: currentMonth
      });
      
      // Create proper call limit based on connected calendar DMs
      const expectedCalls = Math.min(5, connectedCalendarDMs.length * 5);
      await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: expectedCalls,
        remainingCalls: expectedCalls,
        lastUpdated: new Date()
      });
      
      console.log(`   ✅ Fixed: Rep now has ${expectedCalls} calls`);
      
      // Verify the fix
      const updatedCallLimit = await MonthlyCallLimit.findOne({
        userId: repId,
        month: currentMonth
      });
      console.log(`   Verification: ${updatedCallLimit.maxCalls} max, ${updatedCallLimit.remainingCalls} remaining`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugCreditsIssue();