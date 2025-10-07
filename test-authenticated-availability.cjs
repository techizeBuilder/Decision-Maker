// Test availability API with authenticated user
const fetch = require('node-fetch');
const fs = require('fs');

// Extract session cookie from browser logs
function extractSessionCookie() {
  try {
    // Try to read cookies from the browser session
    const cookieStr = 'connect.sid=s%3AGIyHLMlz2bw8UQR1CCFInWpJlOG0OFoJ.W4NzY9GFBhKx%2BH0Kb4PTdLHuA7vXs%2F%2Bg2%2BkY0%2FCQZks'; // Example
    return cookieStr;
  } catch (e) {
    console.log('Could not extract session cookie from logs');
    return null;
  }
}

async function testAvailabilityAPI() {
  try {
    console.log('=== TESTING AUTHENTICATED AVAILABILITY API ===\n');
    
    const dmId = '68b033abf738fbe1849f9d40';
    const selectedDate = new Date('2025-09-01');
    
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
    endDate.setMilliseconds(-1);
    
    const url = `http://localhost:5000/api/calendar/availability/${dmId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&duration=15`;
    
    console.log('1. Testing Availability API:');
    console.log(`   URL: ${url}`);
    console.log(`   DM ID: ${dmId}`);
    console.log(`   Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Test the API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, we'd need the actual session cookie
        'Cookie': extractSessionCookie() || ''
      }
    });
    
    console.log('\n2. API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   Available Slots: ${data.availableSlots?.length || 0}`);
      
      if (data.availableSlots && data.availableSlots.length > 0) {
        console.log('\n3. First Few Slots:');
        data.availableSlots.slice(0, 10).forEach((slot, index) => {
          const startTime = new Date(slot.start);
          const indianTime = startTime.toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
          });
          
          console.log(`     ${index + 1}. ${indianTime} - Available: ${slot.isAvailable ? 'YES' : 'NO'}`);
          if (slot.conflicts && slot.conflicts.length > 0) {
            console.log(`        Conflicts: ${slot.conflicts.length} items`);
          }
        });
        
        // Look for the 9:15 AM slot specifically
        const target915Slot = data.availableSlots.find(slot => {
          const slotTime = new Date(slot.start);
          const indianTime = slotTime.toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
          });
          return indianTime === '09:15 am' || indianTime === '09:15 AM';
        });
        
        console.log('\n4. 9:15 AM Slot Analysis:');
        if (target915Slot) {
          console.log(`   ✅ Found 9:15 AM slot`);
          console.log(`   Available: ${target915Slot.isAvailable ? 'YES' : 'NO'}`);
          console.log(`   Conflicts: ${target915Slot.conflicts?.length || 0}`);
          if (target915Slot.conflicts && target915Slot.conflicts.length > 0) {
            target915Slot.conflicts.forEach(conflict => {
              console.log(`     - ${conflict.source}: ${conflict.callId || 'N/A'}`);
            });
          }
        } else {
          console.log(`   ❌ 9:15 AM slot not found in response`);
        }
      } else {
        console.log('\n3. No available slots in response');
      }
    } else {
      const errorData = await response.text();
      console.log(`   Error: ${errorData}`);
    }
    
    console.log('\n=== TEST INSTRUCTIONS ===');
    console.log('To test in the UI:');
    console.log('1. Open the booking modal for Sameer Sahu');
    console.log('2. Select September 1, 2025');
    console.log('3. Look for the 9:15 AM time slot');
    console.log('4. It should be RED (unavailable) with "DM has another meeting"');
    console.log('5. Check browser console for debug logs');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAvailabilityAPI();