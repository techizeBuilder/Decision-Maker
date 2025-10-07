import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['sales_rep', 'decision_maker', 'admin'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function fixAdmin() {
  try {
    await mongoose.connect('mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority');
    
    // Delete existing admin if any
    await User.deleteOne({ email: 'admin@naeborly.com' });
    
    // Create new admin with correct password hash
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      email: 'admin@naeborly.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    });
    
    await adminUser.save();
    console.log('Admin user fixed successfully!');
    console.log('Email: admin@naeborly.com');
    console.log('Password: admin123');
    
    // Test password
    const testPassword = await bcrypt.compare('admin123', hashedPassword);
    console.log('Password test:', testPassword ? 'PASS' : 'FAIL');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdmin();