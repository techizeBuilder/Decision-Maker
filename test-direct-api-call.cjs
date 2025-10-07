// Test API call with correct date range
const https = require('https');

function testDirectAPI() {
  const options = {
    hostname: 'decisionmaker.shrawantravels.com',
    path: '/api/calendar/availability/68b033abf738fbe1849f9d40?startDate=2025-09-02T00:00:00.000Z&endDate=2025-09-02T23:59:59.999Z&duration=15',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGIwMzJjOGY3MzhmYmUxODQ5ZjlkMmUiLCJpYXQiOjE3NTY3OTk0MjUsImV4cCI6MTc1NzQwNDIyNX0.TQeJGU7Bp7wGAOgSQGBRbS3qCCJr9CYaL7YQpF71lvA'
    }
  };

  console.log('Testing API with date range: 2025-09-02 only (no Sept 1st)');
  console.log('Expected: 8:15 AM UTC slot should be UNAVAILABLE due to existing call\n');

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        const slots = response.availableSlots || [];
        
        // Find 8:15 AM slot
        const conflict815 = slots.find(slot => {
          const slotTime = new Date(slot.start);
          return slotTime.getUTCHours() === 8 && slotTime.getUTCMinutes() === 15;
        });
        
        if (conflict815) {
          console.log('FOUND 8:15 AM UTC SLOT:');
          console.log(`  Start: ${conflict815.start}`);
          console.log(`  Available: ${conflict815.isAvailable}`);
          console.log(`  Conflicts: ${conflict815.conflicts?.length || 0}`);
          
          if (conflict815.isAvailable) {
            console.log('❌ STILL SHOWING AS AVAILABLE - Bug persists');
          } else {
            console.log('✅ CORRECTLY SHOWING AS UNAVAILABLE');
          }
        } else {
          console.log('❌ 8:15 AM slot not found in response');
        }
        
        console.log(`\nTotal slots: ${slots.length}`);
        console.log(`Unavailable slots: ${slots.filter(s => !s.isAvailable).length}`);
        
        process.exit(0);
      } catch (error) {
        console.error('Error parsing response:', error);
        console.log('Raw response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
    process.exit(1);
  });

  req.end();
}

testDirectAPI();