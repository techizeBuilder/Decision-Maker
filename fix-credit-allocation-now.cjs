// Fix the credit allocation issue right now
const { connectToMongoDB, User, MonthlyCallLimit } = require('./server/mongodb.ts');

async function fixCreditAllocationNow() {
  try {
    console.log('=== FIXING CREDIT ALLOCATION NOW ===\n');
    await connectToMongoDB();
    
    const repId = '68a3f49d1438d4ddc172ebdf';
    const dmId = '68a3f52d1438d4ddc172ebf6';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. Verifying DM calendar status');
    const dm = await User.findById(dmId);
    console.log(`   DM: ${dm.firstName} ${dm.lastName}`);
    console.log(`   Calendar Connected: ${dm.calendarIntegrationEnabled}`);
    console.log(`   Invited By: ${dm.invitedBy}`);
    
    console.log('\n2. Current rep call limits');
    let repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (repCallLimit) {
      console.log(`   Current: ${repCallLimit.maxCalls} max, ${repCallLimit.remainingCalls} remaining`);
    } else {
      console.log('   No call limits found');
    }
    
    console.log('\n3. Debugging condition check');
    console.log(`   dm.calendarIntegrationEnabled: ${dm.calendarIntegrationEnabled} (type: ${typeof dm.calendarIntegrationEnabled})`);
    console.log(`   dm.invitedBy: ${dm.invitedBy} (type: ${typeof dm.invitedBy})`);
    console.log(`   repId: ${repId} (type: ${typeof repId})`);
    console.log(`   dm.invitedBy === repId: ${dm.invitedBy === repId}`);
    console.log(`   dm.invitedBy == repId: ${dm.invitedBy == repId}`);
    console.log(`   dm.invitedBy.toString() === repId: ${dm.invitedBy.toString() === repId}`);
    
    console.log('\n4. Fixing credit allocation');
    if (dm.calendarIntegrationEnabled && dm.invitedBy.toString() === repId) {
      // Delete existing incorrect limits
      await MonthlyCallLimit.deleteOne({
        userId: repId,
        month: currentMonth
      });
      
      // Create correct limits with 5 calls (basic plan with 1 connected calendar DM)
      await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: 5,
        remainingCalls: 5,
        lastUpdated: new Date()
      });
      
      console.log('   ✅ Created new call limits: 5 calls available');
    } else {
      console.log('   ❌ DM calendar not connected or not invited by this rep');
    }
    
    console.log('\n5. Verification');
    const finalLimits = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (finalLimits) {
      console.log(`   Final result: ${finalLimits.maxCalls} max, ${finalLimits.remainingCalls} remaining`);
      
      if (finalLimits.maxCalls === 5 && finalLimits.remainingCalls === 5) {
        console.log('   🎉 SUCCESS: Credit allocation fixed!');
      } else {
        console.log('   ❌ Issue still exists');
      }
    } else {
      console.log('   ❌ No call limits found after fix');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCreditAllocationNow();