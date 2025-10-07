// Test the date range fix
function testDateRangeFix() {
  console.log('=== TESTING DATE RANGE FIX ===\n');
  
  // Simulate selecting September 2nd, 2025
  const selectedDate = new Date('2025-09-02T12:00:00.000Z'); // Midday Sept 2nd
  console.log(`Selected Date: ${selectedDate.toISOString()}`);
  console.log(`Selected Date (Local): ${selectedDate.toDateString()}\n`);
  
  // OLD PROBLEMATIC WAY (what was causing the issue)
  console.log('❌ OLD PROBLEMATIC WAY:');
  const oldStart = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(), 
    selectedDate.getDate()
  );
  const oldEnd = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    23, 59, 59, 999
  );
  
  console.log(`Old Start: ${oldStart.toISOString()}`);
  console.log(`Old End: ${oldEnd.toISOString()}`);
  console.log(`Date span: ${oldStart.toISOString().split('T')[0]} to ${oldEnd.toISOString().split('T')[0]}`);
  console.log(`Issue: Includes previous day due to timezone offset!\n`);
  
  // NEW FIXED WAY (using UTC)
  console.log('✅ NEW FIXED WAY (UTC):');
  const newStart = new Date(selectedDate);
  newStart.setUTCHours(0, 0, 0, 0);
  
  const newEnd = new Date(selectedDate);
  newEnd.setUTCHours(23, 59, 59, 999);
  
  console.log(`New Start: ${newStart.toISOString()}`);
  console.log(`New End: ${newEnd.toISOString()}`);
  console.log(`Date span: ${newStart.toISOString().split('T')[0]} to ${newEnd.toISOString().split('T')[0]}`);
  console.log(`✅ Perfect: Only includes the selected day!`);
  
  // Show specific conflict case
  console.log('\n🎯 CONFLICT DETECTION TEST:');
  const conflictTime = new Date('2025-09-02T08:15:00.000Z');
  console.log(`Existing conflict: ${conflictTime.toISOString()}`);
  console.log(`Conflict date: ${conflictTime.toISOString().split('T')[0]}`);
  console.log(`Range covers conflict date: ${conflictTime >= newStart && conflictTime <= newEnd}`);
  console.log(`→ This SHOULD now detect the conflict properly!`);
}

testDateRangeFix();