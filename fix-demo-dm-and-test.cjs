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

const userSchema = new mongoose.Schema({}, { strict: false });
const creditSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model("User", userSchema);
const CallCredits = mongoose.model("CallCredits", creditSchema);

async function fixDemoAndTestSimulation() {
  try {
    await connectToMongoDB();

    const repId = '689c1f01211fce498053a5d9';
    const dmEmail = 'dm@techize.com';

    console.log('=== FIXING DEMO DM AND TESTING SIMULATION ===');
    
    // 1. Update demo DM with required fields
    const updateResult = await User.updateOne(
      { email: dmEmail },
      {
        $set: {
          onboardingComplete: false, // Reset to allow simulation
          engagementScore: 85, // High engagement score (above 40% threshold)
          calendarIntegrationEnabled: true,
          termsAccepted: false
        }
      }
    );
    
    console.log('✓ Demo DM updated:', updateResult);

    // 2. Get updated DM info
    const demoDM = await User.findOne({ email: dmEmail });
    console.log('Updated DM info:', {
      id: demoDM._id.toString(),
      email: demoDM.email,
      onboardingComplete: demoDM.onboardingComplete,
      engagementScore: demoDM.engagementScore,
      calendarIntegrationEnabled: demoDM.calendarIntegrationEnabled
    });

    // 3. Manually simulate the onboarding completion process
    console.log('\n=== MANUALLY TESTING ONBOARDING LOGIC ===');
    
    // Update DM to mark onboarding as complete
    await User.findByIdAndUpdate(demoDM._id, {
      onboardingComplete: true,
      calendarIntegrationEnabled: true,
      termsAccepted: true,
      onboardingCompletedAt: new Date(),
    });
    console.log('✓ DM onboarding marked as complete');

    // Award credit manually following the same logic
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Check engagement score eligibility
    const engagementScore = demoDM.engagementScore || 85;
    const isEligibleForCredits = engagementScore >= 40;
    console.log('Engagement score:', engagementScore, 'Eligible:', isEligibleForCredits);

    if (!isEligibleForCredits) {
      console.log('✗ Not eligible for credits due to low engagement score');
      return;
    }

    // Check for existing credit
    const existingCredit = await CallCredits.findOne({
      repId: repId,
      dmId: demoDM._id,
      month: currentMonth,
      $or: [
        { source: "dm_onboarding" },
        { source: "dm_onboarding_with_calendar" }
      ]
    });

    if (existingCredit) {
      console.log('! Credit already exists for this month:', existingCredit.source);
    } else {
      // Create credit
      const creditData = {
        repId: repId,
        dmId: demoDM._id,
        month: currentMonth,
        source: "dm_onboarding_with_calendar",
        creditAmount: 1,
        earnedAt: new Date(),
        isActive: true
      };

      const credit = await CallCredits.create(creditData);
      console.log('✓ Credit awarded:', credit._id.toString());
    }

    // 4. Check final result
    const totalCredits = await CallCredits.countDocuments({
      repId: repId,
      isActive: true
    });
    
    console.log('\n=== FINAL RESULT ===');
    console.log('Total active credits:', totalCredits);
    console.log('Database access should be:', totalCredits > 0 ? 'GRANTED' : 'DENIED');

    // 5. Verify DM onboarding status
    const finalDM = await User.findOne({ email: dmEmail });
    console.log('Final DM status:', {
      onboardingComplete: finalDM.onboardingComplete,
      termsAccepted: finalDM.termsAccepted,
      onboardingCompletedAt: finalDM.onboardingCompletedAt
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixDemoAndTestSimulation();