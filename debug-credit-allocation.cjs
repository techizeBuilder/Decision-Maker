// Debug credit allocation for sales rep
const { connectToMongoDB, User, MonthlyCallLimit, DMRepCreditUsage, Invitation } = require('./server/mongodb.ts');

async function debugCreditAllocation() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const repId = '68a2fcffc8b684d6531e6f4c';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log(`\nDebugging credit allocation for sales rep: ${repId}`);
    console.log(`Current month: ${currentMonth}`);
    
    // 1. Check rep details
    const rep = await User.findById(repId);
    console.log('\n1. Sales Rep Details:', {
      name: `${rep.firstName} ${rep.lastName}`,
      email: rep.email,
      packageType: rep.packageType || 'free',
      role: rep.role
    });
    
    // 2. Check invitations by this rep
    const invitations = await Invitation.find({ repId: repId });
    console.log('\n2. Invitations sent by rep:', invitations.length);
    
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
    console.log('   - Accepted invitations:', acceptedInvitations.length);
    
    for (const inv of acceptedInvitations) {
      const dm = await User.findById(inv.dmId);
      console.log(`   - DM ${inv.dmId}: ${dm ? dm.firstName + ' ' + dm.lastName : 'Not found'} - Calendar connected: ${dm?.calendarIntegrationEnabled || false}`);
    }
    
    // 3. Check rep's call limits
    const repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    console.log('\n3. Rep Call Limits:', {
      maxCalls: repCallLimit?.maxCalls,
      totalCalls: repCallLimit?.totalCalls,
      remainingCalls: repCallLimit?.remainingCalls
    });
    
    // 4. Check if rep has earned any credits from DMs
    const creditUsages = await DMRepCreditUsage.find({
      repId: repId,
      month: currentMonth
    });
    console.log('\n4. Credit Usage Records:', creditUsages.length);
    creditUsages.forEach(usage => {
      console.log(`   - DM ${usage.dmId}: ${usage.creditsUsed} credits used`);
    });
    
    console.log('\n🔍 DIAGNOSIS:');
    if (acceptedInvitations.length === 0) {
      console.log('❌ No accepted invitations - rep needs DMs to accept invites first');
    } else {
      const connectedCalendarDMs = acceptedInvitations.filter(async inv => {
        const dm = await User.findById(inv.dmId);
        return dm?.calendarIntegrationEnabled;
      });
      if (connectedCalendarDMs.length === 0) {
        console.log('❌ No DMs have connected their calendar - rep earns credits only when invited DMs connect calendar');
      } else {
        console.log('✅ DMs have connected calendar, rep should have credits');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error debugging credit allocation:', error);
    process.exit(1);
  }
}

debugCreditAllocation();