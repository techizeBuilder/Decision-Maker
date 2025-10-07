// Check current flag count for the new sales rep ID
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');

async function checkCurrentFlags() {
  try {
    console.log('=== CHECKING CURRENT FLAGS ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // New Yashwant Sahu ID
    
    console.log('1. Sales rep current state:');
    const salesRep = await User.findById(salesRepId);
    
    if (!salesRep) {
      console.log('❌ Sales rep not found');
      process.exit(1);
    }
    
    console.log(`   Name: ${salesRep.firstName} ${salesRep.lastName}`);
    console.log(`   Email: ${salesRep.email}`);
    console.log(`   Current flags: ${salesRep.flagsReceived || 0}`);
    
    console.log('\n2. All flags for this sales rep:');
    const allFlags = await DMFlags.find({
      dmId: salesRepId
    }).sort({ createdAt: -1 });
    
    console.log(`   Total flags found: ${allFlags.length}`);
    
    if (allFlags.length > 0) {
      allFlags.forEach((flag, i) => {
        console.log(`\n   Flag ${i+1}:`);
        console.log(`     Type: ${flag.flagType}`);
        console.log(`     Description: ${flag.description}`);
        console.log(`     Status: ${flag.status}`);
        console.log(`     Created: ${flag.createdAt || 'No date'}`);
        console.log(`     Flagged by: ${flag.flaggedBy}`);
      });
    }
    
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during check:', error);
    process.exit(1);
  }
}

checkCurrentFlags();