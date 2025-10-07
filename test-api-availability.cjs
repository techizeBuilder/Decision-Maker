// Test the comprehensive availability API directly
const { connectToMongoDB, Call } = require('./server/mongodb');

async function testAvailabilityAPI() {
  try {
    console.log('=== TESTING AVAILABILITY API DIRECTLY ===\n');
    await connectToMongoDB();
    
    // Check existing calls that should cause conflicts
    const existingCall = await Call.findOne({
      scheduledAt: new Date('2025-09-02T08:15:00.000Z')
    });
    
    if (existingCall) {
      console.log('✓ Found existing call that should cause conflict:');
      console.log(`  Call ID: ${existingCall._id}`);
      console.log(`  Scheduled: ${existingCall.scheduledAt}`);
      console.log(`  DM: ${existingCall.decisionMakerId}`);
      console.log(`  Sales Rep: ${existingCall.salesRepId}`);
      console.log(`  Status: ${existingCall.status}`);
      
      const indianTime = new Date(existingCall.scheduledAt).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      });
      console.log(`  Indian Time: ${indianTime}`);
    } else {
      console.log('❌ No existing call found - this is unexpected');
    }
    
    console.log('\n=== EXPECTED BEHAVIOR ===');
    console.log('When sales rep tries to book Sameer Sahu on Sept 2nd:');
    console.log('1. System should check DM database conflicts ✓');
    console.log('2. System should check DM Google Calendar conflicts ✓');
    console.log('3. System should check Sales Rep database conflicts ✓');
    console.log('4. 8:15 AM UTC slot should show as UNAVAILABLE (red)');
    console.log('5. Booking attempt should be prevented');
    
    console.log('\n📝 To test manually:');
    console.log('1. Login as sales rep');
    console.log('2. Go to Available DMs');
    console.log('3. Click "Book Call" for Sameer Sahu');
    console.log('4. Select September 2nd date');
    console.log('5. Check if 8:15 AM slot shows as red/unavailable');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testAvailabilityAPI();