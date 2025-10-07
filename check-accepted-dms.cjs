// Check which DMs are linked to the rep and their calendar status
const { connectToMongoDB, User, Invitation, MonthlyCallLimit } = require('./server/mongodb.ts');

async function checkAcceptedDMs() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const repId = '68a2fcffc8b684d6531e6f4c';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get invitations by salesRepId (correct field)
    const invitations = await Invitation.find({ salesRepId: repId });
    console.log(`\nRep has ${invitations.length} total invitations`);
    
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
    console.log(`Accepted invitations: ${acceptedInvitations.length}`);
    
    let connectedCalendarDMsCount = 0;
    for (const invitation of acceptedInvitations) {
      const dm = await User.findById(invitation.dmId);
      console.log(`\nDM: ${dm?.firstName} ${dm?.lastName} (${invitation.dmId})`);
      console.log(`  - Email: ${dm?.email}`);
      console.log(`  - Calendar Enabled: ${dm?.calendarIntegrationEnabled || false}`);
      console.log(`  - Has Google Tokens: ${!!dm?.googleCalendarTokens}`);
      
      if (dm && dm.calendarIntegrationEnabled) {
        connectedCalendarDMsCount++;
        console.log(`  ✅ This DM counts toward rep credits`);
      } else {
        console.log(`  ❌ This DM does not count (no calendar)`);
      }
    }
    
    console.log(`\nTotal connected calendar DMs: ${connectedCalendarDMsCount}`);
    console.log(`Rep should get: ${connectedCalendarDMsCount > 0 ? '5 calls (basic plan)' : '0 calls'}`);
    
    // Force update the call limit
    if (connectedCalendarDMsCount > 0) {
      console.log('\nForce updating rep call limits...');
      
      // Delete existing limit to force recalculation
      await MonthlyCallLimit.deleteOne({
        userId: repId,
        month: currentMonth
      });
      
      // Create new limit
      const newLimit = await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: 5,
        remainingCalls: 5,
        lastUpdated: new Date()
      });
      
      console.log('✅ Rep call limit set to 5 calls');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAcceptedDMs();