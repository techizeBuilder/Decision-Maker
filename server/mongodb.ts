import mongoose from "mongoose";

export async function connectToMongoDB() {
  try {
    const mongoUrl =
      process.env.MONGODB_URI ||
      "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB Atlas successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// User Schema
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
    linkedinUrl: { type: String },
    linkedinVerified: { type: Boolean, default: false },
    jobTitle: { type: String },
  jobTitleStatus: { type: String, enum: ["approved", "pending", "rejected", "none"], default: "none" },
  submittedCustomJobTitle: { type: String },
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
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      meetingReminders: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      promotionalEmails: { type: Boolean, default: false }
    },
    privacySettings: {
      profileVisibility: { type: String, default: "public" },
      showCompanyInfo: { type: Boolean, default: true },
      allowDirectContact: { type: Boolean, default: true },
      shareCallHistory: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true },
    standing: { type: String, default: "good" },
    flagsReceived: { type: Number, default: 0 },
    // Email verification fields
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationTokenExpiry: { type: Date },
    // User verification system
    verification_status: { 
      type: String, 
      enum: ["verified", "unverified", "pending"], 
      default: "unverified" 
    },
    verified_via: { 
      type: String, 
      enum: ["linkedin", "domain", "manual"], 
      default: null 
    },
    // Enterprise admin fields
    companyDomain: { type: String },
    domainVerified: { type: Boolean, default: false },
    domainVerifiedAt: { type: Date },
    department: { type: String },
    requirePasswordChange: { type: Boolean, default: false },
    permissions: [{ type: String }], // Array of decision maker IDs
    invitationStatus: { type: String, enum: ["invited", "accepted", "declined"], default: "accepted" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invitedAt: { type: Date },
    lastLogin: { type: Date },
    // Google Calendar integration
    googleCalendarTokens: {
      access_token: { type: String },
      refresh_token: { type: String },
      scope: { type: String },
      token_type: { type: String },
      expiry_date: { type: Number }
    },
    googleCalendarId: { type: String },
    calendarIntegrationEnabled: { type: Boolean, default: false },
    // Email addon for basic/pro users
    hasEmailAddon: { type: Boolean, default: false },
    emailAddonPurchaseDate: { type: Date },
    // Suspension system for flagged users
    suspension: {
      isActive: { type: Boolean, default: false },
      startDate: { type: Date },
      endDate: { type: Date },
      reason: { type: String },
      type: { type: String, enum: ['30-day', '90-day-flags', 'manual'], default: '90-day-flags' }
    },
  },
  {
    timestamps: true,
  },
);

// Invitation Schema
const invitationSchema = new mongoose.Schema(
  {
    salesRepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    decisionMakerEmail: { type: String, required: true },
    decisionMakerName: { type: String, required: true },
    decisionMakerJobTitle: { type: String },
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

// Call Schema
const callSchema = new mongoose.Schema(
  {
    salesRepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    decisionMakerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    endTime: { type: Date },
    status: {
      type: String,
      default: "scheduled",
      enum: ["scheduled", "completed", "cancelled"],
    },
    rating: { type: Number, min: 1, max: 5 }, // DM rating
    feedback: { type: String }, // DM feedback
    salesRepRating: { type: Number, min: 1, max: 5 }, // Sales rep rating
    salesRepFeedback: { type: String }, // Sales rep feedback
    company: { type: String },
    pitch: { type: String },
    // Google Calendar integration
    googleCalendarEventId: { type: String },
    googleMeetLink: { type: String },
    salesRepCalendarId: { type: String },
    decisionMakerCalendarId: { type: String },
    meetingLink: { type: String }, // Keep for backward compatibility
    timeZone: { type: String, default: "UTC" },
    agenda: { type: String },
    notes: { type: String },
    platform: { type: String },
    decisionMakerName: { type: String },
  },
  {
    timestamps: true,
  },
);

// Subscription Plan Schema
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: String, required: true },
    billingInterval: {
      type: String,
      required: true,
      enum: ["monthly", "yearly"],
      default: "monthly"
    },
    features: [{ type: String }],
    maxCallCredits: { type: Number, required: true },
    maxInvitations: { type: Number, required: true },
    prioritySupport: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model("User", userSchema);
export const Invitation = mongoose.model("Invitation", invitationSchema);
export const Call = mongoose.model("Call", callSchema);
export const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

// Company Credits Schema
const companyCreditsSchema = new mongoose.Schema({
  companyDomain: { type: String, required: true, unique: true },
  planType: { type: String, required: true },
  monthlyCredits: { type: Number, required: true, default: 500 },
  usedCredits: { type: Number, default: 0 },
  remainingCredits: { type: Number, default: 500 },
  currentPeriodStart: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, required: true },
  perRepLimits: {
    maxCallsPerMonth: { type: Number, default: null }, // null = unlimited
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

// Call Logs Schema
const callLogSchema = new mongoose.Schema({
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  decisionMakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyDomain: { type: String, required: true },
  callType: { type: String, enum: ["intro", "follow_up", "demo"], default: "intro" },
  status: { type: String, enum: ["scheduled", "completed", "cancelled", "no_show"], required: true },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number }, // in minutes
  creditsUsed: { type: Number, default: 1 },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    flags: [{ type: String }] // "inappropriate", "unprepared", "technical_issues"
  },
  meetingUrl: { type: String },
  recordingUrl: { type: String }
}, {
  timestamps: true
});

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  callLogId: { type: mongoose.Schema.Types.ObjectId, ref: "CallLog", required: true },
  salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  decisionMakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyDomain: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String },
  flags: [{ type: String }], // "inappropriate", "unprepared", "technical_issues", "excellent"
  submittedBy: { type: String, enum: ["decision_maker", "sales_rep"], required: true },
  visibility: { type: String, enum: ["private", "team", "public"], default: "team" }
}, {
  timestamps: true
});

export const CompanyCredits = mongoose.model("CompanyCredits", companyCreditsSchema);
export const CallLog = mongoose.model("CallLog", callLogSchema);
export const Feedback = mongoose.model("Feedback", feedbackSchema);

// Company DMs Schema - Tracks DMs referred by company sales reps
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

// DM Flags Schema - Tracks quality and behavior flags
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

export const CompanyDMs = mongoose.model("CompanyDMs", companyDMsSchema);
export const DMFlags = mongoose.model("DMFlags", dmFlagsSchema);

// Initial Feedback Schema (for post-call emails)
const initialFeedbackSchema = new mongoose.Schema(
  {
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Call",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userType: { 
      type: String, 
      enum: ["decision_maker", "sales_rep"], 
      required: true 
    },
    callTookPlace: { type: Boolean, required: true },
    wasPoliteEngaged: { 
      type: String, 
      enum: ["yes", "no", "other"], 
      required: true 
    },
    comments: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
  }
);

export const InitialFeedback = mongoose.model("InitialFeedback", initialFeedbackSchema);

// Rep Suspension Schema
const repSuspensionSchema = new mongoose.Schema({
  repId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['30-day', '90-day'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  suspensionReason: { type: String, required: true },
  triggeringFlags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const RepSuspension = mongoose.model("RepSuspension", repSuspensionSchema);

// Call Credits Schema - Tracks credits earned by sales reps
const callCreditsSchema = new mongoose.Schema({
  repId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dmId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  earnedAt: { type: Date, default: Date.now },
  source: { type: String, required: true, enum: ['dm_onboarding', 'manual', 'bonus'] },
  creditAmount: { type: Number, required: true, default: 1 },
  month: { type: String, required: true }, // Format: YYYY-MM
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// DM-Rep Credit Usage Schema - Tracks monthly credit usage per DM-Rep pair
const dmRepCreditUsageSchema = new mongoose.Schema({
  repId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dmId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // Format: YYYY-MM
  creditsUsed: { type: Number, default: 0, max: 3 }
}, { timestamps: true });

// Create compound indexes for performance
callCreditsSchema.index({ repId: 1, dmId: 1, month: 1 });
dmRepCreditUsageSchema.index({ repId: 1, dmId: 1, month: 1 }, { unique: true });

export const CallCredits = mongoose.model("CallCredits", callCreditsSchema);
export const DMRepCreditUsage = mongoose.model("DMRepCreditUsage", dmRepCreditUsageSchema);

export type UserDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  role: "sales_rep" | "decision_maker";
  firstName: string;
  lastName: string;
  linkedinUrl?: string;
  linkedinVerified: boolean;
  jobTitle?: string;
  company?: string;
  industry?: string;
  companySize?: string;
  yearsInRole?: string;
  packageType: string;
  isActive: boolean;
  standing: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InvitationDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  salesRepId: mongoose.Types.ObjectId;
  decisionMakerEmail: string;
  decisionMakerName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
};

export type CallDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  salesRepId: mongoose.Types.ObjectId;
  decisionMakerId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  status: "scheduled" | "completed" | "cancelled";
  rating?: number;
  feedback?: string;
  company?: string;
  pitch?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SubscriptionPlanDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: string;
  billingInterval: "monthly" | "yearly";
  features: string[];
  maxCallCredits: number;
  maxInvitations: number;
  prioritySupport: boolean;
  bestSeller: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Platform Settings Schema
const platformSettingsSchema = new mongoose.Schema(
  {
    // User Limits
    maxDmsPerMonth: { type: Number, default: 50 },
    freeCallLimit: { type: Number, default: 3 },

    // Credit System
    creditRefundNoShows: { type: Boolean, default: true },
    creditValue: { type: Number, default: 5.00 },
    refundWindow: { type: Number, default: 24 },

    // Enterprise Features
    nameVisibilityToggle: { type: Boolean, default: true },
    emailUnlockFeature: { type: Boolean, default: true },
    advancedAnalytics: { type: Boolean, default: true },
    apiAccess: { type: Boolean, default: false },

    // Security & Compliance
    twoFactorAuth: { type: Boolean, default: false },
    activityLogging: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 60 },
    passwordPolicy: { type: String, enum: ["low", "medium", "high"], default: "medium" },

    // System metadata
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
  }
);

export const PlatformSettings = mongoose.model("PlatformSettings", platformSettingsSchema);

export type PlatformSettingsDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  maxDmsPerMonth: number;
  freeCallLimit: number;
  creditRefundNoShows: boolean;
  creditValue: number;
  refundWindow: number;
  nameVisibilityToggle: boolean;
  emailUnlockFeature: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  twoFactorAuth: boolean;
  activityLogging: boolean;
  sessionTimeout: number;
  passwordPolicy: "low" | "medium" | "high";
  lastUpdatedBy?: mongoose.Types.ObjectId;
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Activity Log Schema
const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  {
    timestamps: true,
  }
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

// Manual Verification Queue Schema
const manualVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    linkedinUrl: { type: String },
    companyDomain: { type: String },
    linkedinVerificationFailed: { type: Boolean, default: false },
    emailVerificationFailed: { type: Boolean, default: false },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String }
  },
  {
    timestamps: true,
  }
);

export const ManualVerification = mongoose.model("ManualVerification", manualVerificationSchema);

export type ActivityLogDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Monthly Call Limits Schema - Track monthly call limits for both DMs and Sales Reps
const monthlyCallLimitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userRole: { type: String, enum: ["sales_rep", "decision_maker"], required: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    totalCalls: { type: Number, default: 0 }, // Total calls completed this month
    maxCalls: { type: Number, default: 3 }, // Maximum calls allowed per month
    remainingCalls: { type: Number, default: 3 }, // Calls remaining this month
    lastUpdated: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one record per user per month
monthlyCallLimitSchema.index({ userId: 1, month: 1 }, { unique: true });

export const MonthlyCallLimit = mongoose.model("MonthlyCallLimit", monthlyCallLimitSchema);

export type MonthlyCallLimitDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: "sales_rep" | "decision_maker";
  month: string;
  totalCalls: number;
  maxCalls: number;
  remainingCalls: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
};