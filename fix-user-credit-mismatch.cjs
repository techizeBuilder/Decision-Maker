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

async function fixUserCreditMismatch() {
  try {
    await connectToMongoDB();

    const oldRepId = '689c1f01211fce498053a5d9';
    const newRepId = '689c73494c03be511a4eeb37';
    const dmEmail = 'dm@techize.com';

    console.log('=== FIXING USER CREDIT MISMATCH ===');
    
    // 1. Verify both users exist
    const oldUser = await User.findById(oldRepId);
    const newUser = await User.findById(newRepId);
    
    console.log('Old user exists:', oldUser ? 'YES' : 'NO');
    if (oldUser) {
      console.log('  Email:', oldUser.email);
    }
    
    console.log('Current user exists:', newUser ? 'YES' : 'NO');
    if (newUser) {
      console.log('  Email:', newUser.email);
    }

    // 2. Check credits for old user
    const oldUserCredits = await CallCredits.find({ repId: oldRepId });
    console.log('Credits for old user:', oldUserCredits.length);

    // 3. Check credits for current user
    const currentUserCredits = await CallCredits.find({ repId: newRepId });
    console.log('Credits for current user:', currentUserCredits.length);

    // 4. Create or recreate demo DM if needed
    let demoDM = await User.findOne({ email: dmEmail });
    if (!demoDM) {
      console.log('Creating new demo DM...');
      demoDM = await User.create({
        email: dmEmail,
        role: "decision_maker",
        firstName: "Demo",
        lastName: "DecisionMaker",
        company: "Techize",
        engagementScore: 85,
        linkedinVerified: true,
        packageType: "basic",
        timezone: "UTC",
        isActive: true,
        standing: "good",
        flagsReceived: 0,
        companyDomain: "techize.com",
        domainVerified: true,
        invitationStatus: "accepted",
        calendarIntegrationEnabled: true,
        onboardingComplete: true,
        termsAccepted: true,
        onboardingCompletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ Demo DM created:', demoDM._id.toString());
    } else {
      console.log('✓ Demo DM exists:', demoDM._id.toString());
    }

    // 5. Create credit for current user
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Check if current user already has a credit for this month
    const existingCredit = await CallCredits.findOne({
      repId: newRepId,
      month: currentMonth,
      source: { $in: ["dm_onboarding", "dm_onboarding_with_calendar"] }
    });

    if (existingCredit) {
      console.log('! Current user already has credit for this month');
    } else {
      // Create new credit for current user
      const creditData = {
        repId: newRepId,
        dmId: demoDM._id,
        month: currentMonth,
        source: "dm_onboarding_with_calendar",
        creditAmount: 1,
        earnedAt: new Date(),
        isActive: true
      };

      const newCredit = await CallCredits.create(creditData);
      console.log('✓ Credit created for current user:', newCredit._id.toString());
    }

    // 6. Verify final state
    const finalCredits = await CallCredits.countDocuments({
      repId: newRepId,
      isActive: true
    });
    
    console.log('\n=== FINAL RESULT ===');
    console.log('Current user ID:', newRepId);
    console.log('Active credits for current user:', finalCredits);
    console.log('Database access should be:', finalCredits > 0 ? 'GRANTED' : 'DENIED');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixUserCreditMismatch();