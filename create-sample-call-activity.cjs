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

const callLogSchema = new mongoose.Schema({
  companyDomain: { type: String, required: true },
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  decisionMakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  scheduledAt: { type: Date, required: true },
  completedAt: { type: Date },
  duration: { type: Number }, // in minutes
  status: { 
    type: String, 
    enum: ["scheduled", "completed", "missed", "cancelled", "no_show"], 
    default: "scheduled" 
  },
  outcome: { type: String },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    summary: { type: String },
    notes: { type: String },
    nextSteps: { type: String },
    followUpRequired: { type: Boolean, default: false },
    qualityScore: { type: Number, min: 1, max: 10 }
  },
  notes: { type: String },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String },
  flagSeverity: { type: String, enum: ["low", "medium", "high", "critical"] },
  flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  flaggedAt: { type: Date },
  meetingUrl: { type: String },
  recordingUrl: { type: String },
  pitch: { type: String },
  dealValue: { type: Number },
  followUpDate: { type: Date }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);
const CallLog = mongoose.model("CallLog", callLogSchema);

async function createSampleCallActivity() {
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
    console.log("Found enterprise admin:", enterpriseAdmin.email);
    console.log("Found decision makers:", dms.length);

    // Clear existing call logs
    await CallLog.deleteMany({ companyDomain: "techize.com" });
    console.log("Cleared existing call logs");

    // Create comprehensive call activity data
    const callActivityData = [
      // Recent completed call with high rating
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[0]._id, // Sarah Johnson
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 min duration
        duration: 45,
        status: "completed",
        outcome: "successful_demo",
        feedback: {
          rating: 5,
          summary: "Excellent product demonstration. Sarah was highly engaged and asked detailed technical questions about our AI integration capabilities.",
          notes: "Strong interest in enterprise features, particularly the advanced analytics dashboard and custom reporting.",
          nextSteps: "Schedule follow-up with technical team to discuss implementation timeline",
          followUpRequired: true,
          qualityScore: 9
        },
        notes: "Very productive call. Clear buying signals and budget confirmed.",
        meetingUrl: "https://zoom.us/j/123456789",
        recordingUrl: "https://zoom.us/rec/share/abc123",
        pitch: "Enterprise AI Sales Platform Demo",
        dealValue: 50000,
        followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        flagged: false
      },

      // Missed call from yesterday
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[1]._id, // Michael Chen
        scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "missed",
        outcome: "no_response",
        feedback: {
          summary: "DM did not join the call. No response to follow-up messages.",
          notes: "This is the second missed call. May need to reconsider lead quality.",
          followUpRequired: true,
          qualityScore: 3
        },
        notes: "Attempted to reach via phone and email. No response.",
        meetingUrl: "https://zoom.us/j/123456790",
        pitch: "Initial Discovery Call",
        flagged: false
      },

      // Completed call with poor feedback - flagged
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[2]._id, // Emily Rodriguez
        scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000), // 20 min duration
        duration: 20,
        status: "completed",
        outcome: "negative_feedback",
        feedback: {
          rating: 2,
          summary: "DM was unresponsive and seemed disinterested. Call ended abruptly without clear next steps.",
          notes: "Emily seemed distracted throughout the call and showed no interest in the product features.",
          nextSteps: "Follow up with qualification email to determine genuine interest level",
          followUpRequired: false,
          qualityScore: 4
        },
        notes: "Poor call quality. DM appeared to be multitasking and not engaged.",
        meetingUrl: "https://zoom.us/j/123456791",
        pitch: "Product Overview Call",
        dealValue: 0,
        flagged: true,
        flagReason: "Low engagement, unprofessional behavior during call",
        flagSeverity: "medium",
        flaggedBy: enterpriseAdmin._id,
        flaggedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },

      // Upcoming scheduled call
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[0]._id, // Sarah Johnson - follow up
        scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        status: "scheduled",
        outcome: "pending",
        feedback: {
          summary: "Follow-up technical discussion scheduled",
          notes: "Technical deep-dive on integration capabilities and implementation roadmap",
          followUpRequired: false
        },
        notes: "Preparation notes: Focus on API documentation and security features",
        meetingUrl: "https://zoom.us/j/123456792",
        pitch: "Technical Implementation Discussion",
        dealValue: 50000,
        flagged: false
      },

      // Cancelled call from last week
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[1]._id, // Michael Chen
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        status: "cancelled",
        outcome: "rescheduled",
        feedback: {
          summary: "DM requested to reschedule due to urgent business matter",
          notes: "Positive interaction, expressed continued interest in the solution",
          nextSteps: "Reschedule for next week after his board meeting",
          followUpRequired: true,
          qualityScore: 6
        },
        notes: "Proactive cancellation with valid reason. Still showing strong interest.",
        meetingUrl: "https://zoom.us/j/123456793",
        pitch: "Discovery and Needs Assessment",
        dealValue: 30000,
        flagged: false
      },

      // High-value completed call with excellent outcome
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[0]._id, // Sarah Johnson - initial call
        scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
        completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 60 min duration
        duration: 60,
        status: "completed",
        outcome: "qualified_opportunity",
        feedback: {
          rating: 5,
          summary: "Outstanding initial discovery call. Sarah provided comprehensive overview of their current challenges and expressed strong interest in our AI platform.",
          notes: "Budget confirmed: $50K+ for enterprise solution. Decision timeline: Q1 2024. Multiple stakeholders involved.",
          nextSteps: "Schedule product demo with technical team and procurement",
          followUpRequired: true,
          qualityScore: 10
        },
        notes: "Perfect fit for our enterprise solution. Clear pain points and strong buying signals.",
        meetingUrl: "https://zoom.us/j/123456794",
        recordingUrl: "https://zoom.us/rec/share/def456",
        pitch: "Initial Discovery and Qualification",
        dealValue: 50000,
        followUpDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        flagged: false
      },

      // Recent no-show call - flagged for review
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[2]._id, // Emily Rodriguez - second call
        scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: "missed",
        outcome: "no_show",
        feedback: {
          summary: "DM did not attend scheduled call and did not respond to reminder emails or messages.",
          notes: "Second consecutive no-show. Previous call also had engagement issues.",
          followUpRequired: false,
          qualityScore: 2
        },
        notes: "Pattern of unreliable behavior. May need to reassess lead qualification.",
        meetingUrl: "https://zoom.us/j/123456795",
        pitch: "Follow-up Discussion",
        flagged: true,
        flagReason: "Repeated no-shows, unreliable engagement pattern",
        flagSeverity: "high",
        flaggedBy: salesRep._id,
        flaggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },

      // Successful call from last month with moderate rating
      {
        companyDomain: "techize.com",
        salesRepId: salesRep._id,
        decisionMakerId: dms[1]._id, // Michael Chen - initial call
        scheduledAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
        completedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000), // 35 min duration
        duration: 35,
        status: "completed",
        outcome: "interested_prospect",
        feedback: {
          rating: 4,
          summary: "Good initial conversation with CTO. Technical questions about scalability and security were well-received.",
          notes: "Interested in enterprise features but needs to discuss with team. Budget discussions pending.",
          nextSteps: "Provide technical documentation and schedule team demo",
          followUpRequired: true,
          qualityScore: 7
        },
        notes: "Solid technical discussion. Good product fit but longer sales cycle expected.",
        meetingUrl: "https://zoom.us/j/123456796",
        recordingUrl: "https://zoom.us/rec/share/ghi789",
        pitch: "Technical Architecture Discussion",
        dealValue: 25000,
        followUpDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        flagged: false
      }
    ];

    // Create call logs
    const savedCallLogs = [];
    for (const callData of callActivityData) {
      const callLog = new CallLog(callData);
      const saved = await callLog.save();
      savedCallLogs.push(saved);
    }

    console.log(`Created ${savedCallLogs.length} call activity records`);

    // Calculate and log summary statistics
    const totalCalls = savedCallLogs.length;
    const completedCalls = savedCallLogs.filter(log => log.status === 'completed').length;
    const missedCalls = savedCallLogs.filter(log => log.status === 'missed').length;
    const cancelledCalls = savedCallLogs.filter(log => log.status === 'cancelled').length;
    const scheduledCalls = savedCallLogs.filter(log => log.status === 'scheduled').length;
    const flaggedCalls = savedCallLogs.filter(log => log.flagged).length;
    
    const ratedCalls = savedCallLogs.filter(log => log.feedback?.rating);
    const avgRating = ratedCalls.length > 0 ? 
      (ratedCalls.reduce((sum, log) => sum + log.feedback.rating, 0) / ratedCalls.length).toFixed(1) : 
      '0.0';

    console.log("\nSample call activity data created successfully!");
    console.log("=== Call Activity Summary ===");
    console.log(`Total Calls: ${totalCalls}`);
    console.log(`Completed: ${completedCalls}`);
    console.log(`Missed: ${missedCalls}`);
    console.log(`Cancelled: ${cancelledCalls}`);
    console.log(`Scheduled: ${scheduledCalls}`);
    console.log(`Flagged: ${flaggedCalls}`);
    console.log(`Average Rating: ${avgRating}/5.0`);
    console.log("\nCall outcomes include:");
    console.log("- Successful demos with high engagement scores");
    console.log("- Missed calls and no-shows for lead quality assessment");
    console.log("- Flagged calls with quality concerns");
    console.log("- Various feedback ratings and detailed notes");
    console.log("- Meeting URLs and recording links");
    console.log("- Deal values and follow-up tracking");
    console.log("- Comprehensive filtering and search test data");

  } catch (error) {
    console.error("Error creating sample call activity:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

createSampleCallActivity();