// Check actual users and login credentials 
const { connectToMongoDB, User } = require('./server/mongodb');

async function checkUsers() {
  try {
    await connectToMongoDB();
    
    const users = await User.find({}).select('email role isActive username firstName lastName');
    
    console.log('ACTUAL USERS IN DATABASE:');
    users.forEach((user, i) => {
      console.log(`${i+1}. ${user.email} (${user.role}) - Active: ${user.isActive}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   ID: ${user._id}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();