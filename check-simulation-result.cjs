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

// Define schemas
const userSchema = new mongoose.Schema({}, { strict: false });
const creditSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model("User", userSchema);
const CallCredits = mongoose.model("CallCredits", creditSchema);

async function checkSimulationResult() {
  try {
    await connectToMongoDB();

    const repId = '689c1f01211fce498053a5d9';
    const dmEmail = 'dm@techize.com';

    console.log('=== CHECKING SIMULATION RESULTS ===');
    
    // 1. Check if demo DM exists and onboarding status
    const demoDM = await User.findOne({ email: dmEmail });
    if (demoDM) {
      console.log('✓ Demo DM found:', {
        id: demoDM._id.toString(),
        email: demoDM.email,
        onboardingComplete: demoDM.onboardingComplete,
        calendarIntegrationEnabled: demoDM.calendarIntegrationEnabled,
        termsAccepted: demoDM.termsAccepted,
        engagementScore: demoDM.engagementScore
      });
    } else {
      console.log('✗ Demo DM not found');
      return;
    }

    // 2. Check sales rep credits
    const credits = await CallCredits.find({ repId: repId });
    console.log('Sales rep credits count:', credits.length);
    
    if (credits.length > 0) {
      console.log('✓ Credits found:');
      credits.forEach((credit, i) => {
        console.log(`  Credit ${i+1}:`, {
          id: credit._id.toString(),
          dmId: credit.dmId?.toString(),
          source: credit.source,
          creditAmount: credit.creditAmount,
          month: credit.month,
          earnedAt: credit.earnedAt,
          isActive: credit.isActive
        });
      });
    } else {
      console.log('✗ No credits found for sales rep');
    }

    // 3. Check what might be blocking credit award
    const currentMonth = new Date().toISOString().slice(0, 7);
    console.log('Current month:', currentMonth);
    
    // Check for existing credits this month from this DM
    const existingCredit = await CallCredits.findOne({
      repId: repId,
      dmId: demoDM._id,
      month: currentMonth
    });
    
    if (existingCredit) {
      console.log('! Existing credit found for this DM this month:', existingCredit.source);
    } else {
      console.log('✓ No existing credit for this DM this month');
    }

    // 4. Check total credits for database access
    const totalCredits = await CallCredits.countDocuments({
      repId: repId,
      isActive: true
    });
    
    console.log('Total active credits:', totalCredits);
    console.log('Database access should be:', totalCredits > 0 ? 'GRANTED' : 'DENIED');

  } catch (error) {
    console.error('Error checking simulation result:', error);
  } finally {
    process.exit(0);
  }
}

checkSimulationResult();