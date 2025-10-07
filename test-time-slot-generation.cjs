// Test time slot generation to see if 9:15 AM shows up
const { connectToMongoDB, Call } = require('./server/mongodb');

function generateTimeSlots(date) {
  const slots = [];
  const today = new Date();
  const selectedDay = new Date(date);
  const isToday = selectedDay.toDateString() === today.toDateString();

  for (let hour = 9; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slotTime = new Date(selectedDay);
      slotTime.setHours(hour, minute, 0, 0);

      // Skip past time slots if it's today
      const isPast = isToday && slotTime <= today;

      const timeString = slotTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      slots.push({
        time: timeString,
        value: slotTime,
        disabled: isPast,
        utc: slotTime.toISOString(),
        indian: slotTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      });
    }
  }
  return slots;
}

async function testTimeSlotGeneration() {
  try {
    console.log('=== TESTING TIME SLOT GENERATION ===\n');
    await connectToMongoDB();
    
    // Get the scheduled call details
    const scheduledCall = await Call.findById('68b0382ff738fbe1849f9e9d');
    const scheduledTime = new Date(scheduledCall.scheduledAt);
    
    console.log('1. Scheduled Call Time:');
    console.log(`   UTC: ${scheduledTime.toISOString()}`);
    console.log(`   Indian: ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    // Generate time slots for September 1, 2025
    const testDate = new Date('2025-09-01');
    const timeSlots = generateTimeSlots(testDate);
    
    console.log('\n2. Generated Time Slots around 9:15 AM:');
    
    // Find slots around 9:15 AM Indian time
    const relevantSlots = timeSlots.filter(slot => {
      const hour = slot.value.getHours();
      return hour >= 9 && hour <= 10; // Show 9 AM to 10 AM slots
    });
    
    relevantSlots.forEach(slot => {
      const isScheduledTime = Math.abs(slot.value.getTime() - scheduledTime.getTime()) < 60000; // Within 1 minute
      console.log(`   ${slot.time} (${slot.indian}) ${isScheduledTime ? '← SCHEDULED CALL HERE' : ''}`);
    });
    
    // Check if there's an exact match for the scheduled time
    const exactMatch = timeSlots.find(slot => {
      return Math.abs(slot.value.getTime() - scheduledTime.getTime()) < 60000;
    });
    
    console.log('\n3. Exact Time Slot Match:');
    if (exactMatch) {
      console.log(`   ✅ Found exact match: ${exactMatch.time} (${exactMatch.indian})`);
      console.log(`   This slot should show as UNAVAILABLE`);
    } else {
      console.log(`   ❌ No exact match found for ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      
      // Find the closest slot
      const closest = timeSlots.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.value.getTime() - scheduledTime.getTime());
        const currDiff = Math.abs(curr.value.getTime() - scheduledTime.getTime());
        return currDiff < prevDiff ? curr : prev;
      });
      
      console.log(`   Closest slot: ${closest.time} (${closest.indian})`);
      console.log(`   Time difference: ${Math.abs(closest.value.getTime() - scheduledTime.getTime()) / 60000} minutes`);
    }
    
    console.log('\n4. Time Slot Analysis:');
    console.log('   The UI generates 15-minute intervals starting from each hour');
    console.log('   9:00, 9:15, 9:30, 9:45, 10:00, 10:15, etc.');
    console.log('   The scheduled call at 9:15 AM should appear as one of these slots');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

testTimeSlotGeneration();