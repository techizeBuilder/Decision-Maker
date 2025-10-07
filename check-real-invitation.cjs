// Check the real invitation flow for the new DM onboarding
const { connectToMongoDB, User, Invitation, MonthlyCallLimit, DMRepCreditUsage } = require('./server/mongodb.ts');

async function checkRealInvitation() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    // New user IDs from logs
    const repId = '68a3391fbab1a344ef7cb8e8';
    const dmId = '68a33ba0bab1a344ef7cb91b';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log('\n=== REAL INVITATION FLOW CHECK ===\n');
    
    // 1. Check rep details
    const rep = await User.findById(repId);
    console.log('1. Sales Rep:', {
      name: `${rep.firstName} ${rep.lastName}`,
      email: rep.email,
      packageType: rep.packageType
    });
    
    // 2. Check DM details
    const dm = await User.findById(dmId);
    console.log('\n2. Decision Maker:', {
      name: `${dm.firstName} ${dm.lastName}`,
      email: dm.email,
      calendarConnected: dm.calendarIntegrationEnabled || false,
      hasGoogleTokens: !!dm.googleCalendarTokens
    });
    
    // 3. Check for invitation record
    const invitation = await Invitation.findOne({
      $or: [
        { repId: repId, dmId: dmId },
        { salesRepId: repId, dmId: dmId }
      ]
    });
    console.log('\n3. Invitation Record:', invitation ? {
      status: invitation.status,
      repId: invitation.repId,
      salesRepId: invitation.salesRepId,
      sentAt: invitation.sentAt,
      acceptedAt: invitation.acceptedAt
    } : 'NO INVITATION RECORD FOUND');
    
    // 4. Check credit usage
    const creditUsage = await DMRepCreditUsage.findOne({
      repId: repId,
      dmId: dmId,
      month: currentMonth
    });
    console.log('\n4. Credit Usage Record:', creditUsage ? {
      creditsUsed: creditUsage.creditsUsed,
      lastUsed: creditUsage.lastUsed
    } : 'No credit usage found');
    
    // 5. Check all invitations for this rep
    const allInvitations = await Invitation.find({ salesRepId: repId });
    console.log(`\n5. All Rep Invitations: ${allInvitations.length} total`);
    const acceptedInvitations = allInvitations.filter(inv => inv.status === 'accepted');
    console.log(`   Accepted: ${acceptedInvitations.length}`);
    
    // 6. Check rep's call limits
    const repCallLimit = await MonthlyCallLimit.findOne({
      userId: repId,
      month: currentMonth
    });
    console.log('\n6. Rep Call Limits:', {
      maxCalls: repCallLimit?.maxCalls || 'Not set',
      remainingCalls: repCallLimit?.remainingCalls || 'Not set'
    });
    
    // 7. Create missing invitation if needed
    if (!invitation && dm.calendarIntegrationEnabled) {
      console.log('\n🔧 FIXING: Creating missing invitation record...');
      await Invitation.create({
        repId: repId,
        salesRepId: repId,
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
      console.log('✅ Invitation record created');
      
      // Force update rep's call limits
      console.log('\n🔧 FIXING: Updating rep call limits...');
      await MonthlyCallLimit.deleteOne({
        userId: repId,
        month: currentMonth
      });
      
      await MonthlyCallLimit.create({
        userId: repId,
        userRole: 'sales_rep',
        month: currentMonth,
        totalCalls: 0,
        maxCalls: 5, // Basic plan gets 5 calls
        remainingCalls: 5,
        lastUpdated: new Date()
      });
      console.log('✅ Rep call limits set to 5 calls');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRealInvitation();