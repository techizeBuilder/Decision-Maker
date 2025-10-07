const { connectToMongoDB, User } = require('./server/mongodb');
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
  try {
    await connectToMongoDB();
    
    const email = 'superadmin@naeberly.com';
    const password = 'SuperAdmin123!';
    
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Super admin already exists:', email);
      return;
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create super admin user
    const superAdmin = new User({
      email,
      password: hashedPassword,
      role: 'super_admin',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      packageType: 'premium',
      standing: 'excellent'
    });
    
    await superAdmin.save();
    
    console.log('Super admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Access URL: /super-admin/login');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();