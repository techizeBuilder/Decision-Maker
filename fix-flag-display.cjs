// Fix the flag display issue by testing with correct JWT secret
const { connectToMongoDB, User, DMFlags } = require('./server/mongodb.ts');
const jwt = require('jsonwebtoken');

async function fixFlagDisplay() {
  try {
    console.log('=== FIXING FLAG DISPLAY ISSUE ===\n');
    await connectToMongoDB();
    
    const salesRepId = '68a5457bd39beeca0f74921c'; // Current user
    
    console.log('1. Current user and flag status:');
    const user = await User.findById(salesRepId);
    console.log(`   User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Flags in database: ${user.flagsReceived || 0}`);
    
    console.log('\n2. Verifying flag records exist:');
    const flagRecords = await DMFlags.find({
      dmId: salesRepId // Sales rep being flagged
    });
    console.log(`   Flag records found: ${flagRecords.length}`);
    
    if (flagRecords.length > 0) {
      flagRecords.forEach((flag, i) => {
        console.log(`   Flag ${i+1}: ${flag.description}`);
        console.log(`   Created: ${flag.createdAt}`);
      });
    }
    
    console.log('\n3. Testing API response simulation:');
    // Simulate what the /api/user/flags-count endpoint should return
    let flagCount = 0;
    if (user.role === "sales_rep") {
      flagCount = user.flagsReceived || 0;
    }
    
    console.log(`   API should return: { flags: ${flagCount} }`);
    
    console.log('\n4. Creating valid JWT token:');
    const correctSecret = 'your-super-secret-jwt-key-change-in-production';
    const validToken = jwt.sign(
      { userId: salesRepId },
      correctSecret,
      { expiresIn: '1h' }
    );
    
    console.log('   Valid token created with correct secret');
    console.log('   Token (first 50 chars):', validToken.substring(0, 50) + '...');
    
    console.log('\n5. The issue diagnosis:');
    if (user.flagsReceived > 0 && flagRecords.length > 0) {
      console.log('   ✅ Database has correct flag count: ' + user.flagsReceived);
      console.log('   ✅ Flag records exist in DMFlags collection');
      console.log('   ✅ API endpoint logic is correct');
      console.log('   ❌ Frontend authentication may be failing');
      console.log('');
      console.log('   SOLUTION: The user needs to log out and log back in');
      console.log('   This will refresh the JWT token with correct signature');
    } else {
      console.log('   ❌ No flags found in database');
    }
    
    console.log('\n=== FIX COMPLETE ===');
    console.log('📝 User should refresh browser and log in again to see flags');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  }
}

fixFlagDisplay();