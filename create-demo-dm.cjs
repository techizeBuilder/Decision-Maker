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

// User Schema (simplified for demo DM creation)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ["sales_rep", "decision_maker", "super_admin", "enterprise_admin"] },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  linkedinUrl: { type: String },
  linkedinVerified: { type: Boolean, default: false },
  jobTitle: { type: String },
  company: { type: String },
  industry: { type: String },
  companySize: { type: String },
  yearsInRole: { type: String },
  packageType: { type: String, default: "free" },
  phone: { type: String },
  timezone: { type: String, default: "UTC" },
  bio: { type: String },
  location: { type: String },
  website: { type: String },
  specialties: { type: String },
  isActive: { type: Boolean, default: true },
  standing: { type: String, default: "good" },
  flagsReceived: { type: Number, default: 0 },
  companyDomain: { type: String },
  domainVerified: { type: Boolean, default: false },
  domainVerifiedAt: { type: Date },
  department: { type: String },
  requirePasswordChange: { type: Boolean, default: false },
  permissions: [{ type: String }],
  invitationStatus: { type: String, enum: ["invited", "accepted", "declined"], default: "accepted" },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  invitedAt: { type: Date },
  lastLogin: { type: Date },
  calendarIntegrationEnabled: { type: Boolean, default: false },
  hasEmailAddon: { type: Boolean, default: false },
  emailAddonPurchaseDate: { type: Date },
  onboardingComplete: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, default: false },
  onboardingCompletedAt: { type: Date }
}, {
  timestamps: true,
});

const User = mongoose.model("User", userSchema);

async function createDemoDM() {
  try {
    await connectToMongoDB();

    // Check if demo DM already exists
    const existingDM = await User.findOne({ email: 'dm@techize.com' });
    if (existingDM) {
      console.log('Demo DM already exists:', existingDM.email);
      return;
    }

    // Create demo decision maker
    const demoDM = new User({
      email: 'dm@techize.com',
      password: 'demo123', // Simple password for demo purposes
      role: 'decision_maker',
      firstName: 'Demo',
      lastName: 'Decision Maker',
      company: 'Techize Demo',
      companyDomain: 'techize.com',
      domainVerified: true,
      linkedinVerified: false,
      packageType: 'basic',
      timezone: 'UTC',
      isActive: true,
      standing: 'good',
      flagsReceived: 0,
      requirePasswordChange: false,
      permissions: [],
      invitationStatus: 'accepted', // Already accepted to be available for simulation
      calendarIntegrationEnabled: true,
      hasEmailAddon: false,
      onboardingComplete: false, // This allows the simulation to complete onboarding
      termsAccepted: false
    });

    await demoDM.save();
    console.log('Demo DM created successfully:', demoDM.email);
    console.log('Demo DM ID:', demoDM._id.toString());

  } catch (error) {
    console.error('Error creating demo DM:', error);
  } finally {
    process.exit(0);
  }
}

createDemoDM();