// Test complete login flow and flag count retrieval
const { connectToMongoDB, User } = require('./server/mongodb.ts');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function testLoginAndFlags() {
  try {
    console.log('=== TESTING LOGIN AND FLAG COUNT FLOW ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // Current Yashwant Sahu ID
    const email = 'mlp.yashvantgupta@gmail.com';
    const password = 'Yash@9454';
    
    console.log('1. Checking user in database:');
    const user = await User.findById(salesRepId);
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log(`   User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Flags in DB: ${user.flagsReceived || 0}`);
    
    console.log('\n2. Testing password verification:');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`   Password valid: ${isPasswordValid}`);
    
    console.log('\n3. Creating JWT token:');
    // Using a simple test secret (should match server secret)
    const testSecret = 'your-secret-key';
    const token = jwt.sign(
      { userId: user._id.toString() },
      testSecret,
      { expiresIn: '24h' }
    );
    console.log(`   Token created for user: ${user._id}`);
    
    console.log('\n4. What the API should return:');
    console.log(`   For sales rep: { flags: ${user.flagsReceived || 0} }`);
    
    // If user is sales rep, the flags count comes from user.flagsReceived
    // If user is decision maker, it comes from querying DMFlags collection
    
    console.log('\n5. Checking if this matches frontend expectation:');
    console.log('   Frontend queries /api/user/flags-count');
    console.log('   Frontend expects: { flags: <number> }');
    console.log('   Database has: { flagsReceived: ' + (user.flagsReceived || 0) + ' }');
    
    if (user.flagsReceived > 0) {
      console.log('\n   ✅ User has flags in database, API should return them');
    } else {
      console.log('\n   ❌ User has no flags in database, need to check flag records');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

testLoginAndFlags();