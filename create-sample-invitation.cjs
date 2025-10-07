const mongoose = require("mongoose");

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const mongoUrl = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB Atlas successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// Define schemas
const invitationSchema = new mongoose.Schema(
  {
    salesRepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    decisionMakerEmail: { type: String, required: true },
    decisionMakerName: { type: String, required: true },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "declined"],
    },
  },
  {
    timestamps: true,
  },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["sales_rep", "decision_maker", "super_admin", "enterprise_admin"],
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    company: { type: String },
    packageType: { type: String, default: "free" },
    isActive: { type: Boolean, default: true },
    standing: { type: String, default: "good" },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
const Invitation = mongoose.model("Invitation", invitationSchema);

async function createSampleInvitation() {
  try {
    await connectToMongoDB();
    
    // Find an existing sales rep
    let salesRep = await User.findOne({ role: "sales_rep" });
    
    if (!salesRep) {
      // Create a sample sales rep if none exists
      salesRep = new User({
        email: "testSalesRep@techize.com",
        password: "$2b$10$hashedPassword",
        role: "sales_rep",
        firstName: "John",
        lastName: "Sales",
        company: "TechSolutions Inc.",
        packageType: "premium"
      });
      await salesRep.save();
      console.log("Created sample sales rep:", salesRep._id);
    }
    
    // Create a sample invitation
    const invitation = new Invitation({
      salesRepId: salesRep._id,
      decisionMakerEmail: "testDM@example.com",
      decisionMakerName: "Sarah Johnson",
      status: "pending"
    });
    
    await invitation.save();
    
    console.log("✅ Sample invitation created successfully!");
    console.log("Invitation ID:", invitation._id);
    console.log("Test URL: /invite/" + invitation._id);
    console.log("Sales Rep:", salesRep.firstName, salesRep.lastName);
    console.log("DM Name:", invitation.decisionMakerName);
    console.log("DM Email:", invitation.decisionMakerEmail);
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating sample invitation:", error);
    process.exit(1);
  }
}

createSampleInvitation();