// Debug invitation field names and fix any mismatches
const { connectToMongoDB, Invitation } = require('./server/mongodb.ts');

async function debugInvitationFields() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const repId = '68a2fcffc8b684d6531e6f4c';
    const dmId = '68a2ff105e77e990a9056749';
    
    console.log('\n=== INVITATION FIELD DEBUG ===\n');
    
    // Check all invitations with various field combinations
    console.log('1. Searching by repId field:');
    const invitationsByRepId = await Invitation.find({ repId: repId });
    console.log(`   Found: ${invitationsByRepId.length}`);
    
    console.log('\n2. Searching by salesRepId field:');
    const invitationsBySalesRepId = await Invitation.find({ salesRepId: repId });
    console.log(`   Found: ${invitationsBySalesRepId.length}`);
    
    console.log('\n3. Searching for our specific DM:');
    const dmInvitations = await Invitation.find({ dmId: dmId });
    console.log(`   Found: ${dmInvitations.length}`);
    
    if (dmInvitations.length > 0) {
      console.log('\n4. DM Invitation details:');
      dmInvitations.forEach((inv, index) => {
        console.log(`   Invitation ${index + 1}:`);
        console.log(`   - _id: ${inv._id}`);
        console.log(`   - repId: ${inv.repId}`);
        console.log(`   - salesRepId: ${inv.salesRepId}`);
        console.log(`   - dmId: ${inv.dmId}`);
        console.log(`   - status: ${inv.status}`);
        console.log('');
      });
      
      // Check if the rep field matches
      const repMatch = dmInvitations.find(inv => 
        inv.repId === repId || inv.salesRepId === repId
      );
      
      if (!repMatch) {
        console.log('5. FIXING: Updating invitation to link to correct rep...');
        const invToUpdate = dmInvitations[0];
        await Invitation.findByIdAndUpdate(invToUpdate._id, {
          repId: repId,
          salesRepId: repId
        });
        console.log('✅ Fixed invitation rep linkage');
      } else {
        console.log('5. Rep linkage is correct');
      }
    }
    
    console.log('\n6. Final verification - search again:');
    const finalCheck = await Invitation.find({ 
      $or: [
        { repId: repId },
        { salesRepId: repId }
      ]
    });
    console.log(`   Total invitations for rep: ${finalCheck.length}`);
    
    const acceptedInvitations = finalCheck.filter(inv => inv.status === 'accepted');
    console.log(`   Accepted invitations: ${acceptedInvitations.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error debugging invitation fields:', error);
    process.exit(1);
  }
}

debugInvitationFields();