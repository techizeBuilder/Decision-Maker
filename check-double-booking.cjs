// Check for double booking issue
const { connectToMongoDB, Call } = require('./server/mongodb');

async function checkDoubleBooking() {
  try {
    console.log('=== CHECKING DOUBLE BOOKING ISSUE ===\n');
    await connectToMongoDB();
    
    const dmId = '68b033abf738fbe1849f9d40';
    
    // Find all calls for this DM on September 1st
    const calls = await Call.find({
      decisionMakerId: dmId,
      scheduledAt: {
        $gte: new Date('2025-09-01T00:00:00.000Z'),
        $lte: new Date('2025-09-01T23:59:59.999Z'),
      }
    }).sort({ scheduledAt: 1 });
    
    console.log(`Found ${calls.length} calls for DM ${dmId} on September 1st:`);
    
    calls.forEach((call, index) => {
      const indianTime = new Date(call.scheduledAt).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`  ${index + 1}. Call ID: ${call._id}`);
      console.log(`     Sales Rep: ${call.salesRepId}`);
      console.log(`     UTC Time: ${call.scheduledAt.toISOString()}`);
      console.log(`     Indian Time: ${indianTime}`);
      console.log(`     Status: ${call.status}`);
      console.log(`     Duration: ${call.duration} minutes`);
      console.log('');
    });
    
    // Check for overlapping times
    if (calls.length > 1) {
      console.log('DOUBLE BOOKING DETECTED!');
      console.log('This is exactly why availability checking is critical.');
      console.log('Multiple calls are scheduled at the same time for the same DM.');
    }
    
    console.log('SOLUTION:');
    console.log('1. The availability API should mark 9:15 AM as UNAVAILABLE');
    console.log('2. The booking form should prevent duplicate bookings');
    console.log('3. The system should check conflicts before allowing new bookings');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

checkDoubleBooking();