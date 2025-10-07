const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  linkedinUrl: String,
  linkedinVerified: { type: Boolean, default: false },
  jobTitle: String,
  company: String,
  industry: String,
  companySize: String,
  yearsInRole: String,
  packageType: { type: String, default: 'free' },
  isActive: { type: Boolean, default: true },
  standing: { type: String, default: 'good' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');
    
    const email = 'superadmin@naeberly.com';
    const password = 'SuperAdmin123!';
    
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Super admin already exists:', email);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create super admin
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
    console.log('Login URL: /super-admin/login');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

createSuperAdmin();