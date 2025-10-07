// Check current DM call limits to verify the fix
const { connectToMongoDB, MonthlyCallLimit, User } = require('./server/mongodb.ts');

async function checkDMCallLimits() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    console.log(`Checking call limits for month: ${currentMonth}`);
    
    // Get all DM call limits for current month
    const dmLimits = await MonthlyCallLimit.find({
      userRole: 'decision_maker',
      month: currentMonth
    }).populate('userId', 'firstName lastName email role packageType');
    
    console.log(`\nFound ${dmLimits.length} decision maker call limits:`);
    dmLimits.forEach(limit => {
      const user = limit.userId;
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}): ${limit.totalCalls}/${limit.maxCalls} calls (${limit.remainingCalls} remaining) - Package: ${user.packageType || 'free'}`);
    });
    
    // Check if any DMs still have 1 call limit
    const oneCallDMs = dmLimits.filter(limit => limit.maxCalls === 1);
    if (oneCallDMs.length > 0) {
      console.log(`\n⚠️  ${oneCallDMs.length} DMs still have 1 call limit - need fixing`);
    } else {
      console.log('\n✅ All DMs now have 3 calls per month!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking DM call limits:', error);
    process.exit(1);
  }
}

checkDMCallLimits();