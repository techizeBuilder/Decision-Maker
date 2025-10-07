// Debug backend date logic issue
const { connectToMongoDB, Call } = require('./server/mongodb');

async function debugBackendDates() {
  try {
    console.log('=== DEBUGGING BACKEND DATE LOGIC ===\n');
    await connectToMongoDB();
    
    // Check existing call
    const existingCall = await Call.findOne({
      scheduledAt: new Date('2025-09-02T08:15:00.000Z')
    });
    
    console.log('✅ EXISTING CALL:');
    console.log(`   Date: ${existingCall.scheduledAt.toISOString()}`);
    console.log(`   Date Only: ${existingCall.scheduledAt.toISOString().split('T')[0]}`);
    
    // Simulate the problematic date range
    console.log('\n🔍 PROBLEMATIC DATE RANGE (what frontend sends):');
    console.log('   Start: 2025-09-01T18:30:00.000Z');  
    console.log('   End: 2025-09-02T18:29:59.999Z');
    console.log('   → This includes BOTH Sept 1st AND Sept 2nd!');
    
    // Show what should be sent instead 
    const correctStart = new Date('2025-09-02T00:00:00.000Z');
    const correctEnd = new Date('2025-09-02T23:59:59.999Z');
    
    console.log('\n✅ CORRECT DATE RANGE (Sept 2nd only):');
    console.log(`   Start: ${correctStart.toISOString()}`);
    console.log(`   End: ${correctEnd.toISOString()}`);
    
    // Simulate slot generation for both ranges
    console.log('\n📊 SLOT GENERATION SIMULATION:');
    
    // Problematic range - includes both days
    console.log('\n❌ CURRENT PROBLEMATIC RANGE:');
    let start = new Date('2025-09-01T18:30:00.000Z');
    let end = new Date('2025-09-02T18:29:59.999Z');
    
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      
      const dayStart = new Date(day);
      dayStart.setHours(8, 15, 0, 0); // 8:15 AM slot specifically
      
      console.log(`   Checking: ${dayStart.toISOString()} (${dayStart.toISOString().split('T')[0]})`);
      console.log(`   Against conflict: ${existingCall.scheduledAt.toISOString()} (${existingCall.scheduledAt.toISOString().split('T')[0]})`);
      console.log(`   Same date? ${dayStart.toISOString().split('T')[0] === existingCall.scheduledAt.toISOString().split('T')[0]}`);
    }
    
    // Correct range - only Sept 2nd
    console.log('\n✅ CORRECT RANGE (Sept 2nd only):');
    start = new Date('2025-09-02T00:00:00.000Z');
    end = new Date('2025-09-02T23:59:59.999Z');
    
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      
      const dayStart = new Date(day);
      dayStart.setHours(8, 15, 0, 0); // 8:15 AM slot specifically
      
      console.log(`   Checking: ${dayStart.toISOString()} (${dayStart.toISOString().split('T')[0]})`);
      console.log(`   Against conflict: ${existingCall.scheduledAt.toISOString()} (${existingCall.scheduledAt.toISOString().split('T')[0]})`);
      console.log(`   Same date? ${dayStart.toISOString().split('T')[0] === existingCall.scheduledAt.toISOString().split('T')[0]}`);
      console.log(`   → This SHOULD detect the conflict!`);
    }
    
    console.log('\n🎯 SOLUTION:');
    console.log('   Frontend must send date range for ONLY the selected day');
    console.log('   No overlapping with previous/next days');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugBackendDates();