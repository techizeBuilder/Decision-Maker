const mongoose = require("mongoose");

// MongoDB connection string
const MONGODB_URI = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";

// Schema definitions
const companyCreditsSchema = new mongoose.Schema({
  companyDomain: { type: String, required: true, unique: true },
  planType: { type: String, required: true },
  monthlyCredits: { type: Number, required: true, default: 500 },
  usedCredits: { type: Number, default: 0 },
  remainingCredits: { type: Number, default: 500 },
  currentPeriodStart: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, required: true },
  perRepLimits: {
    maxCallsPerMonth: { type: Number, default: null },
    maxDMsPerMonth: { type: Number, default: null }
  },
  repUsage: [{
    repId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    repEmail: { type: String },
    callsBooked: { type: Number, default: 0 },
    dmsUnlocked: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },
    feedbacksReceived: { type: Number, default: 0 },
    flagsReceived: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const callLogSchema = new mongoose.Schema({
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  decisionMakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyDomain: { type: String, required: true },
  callType: { type: String, enum: ["intro", "follow_up", "demo"], default: "intro" },
  status: { type: String, enum: ["scheduled", "completed", "cancelled", "no_show"], required: true },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number },
  creditsUsed: { type: Number, default: 1 },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    flags: [{ type: String }]
  },
  meetingUrl: { type: String },
  recordingUrl: { type: String }
}, {
  timestamps: true
});

const feedbackSchema = new mongoose.Schema({
  callLogId: { type: mongoose.Schema.Types.ObjectId, ref: "CallLog", required: true },
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  decisionMakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyDomain: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String },
  flags: [{ type: String }],
  submittedBy: { type: String, enum: ["decision_maker", "sales_rep"], required: true },
  visibility: { type: String, enum: ["private", "team", "public"], default: "team" }
}, {
  timestamps: true
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ["sales_rep", "decision_maker", "super_admin", "enterprise_admin"], required: true },
  companyDomain: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);
const CompanyCredits = mongoose.model("CompanyCredits", companyCreditsSchema);
const CallLog = mongoose.model("CallLog", callLogSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

async function createSampleCreditData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get existing users
    const salesRep = await User.findOne({ email: "salesrep@techize.com" });
    const decisionMaker = await User.findOne({ email: "dm@techize.com" });

    if (!salesRep || !decisionMaker) {
      console.log("Required users not found. Please run create-sample-sales-rep.cjs first.");
      return;
    }

    console.log("Found sales rep:", salesRep.email);
    console.log("Found decision maker:", decisionMaker.email);

    // Create or update company credits
    const currentDate = new Date();
    const periodEnd = new Date(currentDate);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const existingCredits = await CompanyCredits.findOne({ companyDomain: "techize.com" });
    if (existingCredits) {
      await CompanyCredits.deleteOne({ companyDomain: "techize.com" });
      console.log("Deleted existing credits record");
    }

    const creditsData = {
      companyDomain: "techize.com",
      planType: "enterprise",
      monthlyCredits: 1000,
      usedCredits: 0,
      remainingCredits: 1000,
      currentPeriodStart: currentDate,
      currentPeriodEnd: periodEnd,
      perRepLimits: {
        maxCallsPerMonth: 50,
        maxDMsPerMonth: 25
      },
      repUsage: []
    };

    const companyCredits = new CompanyCredits(creditsData);
    await companyCredits.save();
    console.log("Created company credits record");

    // Create sample call logs
    const callLogs = [
      {
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        callType: "intro",
        status: "completed",
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        duration: 15,
        creditsUsed: 1,
        feedback: {
          rating: 4,
          comments: "Great introduction call",
          flags: []
        }
      },
      {
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        callType: "follow_up",
        status: "completed",
        scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        duration: 30,
        creditsUsed: 2,
        feedback: {
          rating: 5,
          comments: "Excellent follow-up discussion",
          flags: []
        }
      },
      {
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        callType: "demo",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        creditsUsed: 3
      },
      {
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        callType: "intro",
        status: "cancelled",
        scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        creditsUsed: 1,
        feedback: {
          rating: 2,
          comments: "Call was cancelled due to scheduling conflict",
          flags: ["scheduling_issue"]
        }
      }
    ];

    // Clear existing call logs for techize.com
    await CallLog.deleteMany({ companyDomain: "techize.com" });
    console.log("Cleared existing call logs");

    const savedCallLogs = [];
    for (const logData of callLogs) {
      const callLog = new CallLog(logData);
      const saved = await callLog.save();
      savedCallLogs.push(saved);
    }
    console.log(`Created ${savedCallLogs.length} call logs`);

    // Create sample feedback records
    const feedbackData = [
      {
        callLogId: savedCallLogs[0]._id,
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        rating: 4,
        comments: "John was well-prepared and professional. Good understanding of our needs.",
        flags: [],
        submittedBy: "decision_maker",
        visibility: "team"
      },
      {
        callLogId: savedCallLogs[1]._id,
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        rating: 5,
        comments: "Excellent follow-up. Addressed all our concerns perfectly.",
        flags: ["excellent"],
        submittedBy: "decision_maker",
        visibility: "team"
      },
      {
        callLogId: savedCallLogs[3]._id,
        salesRepId: salesRep._id,
        decisionMakerId: decisionMaker._id,
        companyDomain: "techize.com",
        rating: 2,
        comments: "Unfortunately had to cancel. Hope to reschedule soon.",
        flags: ["scheduling_issue"],
        submittedBy: "decision_maker",
        visibility: "private"
      }
    ];

    // Clear existing feedback
    await Feedback.deleteMany({ companyDomain: "techize.com" });
    console.log("Cleared existing feedback");

    for (const feedback of feedbackData) {
      const feedbackRecord = new Feedback(feedback);
      await feedbackRecord.save();
    }
    console.log(`Created ${feedbackData.length} feedback records`);

    console.log("\nSample credit data created successfully!");
    console.log("Data includes:");
    console.log("- Company credits record with 1000 monthly credits");
    console.log("- Per-rep limits: 50 calls/month, 25 DMs/month");
    console.log("- 4 call logs with varying statuses");
    console.log("- 3 feedback records with ratings and flags");
    console.log("- Real usage statistics for the sales rep");

  } catch (error) {
    console.error("Error creating sample credit data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

createSampleCreditData();