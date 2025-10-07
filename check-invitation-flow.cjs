// Check the invitation flow and DM calendar connection detection
const { connectToMongoDB, User, Invitation, MonthlyCallLimit } = require('./server/mongodb.ts');

async function checkInvitationFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const repId = '68a2fcffc8b684d6531e6f4c';
    const dmId = '68a2ff105e77e990a9056749';
    
    console.log('\n=== INVITATION FLOW DEBUG ===\n');
    
    // 1. Check all invitations for this rep
    const invitations = await Invitation.find({ repId: repId });
    console.log(`1. Total invitations by rep: ${invitations.length}`);
    
    invitations.forEach((inv, index) => {
      console.log(`   Invitation ${index + 1}:`);
      console.log(`   - DM ID: ${inv.dmId}`);
      console.log(`   - Status: ${inv.status}`);
      console.log(`   - DM Name: ${inv.decisionMakerName || inv.firstName + ' ' + inv.lastName}`);
      console.log(`   - DM Email: ${inv.decisionMakerEmail || inv.email}`);
      console.log(`   - Sent At: ${inv.sentAt}`);
      console.log(`   - Accepted At: ${inv.acceptedAt}`);
      console.log('');
    });
    
    // 2. Check the specific DM's details
    const dm = await User.findById(dmId);
    console.log(`2. DM Details (${dmId}):`);
    console.log(`   - Name: ${dm.firstName} ${dm.lastName}`);
    console.log(`   - Email: ${dm.email}`);
    console.log(`   - Role: ${dm.role}`);
    console.log(`   - Calendar Integration Enabled: ${dm.calendarIntegrationEnabled}`);
    console.log(`   - Has Google Calendar Tokens: ${!!dm.googleCalendarTokens}`);
    console.log('');
    
    // 3. Check if invitation properly links rep to DM
    const directInvitation = invitations.find(inv => inv.dmId === dmId);
    console.log(`3. Direct invitation link exists: ${!!directInvitation}`);
    if (directInvitation) {
      console.log(`   - Status: ${directInvitation.status}`);
      console.log(`   - Rep ID in invitation: ${directInvitation.repId || directInvitation.salesRepId}`);
    }
    
    // 4. Check rep's call limit calculation
    console.log('\n4. Manual Call Limit Calculation:');
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
    console.log(`   - Accepted invitations: ${acceptedInvitations.length}`);
    
    let connectedCalendarDMsCount = 0;
    for (const invitation of acceptedInvitations) {
      const invitedDM = await User.findById(invitation.dmId);
      const hasCalendar = invitedDM && invitedDM.calendarIntegrationEnabled;
      console.log(`   - DM ${invitedDM?.firstName} ${invitedDM?.lastName}: Calendar=${hasCalendar}`);
      if (hasCalendar) connectedCalendarDMsCount++;
    }
    
    console.log(`   - Connected Calendar DMs: ${connectedCalendarDMsCount}`);
    console.log(`   - Rep should have: ${connectedCalendarDMsCount > 0 ? '5 calls (basic plan)' : '0 calls'}`);
    
    // 5. Check current call limit
    const currentMonth = new Date().toISOString().slice(0, 7);
    const repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    console.log(`\n5. Current Rep Call Limit:`);
    console.log(`   - Max Calls: ${repCallLimit?.maxCalls || 'Not set'}`);
    console.log(`   - Remaining: ${repCallLimit?.remainingCalls || 'Not set'}`);
    
    if (connectedCalendarDMsCount > 0 && (!repCallLimit || repCallLimit.maxCalls === 0)) {
      console.log('\n🔧 FIXING: Rep should have calls but limit is 0 - updating...');
      if (repCallLimit) {
        await MonthlyCallLimit.findByIdAndUpdate(repCallLimit._id, {
          maxCalls: 5,
          remainingCalls: 5,
          lastUpdated: new Date()
        });
        console.log('✅ Updated rep call limit to 5');
      } else {
        await MonthlyCallLimit.create({
          userId: repId,
          userRole: 'sales_rep',
          month: currentMonth,
          totalCalls: 0,
          maxCalls: 5,
          remainingCalls: 5,
          lastUpdated: new Date()
        });
        console.log('✅ Created rep call limit with 5 calls');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking invitation flow:', error);
    process.exit(1);
  }
}

checkInvitationFlow();