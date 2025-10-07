// Test the calendar connection credit allocation fix
const { connectToMongoDB, User, MonthlyCallLimit } = require('./server/mongodb.ts');

async function testCalendarConnectionCredit() {
  try {
    console.log('=== TESTING CALENDAR CONNECTION CREDIT ALLOCATION ===\n');
    await connectToMongoDB();
    
    const dmId = '68a3f52d1438d4ddc172ebf6'; // The DM from the logs
    const repId = '68a3f49d1438d4ddc172ebdf'; // The sales rep
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('1. Current user states:');
    const dm = await User.findById(dmId);
    const rep = await User.findById(repId);
    
    console.log(`   DM: ${dm.firstName} ${dm.lastName} (${dm.email})`);
    console.log(`   Calendar Connected: ${dm.calendarIntegrationEnabled || false}`);
    console.log(`   Invited By: ${dm.invitedBy}`);
    console.log('');
    console.log(`   Rep: ${rep.firstName} ${rep.lastName} (${rep.email})`);
    console.log(`   Package: ${rep.packageType}`);
    
    console.log('\n2. Current call limits:');
    const repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    if (repCallLimit) {
      console.log(`   Rep Call Limits: ${repCallLimit.maxCalls} max, ${repCallLimit.remainingCalls} remaining`);
    } else {
      console.log('   No call limits found for rep');
    }
    
    console.log('\n3. Expected behavior:');
    if (dm.calendarIntegrationEnabled) {
      console.log('   ✅ DM has calendar connected - Rep should have 5 calls');
    } else {
      console.log('   ❌ DM calendar disconnected - Rep should have 0 calls');
    }
    
    if (repCallLimit && repCallLimit.maxCalls === 5 && dm.calendarIntegrationEnabled) {
      console.log('   ✅ Credit allocation working correctly!');
    } else if (repCallLimit && repCallLimit.maxCalls === 0 && !dm.calendarIntegrationEnabled) {
      console.log('   ✅ Credit revocation working correctly!');
    } else {
      console.log('   ❌ Credit allocation may need adjustment');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCalendarConnectionCredit();