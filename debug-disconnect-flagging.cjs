// Debug why the DM disconnection didn't trigger sales rep flagging
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');

async function debugDisconnectFlagging() {
  try {
    console.log('=== DEBUGGING DM DISCONNECT FLAGGING ===\n');
    await connectToMongoDB();
    
    // New DM data from user's message
    const dmId = '68a545e3d39beeca0f74922c'; // Sameer Sahu (NEW ID)
    const salesRepId = '68a5457bd39beeca0f74921c'; // Yashwant Sahu (NEW ID)
    
    console.log('1. Current DM and Sales Rep state:');
    const dm = await User.findById(dmId);
    const salesRep = await User.findById(salesRepId);
    
    if (!dm || !salesRep) {
      console.log('❌ Could not find DM or sales rep with new IDs');
      process.exit(1);
    }
    
    console.log(`   DM: ${dm.firstName} ${dm.lastName} (${dm.email})`);
    console.log(`   Calendar enabled: ${dm.calendarIntegrationEnabled}`);
    console.log(`   Has Google tokens: ${dm.googleCalendarTokens ? 'Yes' : 'No'}`);
    console.log(`   Invited by: ${dm.invitedBy}`);
    console.log(`   Sales Rep: ${salesRep.firstName} ${salesRep.lastName} (${salesRep.email})`);
    console.log(`   Current flags: ${salesRep.flagsReceived || 0}`);
    
    console.log('\n2. Checking scenario:');
    const hasTokensButDisconnected = dm.googleCalendarTokens && !dm.calendarIntegrationEnabled;
    console.log(`   DM has tokens but disconnected: ${hasTokensButDisconnected}`);
    console.log(`   DM was invited by this sales rep: ${dm.invitedBy?.toString() === salesRepId}`);
    
    console.log('\n3. Checking existing flags for this DM-Rep pair:');
    const existingFlags = await DMFlags.find({
      dmId: salesRepId, // Sales rep being flagged
      description: { $regex: dm.email }
    });
    
    console.log(`   Found ${existingFlags.length} existing flags for this specific DM email`);
    
    if (existingFlags.length > 0) {
      existingFlags.forEach((flag, i) => {
        console.log(`   Flag ${i+1}: ${flag.description}`);
      });
    }
    
    console.log('\n4. Why flagging may not have triggered:');
    if (!hasTokensButDisconnected) {
      console.log('   ❌ DM calendar is not in disconnected state');
    } else if (dm.invitedBy?.toString() !== salesRepId) {
      console.log('   ❌ DM was not invited by this sales rep');
    } else if (existingFlags.length > 0) {
      console.log('   ⚠️  Sales rep already flagged for this DM');
    } else {
      console.log('   ✅ All conditions met, should flag sales rep');
      
      console.log('\n5. Manually triggering flagging for this scenario:');
      const flagReason = `Calendar disconnected by DM ${dm.email} (${dm.firstName} ${dm.lastName}) from ${dm.company || 'Unknown Company'}`;
      
      // Create the flag
      const flagData = {
        dmId: salesRepId, // Sales rep being flagged
        flaggedBy: dmId, // DM who caused the flag
        flagType: 'quality_concern',
        description: flagReason,
        status: 'open',
        severity: 'medium',
        companyDomain: dm.companyDomain || 'naeberly.com'
      };
      
      console.log('   Creating flag:', flagData);
      const flag = new DMFlags(flagData);
      await flag.save();
      
      // Increment sales rep flag count
      const updatedSalesRep = await User.findByIdAndUpdate(
        salesRepId,
        { 
          $inc: { flagsReceived: 1 },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );
      
      console.log(`   ✅ Sales rep flagged! New flag count: ${updatedSalesRep.flagsReceived}`);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during debug:', error);
    process.exit(1);
  }
}

debugDisconnectFlagging();