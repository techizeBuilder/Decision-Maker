const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// MongoDB connection string
const MONGODB_URI = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["sales_rep", "decision_maker", "super_admin", "enterprise_admin"], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  linkedinUrl: String,
  linkedinVerified: { type: Boolean, default: false },
  jobTitle: String,
  company: String,
  companyDomain: String,
  domainVerified: { type: Boolean, default: false },
  domainVerifiedAt: Date,
  industry: String,
  companySize: String,
  yearsInRole: String,
  packageType: { type: String, default: "free" },
  isActive: { type: Boolean, default: true },
  standing: { type: String, default: "good" },
  department: String,
  requirePasswordChange: { type: Boolean, default: false },
  permissions: [{ type: String }],
  invitationStatus: { type: String, enum: ["invited", "accepted", "declined"], default: "accepted" },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  invitedAt: { type: Date },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);

async function createSampleSalesRep() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create sample sales rep
    const email = "salesrep@techize.com";
    const password = "SalesRep123!";

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await User.deleteOne({ email });
      console.log("Deleted existing sales rep");
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const salesRepData = {
      email,
      password: hashedPassword,
      role: "sales_rep",
      firstName: "John",
      lastName: "Doe",
      company: "Techize",
      companyDomain: "techize.com",
      domainVerified: true,
      domainVerifiedAt: new Date(),
      jobTitle: "Senior Sales Representative",
      department: "Sales",
      packageType: "enterprise",
      isActive: true,
      standing: "excellent",
      permissions: [], // No specific DM permissions yet
      invitationStatus: "accepted",
      lastLogin: new Date()
    };

    const salesRep = new User(salesRepData);
    await salesRep.save();

    console.log("Sample sales rep created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Role:", salesRepData.role);
    console.log("Company Domain:", salesRepData.companyDomain);

    // Also create a sample decision maker for permissions testing
    const dmEmail = "dm@techize.com";
    const dmPassword = "DecisionMaker123!";
    
    const existingDM = await User.findOne({ email: dmEmail });
    if (existingDM) {
      await User.deleteOne({ email: dmEmail });
      console.log("Deleted existing decision maker");
    }

    const dmHashedPassword = await bcrypt.hash(dmPassword, saltRounds);

    const decisionMakerData = {
      email: dmEmail,
      password: dmHashedPassword,
      role: "decision_maker",
      firstName: "Jane",
      lastName: "Smith",
      company: "Techize",
      companyDomain: "techize.com",
      domainVerified: true,
      domainVerifiedAt: new Date(),
      jobTitle: "VP of Sales",
      department: "Sales",
      packageType: "enterprise",
      isActive: true,
      standing: "excellent",
      invitationStatus: "accepted"
    };

    const decisionMaker = new User(decisionMakerData);
    await decisionMaker.save();

    console.log("Sample decision maker created successfully!");
    console.log("DM Email:", dmEmail);
    console.log("DM Password:", dmPassword);

  } catch (error) {
    console.error("Error creating sample users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

createSampleSalesRep();