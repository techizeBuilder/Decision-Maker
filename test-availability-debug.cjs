// Test the availability system with detailed debugging
const { connectToMongoDB, Call } = require('./server/mongodb');

async function testAvailabilityDetailed() {
  try {
    console.log('=== DETAILED AVAILABILITY TESTING ===\n');
    await connectToMongoDB();
    
    // Check the existing call again
    const existingCall = await Call.findOne({
      scheduledAt: new Date('2025-09-02T08:15:00.000Z')
    });
    
    console.log('EXISTING CALL DETAILS:');
    console.log(`- Scheduled At: ${existingCall.scheduledAt} (UTC)`);
    console.log(`- End Time: ${existingCall.endTime} (UTC)`);
    console.log(`- Duration: ${(new Date(existingCall.endTime) - new Date(existingCall.scheduledAt)) / (1000 * 60)} minutes`);
    
    // Convert to Indian time for context
    const indianStart = new Date(existingCall.scheduledAt).toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata', 
      hour12: true,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`- Indian Time: ${indianStart}`);
    
    console.log('\n=== SLOT GENERATION ANALYSIS ===');
    console.log('Working Hours: 8 AM to 6 PM UTC (updated)');
    console.log('Slot Duration: 15 minutes');
    console.log('Conflict Time: 8:15 AM - 8:30 AM UTC');
    
    // Generate time slots manually to understand the issue
    const slotDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const dayStart = new Date('2025-09-02T08:00:00.000Z'); // 8 AM UTC
    const conflictStart = new Date('2025-09-02T08:15:00.000Z');
    const conflictEnd = new Date('2025-09-02T08:30:00.000Z');
    
    console.log('\nSLOT ANALYSIS:');
    for (let i = 0; i < 4; i++) {
      const slotStart = new Date(dayStart.getTime() + (i * slotDuration));
      const slotEnd = new Date(slotStart.getTime() + slotDuration);
      
      // Check overlap with conflict
      const hasOverlap = (
        (slotStart >= conflictStart && slotStart < conflictEnd) ||
        (slotEnd > conflictStart && slotEnd <= conflictEnd) ||
        (slotStart <= conflictStart && slotEnd >= conflictEnd)
      );
      
      const indianSlotTime = slotStart.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`  Slot ${i+1}: ${slotStart.toISOString()} (${indianSlotTime} IST) - Conflict: ${hasOverlap ? 'YES ❌' : 'NO ✅'}`);
    }
    
    console.log('\n=== EXPECTED RESULT ===');
    console.log('The 8:15 AM UTC slot (1:45 PM IST) should be marked as UNAVAILABLE');
    console.log('This corresponds to the existing call conflict');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testAvailabilityDetailed();