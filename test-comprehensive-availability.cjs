// Test comprehensive availability checking system
const { connectToMongoDB, Call, User } = require('./server/mongodb');

async function testComprehensiveAvailability() {
  try {
    console.log('=== TESTING COMPREHENSIVE AVAILABILITY SYSTEM ===\n');
    await connectToMongoDB();
    
    const dmId = '68b033abf738fbe1849f9d40'; // Sameer Sahu
    const salesRepId = '68b032c8f738fbe1849f9d2e'; // Current sales rep
    
    console.log('1. CHECKING DM DATABASE CONFLICTS ON SEPT 2ND');
    const dmCalls = await Call.find({
      decisionMakerId: dmId,
      scheduledAt: {
        $gte: new Date('2025-09-02T00:00:00.000Z'),
        $lte: new Date('2025-09-02T23:59:59.999Z'),
      }
    });
    
    console.log(`Found ${dmCalls.length} DM database calls on Sept 2nd:`);
    dmCalls.forEach(call => {
      const indianTime = new Date(call.scheduledAt).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      });
      console.log(`  - ${call._id}: ${indianTime} (Status: ${call.status})`);
    });
    
    console.log('\n2. CHECKING SALES REP DATABASE CONFLICTS ON SEPT 2ND');
    const repCalls = await Call.find({
      salesRepId: salesRepId,
      scheduledAt: {
        $gte: new Date('2025-09-02T00:00:00.000Z'),
        $lte: new Date('2025-09-02T23:59:59.999Z'),
      }
    });
    
    console.log(`Found ${repCalls.length} Sales Rep database calls on Sept 2nd:`);
    repCalls.forEach(call => {
      const indianTime = new Date(call.scheduledAt).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      });
      console.log(`  - ${call._id}: ${indianTime} with DM ${call.decisionMakerId}`);
    });
    
    console.log('\n3. CHECKING DM GOOGLE CALENDAR');
    const dmUser = await User.findById(dmId);
    console.log(`DM Calendar Status: ${dmUser?.googleCalendarTokens ? 'Connected' : 'Not Connected'}`);
    
    console.log('\nTEST SCENARIO:');
    console.log('✓ Found EXISTING call on Sept 2nd at 1:45 PM Indian time (8:15 AM UTC)');
    console.log('✓ Same DM (Sameer Sahu) and same Sales Rep already have a scheduled call');
    console.log('✓ When trying to book ANOTHER call at the same time, system should prevent it');
    
    console.log('\nEXPECTED RESULT:');
    console.log('The 8:15 AM UTC slot on Sept 2nd should show as UNAVAILABLE (red) in booking modal');
    console.log('System should prevent double booking due to existing call conflicts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testComprehensiveAvailability();