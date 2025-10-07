// Quick verification that the flag was created
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');

async function verifyFlagCreated() {
  try {
    console.log('=== VERIFYING FLAG CREATION ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c';
    const dmId = '68a545e3d39beeca0f74922c';
    
    console.log('Current status:');
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    const flags = await DMFlags.find({ dmId: salesRepId }).sort({ createdAt: -1 });
    
    console.log(`Sales Rep: ${salesRep.firstName} ${salesRep.lastName}`);
    console.log(`Flags in database: ${salesRep.flagsReceived || 0}`);
    
    console.log(`\nDM: ${dm.firstName} ${dm.lastName}`);
    console.log(`Calendar enabled: ${dm.calendarIntegrationEnabled}`);
    console.log(`Invited by rep: ${dm.invitedBy === salesRepId ? 'Yes' : 'No'}`);
    
    console.log(`\nFlag records: ${flags.length}`);
    flags.forEach((flag, i) => {
      console.log(`${i+1}. ${flag.description}`);
      console.log(`   Created: ${flag.createdAt}`);
    });
    
    if (flags.length >= 2) {
      console.log('\n🎉 SUCCESS: Second flag created for calendar disconnection!');
    } else {
      console.log('\n⚠️  Only one flag exists - second disconnection not flagged yet');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyFlagCreated();