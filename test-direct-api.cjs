// Test the availability API directly
const { connectToMongoDB, Call } = require('./server/mongodb');

async function testDirectAPI() {
  try {
    console.log('=== TESTING DIRECT AVAILABILITY API ===\n');
    await connectToMongoDB();
    
    const dmId = '68b033abf738fbe1849f9d40';
    
    // Test the exact date range that the UI is sending
    const selectedDate = new Date('2025-09-01'); // September 1, 2025
    
    // Original method (what UI was doing before)
    const originalStart = new Date(selectedDate);
    originalStart.setHours(0, 0, 0, 0);
    const originalEnd = new Date(selectedDate);
    originalEnd.setHours(23, 59, 59, 999);
    
    // New method (what UI should do)
    const newStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const newEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
    newEnd.setMilliseconds(-1);
    
    console.log('1. Date Range Comparison:');
    console.log('   Original method:');
    console.log(`     Start: ${originalStart.toISOString()}`);
    console.log(`     End: ${originalEnd.toISOString()}`);
    console.log('   New method:');
    console.log(`     Start: ${newStart.toISOString()}`);
    console.log(`     End: ${newEnd.toISOString()}`);
    
    // Test both date ranges
    console.log('\n2. Database Query Results:');
    
    const callsOriginal = await Call.find({
      decisionMakerId: dmId,
      scheduledAt: {
        $gte: originalStart,
        $lte: originalEnd,
      },
      status: { $in: ["scheduled", "completed"] },
    });
    
    const callsNew = await Call.find({
      decisionMakerId: dmId,
      scheduledAt: {
        $gte: newStart,
        $lte: newEnd,
      },
      status: { $in: ["scheduled", "completed"] },
    });
    
    console.log(`   Original range found: ${callsOriginal.length} calls`);
    callsOriginal.forEach(call => {
      console.log(`     - ${call._id}: ${call.scheduledAt.toISOString()}`);
    });
    
    console.log(`   New range found: ${callsNew.length} calls`);
    callsNew.forEach(call => {
      console.log(`     - ${call._id}: ${call.scheduledAt.toISOString()}`);
    });
    
    // Check the scheduled call specifically
    const scheduledCall = await Call.findById('68b0382ff738fbe1849f9e9d');
    console.log('\n3. Scheduled Call Analysis:');
    console.log(`   Call Time: ${scheduledCall.scheduledAt.toISOString()}`);
    console.log(`   Is in original range: ${scheduledCall.scheduledAt >= originalStart && scheduledCall.scheduledAt <= originalEnd}`);
    console.log(`   Is in new range: ${scheduledCall.scheduledAt >= newStart && scheduledCall.scheduledAt <= newEnd}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testDirectAPI();