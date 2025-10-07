// Fix sales rep credits by updating their call limits based on accepted invitations
const { connectToMongoDB, User, MonthlyCallLimit, Invitation } = require('./server/mongodb.ts');

async function fixRepCredits() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const repId = '68a2fcffc8b684d6531e6f4c';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get rep's current call limit
    let repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    
    console.log('Current rep call limits:', {
      maxCalls: repCallLimit?.maxCalls || 0,
      remainingCalls: repCallLimit?.remainingCalls || 0
    });
    
    // Get rep's invitations
    const invitations = await Invitation.find({ repId: repId });
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
    
    console.log(`Rep has ${invitations.length} total invitations, ${acceptedInvitations.length} accepted`);
    
    // Check which accepted DMs have connected calendar
    let connectedCalendarDMsCount = 0;
    for (const invitation of acceptedInvitations) {
      const dm = await User.findById(invitation.dmId);
      if (dm && dm.calendarIntegrationEnabled) {
        console.log(`✅ DM ${dm.firstName} ${dm.lastName} has calendar connected`);
        connectedCalendarDMsCount++;
      } else {
        console.log(`❌ DM ${dm ? dm.firstName + ' ' + dm.lastName : invitation.dmId} no calendar connection`);
      }
    }
    
    console.log(`Connected calendar DMs: ${connectedCalendarDMsCount}`);
    
    // Rep should get their plan limit if they have connected calendar DMs
    if (connectedCalendarDMsCount > 0) {
      const rep = await User.findById(repId);
      const planBasedLimit = rep.packageType === 'basic' ? 5 : rep.packageType === 'pro' ? 10 : 5; // Default to 5
      
      console.log(`Rep should have ${planBasedLimit} calls based on ${rep.packageType} plan`);
      
      // Update call limit
      if (repCallLimit) {
        const updatedLimit = await MonthlyCallLimit.findByIdAndUpdate(
          repCallLimit._id,
          { 
            maxCalls: planBasedLimit,
            remainingCalls: Math.max(0, planBasedLimit - repCallLimit.totalCalls),
            lastUpdated: new Date()
          },
          { new: true }
        );
        console.log('✅ Updated rep call limits:', {
          maxCalls: updatedLimit.maxCalls,
          remainingCalls: updatedLimit.remainingCalls
        });
      } else {
        const newLimit = await MonthlyCallLimit.create({
          userId: repId,
          userRole: 'sales_rep',
          month: currentMonth,
          totalCalls: 0,
          maxCalls: planBasedLimit,
          remainingCalls: planBasedLimit,
          lastUpdated: new Date()
        });
        console.log('✅ Created new rep call limits:', {
          maxCalls: newLimit.maxCalls,
          remainingCalls: newLimit.remainingCalls
        });
      }
    } else {
      console.log('❌ Rep has no connected calendar DMs, call limit remains 0');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing rep credits:', error);
    process.exit(1);
  }
}

fixRepCredits();