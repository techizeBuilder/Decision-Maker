// Trigger the calendar disconnect flagging now that relationship is fixed
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');

async function triggerCalendarDisconnect() {
  try {
    console.log('=== TRIGGERING CALENDAR DISCONNECT FLAGGING ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // Yashwant Sahu
    const dmId = '68a545e3d39beeca0f74922c';       // Sameer Sahu
    
    console.log('1. Verifying current state:');
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    
    console.log(`   Sales Rep: ${salesRep.firstName} ${salesRep.lastName}`);
    console.log(`   Current flags: ${salesRep.flagsReceived || 0}`);
    
    console.log(`\n   DM: ${dm.firstName} ${dm.lastName}`);
    console.log(`   Calendar enabled: ${dm.calendarIntegrationEnabled}`);
    console.log(`   Has Google tokens: ${dm.googleCalendarTokens ? 'Yes' : 'No'}`);
    console.log(`   InvitedBy: ${dm.invitedBy === salesRepId ? 'This rep' : 'Other/None'}`);
    
    console.log('\n2. Checking flagging conditions:');
    const hasTokens = dm.googleCalendarTokens && dm.googleCalendarTokens.access_token;
    const isDisconnected = !dm.calendarIntegrationEnabled;
    const isInvitedByRep = dm.invitedBy === salesRepId;
    
    console.log(`   Has tokens: ${hasTokens ? '✅' : '❌'}`);
    console.log(`   Calendar disconnected: ${isDisconnected ? '✅' : '❌'}`);
    console.log(`   Invited by this rep: ${isInvitedByRep ? '✅' : '❌'}`);
    
    if (hasTokens && isDisconnected && isInvitedByRep) {
      console.log('\n3. ✅ All conditions met - creating flag!');
      
      // Check for existing flags to prevent duplicates
      const existingFlag = await DMFlags.findOne({
        dmId: salesRepId,
        flaggedBy: dmId,
        flagType: 'quality_concern',
        description: { $regex: dm.email }
      });
      
      if (existingFlag) {
        console.log('   ⚠️  Flag already exists - no duplicate created');
      } else {
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
        
        console.log('   🚩 NEW FLAG CREATED!');
        
        // Verify the update
        const updatedRep = await User.findById(salesRepId);
        console.log(`   Sales rep flag count: ${salesRep.flagsReceived || 0} → ${updatedRep.flagsReceived}`);
      }
    } else {
      console.log('\n3. ❌ Conditions not met for flagging');
    }
    
    console.log('\n4. Final status:');
    const finalRep = await User.findById(salesRepId);
    const allFlags = await DMFlags.find({ dmId: salesRepId });
    
    console.log(`   Sales rep total flags: ${finalRep.flagsReceived || 0}`);
    console.log(`   Flag records in database: ${allFlags.length}`);
    
    if (allFlags.length > 0) {
      console.log('\n   Recent flags:');
      allFlags.sort((a, b) => b.createdAt - a.createdAt).forEach((flag, i) => {
        console.log(`   ${i+1}. ${flag.description}`);
        console.log(`      Created: ${flag.createdAt}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during flagging:', error);
    process.exit(1);
  }
}

triggerCalendarDisconnect();