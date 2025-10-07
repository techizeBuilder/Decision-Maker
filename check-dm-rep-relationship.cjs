// Check the relationship between DM and sales rep for credit allocation
const { connectToMongoDB, User, DMRepCreditUsage, Invitation } = require('./server/mongodb.ts');

async function checkDMRepRelationship() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const repId = '68a2fcffc8b684d6531e6f4c';
    const dmId = '68a2ff105e77e990a9056749';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log(`\nChecking relationship between:`);
    console.log(`Rep: ${repId}`);
    console.log(`DM: ${dmId}`);
    
    // Get rep details
    const rep = await User.findById(repId);
    console.log('\nSales Rep:', {
      name: `${rep.firstName} ${rep.lastName}`,
      email: rep.email,
      role: rep.role
    });
    
    // Get DM details
    const dm = await User.findById(dmId);
    console.log('\nDecision Maker:', {
      name: `${dm.firstName} ${dm.lastName}`,
      email: dm.email,
      role: dm.role,
      calendarConnected: dm.calendarIntegrationEnabled || false
    });
    
    // Check if there's an invitation record
    const invitation = await Invitation.findOne({
      repId: repId,
      dmId: dmId
    });
    console.log('\nInvitation Record:', invitation ? {
      status: invitation.status,
      sentAt: invitation.sentAt,
      acceptedAt: invitation.acceptedAt
    } : 'NO INVITATION RECORD FOUND');
    
    // Check credit usage
    const creditUsage = await DMRepCreditUsage.findOne({
      repId: repId,
      dmId: dmId,
      month: currentMonth
    });
    console.log('\nCredit Usage:', creditUsage ? {
      creditsUsed: creditUsage.creditsUsed,
      lastUsed: creditUsage.lastUsed
    } : 'No credit usage found');
    
    // Check if we need to create missing invitation record
    if (!invitation && creditUsage) {
      console.log('\n⚠️  ISSUE DETECTED: Credit usage exists but no invitation record!');
      console.log('This suggests the DM was onboarded without proper invitation tracking.');
      
      // Create missing invitation record with all required fields
      console.log('\nCreating missing invitation record...');
      const newInvitation = await Invitation.create({
        repId: repId,
        dmId: dmId,
        salesRepId: repId, // Required field
        status: 'accepted',
        sentAt: new Date(creditUsage.lastUsed || new Date()),
        acceptedAt: new Date(creditUsage.lastUsed || new Date()),
        email: dm.email,
        firstName: dm.firstName,
        lastName: dm.lastName,
        decisionMakerEmail: dm.email, // Required field
        decisionMakerName: `${dm.firstName} ${dm.lastName}` // Required field
      });
      console.log('✅ Missing invitation record created');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking relationship:', error);
    process.exit(1);
  }
}

checkDMRepRelationship();