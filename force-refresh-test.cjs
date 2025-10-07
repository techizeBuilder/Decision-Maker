// Force a direct test of the availability system
const { connectToMongoDB, Call } = require('./server/mongodb');

async function forceTest() {
  try {
    console.log('=== FORCE TESTING AVAILABILITY SYSTEM ===\n');
    await connectToMongoDB();
    
    // Check all calls for Sept 2nd
    const sept2Start = new Date('2025-09-02T00:00:00.000Z');
    const sept2End = new Date('2025-09-02T23:59:59.999Z');
    
    const callsOnSept2 = await Call.find({
      decisionMakerId: '68b033abf738fbe1849f9d40',
      scheduledAt: {
        $gte: sept2Start,
        $lte: sept2End
      }
    });
    
    console.log(`✅ CALLS ON SEPTEMBER 2ND: ${callsOnSept2.length}`);
    callsOnSept2.forEach((call, i) => {
      const indianTime = call.scheduledAt.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`   ${i+1}. ${call.scheduledAt.toISOString()} (${indianTime} IST)`);
      console.log(`      Status: ${call.status}, Sales Rep: ${call.salesRepId}`);
    });
    
    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('   When selecting Sept 2nd in booking modal:');
    console.log('   - 4:30 PM IST slot should be UNAVAILABLE');
    console.log('   - No double booking allowed');
    
    console.log('\n📋 DEBUGGING STEPS:');
    console.log('   1. Close and reopen booking modal');
    console.log('   2. Select September 2nd');
    console.log('   3. Check for red/unavailable 4:30 PM slot');
    console.log('   4. If still available, date range is still wrong');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceTest();