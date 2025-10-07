// Final verification that the credit system is working correctly
const { connectToMongoDB, User, MonthlyCallLimit } = require('./server/mongodb.ts');

async function verifyCreditSystemWorking() {
  try {
    console.log('=== FINAL CREDIT SYSTEM VERIFICATION ===\n');
    await connectToMongoDB();
    
    const repId = '68a3f49d1438d4ddc172ebdf';
    const dmId = '68a3f52d1438d4ddc172ebf6';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. User Relationship Check');
    const dm = await User.findById(dmId);
    const rep = await User.findById(repId);
    
    console.log(`   Rep: ${rep.firstName} ${rep.lastName} (${rep.packageType} plan)`);
    console.log(`   DM: ${dm.firstName} ${dm.lastName}`);
    console.log(`   DM invited by rep: ${dm.invitedBy?.toString() === repId ? '✅ YES' : '❌ NO'}`);
    console.log(`   DM calendar connected: ${dm.calendarIntegrationEnabled ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n2. Call Limits Status');
    const repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (repCallLimit) {
      console.log(`   Rep has ${repCallLimit.maxCalls} max calls, ${repCallLimit.remainingCalls} remaining`);
      
      if (dm.calendarIntegrationEnabled && repCallLimit.maxCalls === 5) {
        console.log('   ✅ Credit allocation working correctly!');
      } else if (!dm.calendarIntegrationEnabled && repCallLimit.maxCalls === 0) {
        console.log('   ✅ Credit revocation working correctly!');
      } else {
        console.log('   ⚠️  Unexpected credit state');
      }
    } else {
      console.log('   ❌ No call limits found for rep');
    }
    
    console.log('\n3. Expected System Behavior');
    console.log('   When DM connects calendar → Rep gets 5 calls');
    console.log('   When DM disconnects calendar → Rep gets flagged and loses calls');
    console.log('   When DM reconnects calendar → Rep gets unflagged and regains calls');
    
    console.log('\n4. Current System Status');
    if (dm.calendarIntegrationEnabled && repCallLimit?.maxCalls === 5) {
      console.log('   🎉 SYSTEM WORKING: Sales rep has proper credits for connected DM calendar!');
    } else {
      console.log('   ❌ SYSTEM ISSUE: Credit allocation not working as expected');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCreditSystemWorking();