// Check specific user mentioned in the issue
const { connectToMongoDB, MonthlyCallLimit, User } = require('./server/mongodb.ts');

async function checkSpecificUser() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    const userId = '68a2d531584fa71411e1ddd4';
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get user details
    const user = await User.findById(userId);
    console.log('User details:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      packageType: user.packageType || 'free'
    });
    
    // Get call limit
    const callLimit = await MonthlyCallLimit.findOne({
      userId: userId,
      month: currentMonth
    });
    
    console.log('\nCall limit details:', {
      maxCalls: callLimit.maxCalls,
      totalCalls: callLimit.totalCalls,
      remainingCalls: callLimit.remainingCalls,
      month: callLimit.month
    });
    
    if (callLimit.maxCalls === 3) {
      console.log('\n✅ SUCCESS: User now has 3 calls per month as required!');
    } else {
      console.log(`\n❌ ISSUE: User still has ${callLimit.maxCalls} calls instead of 3`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

checkSpecificUser();