import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'sales_rep', 'decision_maker', 'super_admin'
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  linkedinUrl: text("linkedin_url"),
  linkedinVerified: boolean("linkedin_verified").default(false),
  jobTitle: text("job_title"),
  company: text("company"),
  industry: text("industry"),
  companySize: text("company_size"),
  yearsInRole: text("years_in_role"),
  packageType: text("package_type").default("free"),
  hasEmailAddon: boolean("has_email_addon").default(false), // $5 addon for DM email access
  emailAddonPurchaseDate: timestamp("email_addon_purchase_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  standing: text("standing").default("good"), // 'good', 'excellent'
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").notNull(),
  decisionMakerEmail: text("decision_maker_email").notNull(),
  decisionMakerName: text("decision_maker_name").notNull(),
  decisionMakerJobTitle: text("decision_maker_job_title"),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").notNull(),
  decisionMakerId: integer("decision_maker_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'completed', 'cancelled'
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  company: text("company"),
  pitch: text("pitch"),
});

// Subscription Plans Table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(),
  billingInterval: text("billing_interval").notNull(), // 'monthly', 'yearly'
  features: text("features").array(), // Array of feature strings
  maxCallCredits: integer("max_call_credits").notNull(),
  maxInvitations: integer("max_invitations").notNull(),
  prioritySupport: boolean("priority_support").default(false),
  bestSeller: boolean("best_seller").default(false), // Only one plan can be best seller
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity Logs Table for Super Admin monitoring
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // 'user', 'subscription', 'call', etc.
  entityId: text("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales Rep signup validation schemas
export const salesRepPersonalInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  companyDomain: z.string().min(2, "Company domain is required").refine(
    (domain) => {
      // Remove http/https and www prefix, ensure it's a valid domain format
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(cleanDomain);
    },
    "Please enter a valid domain (e.g., company.com)"
  ),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").refine(
    (url) => url.includes("linkedin.com"),
    "URL must be a LinkedIn profile"
  ),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number and special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Extract domain from email
  const emailDomain = data.email.split('@')[1]?.toLowerCase();
  // Clean and normalize company domain
  const cleanCompanyDomain = data.companyDomain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
  return emailDomain === cleanCompanyDomain;
}, {
  message: "Email domain must match company domain",
  path: ["companyDomain"],
});

export const salesRepProfessionalSchema = z.object({
  jobTitle: z.string().min(2, "Job title is required"),
  company: z.string().min(2, "Company name is required"),
  industry: z.string().min(1, "Please select an industry"),
  companySize: z.string().min(1, "Please select company size"),
  yearsInRole: z.string().optional(),
});

export const addInvitationsSchema = z.object({
  invitations: z.array(z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
  })).min(1, "At least one decision maker is required").max(10, "Maximum 10 invitations at once"),
});

export const salesRepPackageSchema = z.object({
  packageType: z.string().min(1, "Package selection is required"), // Accept MongoDB ID
});

// Decision Maker signup validation schemas
export const decisionMakerPersonalInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  companyDomain: z.string().min(2, "Company domain is required").refine(
    (domain) => {
      // Remove http/https and www prefix, ensure it's a valid domain format
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(cleanDomain);
    },
    "Please enter a valid domain (e.g., company.com)"
  ),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").refine(
    (url) => url.includes("linkedin.com"),
    "Must be a valid LinkedIn URL"
  ),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Extract domain from email
  const emailDomain = data.email.split('@')[1]?.toLowerCase();
  // Clean and normalize company domain
  const cleanCompanyDomain = data.companyDomain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
  return emailDomain === cleanCompanyDomain;
}, {
  message: "Email domain must match company domain",
  path: ["companyDomain"],
});

// Central list of allowed Decision Maker job titles. "Other" requires manual approval.
export const DECISION_MAKER_ALLOWED_TITLES = [
  "CEO",
  "Founder",
  "Co-Founder",
  "President",
  "Owner",
  "Managing Director",
  "Director",
  "Vice President",
  "VP",
  "Head of Sales",
  "Head of Marketing",
  "Head of Operations",
  "COO",
  "CFO",
  "CTO",
  "CMO",
  "Chief Strategy Officer",
  "Chief Revenue Officer",
  "General Manager",
  "Partner",
  "Principal",
  "Chairman",
  "Board Member",
  "Other",
] as const;

export type DecisionMakerAllowedTitle =
  typeof DECISION_MAKER_ALLOWED_TITLES[number];

export const salesRepInvitesSchema = z.object({
  decisionMakers: z.array(z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters").optional().or(z.literal("")),
    lastName: z.string().min(2, "Last name must be at least 2 characters").optional().or(z.literal("")),
    jobTitle: z.enum(DECISION_MAKER_ALLOWED_TITLES).optional().or(z.literal("")),
    customJobTitle: z.string().optional().or(z.literal("")),
    email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  })).optional(),
});

export const decisionMakerProfessionalSchema = z
  .object({
    jobTitle: z.enum(DECISION_MAKER_ALLOWED_TITLES, {
      required_error: "Job title is required",
    }),
    customJobTitle: z
      .string()
      .optional()
      .refine((val) => !val || (val.length >= 2 && val.length <= 80), {
        message: "Custom job title must be between 2 and 80 characters",
      }),
    company: z.string().min(2, "Company name is required"),
    industry: z.string().min(1, "Please select an industry"),
    companySize: z.string().min(1, "Please select company size"),
    yearsInRole: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.jobTitle === "Other") {
        return !!data.customJobTitle;
      }
      return true;
    },
    {
      message: "Custom job title is required when selecting Other",
      path: ["customJobTitle"],
    },
  );

export const decisionMakerAvailabilitySchema = z.object({
  availabilityType: z.enum(["flexible", "specific_times", "by_appointment"]),
  preferredDays: z.array(z.string()).optional(),
  preferredTimes: z.array(z.string()).optional(),
  timezone: z.string().min(1, "Please select your timezone"),
  callDuration: z.enum(["15", "30", "45"]).default("15"),
});

export const decisionMakerNominationSchema = z.object({
  nominatedSalesReps: z.array(z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional().or(z.literal("")),
    email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
    company: z.string().optional().or(z.literal("")),
    referralReason: z.string().optional().or(z.literal("")),
  })).optional(),
});

export const decisionMakerPackageSchema = z.object({
  packageType: z.string().min(1, "Package selection is required"), // Accept MongoDB ID
});

// Super Admin Authentication Schema
export const superAdminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Subscription Plan Management Schemas
export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  billingInterval: z.enum(["monthly", "yearly"]),
  features: z.array(z.string()).optional(),
  maxCallCredits: z.number().min(0, "Call credits must be 0 or greater"),
  maxInvitations: z.number().min(0, "Invitations must be 0 or greater"),
  prioritySupport: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateSubscriptionPlanSchema = createSubscriptionPlanSchema.partial();

// User Management Schema for Super Admin
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  role: z.enum(["sales_rep", "decision_maker", "super_admin"]).optional(),
  packageType: z.string().optional(),
  isActive: z.boolean().optional(),
  standing: z.enum(["good", "warning", "suspended"]).optional(),
});

// Activity Log Schema
export const createActivityLogSchema = z.object({
  userId: z.number().optional(),
  action: z.string().min(1, "Action is required"),
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().optional(),
  details: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
