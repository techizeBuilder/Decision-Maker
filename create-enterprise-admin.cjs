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
  requirePasswordChange: { type: Boolean, default: false }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);

async function createEnterpriseAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const email = "admin@techize.com";
    const password = "EnterpriseAdmin123!";

    // Check if enterprise admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      // Delete existing user to recreate with proper hash
      await User.deleteOne({ email });
      console.log("Deleted existing enterprise admin");
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const enterpriseAdminData = {
      email,
      password: hashedPassword,
      role: "enterprise_admin",
      firstName: "Enterprise",
      lastName: "Admin",
      company: "Techize",
      companyDomain: "techize.com",
      domainVerified: true,
      domainVerifiedAt: new Date(),
      jobTitle: "Enterprise Administrator",
      department: "IT Administration",
      packageType: "enterprise",
      isActive: true,
      standing: "excellent"
    };

    const enterpriseAdmin = new User(enterpriseAdminData);
    await enterpriseAdmin.save();

    console.log("Enterprise admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Company Domain:", enterpriseAdminData.companyDomain);
    console.log("Role:", enterpriseAdminData.role);

  } catch (error) {
    console.error("Error creating enterprise admin:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

createEnterpriseAdmin();