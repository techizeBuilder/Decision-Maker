// Fix the credit allocation to give 1 credit per DM instead of 5
const { connectToMongoDB, User, MonthlyCallLimit } = require('./server/mongodb.ts');

async function fixCreditAllocationTo1() {
  try {
    console.log('=== FIXING CREDIT ALLOCATION TO 1 PER DM ===\n');
    await connectToMongoDB();
    
    const repId = '68a3f49d1438d4ddc172ebdf';
    const dmId = '68a3f52d1438d4ddc172ebf6';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. Current status');
    const dm = await User.findById(dmId);
    const rep = await User.findById(repId);
    
    console.log(`   Rep: ${rep.firstName} ${rep.lastName}`);
    console.log(`   DM: ${dm.firstName} ${dm.lastName}`);
    console.log(`   DM calendar connected: ${dm.calendarIntegrationEnabled}`);
    console.log(`   DM invited by rep: ${dm.invitedBy?.toString() === repId}`);
    
    console.log('\n2. Current call limits');
    let repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (repCallLimit) {
      console.log(`   Current: ${repCallLimit.maxCalls} max, ${repCallLimit.remainingCalls} remaining`);
    } else {
      console.log('   No call limits found');
    }
    
    console.log('\n3. Fixing to 1 credit per connected DM');
    if (dm.calendarIntegrationEnabled && dm.invitedBy?.toString() === repId) {
      // Delete existing incorrect limits
      await MonthlyCallLimit.deleteOne({
        userId: repId,
        month: currentMonth
      });
      
      // Create correct limits with 1 call per connected DM
      await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: 1, // 1 credit per connected DM
        remainingCalls: 1,
        lastUpdated: new Date()
      });
      
      console.log('   ✅ Created new call limits: 1 call per connected DM');
    } else {
      console.log('   ❌ DM calendar not connected or not invited by this rep');
    }
    
    console.log('\n4. Verification');
    const finalLimits = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (finalLimits) {
      console.log(`   Final result: ${finalLimits.maxCalls} max, ${finalLimits.remainingCalls} remaining`);
      
      if (finalLimits.maxCalls === 1 && finalLimits.remainingCalls === 1) {
        console.log('   🎉 SUCCESS: 1 credit per DM allocation working!');
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

fixCreditAllocationTo1();