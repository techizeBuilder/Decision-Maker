const mongoose = require("mongoose");

// MongoDB connection string
const MONGODB_URI = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";

// Schema definitions
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ["sales_rep", "decision_maker", "super_admin", "enterprise_admin"], required: true },
  jobTitle: { type: String },
  company: { type: String },
  companyDomain: { type: String },
  linkedinUrl: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const companyDMsSchema = new mongoose.Schema({
  companyDomain: { type: String, required: true },
  dmId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  linkedRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verificationStatus: { type: String, enum: ["pending", "verified", "rejected", "suspended"], default: "pending" },
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },
  flagCount: { type: Number, default: 0 },
  totalInteractions: { type: Number, default: 0 },
  lastInteraction: { type: Date },
  referralDate: { type: Date, default: Date.now },
  removalRequested: { type: Boolean, default: false },
  removalReason: { type: String },
  replacementDMId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["active", "inactive", "removed"], default: "active" }
}, {
  timestamps: true
});

const dmFlagsSchema = new mongoose.Schema({
  dmId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyDomain: { type: String, required: true },
  flagType: { 
    type: String, 
    enum: ["inappropriate_behavior", "unresponsive", "fake_profile", "low_engagement", "scheduling_issues", "quality_concern"],
    required: true 
  },
  description: { type: String, required: true },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  status: { type: String, enum: ["open", "investigating", "resolved", "dismissed"], default: "open" },
  resolution: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);
const CompanyDMs = mongoose.model("CompanyDMs", companyDMsSchema);
const DMFlags = mongoose.model("DMFlags", dmFlagsSchema);

async function createSampleDMData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get existing users
    const salesRep = await User.findOne({ email: "salesrep@techize.com" });
    const enterpriseAdmin = await User.findOne({ email: "admin@techize.com" });

    if (!salesRep || !enterpriseAdmin) {
      console.log("Required users not found. Please run previous setup scripts first.");
      return;
    }

    console.log("Found sales rep:", salesRep.email);
    console.log("Found enterprise admin:", enterpriseAdmin.email);

    // Create sample decision makers
    const dmEmails = [
      "sarah.johnson@acmecorp.com",
      "michael.chen@globaltechllc.com", 
      "emily.rodriguez@innovatestart.com"
    ];

    const dmData = [
      {
        email: "sarah.johnson@acmecorp.com",
        firstName: "Sarah",
        lastName: "Johnson",
        role: "decision_maker",
        jobTitle: "VP of Sales",
        company: "Acme Corp",
        companyDomain: "acmecorp.com",
        linkedinUrl: "https://linkedin.com/in/sarah-johnson-vp",
        isActive: true
      },
      {
        email: "michael.chen@globaltechllc.com",
        firstName: "Michael", 
        lastName: "Chen",
        role: "decision_maker",
        jobTitle: "Chief Technology Officer",
        company: "Global Tech LLC",
        companyDomain: "globaltechllc.com",
        linkedinUrl: "https://linkedin.com/in/michael-chen-cto",
        isActive: true
      },
      {
        email: "emily.rodriguez@innovatestart.com",
        firstName: "Emily",
        lastName: "Rodriguez", 
        role: "decision_maker",
        jobTitle: "Head of Business Development",
        company: "Innovate Startup",
        companyDomain: "innovatestart.com",
        linkedinUrl: "https://linkedin.com/in/emily-rodriguez-bd",
        isActive: true
      }
    ];

    // Delete existing DMs and create new ones
    await User.deleteMany({ email: { $in: dmEmails } });
    console.log("Cleared existing sample DMs");

    const createdDMs = [];
    for (const dm of dmData) {
      const newDM = new User(dm);
      const savedDM = await newDM.save();
      createdDMs.push(savedDM);
    }
    console.log(`Created ${createdDMs.length} decision makers`);

    // Clear existing CompanyDMs records
    await CompanyDMs.deleteMany({ companyDomain: "techize.com" });
    console.log("Cleared existing company DM records");

    // Create CompanyDMs records
    const companyDMData = [
      {
        companyDomain: "techize.com",
        dmId: createdDMs[0]._id,
        linkedRepId: salesRep._id,
        verificationStatus: "verified",
        engagementScore: 85,
        flagCount: 0,
        totalInteractions: 3,
        lastInteraction: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        referralDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        status: "active"
      },
      {
        companyDomain: "techize.com",
        dmId: createdDMs[1]._id,
        linkedRepId: salesRep._id,
        verificationStatus: "pending",
        engagementScore: 45,
        flagCount: 1,
        totalInteractions: 1,
        lastInteraction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        referralDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        status: "active"
      },
      {
        companyDomain: "techize.com",
        dmId: createdDMs[2]._id,
        linkedRepId: salesRep._id,
        verificationStatus: "suspended",
        engagementScore: 20,
        flagCount: 2,
        totalInteractions: 2,
        lastInteraction: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        referralDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
        removalRequested: true,
        removalReason: "Multiple quality concerns and unresponsive behavior",
        status: "inactive"
      }
    ];

    const savedCompanyDMs = [];
    for (const dmRecord of companyDMData) {
      const companyDM = new CompanyDMs(dmRecord);
      const saved = await companyDM.save();
      savedCompanyDMs.push(saved);
    }
    console.log(`Created ${savedCompanyDMs.length} company DM records`);

    // Clear existing flags and create sample flags
    await DMFlags.deleteMany({ companyDomain: "techize.com" });
    console.log("Cleared existing DM flags");

    const flagData = [
      {
        dmId: createdDMs[1]._id, // Michael Chen
        flaggedBy: enterpriseAdmin._id,
        companyDomain: "techize.com",
        flagType: "low_engagement",
        description: "DM has been unresponsive to follow-up communications after initial call",
        severity: "medium",
        status: "open"
      },
      {
        dmId: createdDMs[2]._id, // Emily Rodriguez  
        flaggedBy: salesRep._id,
        companyDomain: "techize.com",
        flagType: "inappropriate_behavior",
        description: "Used inappropriate language during video call and was dismissive",
        severity: "high",
        status: "open"
      },
      {
        dmId: createdDMs[2]._id, // Emily Rodriguez
        flaggedBy: enterpriseAdmin._id,
        companyDomain: "techize.com", 
        flagType: "scheduling_issues",
        description: "Repeatedly cancels meetings at last minute without rescheduling",
        severity: "medium",
        status: "investigating"
      }
    ];

    for (const flag of flagData) {
      const dmFlag = new DMFlags(flag);
      await dmFlag.save();
    }
    console.log(`Created ${flagData.length} DM flags`);

    console.log("\nSample DM tracking data created successfully!");
    console.log("Data includes:");
    console.log("- 3 decision makers from different companies");
    console.log("- Various verification statuses (verified, pending, suspended)");
    console.log("- Different engagement scores and interaction counts");
    console.log("- Sample flags for quality issues");
    console.log("- Realistic referral dates and interaction history");
    console.log("- One DM with removal request for testing");

  } catch (error) {
    console.error("Error creating sample DM data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

createSampleDMData();