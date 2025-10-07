import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['sales_rep', 'decision_maker', 'admin'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  linkedinUrl: String,
  linkedinVerified: { type: Boolean, default: false },
  jobTitle: String,
  company: String,
  industry: String,
  companySize: String,
  yearsInRole: String,
  packageType: String,
  isActive: { type: Boolean, default: false },
  standing: { type: String, default: 'good' },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@naeborly.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      await mongoose.disconnect();
      return;
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      email: 'admin@naeborly.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      packageType: 'enterprise',
      isActive: true,
      standing: 'excellent'
    });
    
    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@naeborly.com');
    console.log('Password: admin123');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();