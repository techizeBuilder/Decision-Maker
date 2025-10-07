// Fix Free plan to give 3 calls for decision makers instead of 1
const { connectToMongoDB, SubscriptionPlan } = require('./server/mongodb.ts');

async function fixFreePlanCalls() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    
    console.log('Updating Free plan maxCallCredits from 1 to 3...');
    const result = await SubscriptionPlan.updateOne(
      { name: 'Free' },
      { $set: { maxCallCredits: 3 } }
    );
    
    console.log('Update result:', result);
    
    // Verify the update
    const updatedPlan = await SubscriptionPlan.findOne({ name: 'Free' });
    console.log('Updated Free plan:', {
      name: updatedPlan.name,
      maxCallCredits: updatedPlan.maxCallCredits
    });
    
    console.log('✅ Free plan successfully updated to give 3 calls per month to all users');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating Free plan:', error);
    process.exit(1);
  }
}

fixFreePlanCalls();