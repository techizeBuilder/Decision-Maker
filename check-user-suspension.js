import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/naeberly');

// Define User schema (simplified)
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  flagsReceived: { type: Number, default: 0 },
  suspension: {
    isActive: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    reason: String
  }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function checkUserSuspension() {
  try {
    const user = await User.findOne({ email: 'mlp.yashvantgupta@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User Details:');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Flags Received:', user.flagsReceived || 0);
    console.log('Suspension Status:', user.suspension || 'No suspension data');
    
    if (user.suspension && user.suspension.isActive) {
      console.log('\n🚨 ACCOUNT IS SUSPENDED');
      console.log('Reason:', user.suspension.reason);
      console.log('Start Date:', user.suspension.startDate);
      console.log('End Date:', user.suspension.endDate);
      
      const now = new Date();
      const daysRemaining = Math.ceil((user.suspension.endDate - now) / (1000 * 60 * 60 * 24));
      console.log('Days Remaining:', daysRemaining);
    } else {
      console.log('\n✅ Account is NOT suspended');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUserSuspension();