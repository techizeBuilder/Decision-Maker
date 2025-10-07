import { connectToMongoDB, User } from './server/mongodb.ts';

async function checkSuspendedUsers() {
  try {
    await connectToMongoDB();
    
    console.log('Checking all users and their status...');
    const users = await User.find({}, 'firstName lastName email standing isActive suspendedAt suspensionReason').exec();
    
    console.log('\nAll users:');
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`  standing: ${user.standing}`);
      console.log(`  isActive: ${user.isActive}`);
      console.log(`  suspendedAt: ${user.suspendedAt}`);
      console.log(`  suspensionReason: ${user.suspensionReason}`);
      console.log('');
    });
    
    console.log('\nFiltering suspended users...');
    const suspendedUsers = users.filter(u => u.standing === 'suspended');
    console.log(`Found ${suspendedUsers.length} suspended users:`);
    suspendedUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - standing: ${user.standing}`);
    });
    
    console.log('\nFiltering inactive users...');
    const inactiveUsers = users.filter(u => !u.isActive);
    console.log(`Found ${inactiveUsers.length} inactive users:`);
    inactiveUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - isActive: ${user.isActive}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking suspended users:', error);
    process.exit(1);
  }
}

checkSuspendedUsers();