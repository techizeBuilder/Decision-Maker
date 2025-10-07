const mongoose = require('mongoose');

async function connectToMongoDB() {
  try {
    const mongoUrl = process.env.MONGODB_URI || "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB Atlas successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// Simplified User Schema
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema);

async function updateDemoDM() {
  try {
    await connectToMongoDB();

    // Find and update the demo DM to ensure it has all required fields
    const result = await User.updateOne(
      { email: 'dm@techize.com' },
      {
        $set: {
          onboardingComplete: false, // This allows the simulation to complete onboarding
          termsAccepted: false,
          calendarIntegrationEnabled: true
        }
      }
    );

    if (result.matchedCount > 0) {
      console.log('Demo DM updated successfully');
      console.log('Modified count:', result.modifiedCount);
      
      // Show the updated DM
      const updatedDM = await User.findOne({ email: 'dm@techize.com' });
      console.log('Updated DM onboardingComplete:', updatedDM.onboardingComplete);
      console.log('Updated DM termsAccepted:', updatedDM.termsAccepted);
    } else {
      console.log('Demo DM not found');
    }

  } catch (error) {
    console.error('Error updating demo DM:', error);
  } finally {
    process.exit(0);
  }
}

updateDemoDM();