// Create a proper invitation relationship and test flagging
const { connectToMongoDB, User, Invitation, DMFlags } = require('./server/mongodb.ts');

async function createRealInvitation() {
  try {
    console.log('=== CREATING REAL INVITATION RELATIONSHIP ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // Yashwant Sahu
    const dmId = '68a545e3d39beeca0f74922c';       // Sameer Sahu
    
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    
    console.log('1. Creating invitation record:');
    
    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      salesRepId: salesRepId,
      email: dm.email
    });
    
    if (existingInvitation) {
      console.log('   Invitation already exists');
      console.log(`   Status: ${existingInvitation.status}`);
      
      if (existingInvitation.status !== 'accepted') {
        await Invitation.findByIdAndUpdate(existingInvitation._id, {
          status: 'accepted'
        });
        console.log('   Updated to accepted');
      }
    } else {
      // Create new invitation
      const invitation = new Invitation({
        salesRepId: salesRepId,
        email: dm.email,
        firstName: dm.firstName,
        lastName: dm.lastName,
        company: dm.company || 'Unknown Company',
        position: dm.position || 'Decision Maker',
        status: 'accepted',
        sentAt: new Date(),
        acceptedAt: new Date()
      });
      
      await invitation.save();
      console.log('   ✅ New invitation created and accepted');
    }
    
    console.log('\n2. Updating DM relationship:');
    await User.findByIdAndUpdate(dmId, {
      invitedBy: salesRepId
    });
    console.log('   ✅ DM invitedBy field updated');
    
    console.log('\n3. Testing calendar disconnection flagging:');
    const updatedDM = await User.findById(dmId);
    const hasTokens = updatedDM.googleCalendarTokens && updatedDM.googleCalendarTokens.access_token;
    const isDisconnected = !updatedDM.calendarIntegrationEnabled;
    const isInvitedByRep = updatedDM.invitedBy === salesRepId;
    
    console.log(`   Has tokens: ${hasTokens ? '✅' : '❌'}`);
    console.log(`   Calendar disconnected: ${isDisconnected ? '✅' : '❌'}`);
    console.log(`   Proper relationship: ${isInvitedByRep ? '✅' : '❌'}`);
    
    if (hasTokens && isDisconnected && isInvitedByRep) {
      console.log('\n4. ✅ All conditions met - creating new flag!');
      
      // Check for duplicate flags
      const existingFlag = await DMFlags.findOne({
        dmId: salesRepId,
        flaggedBy: dmId,
        flagType: 'quality_concern',
        description: { $regex: updatedDM.email },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Only today's flags
      });
      
      if (existingFlag) {
        console.log('   ⚠️  Recent flag already exists for today - no duplicate');
      } else {
        // Create the flag
        const newFlag = new DMFlags({
          dmId: salesRepId,
          flaggedBy: dmId,
          flagType: 'quality_concern',
          description: `Calendar disconnected by DM ${updatedDM.email} (${updatedDM.firstName} ${updatedDM.lastName}) from ${updatedDM.company || 'Unknown Company'} - SECOND DISCONNECT`,
          status: 'open',
          createdAt: new Date()
        });
        
        await newFlag.save();
        
        // Increment flag count
        const currentRep = await User.findById(salesRepId);
        await User.findByIdAndUpdate(salesRepId, {
          flagsReceived: (currentRep.flagsReceived || 0) + 1
        });
        
        console.log('   🚩 SECOND FLAG CREATED FOR CALENDAR DISCONNECTION!');
        
        const updatedRep = await User.findById(salesRepId);
        console.log(`   Sales rep flag count: ${currentRep.flagsReceived || 0} → ${updatedRep.flagsReceived}`);
      }
    } else {
      console.log('\n4. ❌ Conditions not met for flagging');
    }
    
    console.log('\n5. Final verification:');
    const finalRep = await User.findById(salesRepId);
    const allFlags = await DMFlags.find({ dmId: salesRepId }).sort({ createdAt: -1 });
    
    console.log(`   Sales rep total flags: ${finalRep.flagsReceived || 0}`);
    console.log(`   Total flag records: ${allFlags.length}`);
    
    console.log('\n   All flags:');
    allFlags.forEach((flag, i) => {
      console.log(`   ${i+1}. ${flag.description}`);
      console.log(`      Created: ${flag.createdAt}`);
      console.log(`      Status: ${flag.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating invitation:', error);
    process.exit(1);
  }
}

createRealInvitation();