// Check current flag status for both old and new user IDs
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');

async function checkFlagStatus() {
  try {
    console.log('=== CHECKING FLAG STATUS FOR ALL USERS ===\n');
    await connectToMongoDB();
    
    // Check both old and new user IDs
    const salesRepIds = [
      '68a416aa43a1e7186672b471', // Old Yashwant Sahu ID
      '68a5457bd39beeca0f74921c'  // New Yashwant Sahu ID
    ];
    
    const dmIds = [
      '68a4171e43a1e7186672b4d5', // Old Sameer Sahu ID  
      '68a545e3d39beeca0f74922c'  // New Sameer Sahu ID
    ];
    
    console.log('1. Checking all sales reps:');
    for (const repId of salesRepIds) {
      const rep = await User.findById(repId);
      if (rep) {
        console.log(`   Rep: ${rep.firstName} ${rep.lastName} (${rep.email})`);
        console.log(`   ID: ${repId}`);
        console.log(`   Flags: ${rep.flagsReceived || 0}`);
        console.log('');
      }
    }
    
    console.log('2. Checking all DMs:');
    for (const dmId of dmIds) {
      const dm = await User.findById(dmId);
      if (dm) {
        console.log(`   DM: ${dm.firstName} ${dm.lastName} (${dm.email})`);
        console.log(`   ID: ${dmId}`);
        console.log(`   Calendar enabled: ${dm.calendarIntegrationEnabled}`);
        console.log(`   Has tokens: ${dm.googleCalendarTokens ? 'Yes' : 'No'}`);
        console.log(`   Invited by: ${dm.invitedBy}`);
        console.log('');
      }
    }
    
    console.log('3. All flag records in database:');
    const allFlags = await DMFlags.find({}).sort({ createdAt: -1 });
    console.log(`   Total flags in system: ${allFlags.length}`);
    
    if (allFlags.length > 0) {
      allFlags.forEach((flag, i) => {
        console.log(`\n   Flag ${i+1}:`);
        console.log(`     Target (dmId): ${flag.dmId}`);
        console.log(`     Flagged by: ${flag.flaggedBy}`);
        console.log(`     Type: ${flag.flagType}`);
        console.log(`     Description: ${flag.description}`);
        console.log(`     Status: ${flag.status}`);
        console.log(`     Created: ${flag.createdAt}`);
      });
    }
    
    console.log('\n4. Checking API endpoint response for current user:');
    // Find the most recent sales rep (should be the one currently logged in)
    const currentRep = await User.findById('68a5457bd39beeca0f74921c');
    if (currentRep) {
      console.log(`   Current logged-in rep: ${currentRep.email}`);
      console.log(`   Flag count in database: ${currentRep.flagsReceived || 0}`);
      
      // Check what the API endpoint returns
      console.log('\n5. Simulating API response:');
      const userFlags = await DMFlags.find({ dmId: currentRep._id });
      console.log(`   Flags found via API query: ${userFlags.length}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during flag status check:', error);
    process.exit(1);
  }
}

checkFlagStatus();