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

const feedbackSchema = new mongoose.Schema({
  companyDomain: { type: String, required: true },
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  decisionMakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  callId: { type: mongoose.Schema.Types.ObjectId, ref: "CallLog" },
  rating: { type: Number, min: 1, max: 5, required: true },
  summary: { type: String, required: true },
  notes: { type: String },
  nextSteps: { type: String },
  followUpRequired: { type: Boolean, default: false },
  qualityScore: { type: Number, min: 1, max: 10 },
  categories: {
    communication: { type: Number, min: 1, max: 5 },
    productKnowledge: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 },
    responsiveness: { type: Number, min: 1, max: 5 }
  },
  improvements: [{ type: String }],
  strengths: [{ type: String }]
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

async function createSampleFeedbackData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get existing users
    const salesRep = await User.findOne({ email: "salesrep@techize.com" });
    const enterpriseAdmin = await User.findOne({ email: "admin@techize.com" });
    const dms = await User.find({ role: "decision_maker" });

    if (!salesRep || !enterpriseAdmin || dms.length === 0) {
      console.log("Required users not found. Please run previous setup scripts first.");
      return;
    }

    console.log("Found sales rep:", salesRep.email);
    console.log("Found decision makers:", dms.length);

    // Clear existing feedback
    await Feedback.deleteMany({ companyDomain: "techize.com" });
    console.log("Cleared existing feedback records");

    // Create comprehensive feedback data spanning 6 months
    const feedbackData = [];
    const currentDate = new Date();

    // Generate feedback for the last 6 months
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - monthOffset);
      
      // Generate 2-4 feedback records per month
      const feedbackCount = 2 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < feedbackCount; i++) {
        const feedbackDate = new Date(monthDate);
        feedbackDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        // Randomly select a DM
        const randomDM = dms[Math.floor(Math.random() * dms.length)];
        
        // Generate realistic feedback based on month (improving trend)
        const baseRating = 3.5 + (monthOffset * 0.1); // Slight improvement over time
        const variation = (Math.random() - 0.5) * 1.5; // Random variation
        const rating = Math.max(1, Math.min(5, Math.round((baseRating + variation) * 2) / 2)); // Round to nearest 0.5
        
        // Generate category scores based on overall rating
        const categoryVariation = () => Math.max(1, Math.min(5, rating + (Math.random() - 0.5) * 1));
        
        const feedback = {
          companyDomain: "techize.com",
          salesRepId: salesRep._id,
          decisionMakerId: randomDM._id,
          rating: rating,
          summary: getFeedbackSummary(rating),
          notes: getFeedbackNotes(rating),
          nextSteps: getNextSteps(rating),
          followUpRequired: rating >= 4,
          qualityScore: Math.round(rating * 2),
          categories: {
            communication: Math.round(categoryVariation()),
            productKnowledge: Math.round(categoryVariation()),
            professionalism: Math.round(categoryVariation()),
            responsiveness: Math.round(categoryVariation())
          },
          improvements: getImprovements(rating),
          strengths: getStrengths(rating),
          createdAt: feedbackDate
        };
        
        feedbackData.push(feedback);
      }
    }

    // Create feedback records
    const savedFeedback = [];
    for (const feedback of feedbackData) {
      const feedbackRecord = new Feedback(feedback);
      const saved = await feedbackRecord.save();
      savedFeedback.push(saved);
    }

    console.log(`Created ${savedFeedback.length} feedback records`);

    // Calculate and display statistics
    const avgRating = savedFeedback.reduce((sum, fb) => sum + fb.rating, 0) / savedFeedback.length;
    const ratingDistribution = {
      5: savedFeedback.filter(fb => fb.rating === 5).length,
      4: savedFeedback.filter(fb => fb.rating >= 4 && fb.rating < 5).length,
      3: savedFeedback.filter(fb => fb.rating >= 3 && fb.rating < 4).length,
      2: savedFeedback.filter(fb => fb.rating >= 2 && fb.rating < 3).length,
      1: savedFeedback.filter(fb => fb.rating < 2).length
    };

    console.log("\nSample feedback data created successfully!");
    console.log("=== Feedback Analytics ===");
    console.log(`Total Feedback Records: ${savedFeedback.length}`);
    console.log(`Average Rating: ${avgRating.toFixed(2)}/5.0`);
    console.log(`Rating Distribution:`);
    console.log(`  5 stars: ${ratingDistribution[5]} (${((ratingDistribution[5]/savedFeedback.length)*100).toFixed(1)}%)`);
    console.log(`  4+ stars: ${ratingDistribution[4]} (${((ratingDistribution[4]/savedFeedback.length)*100).toFixed(1)}%)`);
    console.log(`  3+ stars: ${ratingDistribution[3]} (${((ratingDistribution[3]/savedFeedback.length)*100).toFixed(1)}%)`);
    console.log(`  2+ stars: ${ratingDistribution[2]} (${((ratingDistribution[2]/savedFeedback.length)*100).toFixed(1)}%)`);
    console.log(`  Below 2: ${ratingDistribution[1]} (${((ratingDistribution[1]/savedFeedback.length)*100).toFixed(1)}%)`);
    console.log(`Follow-up Required: ${savedFeedback.filter(fb => fb.followUpRequired).length}`);

  } catch (error) {
    console.error("Error creating sample feedback data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

function getFeedbackSummary(rating) {
  const summaries = {
    5: [
      "Exceptional call with outstanding engagement and clear next steps identified.",
      "Perfect demonstration of product value with immediate buy-in from decision maker.",
      "Excellent rapport building and thorough needs assessment completed.",
      "Outstanding product presentation with all questions answered satisfactorily."
    ],
    4: [
      "Very good call with strong interest shown and productive discussion.",
      "Good product fit identified with some technical questions to follow up.",
      "Positive engagement with clear interest in moving forward.",
      "Solid call with good questions and meaningful conversation about needs."
    ],
    3: [
      "Decent call with moderate interest but needs more qualification.",
      "Average engagement with some concerns that need addressing.",
      "Good initial conversation but requires further evaluation.",
      "Reasonable call with mixed signals about product interest."
    ],
    2: [
      "Below average call with limited engagement and unclear next steps.",
      "Minimal interest shown with significant objections raised.",
      "Disappointing call with poor fit and low engagement.",
      "Challenging call with multiple concerns and hesitation."
    ],
    1: [
      "Poor call with very low engagement and no clear interest.",
      "Unproductive call with significant objections and no path forward.",
      "Difficult call with poor rapport and minimal product interest.",
      "Unsuccessful call with major concerns and resistance to product."
    ]
  };
  
  const ratingKey = Math.ceil(rating);
  const options = summaries[ratingKey] || summaries[3];
  return options[Math.floor(Math.random() * options.length)];
}

function getFeedbackNotes(rating) {
  const notes = {
    5: [
      "DM was highly engaged throughout the call and asked detailed technical questions.",
      "Clear budget available and decision timeline established for Q1.",
      "Strong product-market fit with immediate use cases identified.",
      "Excellent chemistry and rapport built during the conversation."
    ],
    4: [
      "Good discussion about current pain points and potential solutions.",
      "Some budget considerations to work through but overall positive.",
      "Need to involve technical team for implementation discussion.",
      "Strong interest with a few questions about integration capabilities."
    ],
    3: [
      "Mixed feedback with some interest but also concerns about cost.",
      "Need to better understand their current workflow and pain points.",
      "Decent conversation but requires more discovery work.",
      "Some interest shown but needs competitive comparison."
    ],
    2: [
      "Limited engagement with concerns about implementation complexity.",
      "Budget constraints mentioned as significant barrier.",
      "Poor timing with other priorities taking precedence.",
      "Some skepticism about product capabilities and ROI."
    ],
    1: [
      "Very poor engagement with multiple interruptions during call.",
      "No clear budget or timeline for making decisions.",
      "Significant objections to product approach and pricing.",
      "Poor fit with current needs and no interest in follow-up."
    ]
  };
  
  const ratingKey = Math.ceil(rating);
  const options = notes[ratingKey] || notes[3];
  return options[Math.floor(Math.random() * options.length)];
}

function getNextSteps(rating) {
  const nextSteps = {
    5: [
      "Schedule technical demo with implementation team next week.",
      "Prepare detailed proposal with pricing and timeline.",
      "Connect with procurement team for contract discussions.",
      "Set up pilot program to demonstrate immediate value."
    ],
    4: [
      "Follow up with technical documentation and case studies.",
      "Schedule demo with broader team including technical stakeholders.",
      "Provide competitive analysis and ROI calculations.",
      "Arrange reference call with similar customer."
    ],
    3: [
      "Send additional product information and pricing overview.",
      "Schedule follow-up call to address remaining questions.",
      "Provide more detailed discovery questionnaire.",
      "Share relevant case studies and success stories."
    ],
    2: [
      "Follow up with email addressing key concerns raised.",
      "Provide budget-friendly options and flexible terms.",
      "Share resources about implementation best practices.",
      "Schedule brief check-in call in 2-3 months."
    ],
    1: [
      "Send thank you email with no immediate follow-up planned.",
      "Add to nurture campaign for future consideration.",
      "No immediate next steps - poor fit identified.",
      "Document concerns for product team feedback."
    ]
  };
  
  const ratingKey = Math.ceil(rating);
  const options = nextSteps[ratingKey] || nextSteps[3];
  return options[Math.floor(Math.random() * options.length)];
}

function getImprovements(rating) {
  if (rating >= 4) return [];
  
  const improvements = [
    "Better discovery questions about current pain points",
    "More specific ROI examples relevant to their industry",
    "Clearer explanation of implementation timeline",
    "Better handling of pricing objections",
    "More engaging presentation style",
    "Follow up more promptly on technical questions"
  ];
  
  const count = rating <= 2 ? 2 : 1;
  return improvements.sort(() => 0.5 - Math.random()).slice(0, count);
}

function getStrengths(rating) {
  const strengths = [
    "Excellent product knowledge",
    "Strong listening skills",
    "Good rapport building",
    "Clear communication",
    "Professional presentation",
    "Responsive to questions",
    "Well-prepared for the call",
    "Good follow-up skills"
  ];
  
  const count = rating >= 4 ? 3 : rating >= 3 ? 2 : 1;
  return strengths.sort(() => 0.5 - Math.random()).slice(0, count);
}

createSampleFeedbackData();