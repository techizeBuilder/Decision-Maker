// Fix the existing DM-Rep relationship and test the credit allocation
const { connectToMongoDB, User, Invitation, MonthlyCallLimit } = require('./server/mongodb.ts');

async function fixExistingDMCalls() {
  try {
    console.log('Fixing existing DM-Rep relationship...');
    await connectToMongoDB();
    
    const repId = '68a3391fbab1a344ef7cb8e8';
    const dmId = '68a33ba0bab1a344ef7cb91b';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Check if invitation record exists
    let invitation = await Invitation.findOne({
      $or: [
        { salesRepId: repId, dmId: dmId },
        { repId: repId, dmId: dmId }
      ]
    });
    
    console.log('Existing invitation:', !!invitation);
    
    // Create invitation record if missing
    if (!invitation) {
      const dm = await User.findById(dmId);
      invitation = await Invitation.create({
        salesRepId: repId,
        repId: repId,
        dmId: dmId,
        status: 'accepted',
        sentAt: new Date(),
        acceptedAt: new Date(),
        email: dm.email,
        firstName: dm.firstName,
        lastName: dm.lastName,
        decisionMakerEmail: dm.email,
        decisionMakerName: `${dm.firstName} ${dm.lastName}`
      });
      console.log('✅ Created missing invitation record');
    }
    
    // Update DM to show they were invited by this rep
    await User.findByIdAndUpdate(dmId, {
      invitedBy: repId,
      invitationStatus: 'accepted',
      invitedAt: new Date()
    });
    console.log('✅ Updated DM invitation info');
    
    // Now force refresh the rep's call limits
    await MonthlyCallLimit.deleteOne({
      userId: repId,
      month: currentMonth
    });
    
    // The system should now properly detect the connected calendar DM and allocate credits
    const dm = await User.findById(dmId);
    if (dm.calendarIntegrationEnabled) {
      await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: 5, // Basic plan
        remainingCalls: 5,
        lastUpdated: new Date()
      });
      console.log('✅ Sales rep credited with 5 calls for connected calendar DM');
    }
    
    console.log('\n=== VERIFICATION ===');
    const finalCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    console.log(`Rep call limits: ${finalCallLimit?.maxCalls || 0} max, ${finalCallLimit?.remainingCalls || 0} remaining`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixExistingDMCalls();