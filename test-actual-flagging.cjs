// Test the actual flagging system after recent disconnection
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');

async function testActualFlagging() {
  try {
    console.log('=== TESTING ACTUAL FLAGGING AFTER DISCONNECTION ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // Yashwant Sahu
    const dmId = '68a545e3d39beeca0f74922c';       // Sameer Sahu
    
    console.log('1. Current system state:');
    
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    
    console.log(`   Sales Rep: ${salesRep.firstName} ${salesRep.lastName}`);
    console.log(`   Current flags: ${salesRep.flagsReceived || 0}`);
    
    console.log(`\n   DM: ${dm.firstName} ${dm.lastName}`);
    console.log(`   Calendar enabled: ${dm.calendarIntegrationEnabled}`);
    console.log(`   Has Google tokens: ${dm.googleCalendarTokens ? 'Yes' : 'No'}`);
    console.log(`   Invited by rep: ${dm.invitedBy === salesRepId ? 'Yes' : 'No'}`);
    
    console.log('\n2. Checking flag creation conditions:');
    
    // Check if DM has tokens but calendar disabled (disconnection scenario)
    const hasTokens = dm.googleCalendarTokens && 
                     dm.googleCalendarTokens.access_token && 
                     dm.googleCalendarTokens.refresh_token;
    
    console.log(`   Has tokens but disabled: ${hasTokens && !dm.calendarIntegrationEnabled ? 'YES - Should flag' : 'NO'}`);
    console.log(`   Was invited by this rep: ${dm.invitedBy === salesRepId ? 'YES' : 'NO'}`);
    
    // Check existing flags for this DM-Rep pair
    const existingFlags = await DMFlags.find({
      dmId: salesRepId,
      flaggedBy: dmId,
      flagType: 'quality_concern',
      description: { $regex: dm.email }
    });
    
    console.log(`   Existing flags for this pair: ${existingFlags.length}`);
    
    console.log('\n3. Manual flagging test:');
    
    if (hasTokens && !dm.calendarIntegrationEnabled && dm.invitedBy === salesRepId) {
      console.log('   ✅ Conditions met - should create flag');
      
      // Check if flag already exists to prevent duplicates
      if (existingFlags.length === 0) {
        console.log('   ✅ No duplicate flag - proceeding with flagging');
        
        // Create the flag
        const newFlag = new DMFlags({
          dmId: salesRepId, // Sales rep being flagged
          flaggedBy: dmId,  // DM who disconnected
          flagType: 'quality_concern',
          description: `Calendar disconnected by DM ${dm.email} (${dm.firstName} ${dm.lastName}) from ${dm.company || 'Unknown Company'}`,
          status: 'open',
          createdAt: new Date()
        });
        
        await newFlag.save();
        
        // Increment sales rep flag count
        await User.findByIdAndUpdate(
          salesRepId,
          { $inc: { flagsReceived: 1 } }
        );
        
        console.log('   ✅ NEW FLAG CREATED SUCCESSFULLY');
        
        // Verify the update
        const updatedRep = await User.findById(salesRepId);
        console.log(`   Updated flag count: ${updatedRep.flagsReceived}`);
        
      } else {
        console.log('   ⚠️  Flag already exists - no duplicate created');
      }
    } else {
      console.log('   ❌ Conditions not met for flagging');
      if (!hasTokens) console.log('       - DM has no Google tokens');
      if (dm.calendarIntegrationEnabled) console.log('       - Calendar is still enabled');
      if (dm.invitedBy !== salesRepId) console.log('       - DM was not invited by this rep');
    }
    
    console.log('\n4. Final verification:');
    const finalRep = await User.findById(salesRepId);
    const allFlags = await DMFlags.find({ dmId: salesRepId });
    
    console.log(`   Sales rep final flag count: ${finalRep.flagsReceived || 0}`);
    console.log(`   Total flag records: ${allFlags.length}`);
    
    allFlags.forEach((flag, i) => {
      console.log(`   Flag ${i+1}: ${flag.description}`);
      console.log(`   Created: ${flag.createdAt}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during flagging test:', error);
    process.exit(1);
  }
}

testActualFlagging();