// Debug invitation count discrepancy
const { connectToMongoDB, Invitation, User } = require('./server/mongodb');

async function debugInvitationCount() {
  try {
    console.log('=== DEBUGGING INVITATION COUNT ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a58ce1e6dc71868438847e';
    
    // Get user info
    const user = await User.findById(salesRepId);
    console.log('1. User details:');
    console.log(`   Name: ${user?.firstName} ${user?.lastName}`);
    console.log(`   Email: ${user?.email}`);
    console.log(`   Package Type: ${user?.packageType}`);
    
    // Check invitations directly
    console.log('\n2. Direct database check:');
    const allInvitations = await Invitation.find({ salesRepId: salesRepId });
    console.log(`   Total invitations in DB: ${allInvitations.length}`);
    
    allInvitations.forEach((inv, index) => {
      console.log(`   ${index + 1}. DM: ${inv.decisionMakerName || inv.name || 'Unknown'}`);
      console.log(`      Email: ${inv.decisionMakerEmail || inv.email || 'Unknown'}`);
      console.log(`      Status: ${inv.status}`);
      console.log(`      Created: ${inv.createdAt}`);
      console.log('');
    });
    
    // Check for duplicate invitations
    console.log('3. Checking for duplicates:');
    const duplicateEmails = {};
    allInvitations.forEach(inv => {
      const email = inv.decisionMakerEmail || inv.email;
      if (email) {
        if (duplicateEmails[email]) {
          duplicateEmails[email].push(inv);
        } else {
          duplicateEmails[email] = [inv];
        }
      }
    });
    
    let hasDuplicates = false;
    Object.keys(duplicateEmails).forEach(email => {
      if (duplicateEmails[email].length > 1) {
        hasDuplicates = true;
        console.log(`   ⚠️  Duplicate email ${email}: ${duplicateEmails[email].length} invitations`);
        duplicateEmails[email].forEach((inv, idx) => {
          console.log(`      ${idx + 1}. ID: ${inv._id}, Status: ${inv.status}, Created: ${inv.createdAt}`);
        });
      }
    });
    
    if (!hasDuplicates) {
      console.log('   ✅ No duplicate emails found');
    }
    
    // Summary
    console.log('\n4. Summary:');
    const accepted = allInvitations.filter(inv => inv.status === 'accepted').length;
    const pending = allInvitations.filter(inv => inv.status === 'pending').length;
    
    console.log(`   Total invitations: ${allInvitations.length}`);
    console.log(`   Accepted: ${accepted}`);
    console.log(`   Pending: ${pending}`);
    
    // Expected vs Actual count
    console.log('\n5. Expected vs Actual:');
    console.log('   User says they invited only 1 DM');
    console.log(`   Database shows: ${allInvitations.length} invitations`);
    
    if (allInvitations.length > 1) {
      console.log('   ❌ Count mismatch - there are extra invitations');
      console.log('\n   Possible causes:');
      console.log('   - User invited multiple DMs but forgot');
      console.log('   - System created duplicate invitations');
      console.log('   - Data import/migration created extras');
    } else {
      console.log('   ✅ Count matches user expectation');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugInvitationCount();