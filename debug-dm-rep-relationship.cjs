// Debug and fix the DM-Rep relationship for proper flagging
const { connectToMongoDB, User, Invitation } = require('./server/mongodb.ts');

async function debugDMRepRelationship() {
  try {
    console.log('=== DEBUGGING DM-REP RELATIONSHIP ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // Yashwant Sahu
    const dmId = '68a545e3d39beeca0f74922c';       // Sameer Sahu
    
    console.log('1. Current user data:');
    const salesRep = await User.findById(salesRepId);
    const dm = await User.findById(dmId);
    
    console.log(`   Sales Rep: ${salesRep.firstName} ${salesRep.lastName} (${salesRep.email})`);
    console.log(`   ID: ${salesRepId}`);
    
    console.log(`\n   DM: ${dm.firstName} ${dm.lastName} (${dm.email})`);
    console.log(`   ID: ${dmId}`);
    console.log(`   Current invitedBy: ${dm.invitedBy || 'NULL'}`);
    console.log(`   Calendar enabled: ${dm.calendarIntegrationEnabled}`);
    
    console.log('\n2. Checking invitation records:');
    // Check if there's an invitation from this rep to this DM
    const invitation = await Invitation.findOne({
      salesRepId: salesRepId,
      email: dm.email
    });
    
    if (invitation) {
      console.log('   ✅ Invitation found:');
      console.log(`   From: ${invitation.salesRepId}`);
      console.log(`   To: ${invitation.email}`);
      console.log(`   Status: ${invitation.status}`);
      console.log(`   Created: ${invitation.createdAt}`);
    } else {
      console.log('   ❌ No invitation found');
    }
    
    console.log('\n3. Fixing the relationship:');
    if (invitation && invitation.status === 'accepted') {
      // Update DM's invitedBy field to establish proper relationship
      await User.findByIdAndUpdate(dmId, {
        invitedBy: salesRepId
      });
      
      console.log('   ✅ Fixed: Updated DM invitedBy field');
      
      // Verify the fix
      const updatedDM = await User.findById(dmId);
      console.log(`   Verification: invitedBy is now ${updatedDM.invitedBy}`);
      
      console.log('\n4. Testing flagging conditions after fix:');
      const hasTokens = updatedDM.googleCalendarTokens && 
                       updatedDM.googleCalendarTokens.access_token;
      
      const shouldFlag = hasTokens && 
                        !updatedDM.calendarIntegrationEnabled && 
                        updatedDM.invitedBy === salesRepId;
      
      console.log(`   Has tokens: ${hasTokens ? 'Yes' : 'No'}`);
      console.log(`   Calendar disabled: ${!updatedDM.calendarIntegrationEnabled ? 'Yes' : 'No'}`);
      console.log(`   Proper relationship: ${updatedDM.invitedBy === salesRepId ? 'Yes' : 'No'}`);
      console.log(`   Should trigger flagging: ${shouldFlag ? 'YES' : 'NO'}`);
      
      if (shouldFlag) {
        console.log('\n   ✅ Relationship fixed - flagging should now work!');
      }
      
    } else {
      console.log('   ❌ Cannot fix - no accepted invitation found');
      console.log('\n   📝 Manual fix needed:');
      console.log('   Creating invitation relationship...');
      
      // Create the relationship directly
      await User.findByIdAndUpdate(dmId, {
        invitedBy: salesRepId
      });
      
      console.log('   ✅ Manual relationship created');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during relationship debug:', error);
    process.exit(1);
  }
}

debugDMRepRelationship();