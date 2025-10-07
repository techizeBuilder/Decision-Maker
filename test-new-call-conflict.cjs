// Test the new call conflict detection
const { connectToMongoDB, Call } = require('./server/mongodb');

async function testNewCallConflict() {
  try {
    console.log('=== TESTING NEW CALL CONFLICT DETECTION ===\n');
    await connectToMongoDB();
    
    // Find the new call you just booked
    const newCall = await Call.findOne({
      scheduledAt: new Date('2025-09-02T11:00:00.000Z')
    });
    
    if (newCall) {
      console.log('✅ FOUND NEW CALL:');
      console.log(`   ID: ${newCall._id}`);
      console.log(`   Scheduled: ${newCall.scheduledAt} UTC`);
      console.log(`   End Time: ${newCall.endTime} UTC`);
      console.log(`   DM: ${newCall.decisionMakerId}`);
      console.log(`   Sales Rep: ${newCall.salesRepId}`);
      
      const indianTime = new Date(newCall.scheduledAt).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true,
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`   Indian Time: ${indianTime}`);
      
      // Show UTC time breakdown
      const utc = new Date(newCall.scheduledAt);
      console.log(`   UTC Breakdown: ${utc.getUTCFullYear()}-${String(utc.getUTCMonth()+1).padStart(2,'0')}-${String(utc.getUTCDate()).padStart(2,'0')} ${String(utc.getUTCHours()).padStart(2,'0')}:${String(utc.getUTCMinutes()).padStart(2,'0')}`);
      
    } else {
      console.log('❌ NEW CALL NOT FOUND');
    }
    
    // Find all calls for this DM-Rep pair
    const allCalls = await Call.find({
      decisionMakerId: new require('mongodb').ObjectId('68b033abf738fbe1849f9d40'),
      salesRepId: new require('mongodb').ObjectId('68b032c8f738fbe1849f9d2e')
    }).sort({ scheduledAt: 1 });
    
    console.log(`\n📋 ALL CALLS FOR THIS DM-REP PAIR: ${allCalls.length}`);
    allCalls.forEach((call, i) => {
      const utcTime = call.scheduledAt.toISOString();
      const indianTime = call.scheduledAt.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`   ${i+1}. ${utcTime} (${indianTime} IST) - Status: ${call.status}`);
    });
    
    console.log('\n🎯 EXPECTED RESULT:');
    console.log('   When selecting Sept 2nd in booking modal:');
    console.log('   - 4:30 PM IST (11:00 AM UTC) should be UNAVAILABLE');
    console.log('   - System should prevent double booking');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testNewCallConflict();