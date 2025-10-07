const mongoose = require('mongoose');

// Connect to MongoDB using the connection from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

mongoose.connect(DATABASE_URL);

// Define User schema
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

async function removeSuspension() {
  try {
    const user = await User.findOne({ email: 'mlp.yashvantgupta@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n📋 Current User Status:');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Flags Received:', user.flagsReceived || 0);
    
    if (user.suspension && user.suspension.isActive) {
      console.log('Current Suspension:', user.suspension);
      
      // Remove suspension
      const result = await User.updateOne(
        { email: 'mlp.yashvantgupta@gmail.com' },
        { 
          $set: { 
            'suspension.isActive': false,
            'suspension.endDate': new Date(),
            'suspension.reason': 'Suspension removed for testing'
          }
        }
      );
      
      console.log('\n✅ Suspension removed successfully!');
      console.log('Update result:', result);
      console.log('\nYou can now login with this account.');
      
    } else {
      console.log('\n✅ Account is not currently suspended');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

removeSuspension();