// Fix duplicate invitations issue
const { connectToMongoDB, Invitation, User } = require('./server/mongodb');

async function fixDuplicateInvitations() {
  try {
    console.log('=== FIXING DUPLICATE INVITATIONS ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a58ce1e6dc71868438847e';
    
    // Get all invitations for this sales rep
    const allInvitations = await Invitation.find({ salesRepId: salesRepId });
    console.log(`Found ${allInvitations.length} total invitations`);
    
    // Group by email to find duplicates
    const emailGroups = {};
    allInvitations.forEach(inv => {
      const email = inv.decisionMakerEmail || inv.email;
      if (email) {
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(inv);
      }
    });
    
    console.log('Processing duplicate groups...\n');
    
    let deletedCount = 0;
    
    for (const [email, invitations] of Object.entries(emailGroups)) {
      if (invitations.length > 1) {
        console.log(`Processing duplicates for ${email}:`);
        console.log(`  Found ${invitations.length} invitations`);
        
        // Sort by creation date (keep the most recent)
        invitations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const keepInvitation = invitations[0];
        const deleteInvitations = invitations.slice(1);
        
        console.log(`  Keeping: ID ${keepInvitation._id} (${keepInvitation.status}, created ${keepInvitation.createdAt})`);
        
        for (const deleteInv of deleteInvitations) {
          console.log(`  Deleting: ID ${deleteInv._id} (${deleteInv.status}, created ${deleteInv.createdAt})`);
          await Invitation.findByIdAndDelete(deleteInv._id);
          deletedCount++;
        }
        
        console.log('');
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Successfully removed ${deletedCount} duplicate invitation(s)`);
      
      // Verify the fix
      const remainingInvitations = await Invitation.find({ salesRepId: salesRepId });
      console.log(`Remaining invitations: ${remainingInvitations.length}`);
      
      remainingInvitations.forEach((inv, index) => {
        console.log(`  ${index + 1}. ${inv.decisionMakerName} (${inv.decisionMakerEmail}) - ${inv.status}`);
      });
      
    } else {
      console.log('✅ No duplicate invitations found to remove');
    }
    
    console.log('\n=== FIX COMPLETE ===');
    console.log('The dashboard should now show the correct invitation count.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error);
    process.exit(1);
  }
}

fixDuplicateInvitations();