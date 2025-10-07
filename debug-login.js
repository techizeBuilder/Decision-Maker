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

async function debugLogin() {
  try {
    await mongoose.connect('mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority');
    
    console.log('Testing admin login...');
    
    // Find the admin user
    const user = await User.findOne({ email: 'admin@naeborly.com' });
    if (!user) {
      console.log('ERROR: Admin user not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('Admin user found:');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Active:', user.isActive);
    console.log('Password hash length:', user.password.length);
    
    // Test password comparison
    const isPasswordValid = await bcrypt.compare('admin123', user.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!user.isActive) {
      console.log('ERROR: User account is not active');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugLogin();