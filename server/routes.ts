import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { storage } from "./storage";
import {
  authenticateToken,
  optionalAuth,
  generateToken,
  JWTPayload,
} from "./jwt-middleware";
import {
  getAuthUrl,
  setCredentials,
  oauth2Client,
  getCalendarEvents,
  createCalendarEvent,
  getAvailableSlots,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "./google-calendar";
import {
  sendDecisionMakerInvitation,
  sendWelcomeEmail,
  sendBookingConfirmationToRep,
  sendBookingConfirmationToDM,
  sendPostCallFeedbackToDM,
  sendPostCallFeedbackToRep,
  generateEmailVerificationToken,
} from "./email-service";
import {
  insertInvitationSchema,
  insertCallSchema,
  salesRepPersonalInfoSchema,
  salesRepProfessionalSchema,
  salesRepInvitesSchema,
  addInvitationsSchema,
  salesRepPackageSchema,
  decisionMakerPersonalInfoSchema,
  decisionMakerProfessionalSchema,
  decisionMakerAvailabilitySchema,
  decisionMakerNominationSchema,
  decisionMakerPackageSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Stripe after environment variables are loaded
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });

  // Approve a pending custom Decision Maker job title (super admin only)
  app.post("/api/admin/decision-maker/:id/approve-job-title", optionalAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (!currentUser || currentUser.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { id } = req.params;
      const targetUser = await storage.getUserById(id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.jobTitleStatus !== "pending") {
        console.warn(`Approve job title: user ${id} status not pending (status=${targetUser.jobTitleStatus})`);
        return res.status(400).json({ message: "User does not have a pending job title" });
      }
      // Require a submittedCustomJobTitle when jobTitle is Other
      if (targetUser.jobTitle === 'Other' && !targetUser.submittedCustomJobTitle) {
        console.error(`Approval blocked: user ${id} missing submittedCustomJobTitle while jobTitle='Other'`);
        return res.status(400).json({ message: "Missing submitted custom job title for approval" });
      }
      const finalTitle = targetUser.submittedCustomJobTitle || targetUser.jobTitle || "Decision Maker";
      console.log(`Approving job title for user ${id}. Final title: ${finalTitle}`);
      const updated = await storage.updateUser(id, {
        jobTitle: finalTitle,
        jobTitleStatus: "approved",
        submittedCustomJobTitle: undefined,
      });
      if (!updated) {
        console.error(`Approval failed: updateUser returned undefined for user ${id}`);
        return res.status(500).json({ message: "Failed to persist approved job title" });
      }
      res.json({ success: true, message: "Job title approved", jobTitle: updated?.jobTitle });
    } catch (error: any) {
      console.error("Error approving job title:", error);
      res.status(500).json({ message: "Failed to approve job title" });
    }
  });

  // List pending Decision Maker job titles (super admin only)
  app.get("/api/admin/decision-maker/pending-job-titles", optionalAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (!currentUser || currentUser.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const pending = await storage.getAllUsers();
      const filtered = pending.filter(u => u.role === 'decision_maker' && u.jobTitleStatus === 'pending');
      res.json({
        pending: filtered.map(u => ({
          id: u.id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            submittedCustomJobTitle: (u as any).submittedCustomJobTitle,
            placeholderJobTitle: u.jobTitle,
            company: u.company,
            createdAt: u.createdAt,
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to load pending job titles" });
    }
  });

  // Public endpoint for subscription plans (for landing page)
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error getting subscription plans:", error);
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  // Get current user's package limits during signup
  app.get("/api/user-package-limits", async (req, res) => {
    try {
      // Get user ID from session or query parameter (VPS fallback)
      const userId = (req.session as any)?.signupUserId || req.query.userId;
      console.log("🚀 BACKEND PACKAGE LIMITS - Session userId:", (req.session as any)?.signupUserId);
      console.log("🚀 BACKEND PACKAGE LIMITS - Query userId:", req.query.userId);
      console.log("🚀 BACKEND PACKAGE LIMITS - Using userId:", userId);
      
      if (!userId) {
        return res.status(400).json({ message: "No active signup session" });
      }

      // Get user information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's subscription plan based on packageType
      const plans = await storage.getAllSubscriptionPlans();
      console.log(
        `Looking for user plan: ${user.packageType} among plans:`,
        plans.map((p) => p.name),
      );

      const userPlan = plans.find(
        (plan) => plan.name.toLowerCase() === user.packageType?.toLowerCase(),
      );

      if (!userPlan) {
        console.warn(
          `No plan found for packageType: ${user.packageType}, defaulting to free`,
        );
        // Default to free plan if no plan found
        const freePlan = plans.find(
          (plan) => plan.name.toLowerCase() === "free",
        );
        return res.json({
          packageType: "free",
          maxInvitations: freePlan?.maxInvitations || 3,
          maxCallCredits: freePlan?.maxCallCredits || 1,
          planName: "Free",
          userEmail: user.email, // Include user's email for domain validation
        });
      }

      console.log(`Found user plan: ${userPlan.name} with limits:`, {
        maxInvitations: userPlan.maxInvitations,
        maxCallCredits: userPlan.maxCallCredits,
      });

      res.json({
        packageType: user.packageType,
        maxInvitations: userPlan.maxInvitations,
        maxCallCredits: userPlan.maxCallCredits,
        planName: userPlan.name,
        userEmail: user.email, // Include user's email for domain validation
      });
    } catch (error) {
      console.error("Error getting user package limits:", error);
      res.status(500).json({ message: "Failed to get package limits" });
    }
  });

  // Test email service endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { testEmailConnection } = await import("./email-service");
      const result = await testEmailConnection();
      res.json(result);
    } catch (error) {
      console.error("Email service test failed:", error);
      res.status(500).json({
        success: false,
        message: "Email service test failed",
        error: error.message,
      });
    }
  });

  // Stripe payment endpoints
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "usd", packageType, userEmail } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          packageType: packageType || "unknown",
          userEmail: userEmail || "unknown",
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({
        message: "Error creating payment intent: " + error.message,
      });
    }
  });

  // Create subscription for recurring payments
  app.post("/api/create-subscription", async (req, res) => {
    try {
      const { customerEmail, customerName, priceId, packageType, userId } =
        req.body;

      if (!customerEmail || !priceId) {
        return res.status(400).json({
          message: "Customer email and price ID are required",
        });
      }

      // Create or retrieve customer
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
          name: customerName,
          metadata: {
            userId: userId || "unknown",
            packageType: packageType || "unknown",
          },
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: priceId,
          },
        ],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret:
          subscription.latest_invoice?.payment_intent?.client_secret,
        customerId: customer.id,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({
        message: "Error creating subscription: " + error.message,
      });
    }
  });

  // Verify payment status
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res
          .status(400)
          .json({ message: "Payment intent ID is required" });
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      res.json({
        status: paymentIntent.status,
        succeeded: paymentIntent.status === "succeeded",
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({
        message: "Error verifying payment: " + error.message,
      });
    }
  });

  // Get available upgrade plans for a user
  app.get("/api/upgrade-plans", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const allPlans = await storage.getAllSubscriptionPlans();
      if (!allPlans || allPlans.length === 0) {
        return res.json([]);
      }

      // Define plan hierarchy
      const planHierarchy = {
        free: 0,
        basic: 1,
        pro: 2,
        'pro-team': 3,
        enterprise: 4
      };

      const currentPlanLevel = planHierarchy[user.packageType?.toLowerCase() as keyof typeof planHierarchy] || 0;

      // Filter to show only upgrade options (higher tier plans)
      const upgradePlans = allPlans.filter(plan => {
        const planLevel = planHierarchy[plan.name.toLowerCase().replace(/\s+/g, '-') as keyof typeof planHierarchy];
        return planLevel !== undefined && planLevel > currentPlanLevel;
      }).sort((a, b) => {
        const aLevel = planHierarchy[a.name.toLowerCase().replace(/\s+/g, '-') as keyof typeof planHierarchy] || 0;
        const bLevel = planHierarchy[b.name.toLowerCase().replace(/\s+/g, '-') as keyof typeof planHierarchy] || 0;
        return aLevel - bLevel;
      });

      res.json({
        currentPlan: user.packageType || 'free',
        upgradePlans
      });
    } catch (error: any) {
      console.error("Error getting upgrade plans:", error);
      res.status(500).json({ message: "Failed to get upgrade plans" });
    }
  });

  // Process plan upgrade
  app.post("/api/upgrade-plan", authenticateToken, async (req, res) => {
    try {
      const { planId, paymentIntentId } = req.body;

      if (!planId || !paymentIntentId) {
        return res.status(400).json({ 
          message: "Plan ID and payment intent ID are required" 
        });
      }

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify payment was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ 
          message: "Payment not completed successfully" 
        });
      }

      // Get the plan details
      const allPlans = await storage.getAllSubscriptionPlans();
      const selectedPlan = allPlans.find(plan => plan.id === planId);
      
      if (!selectedPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Update user's package type
      const planName = selectedPlan.name.toLowerCase().replace(/\s+/g, '-');
      await storage.updateUser(req.user!.userId, {
        packageType: planName
      });

      res.json({
        success: true,
        message: `Successfully upgraded to ${selectedPlan.name} plan`,
        newPlan: planName
      });
    } catch (error: any) {
      console.error("Error upgrading plan:", error);
      res.status(500).json({ message: "Failed to upgrade plan" });
    }
  });

  // Test warning email endpoint
  app.post("/api/test-warning-email", authenticateToken, async (req, res) => {
    try {
      const { targetEmail, reason } = req.body;

      if (!targetEmail) {
        return res.status(400).json({ message: "Target email is required" });
      }

      const { sendSalesRepWarningEmail } = await import("./email-service");

      const result = await sendSalesRepWarningEmail(
        targetEmail,
        "Test",
        "Admin",
        "Admin User",
        "System Administrator",
        "Naeberly Platform",
        reason || "Test warning email",
        new Date().toLocaleDateString(),
        1,
      );

      res.json({
        success: true,
        message: "Test warning email sent successfully",
        result,
      });
    } catch (error) {
      console.error("Test warning email failed:", error);
      res.status(500).json({
        success: false,
        message: "Test warning email failed",
        error: error.message,
      });
    }
  });

  // Validate invitation token endpoint
  app.get("/api/validate-invitation/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // Get invitation by ID (using token as invitation ID)
      const invitation = await storage.getInvitationById(token);

      if (!invitation) {
        return res.status(404).json({
          valid: false,
          message: "Invitation not found or expired",
        });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({
          valid: false,
          message: "Invitation has already been processed",
        });
      }

      // Get sales rep information
      const salesRep = await storage.getUser(invitation.salesRepId);

      res.json({
        valid: true,
        invitation: {
          id: invitation.id,
          decisionMakerName: invitation.decisionMakerName,
          decisionMakerEmail: invitation.decisionMakerEmail,
          salesRepName: salesRep
            ? `${salesRep.firstName} ${salesRep.lastName}`
            : "Unknown",
          salesRepCompany: salesRep ? salesRep.company : "Unknown",
          createdAt: invitation.createdAt,
        },
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({
        valid: false,
        message: "Failed to validate invitation",
      });
    }
  });

  // Accept invitation endpoint
  app.post("/api/accept-invitation/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // Get invitation by ID
      const invitation = await storage.getInvitationById(token);

      if (!invitation || invitation.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired invitation",
        });
      }

      // Update invitation status to accepted
      const updatedInvitation = await storage.updateInvitationStatus(
        token,
        "accepted",
      );

      if (!updatedInvitation) {
        return res.status(500).json({
          success: false,
          message: "Failed to accept invitation",
        });
      }

      res.json({
        success: true,
        message: "Invitation accepted successfully",
        invitation: updatedInvitation,
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to accept invitation",
      });
    }
  });

  // Get current authenticated user
  app.get("/api/current-user", authenticateToken, async (req, res) => {
    try {
      console.log(
        "Current user check - User ID:",
        req.user?.userId,
        "Email:",
        req.user?.email,
      );

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        console.log("User not found in database:", req.user?.userId);
        return res.status(401).json({ message: "User not found" });
      }

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      console.log(
        "Current user found:",
        userWithoutPassword.email,
        userWithoutPassword.role,
      );
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Current user error:", error);
      res.status(500).json({ message: "Failed to get current user" });
    }
  });

  // Update current user profile
  app.put("/api/current-user", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const updates = req.body;

      console.log(
        "Profile update request for user:",
        userId,
        "Updates:",
        updates,
      );

      // Get current user state before update to check for calendar disconnection
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if this is a calendar disconnection
      const wasConnected = currentUser.calendarIntegrationEnabled;
      const willBeConnected = !!updates.calendarIntegrationEnabled;
      const isDisconnecting = wasConnected && !willBeConnected;

      console.log(`Calendar status change for user ${userId}:`, {
        wasConnected,
        willBeConnected,
        isDisconnecting,
        userRole: currentUser.role,
        invitedBy: currentUser.invitedBy,
      });

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.password;
      delete updates.role;
      delete updates._id;
      delete updates.id;
      delete updates.createdAt;
      delete updates.__v;

      // Handle calendar disconnection flagging for DMs with inviting reps
      if (currentUser.role === "decision_maker" && currentUser.invitedBy && isDisconnecting) {
        console.log(
          `DM ${currentUser.email} disconnecting calendar via profile update, flagging referring sales rep ${currentUser.invitedBy}`,
        );

        try {
          await handleCalendarDisconnectionFlag(
            currentUser.invitedBy,
            userId,
            currentUser,
          );
          console.log(
            `✅ Sales rep ${currentUser.invitedBy} flagged for DM calendar disconnection via profile update`,
          );
        } catch (flagError) {
          console.error(
            "Error handling calendar disconnection flag via profile update:",
            flagError,
          );
          // Continue with the update even if flagging fails
        }
      }

      const updatedUser = await storage.updateUser(userId, {
        ...updates,
        updatedAt: new Date(),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user data without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      console.log("Profile updated successfully for user:", userId);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res
        .status(500)
        .json({ message: "Failed to update profile", error: error.message });
    }
  });

  // Get invitations for current user
  app.get("/api/invitations", authenticateToken, async (req, res) => {
    try {
      const invitations = await storage.getInvitationsByUserId(
        req.user!.userId,
      );
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Create new invitation
  app.post("/api/invitations", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertInvitationSchema.parse({
        ...req.body,
        salesRepId: req.user!.userId,
      });

      const invitation = await storage.createInvitation(validatedData);
      res.status(201).json(invitation);
    } catch (error) {
      res.status(400).json({ message: "Invalid invitation data" });
    }
  });

  // Validate invite token and get invitation details
  app.get("/api/invitations/validate/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // For this demo, the token is the invitation ID
      // In production, you'd use a secure token with expiration
      const invitation = await storage.getInvitationById(token);
      if (!invitation) {
        return res.status(404).json({
          valid: false,
          message: "Invalid or expired invitation link",
        });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({
          valid: false,
          message:
            invitation.status === "accepted"
              ? "This invitation has already been accepted"
              : "This invitation has been declined",
        });
      }

      // Get sales rep details
      const salesRep = await storage.getUserById(invitation.salesRepId);

      res.json({
        valid: true,
        invitation: {
          id: invitation._id,
          salesRepId: invitation.salesRepId,
          decisionMakerName: invitation.decisionMakerName,
          decisionMakerEmail: invitation.decisionMakerEmail,
          salesRepName: salesRep
            ? `${salesRep.firstName} ${salesRep.lastName}`
            : "Sales Representative",
          salesRepEmail: salesRep?.email || "",
          salesRepCompany: salesRep?.company || "Company",
          createdAt: invitation.createdAt,
        },
      });
    } catch (error) {
      console.error("Error validating invitation token:", error);
      res.status(500).json({
        valid: false,
        message: "Failed to validate invitation",
      });
    }
  });

  // Update invitation status
  app.patch("/api/invitations/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const invitation = await storage.updateInvitationStatus(id, status);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      res.json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invitation" });
    }
  });

  // Get calls for current user
  app.get("/api/calls", async (req, res) => {
    try {
      // For demo purposes, get calls for user ID 1 or 2
      const userId = req.query.userId ? (req.query.userId as string) : "1";
      const calls = await storage.getCallsByUserId(userId);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Create new call
  app.post("/api/calls", async (req, res) => {
    try {
      const validatedData = insertCallSchema.parse(req.body);

      // Check monthly call limits for both sales rep and decision maker
      const salesRepId = validatedData.salesRepId;
      const decisionMakerId = validatedData.decisionMakerId;

      // Validate sales rep can book calls
      const repCanBook = await storage.canUserBookCall(salesRepId, "sales_rep");
      if (!repCanBook.canBook) {
        return res.status(429).json({
          message: `Sales rep has reached monthly call limit: ${repCanBook.message}`,
          limitType: "sales_rep",
        });
      }

      // Validate decision maker can book calls
      const dmCanBook = await storage.canUserBookCall(
        decisionMakerId,
        "decision_maker",
      );
      if (!dmCanBook.canBook) {
        return res.status(429).json({
          message: `Decision maker has reached monthly call limit: ${dmCanBook.message}`,
          limitType: "decision_maker",
        });
      }

      // Create the call if both users have remaining call slots
      const call = await storage.createCall(validatedData);
      res.status(201).json(call);
    } catch (error) {
      console.error("Create call error:", error);
      res.status(400).json({ message: "Invalid call data" });
    }
  });

  // Update call
  app.patch("/api/calls/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const call = await storage.updateCall(id, updates);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to update call" });
    }
  });

  // Sales Rep Signup API Routes

  // LinkedIn verification endpoint with name matching
  app.post("/api/verify-linkedin", async (req, res) => {
    try {
      const { linkedinUrl, firstName, lastName } = req.body;

      console.log("LinkedIn verification request:", { linkedinUrl, firstName, lastName });

      if (!linkedinUrl) {
        return res.status(400).json({
          verified: false,
          message: "LinkedIn URL is required",
        });
      }

      if (!linkedinUrl.includes("linkedin.com")) {
        return res.status(400).json({
          verified: false,
          message: "Invalid LinkedIn URL - must be a LinkedIn profile",
        });
      }

      // Enhanced LinkedIn URL validation
      const urlPattern =
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-._]+\/?(\?.*)?$/;
      if (!urlPattern.test(linkedinUrl)) {
        return res.status(400).json({
          verified: false,
          message:
            "Please provide a valid LinkedIn profile URL (e.g., https://linkedin.com/in/your-profile)",
        });
      }

      // Additional checks for common LinkedIn URL formats
      const cleanUrl = linkedinUrl.toLowerCase().trim();

      // Check for valid LinkedIn profile path
      if (!cleanUrl.includes("/in/")) {
        return res.status(400).json({
          verified: false,
          message: "LinkedIn URL must be a profile link (containing '/in/')",
        });
      }

      // Extract profile identifier
      const profileMatch = cleanUrl.match(/\/in\/([a-zA-Z0-9-._]+)/);
      if (!profileMatch || profileMatch[1].length < 3) {
        return res.status(400).json({
          verified: false,
          message: "LinkedIn profile identifier is too short or invalid",
        });
      }

      // Name matching logic if firstName and lastName are provided
      let nameMatches = false;
      if (firstName && lastName) {
        const profileId = profileMatch[1].toLowerCase();
        const normalizedFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const normalizedLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
        
        // Simple exact matching logic
        const hasFirstName = profileId.includes(normalizedFirstName);
        const hasLastName = profileId.includes(normalizedLastName);
        
        // Both names must be present for a match
        nameMatches = hasFirstName && hasLastName;

        console.log("Name matching results:", {
          profileId,
          normalizedFirstName,
          normalizedLastName,
          hasFirstName,
          hasLastName,
          nameMatches
        });
      }

      console.log("LinkedIn verification successful for:", profileMatch[1]);

      // Verification successful
      res.json({
        verified: true,
        nameMatches: nameMatches,
        message: nameMatches 
          ? "LinkedIn profile verified and name matches!"
          : "LinkedIn profile verified but name doesn't match",
        profileId: profileMatch[1],
      });
    } catch (error) {
      console.error("LinkedIn verification error:", error);
      res.status(500).json({
        verified: false,
        message: "LinkedIn verification failed due to server error",
      });
    }
  });

  // Save personal information
  app.post("/api/sales-rep/personal-info", async (req, res) => {
    try {
      console.log("Received sales rep signup request:", req.body);
      const validatedData = salesRepPersonalInfoSchema.parse(req.body);
      console.log("Validated sales rep data:", validatedData);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log("Email already exists:", validatedData.email);
        return res
          .status(400)
          .json({ message: "Email address is already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Determine verification status based on LinkedIn name matching
      const linkedinNameMatches = req.body.linkedinNameMatches || false;
      let verificationStatus = "unverified";
      let verifiedVia = null;

      if (req.body.linkedinVerified && linkedinNameMatches) {
        // Condition 1: LinkedIn name matches - automatically verified
        verificationStatus = "verified";
        verifiedVia = "linkedin";
        console.log("Sales rep automatically verified via LinkedIn name match");
      }

      // Save user data
      const userData = {
        email: validatedData.email,
        password: hashedPassword,
        role: "sales_rep",
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        linkedinUrl: validatedData.linkedinUrl,
        linkedinVerified: req.body.linkedinVerified || false,
        companyDomain: validatedData.companyDomain,
        calendarIntegrationEnabled: false, // Default: calendar disconnected for new sales reps
        isActive: false, // Mark as inactive until signup is complete
        verification_status: verificationStatus,
        verified_via: verifiedVia,
        // Keep backward compatibility with existing email verification
        emailVerified: verificationStatus === "verified",
      };

      console.log("Creating sales rep with data:", userData);
      const user = await storage.createUser(userData);
      console.log("Sales rep created successfully:", user.id);

      // Add to manual verification queue if not automatically verified
      if (verificationStatus === "unverified") {
        try {
          const { connectToMongoDB, ManualVerification } = await import("./mongodb");
          await connectToMongoDB();

          await ManualVerification.create({
            userId: user.id,
            userRole: "sales_rep",
            userEmail: user.email,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            linkedinUrl: validatedData.linkedinUrl,
            companyDomain: validatedData.companyDomain,
            reason: "LinkedIn name doesn't match entered name",
            submittedAt: new Date(),
            status: "pending"
          });

          console.log("Sales rep added to manual verification queue:", user.id);
        } catch (verificationError) {
          console.error("Error adding sales rep to manual verification queue:", verificationError);
          // Don't fail the signup, just log the error
        }
      }

      // Store user ID in session for multi-step process
      (req.session as any).signupUserId = user.id;

      res.json({
        success: true,
        message: "Personal information saved",
        userId: user.id,
        verificationStatus: verificationStatus,
        needsEmailVerification: !linkedinNameMatches, // If LinkedIn name doesn't match, email verification will be needed
      });
    } catch (error: any) {
      console.error("Sales rep signup error:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to save personal information",
        error: error.message,
      });
    }
  });

  // Save professional background
  app.post("/api/sales-rep/professional-info", async (req, res) => {
    try {
      const validatedData = salesRepProfessionalSchema.parse(req.body);

      // Get user ID from session or request body (fallback for VPS deployment)
      const userId = (req.session as any)?.signupUserId || req.body.userId;
      console.log("🚀 BACKEND PROFESSIONAL INFO - Session userId:", (req.session as any)?.signupUserId);
      console.log("🚀 BACKEND PROFESSIONAL INFO - Body userId:", req.body.userId);
      console.log("🚀 BACKEND PROFESSIONAL INFO - Final userId:", userId);
      
      if (!userId) {
        return res
          .status(400)
          .json({ message: "Please complete personal information first or provide user ID" });
      }

      // Update user with professional information
      const updatedUser = await storage.updateUser(userId, {
        jobTitle: validatedData.jobTitle,
        company: validatedData.company,
        industry: validatedData.industry,
        companySize: validatedData.companySize,
        yearsInRole: validatedData.yearsInRole,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't clear session yet - user still needs to complete invites step
      // Session will be cleared after invites are completed

      res.json({
        success: true,
        message: "Professional information saved successfully!",
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res
        .status(500)
        .json({ message: "Failed to save professional information" });
    }
  });

  // Save decision maker invitations
  app.post("/api/sales-rep/invites", async (req, res) => {
    try {
      const validatedData = salesRepInvitesSchema.parse(req.body);

      // Get user ID from session or request body (fallback for VPS deployment)
      console.log("🚀 BACKEND INVITES - Session data:", req.session);
      console.log("🚀 BACKEND INVITES - Session ID:", req.sessionID);
      let userId = (req.session as any)?.signupUserId || req.body.userId;
      console.log("🚀 BACKEND INVITES - Session userId:", (req.session as any)?.signupUserId);
      console.log("🚀 BACKEND INVITES - Body userId:", req.body.userId);
      console.log("🚀 BACKEND INVITES - Final userId:", userId);

      // If no session, try to find recently created sales rep as fallback
      if (!userId) {
        console.log("No session found, looking for recently created sales rep");
        const recentUsers = await storage.getRecentInactiveSalesReps(5); // Get last 5 inactive sales reps
        console.log("Found recent inactive users:", recentUsers?.length || 0);
        if (recentUsers && recentUsers.length > 0) {
          console.log(
            "Recent inactive users:",
            recentUsers.map((u) => ({
              id: u.id,
              email: u.email,
              jobTitle: u.jobTitle,
            })),
          );
        }

        if (recentUsers && recentUsers.length > 0) {
          // Use the most recent one that has professional info but no invitations sent yet
          for (const user of recentUsers) {
            // Check if user has professional info but no invitations
            const invitations = await storage.getInvitationsByRep(user.id);
            console.log(
              `User ${user.id} has ${invitations.length} invitations`,
            );

            if (user.jobTitle && invitations.length === 0) {
              userId = user.id;
              console.log("Found recent sales rep needing invites:", userId);
              // Restore session for this user
              (req.session as any).signupUserId = userId;
              break;
            }
          }
        }

        // If still no user found, also check active users in case they were activated
        if (!userId) {
          console.log("Checking recently active sales reps too");
          const activeSalesReps = await storage.getUsersByRole("sales_rep");
          const recentActiveSalesReps = activeSalesReps.slice(0, 5);
          console.log(
            "Found active sales reps:",
            recentActiveSalesReps?.length || 0,
          );
          if (recentActiveSalesReps && recentActiveSalesReps.length > 0) {
            console.log(
              "Recent active users:",
              recentActiveSalesReps.map((u) => ({
                id: u.id,
                email: u.email,
                jobTitle: u.jobTitle,
                isActive: u.isActive,
              })),
            );
          }

          for (const user of recentActiveSalesReps) {
            const invitations = await storage.getInvitationsByRep(user.id);
            console.log(
              `Active user ${user.id} has ${invitations.length} invitations`,
            );

            if (user.jobTitle && invitations.length === 0) {
              userId = user.id;
              console.log(
                "Found recent active sales rep needing invites:",
                userId,
              );
              (req.session as any).signupUserId = userId;
              break;
            }
          }
        }
      }

      if (!userId) {
        return res.status(400).json({
          message: "Session expired. Please refresh the page and try again.",
          code: "SESSION_EXPIRED",
          suggestion:
            "Your registration is almost complete. Please refresh the page to continue.",
        });
      }

      // Get sales rep information for email
      const salesRep = await storage.getUser(userId);
      if (!salesRep) {
        return res.status(404).json({ message: "Sales rep not found" });
      }

      // Get user's plan limits and validate
      const plans = await storage.getAllSubscriptionPlans();
      const userPlan = plans.find(
        (plan) =>
          plan.name.toLowerCase() === salesRep.packageType?.toLowerCase(),
      );

      const maxInvitations = userPlan?.maxInvitations || 3; // Default to free plan

      // Validate number of decision makers against plan limits
      const validDecisionMakers =
        validatedData.decisionMakers?.filter((dm) => (dm.firstName || dm.lastName) && dm.email) || [];
      if (validDecisionMakers.length > maxInvitations) {
        return res.status(400).json({
          message: `Your ${userPlan?.name || "Free"} plan allows up to ${maxInvitations} invitations only.`,
          limit: maxInvitations,
          planName: userPlan?.name || "Free",
        });
      }

      // Check existing invitations to prevent exceeding monthly limits
      const existingInvitations = await storage.getInvitationsByRep(userId);
      if (
        existingInvitations.length + validDecisionMakers.length >
        maxInvitations
      ) {
        return res.status(400).json({
          message: `Adding ${validDecisionMakers.length} more invitations would exceed your plan limit of ${maxInvitations}.`,
          existing: existingInvitations.length,
          limit: maxInvitations,
          planName: userPlan?.name || "Free",
        });
      }

      // Create invitations for each decision maker
      const invitations = [];
      const emailResults = [];

      if (validatedData.decisionMakers) {
        for (const dm of validatedData.decisionMakers) {
          if ((dm.firstName || dm.lastName) && dm.email) {
            const fullName = `${dm.firstName || ''} ${dm.lastName || ''}`.trim();
            // Handle job title - use custom job title if "Other" is selected
            const finalJobTitle = dm.jobTitle === "Other" ? dm.customJobTitle || dm.jobTitle : dm.jobTitle;
            
            const invitation = await storage.createInvitation({
              salesRepId: userId,
              decisionMakerEmail: dm.email,
              decisionMakerName: fullName,
              decisionMakerJobTitle: finalJobTitle || '',
              status: "pending",
            });
            invitations.push(invitation);

            // Send invitation email
            try {
              const emailResult = await sendDecisionMakerInvitation(
                dm.email,
                fullName,
                `${salesRep.firstName} ${salesRep.lastName}`,
                invitation.id.toString(), // Using invitation ID as token
              );
              emailResults.push({
                email: dm.email,
                sent: true,
                messageId: emailResult.messageId,
              });
              console.log(`Invitation email sent to ${dm.email}`);
            } catch (emailError) {
              console.error(
                `Failed to send invitation email to ${dm.email}:`,
                emailError,
              );
              emailResults.push({
                email: dm.email,
                sent: false,
                error: emailError.message,
              });
            }
          }
        }
      }

      // Clear signup session now that signup is fully completed
      delete (req.session as any).signupUserId;

      res.json({
        success: true,
        message: "Registration completed successfully! Invitations sent.",
        invitations,
        emailResults,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Error saving invitations:", error);
      res.status(500).json({ message: "Failed to save invitations" });
    }
  });

  // Complete signup with package selection
  app.post("/api/sales-rep/package", async (req, res) => {
    try {
      console.log("🚀 BACKEND PACKAGE - Request received, parsing data...");
      const validatedData = salesRepPackageSchema.parse(req.body);
      console.log("🚀 BACKEND PACKAGE - Validated data:", validatedData);

      // Get user ID from session or request body (fallback for VPS deployment)
      const userId = (req.session as any)?.signupUserId || req.body.userId;
      console.log("� BACKEND PACKAGE - Session userId:", (req.session as any)?.signupUserId);
      console.log("� BACKEND PACKAGE - Body userId:", req.body.userId);
      console.log("� BACKEND PACKAGE - Request body keys:", Object.keys(req.body));
      console.log("🚀 BACKEND PACKAGE - Full request body:", JSON.stringify(req.body, null, 2));
      console.log("🚀 BACKEND PACKAGE - Final userId:", userId);
      
      if (!userId) {
        console.log("🚀 BACKEND PACKAGE - ERROR: No userId found!");
        return res
          .status(400)
          .json({ message: "Please complete previous steps first or provide user ID" });
      }

      // Fetch the subscription plan to get the enum value
      const subscriptionPlan = await storage.getSubscriptionPlan(
        validatedData.packageType,
      );
      if (!subscriptionPlan) {
        return res.status(400).json({ message: "Invalid package selection" });
      }

      // Map plan name to enum value - use the actual plan name as enum value
      let enumValue = subscriptionPlan.name.toLowerCase(); // Use the actual plan name

      // Validate against known enum values and provide fallback
      const validEnumValues = [
        "free",
        "basic",
        "pro",
        "premium",
        "enterprise",
        "pro-team",
      ];
      if (!validEnumValues.includes(enumValue)) {
        console.warn(
          `Unknown plan name: ${subscriptionPlan.name}, defaulting to free`,
        );
        enumValue = "free";
      }

      console.log(
        `Mapping plan "${subscriptionPlan.name}" to enum value "${enumValue}"`,
      );

      // Update user with package selection and activate account
      const updatedUser = await storage.updateUser(userId, {
        packageType: enumValue, // Use enum value for database
        isActive: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate email verification token and send welcome email
      const verificationToken = generateEmailVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with verification token and set emailVerified to false
      await storage.updateUser(userId, {
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: verificationExpiry,
      });

      try {
        await sendWelcomeEmail(
          updatedUser.email,
          `${updatedUser.firstName} ${updatedUser.lastName}`,
          updatedUser.role,
          verificationToken,
        );
        console.log(`Welcome email with verification sent to ${updatedUser.email}`);
      } catch (emailError) {
        console.error(
          `Failed to send welcome email to ${updatedUser.email}:`,
          emailError,
        );
        // Don't fail the signup if email fails
      }

      // Don't clear signup session yet - user still needs to complete professional info
      // Session will be cleared after professional info is completed

      res.json({
        success: true,
        message: "Package selection saved successfully",
        user: updatedUser,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to complete signup" });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Verification token is required" 
        });
      }

      // Find user with this verification token
      const users = await storage.getAllUsers();
      const user = users.find(u => 
        u.emailVerificationToken === token &&
        u.emailVerificationTokenExpiry &&
        new Date(u.emailVerificationTokenExpiry) > new Date()
      );

      if (!user) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired verification token" 
        });
      }

      // Update user to mark email as verified
      const updateData: any = {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      };

      // If this is a decision maker and they were unverified, update verification status
      if (user.role === "decision_maker" && user.verification_status === "unverified") {
        updateData.verification_status = "verified";
        updateData.verified_via = "domain";
        
        // Remove from manual verification queue if present
        try {
          const { connectToMongoDB, ManualVerification } = await import("./mongodb");
          await connectToMongoDB();
          await ManualVerification.deleteOne({ userId: user.id });
          console.log(`Removed user ${user.id} from manual verification queue after email verification`);
        } catch (error) {
          console.error("Error removing from manual verification queue:", error);
        }
      }

      await storage.updateUser(user.id, updateData);

      res.json({
        success: true,
        message: "Email verified successfully! You can now log in to your account.",
      });
    } catch (error: any) {
      console.error("Error verifying email:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to verify email" 
      });
    }
  });

  // ===== SUPER ADMIN ROUTES =====

  // Create Super Admin (development only)
  app.post("/api/create-super-admin", async (req, res) => {
    try {
      const email = "superadmin@naeborly.com";
      const password = "SuperAdmin123!";

      // Check if super admin already exists
      const existingAdmin = await storage.getUserByEmail(email);
      if (existingAdmin) {
        return res.json({ message: "Super admin already exists", email });
      }

      // Create super admin user
      const superAdmin = await storage.createUser({
        email,
        password, // Will be hashed in storage
        role: "super_admin",
        firstName: "Super",
        lastName: "Admin",
        isActive: true,
        packageType: "premium",
        standing: "excellent",
      });

      res.json({
        success: true,
        message: "Super admin created successfully",
        email,
        temporaryPassword: password,
      });
    } catch (error) {
      console.error("Error creating super admin:", error);
      res.status(500).json({ message: "Failed to create super admin" });
    }
  });

  // Super Admin Authentication
  app.post("/api/super-admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Super admin login attempt:", { email, password: "***" });

      const user = await storage.getUserByEmail(email);
      if (!user || user.role !== "super_admin") {
        console.log("Super admin not found or wrong role:", user?.role);
        return res
          .status(401)
          .json({ message: "Invalid super admin credentials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        console.log("Invalid super admin password");
        return res
          .status(401)
          .json({ message: "Invalid super admin credentials" });
      }

      // Set session with proper save
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.isAuthenticated = true;

      req.session.save((err) => {
        if (err) {
          console.error("Super admin session save error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        console.log(
          "Super admin login successful:",
          email,
          "Session ID:",
          req.sessionID,
        );
        res.json({
          success: true,
          message: "Super admin login successful",
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          sessionId: req.sessionID,
        });
      });
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // JWT Authentication middleware (already defined above)
  // const requireAuthentication = authenticateToken;

  // Super Admin middleware
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    // First authenticate the token
    authenticateToken(req, res, (err) => {
      if (err) return;

      const userRole = req.user?.role;

      if (userRole !== "super_admin") {
        return res.status(403).json({ message: "Super admin access required" });
      }

      next();
    });
  };

  // Enterprise Admin middleware
  const requireEnterpriseAdmin = async (req: any, res: any, next: any) => {
    // First authenticate the token
    authenticateToken(req, res, async (err) => {
      if (err) return;

      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || userRole !== "enterprise_admin") {
        return res
          .status(403)
          .json({ message: "Enterprise admin access required" });
      }

      // Verify domain access
      try {
        const user = await storage.getUser(userId);
        if (!user?.companyDomain || !user?.domainVerified) {
          return res.status(403).json({
            message: "Domain verification required for enterprise access",
          });
        }

        // Add user info to request for use in handlers
        req.enterpriseUser = user;
        next();
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Failed to verify enterprise access" });
      }
    });
  };

  // User Management Routes
  app.get("/api/super-admin/users", requireSuperAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100; // Show more users by default for super admin
      const role = req.query.role as string;
      const search = req.query.search as string;

      let filters: any = {};
      if (role) filters.role = role;
      if (search) {
        filters.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const result = await storage.getUsersWithPagination(page, limit, filters);
      res.json(result);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.put("/api/super-admin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.userId,
        action: "UPDATE_USER",
        entityType: "user",
        entityId: id,
        details: `Updated user: ${JSON.stringify(updates)}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete(
    "/api/super-admin/users/:id",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "DELETE_USER",
          entityType: "user",
          entityId: id,
          details: `Deleted user with ID: ${id}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        const deleted = await storage.deleteUser(id);
        if (!deleted) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    },
  );

  // Suspend user endpoint
  app.post(
    "/api/super-admin/users/:id/suspend",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { reason, suspendedBy } = req.body;

        // Update user status to suspended
        const updatedUser = await storage.updateUser(id, {
          standing: "suspended",
          isActive: false,
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedBy,
        });

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Create suspension record with proper schema fields
        const suspensionStartDate = new Date();
        const suspensionEndDate = new Date();
        suspensionEndDate.setDate(suspensionEndDate.getDate() + 30); // Default 30-day suspension

        await storage.createRepSuspension({
          repId: id,
          type: "30-day",
          startDate: suspensionStartDate,
          endDate: suspensionEndDate,
          isActive: true,
          suspensionReason: reason,
          triggeringFlags: [],
        });

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "SUSPEND_USER",
          entityType: "user",
          entityId: id,
          details: `Suspended user: ${reason}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({ success: true, message: "User suspended successfully" });
      } catch (error) {
        console.error("Error suspending user:", error);
        res.status(500).json({ message: "Failed to suspend user" });
      }
    },
  );

  // Reinstate user endpoint
  app.post(
    "/api/super-admin/users/:id/reinstate",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Update user status to active
        const updatedUser = await storage.updateUser(id, {
          standing: "good",
          isActive: true,
          suspensionReason: undefined,
          suspendedAt: undefined,
          suspendedBy: undefined,
          reinstatedAt: new Date(),
          reinstatedBy: req.user!.userId,
        });

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Deactivate any active suspension records
        try {
          await storage.liftRepSuspension(
            id,
            req.user!.userId,
            "Admin reinstatement",
          );
        } catch (suspensionError) {
          console.log(
            "No suspension record found to lift, continuing with reinstatement",
          );
        }

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "REINSTATE_USER",
          entityType: "user",
          entityId: id,
          details: `Reinstated user account`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({ success: true, message: "User reinstated successfully" });
      } catch (error) {
        console.error("Error reinstating user:", error);
        res.status(500).json({ message: "Failed to reinstate user" });
      }
    },
  );

  // Manage user credits endpoint
  app.post(
    "/api/super-admin/users/:id/credits",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { amount, notes } = req.body;

        const user = await storage.getUser(id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update user credits (this would depend on your credit system implementation)
        // For now, we'll just log the activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "MANAGE_CREDITS",
          entityType: "user",
          entityId: id,
          details: `Credit adjustment: ${amount} credits. Notes: ${notes || "No notes"}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({ success: true, message: "Credits updated successfully" });
      } catch (error) {
        console.error("Error managing credits:", error);
        res.status(500).json({ message: "Failed to manage credits" });
      }
    },
  );

  // Send message to user endpoint
  app.post(
    "/api/super-admin/users/:id/message",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { subject, message } = req.body;

        const user = await storage.getUser(id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Log the message activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "SEND_MESSAGE",
          entityType: "user",
          entityId: id,
          details: `Message sent - Subject: ${subject}. Message: ${message}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({ success: true, message: "Message sent successfully" });
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  // Subscription Plan Management Routes
  app.get(
    "/api/super-admin/subscription-plans",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const plans = await storage.getAllSubscriptionPlans();
        res.json(plans);
      } catch (error) {
        console.error("Error getting subscription plans:", error);
        res.status(500).json({ message: "Failed to get subscription plans" });
      }
    },
  );

  app.post(
    "/api/super-admin/subscription-plans",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const planData = req.body;

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "CREATE_SUBSCRIPTION_PLAN",
          entityType: "subscription_plan",
          details: `Created plan: ${planData.name}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        const plan = await storage.createSubscriptionPlan(planData);
        res.json({ success: true, plan });
      } catch (error) {
        console.error("Error creating subscription plan:", error);
        res.status(500).json({ message: "Failed to create subscription plan" });
      }
    },
  );

  app.put(
    "/api/super-admin/subscription-plans/:id",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "UPDATE_SUBSCRIPTION_PLAN",
          entityType: "subscription_plan",
          entityId: id,
          details: `Updated plan: ${JSON.stringify(updates)}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        const plan = await storage.updateSubscriptionPlan(id, updates);
        if (!plan) {
          return res
            .status(404)
            .json({ message: "Subscription plan not found" });
        }

        res.json({ success: true, plan });
      } catch (error) {
        console.error("Error updating subscription plan:", error);
        res.status(500).json({ message: "Failed to update subscription plan" });
      }
    },
  );

  app.delete(
    "/api/super-admin/subscription-plans/:id",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "DELETE_SUBSCRIPTION_PLAN",
          entityType: "subscription_plan",
          entityId: id,
          details: `Deleted plan with ID: ${id}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        const deleted = await storage.deleteSubscriptionPlan(id);
        if (!deleted) {
          return res
            .status(404)
            .json({ message: "Subscription plan not found" });
        }

        res.json({
          success: true,
          message: "Subscription plan deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting subscription plan:", error);
        res.status(500).json({ message: "Failed to delete subscription plan" });
      }
    },
  );

  // Analytics Routes
  app.get(
    "/api/super-admin/analytics/users",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const analytics = await storage.getUserAnalytics();
        res.json(analytics);
      } catch (error) {
        console.error("Error getting user analytics:", error);
        res.status(500).json({ message: "Failed to get user analytics" });
      }
    },
  );

  app.get(
    "/api/super-admin/analytics/calls",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const analytics = await storage.getCallAnalytics();
        res.json(analytics);
      } catch (error) {
        console.error("Error getting call analytics:", error);
        res.status(500).json({ message: "Failed to get call analytics" });
      }
    },
  );

  app.get(
    "/api/super-admin/analytics/subscriptions",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const analytics = await storage.getSubscriptionAnalytics();
        res.json(analytics);
      } catch (error) {
        console.error("Error getting subscription analytics:", error);
        res
          .status(500)
          .json({ message: "Failed to get subscription analytics" });
      }
    },
  );

  app.get(
    "/api/super-admin/activity-logs",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const filters = {
          search: req.query.search as string,
          action: req.query.action as string,
          entityType: req.query.entityType as string,
        };

        const result = await storage.getActivityLogs(page, limit, filters);
        res.json(result);
      } catch (error) {
        console.error("Error getting activity logs:", error);
        res.status(500).json({ message: "Failed to get activity logs" });
      }
    },
  );

  // Manual Verification Management Routes
  app.get(
    "/api/super-admin/manual-verification",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { connectToMongoDB, ManualVerification } = await import("./mongodb");
        await connectToMongoDB();

        const pendingVerifications = await ManualVerification.find({ status: "pending" })
          .populate('userId', 'firstName lastName email linkedinUrl companyDomain')
          .sort({ createdAt: -1 });

        res.json({
          success: true,
          verifications: pendingVerifications,
        });
      } catch (error) {
        console.error("Error getting manual verifications:", error);
        res.status(500).json({ message: "Failed to get manual verifications" });
      }
    }
  );

  app.post(
    "/api/super-admin/manual-verification/:id/approve",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { notes } = req.body;

        const { connectToMongoDB, ManualVerification } = await import("./mongodb");
        await connectToMongoDB();

        // Update manual verification record
        const verification = await ManualVerification.findByIdAndUpdate(
          id,
          {
            status: "approved",
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            reviewNotes: notes || "Approved by super admin"
          },
          { new: true }
        );

        if (!verification) {
          return res.status(404).json({ message: "Verification record not found" });
        }

        // Update user verification status
        await storage.updateUser(verification.userId.toString(), {
          verification_status: "verified",
          verified_via: "manual",
        });

        // Get user details for email
        const user = await storage.getUser(verification.userId.toString());
        
        // Send approval email notification
        if (user && user.email) {
          try {
            const { sendManualVerificationApprovalEmail } = await import("./email-service");
            await sendManualVerificationApprovalEmail(
              user.email,
              `${user.firstName} ${user.lastName}`,
              user.role as "sales_rep" | "decision_maker",
              notes
            );
            console.log(`✅ Approval email sent to: ${user.email}`);
          } catch (emailError) {
            console.error("❌ Failed to send approval email:", emailError);
            // Don't fail the entire operation if email fails
          }
        }

        // Log activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "APPROVE_MANUAL_VERIFICATION",
          entityType: "user",
          entityId: verification.userId.toString(),
          details: `Manually approved verification for user: ${verification.userEmail}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({
          success: true,
          message: "User verification approved successfully",
        });
      } catch (error) {
        console.error("Error approving manual verification:", error);
        res.status(500).json({ message: "Failed to approve verification" });
      }
    }
  );

  app.post(
    "/api/super-admin/manual-verification/:id/reject",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { notes } = req.body;

        const { connectToMongoDB, ManualVerification } = await import("./mongodb");
        await connectToMongoDB();

        // Update manual verification record
        const verification = await ManualVerification.findByIdAndUpdate(
          id,
          {
            status: "rejected",
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            reviewNotes: notes || "Rejected by super admin"
          },
          { new: true }
        );

        if (!verification) {
          return res.status(404).json({ message: "Verification record not found" });
        }

        // Optionally deactivate user account or send notification
        // Get user details for email
        const user = await storage.getUser(verification.userId.toString());
        
        // Send rejection email notification
        if (user && user.email) {
          try {
            const { sendManualVerificationRejectionEmail } = await import("./email-service");
            await sendManualVerificationRejectionEmail(
              user.email,
              `${user.firstName} ${user.lastName}`,
              user.role as "sales_rep" | "decision_maker",
              notes
            );
            console.log(`✅ Rejection email sent to: ${user.email}`);
          } catch (emailError) {
            console.error("❌ Failed to send rejection email:", emailError);
            // Don't fail the entire operation if email fails
          }
        }
        
        // Log the rejection activity
        await storage.createActivityLog({
          userId: req.user!.userId,
          action: "REJECT_MANUAL_VERIFICATION",
          entityType: "user",
          entityId: verification.userId.toString(),
          details: `Rejected manual verification for user: ${verification.userEmail}. Reason: ${notes}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({
          success: true,
          message: "User verification rejected",
        });
      } catch (error) {
        console.error("Error rejecting manual verification:", error);
        res.status(500).json({ message: "Failed to reject verification" });
      }
    }
  );

  // Platform Settings Routes
  app.get(
    "/api/super-admin/platform-settings",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const settings = await storage.getPlatformSettings();
        res.json(settings);
      } catch (error) {
        console.error("Error getting platform settings:", error);
        res.status(500).json({ message: "Failed to get platform settings" });
      }
    },
  );

  app.put(
    "/api/super-admin/platform-settings",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const updates = req.body;
        const userId = req.user!.userId;

        const updatedSettings = await storage.updatePlatformSettings(
          updates,
          userId,
        );

        // Log activity
        await storage.createActivityLog({
          userId: userId,
          action: "UPDATE_PLATFORM_SETTINGS",
          entityType: "platform_settings",
          details: `Updated platform settings: ${Object.keys(updates).join(", ")}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json(updatedSettings);
      } catch (error) {
        console.error("Error updating platform settings:", error);
        res.status(500).json({ message: "Failed to update platform settings" });
      }
    },
  );

  // ===== GOOGLE CALENDAR INTEGRATION ROUTES =====

  // Initiate Google Calendar OAuth (direct redirect) - accepts userId as query param
  app.get("/api/auth/google", async (req, res) => {
    const { userId } = req.query;

    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    // Check if Google credentials are available
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        message:
          "Google Calendar integration not configured. Please contact administrator.",
      });
    }

    try {
      const authUrl = getAuthUrl(userId as string);
      console.log("Redirecting to Google OAuth for user:", userId);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  // Initiate Google Calendar OAuth (API endpoint)
  app.get("/api/auth/google/connect", authenticateToken, async (req, res) => {
    try {
      const authUrl = getAuthUrl(req.user!.userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  // Google Calendar OAuth callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state: userId, error } = req.query;

      console.log("Google Calendar callback received:", {
        hasCode: !!code,
        hasUserId: !!userId,
        hasError: !!error,
        fullUrl: req.url,
        clientId: process.env.GOOGLE_CLIENT_ID
          ? process.env.GOOGLE_CLIENT_ID.substring(0, 12) + "..."
          : "Missing",
        redirectUri: `${req.protocol}://${req.get("host")}/api/auth/google/callback`,
      });

      // Check if Google returned an error
      if (error) {
        console.error("Google OAuth error:", error);
        return res.redirect(
          `/?calendar=error&reason=google_oauth_error&details=${error}`,
        );
      }

      if (!code || !userId) {
        console.error("Missing authorization code or user ID:", {
          code: !!code,
          userId: !!userId,
        });
        return res.redirect("/?calendar=error&reason=missing_params");
      }

      console.log("Processing Google Calendar callback for user:", userId);

      // Check if we have valid credentials
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("Missing Google credentials");
        return res.redirect("/?calendar=error&reason=missing_credentials");
      }

      // Exchange code for tokens
      console.log("Attempting to exchange code for tokens...");
      console.log("OAuth2 Client config:", {
        clientId: oauth2Client._clientId,
        redirectUri: oauth2Client.redirectUri,
        hasClientSecret: !!oauth2Client._clientSecret,
      });

      const { tokens } = await oauth2Client.getToken(code as string);
      console.log("Received Google Calendar tokens:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });

      // Store tokens in user record
      await storage.updateUser(userId as string, {
        googleCalendarTokens: tokens,
        calendarIntegrationEnabled: true,
      });

      console.log(
        "Google Calendar tokens stored successfully for user:",
        userId,
      );

      // Check if this is a DM connecting calendar for first time and trigger credit allocation
      const user = await storage.getUserById(userId as string);
      if (user && user.role === "decision_maker" && user.invitedBy) {
        console.log(
          `DM ${userId} connected calendar - checking credit allocation for sales rep ${user.invitedBy}`,
        );

        try {
          // Force refresh the inviting sales rep's call limits since DM now has calendar connected
          const currentMonth = new Date().toISOString().slice(0, 7);
          const repCallLimit = await storage.getMonthlyCallLimit(
            user.invitedBy,
            "sales_rep",
            currentMonth,
          );

          console.log(
            `✅ Sales rep ${user.invitedBy} call limits refreshed after DM calendar connection`,
          );
        } catch (error) {
          console.error("❌ Failed to refresh sales rep call limits:", error);
        }
      }

      res.redirect("/?calendar=connected");
    } catch (error) {
      console.error("Error in Google Calendar callback:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response?.data,
      });
      res.redirect("/?calendar=error&reason=token_exchange_failed");
    }
  });

  // Disconnect calendar integration
  app.post("/api/calendar/disconnect", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.calendarIntegrationEnabled) {
        return res.json({
          success: true,
          message: "Calendar is already disconnected",
          connected: false,
        });
      }

      console.log(`User ${user.email} disconnecting calendar`);

      // Handle calendar disconnection flagging for DMs with inviting reps
      if (user.role === "decision_maker" && user.invitedBy) {
        console.log(
          `DM ${user.email} disconnecting calendar, flagging referring sales rep ${user.invitedBy}`,
        );

        try {
          await handleCalendarDisconnectionFlag(user.invitedBy, userId, user);
          console.log(
            `✅ Sales rep ${user.invitedBy} flagged for DM calendar disconnection`,
          );
        } catch (flagError) {
          console.error(
            "Error handling calendar disconnection flag:",
            flagError,
          );
          // Continue with disconnection even if flagging fails
        }
      }

      // Disconnect calendar
      const updatedUser = await storage.updateUser(userId, {
        calendarIntegrationEnabled: false,
        googleCalendarTokens: null,
      });

      console.log(`Calendar disconnected successfully for user: ${user.email}`);

      res.json({
        success: true,
        message: "Calendar disconnected successfully",
        connected: false,
      });
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });

  // Get calendar integration status
  app.get("/api/calendar/status", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Calendar status check for user:", user.email);
      console.log(
        "Calendar integration enabled:",
        user.calendarIntegrationEnabled,
      );
      console.log("Has Google Calendar tokens:", !!user.googleCalendarTokens);

      res.json({
        connected: !!user.calendarIntegrationEnabled,
        email: user.email,
        hasTokens: !!user.googleCalendarTokens,
        tokenInfo: user.googleCalendarTokens
          ? {
              hasAccessToken: !!user.googleCalendarTokens.access_token,
              hasRefreshToken: !!user.googleCalendarTokens.refresh_token,
              expiryDate: user.googleCalendarTokens.expiry_date,
            }
          : null,
      });
    } catch (error) {
      console.error("Error checking calendar status:", error);
      res.status(500).json({ message: "Failed to check calendar status" });
    }
  });

  // Upcoming meetings endpoint for decision makers
  app.get(
    "/api/calendar/upcoming-meetings",
    authenticateToken,
    async (req, res) => {
      try {
        const user = await storage.getUserById(req.user!.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (!user.calendarIntegrationEnabled) {
          return res.json([]);
        }

        // Fetch real Google Calendar events
        if (!user.googleCalendarTokens) {
          return res.json([]);
        }

        try {
          // Get calendar events using the Google Calendar API
          const events = await getCalendarEvents(req.user!.userId, storage);

          // Filter events to show only meetings with sales reps
          const salesRepMeetings = events.filter((event) => {
            // Skip events without attendees
            if (!event.attendees || event.attendees.length < 2) {
              return false;
            }

            // Skip events organized by the current user
            if (event.organizer?.email === user.email) {
              return false;
            }

            // Check if any attendees are sales reps or from sales companies
            const hasSalesRepAttendee = event.attendees?.some((attendee) => {
              const email = attendee.email?.toLowerCase() || "";
              const displayName = attendee.displayName?.toLowerCase() || "";

              // Skip the current user
              if (email === user.email.toLowerCase()) {
                return false;
              }

              // Enhanced sales rep detection criteria
              return (
                email.includes("sales") ||
                email.includes("rep") ||
                displayName.includes("sales") ||
                displayName.includes("rep") ||
                email.includes("techize.com") || // Your sales domain
                email.includes("business") ||
                email.includes("account") ||
                displayName.includes("business") ||
                displayName.includes("account")
              );
            });

            // Check if the event title/summary indicates a sales meeting
            const isSalesEvent =
              event.summary?.toLowerCase().includes("sales") ||
              event.summary?.toLowerCase().includes("demo") ||
              event.summary?.toLowerCase().includes("presentation") ||
              event.summary?.toLowerCase().includes("pitch") ||
              event.summary?.toLowerCase().includes("meeting") ||
              event.summary?.toLowerCase().includes("call") ||
              event.summary?.toLowerCase().includes("discussion");

            // Include events that have sales rep attendees or are sales-related events
            return hasSalesRepAttendee || isSalesEvent;
          });

          res.json(salesRepMeetings);
        } catch (error) {
          console.error("Error fetching calendar events:", error);
          // Return empty array if calendar fetch fails
          res.json([]);
        }
      } catch (error) {
        console.error("Error fetching upcoming meetings:", error);
        res.status(500).json({ message: "Failed to fetch upcoming meetings" });
      }
    },
  );

  // Submit post-call evaluation
  app.post("/api/decision-maker/call-evaluation", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    try {
      const evaluationData = {
        ...req.body,
        decisionMakerId: req.session.userId,
        submittedAt: new Date(),
      };

      // Create feedback record
      const feedback = await storage.createFeedback(evaluationData);

      // Update call record if it exists
      if (evaluationData.callId) {
        await storage.updateCall(evaluationData.callId, {
          rating: evaluationData.rating,
          feedback: evaluationData.comments,
          status: "completed",
          completedAt: new Date(),
        });
      }

      // Check for red flags and handle rep suspension
      const isRedFlag = ["poor", "rude"].includes(evaluationData.experience);
      if (isRedFlag && evaluationData.salesRepId) {
        await handleRedFlagSuspension(evaluationData.salesRepId, feedback._id);
      }

      // Increment flag count and send warning email for rating of 1
      if (evaluationData.rating === 1 && evaluationData.salesRepId) {
        try {
          console.log(
            `Rating is 1, incrementing flag for sales rep: ${evaluationData.salesRepId}`,
          );
          await storage.incrementUserFlag(
            evaluationData.salesRepId,
            `Poor call rating (${evaluationData.rating}/5) - ${evaluationData.experience}`,
            req.session.userId,
          );
          console.log(
            `Flag incremented and warning email sent for sales rep: ${evaluationData.salesRepId}`,
          );
        } catch (flagError) {
          console.error("Error incrementing flag count:", flagError);
          // Don't fail the evaluation submission if flagging fails
        }
      }

      // If positive feedback and rep was suspended, check for suspension removal
      if (!isRedFlag && evaluationData.salesRepId) {
        await handleSuspensionRemoval(evaluationData.salesRepId);
      }

      // Log activity
      await storage.createActivityLog({
        action: "SUBMIT_CALL_EVALUATION",
        performedBy: req.session.userId,
        details: `Submitted evaluation for call with ${evaluationData.salesRepName}`,
        metadata: {
          callId: evaluationData.callId,
          rating: evaluationData.rating,
          experience: evaluationData.experience,
          isRedFlag,
        },
      });

      res.json({
        success: true,
        message: "Evaluation submitted successfully",
        feedbackId: feedback.id,
      });
    } catch (error) {
      console.error("Error submitting call evaluation:", error);
      res.status(500).json({ message: "Failed to submit evaluation" });
    }
  });

  // Check for suspicious sales rep activity (for DM dashboard)
  app.get(
    "/api/decision-maker/suspicious-activity",
    authenticateToken,
    async (req, res) => {
      try {
        // Get current user to find their company domain
        const currentUser = await storage.getUserById(req.user!.userId);
        if (!currentUser || !currentUser.companyDomain) {
          return res.json({
            hasSuspiciousActivity: false,
            suspendedRepsCount: 0,
          });
        }

        // Find all sales reps that have interacted with this DM's company
        const companyFeedback = await storage.getFeedbackByCompany(
          currentUser.companyDomain,
        );
        const repIds = [
          ...new Set(
            companyFeedback
              .map((f) => f.salesRepId?.toString())
              .filter(Boolean),
          ),
        ];

        // Check for suspended reps
        let suspendedRepsCount = 0;
        const suspendedReps = [];

        for (const repId of repIds) {
          const suspensionStatus =
            await storage.checkRepSuspensionStatus(repId);
          if (suspensionStatus.isSuspended) {
            suspendedRepsCount++;
            const rep = await storage.getUserById(repId);
            if (rep) {
              suspendedReps.push({
                repId,
                repName: `${rep.firstName} ${rep.lastName}`,
                repEmail: rep.email,
                suspension: suspensionStatus.suspension,
              });
            }
          }
        }

        res.json({
          hasSuspiciousActivity: suspendedRepsCount > 0,
          suspendedRepsCount,
          suspendedReps,
          companyDomain: currentUser.companyDomain,
        });
      } catch (error) {
        console.error("Error checking suspicious activity:", error);
        res
          .status(500)
          .json({ message: "Failed to check suspicious activity" });
      }
    },
  );

  // Helper function to handle calendar connection credit award
  async function handleCalendarConnectionCredit(
    salesRepId: string,
    dmId: string,
    dmUser: any,
  ) {
    try {
      console.log(
        `Handling referral credit award for sales rep ${salesRepId} due to DM ${dmId} connecting calendar`,
      );

      // Award credit to the referring sales rep for successful DM onboarding with calendar integration
      const creditResult = await storage.awardCreditToDMCompletion(
        salesRepId,
        dmId,
      );

      console.log(`Calendar connection credit result:`, creditResult);

      if (creditResult.success) {
        // Log successful credit award activity
        await storage.createActivityLog({
          action: "REFERRAL_CREDIT_AWARDED",
          performedBy: dmId,
          userId: salesRepId,
          entityType: "user",
          entityId: salesRepId,
          details: `Referral credit awarded to sales rep ${await storage.getUser(salesRepId).then((u) => u?.email)} for DM ${dmUser.email} completing onboarding with calendar integration`,
          metadata: {
            salesRepId: salesRepId,
            dmId: dmId,
            dmEmail: dmUser.email,
            creditAmount: 1,
            source: "dm_onboarding_with_calendar",
          },
        });

        console.log(
          `Referral credit successfully awarded to sales rep ${salesRepId}`,
        );
      } else {
        console.log(`Referral credit not awarded: ${creditResult.message}`);
      }
    } catch (error) {
      console.error("Error handling calendar connection credit:", error);
      throw error;
    }
  }

  // Helper function to handle calendar disconnection flagging
  async function handleCalendarDisconnectionFlag(
    salesRepId: string,
    dmId: string,
    dmUser: any,
  ) {
    try {
      console.log(
        `Handling calendar disconnection flag for sales rep ${salesRepId} due to DM ${dmId} disconnecting`,
      );

      // Check if this sales rep has already been flagged for this DM's calendar disconnection
      const existingFlags = await storage.getUserFlags(salesRepId);
      const alreadyFlagged = existingFlags.some((flag) =>
        flag.description?.includes(
          `Calendar disconnected by DM ${dmUser.email}`,
        ),
      );

      if (alreadyFlagged) {
        console.log(
          "Sales rep already flagged for this DM calendar disconnection, skipping",
        );
        return;
      }

      // Create flag entry
      const flagReason = `Calendar disconnected by DM ${dmUser.email} (${dmUser.firstName} ${dmUser.lastName}) from ${dmUser.company || "Unknown Company"}`;

      console.log(`Creating calendar disconnection flag: ${flagReason}`);
      await storage.incrementUserFlag(salesRepId, flagReason, dmId);

      // Get updated sales rep info
      const salesRep = await storage.getUser(salesRepId);
      if (!salesRep) {
        console.error(`Sales rep ${salesRepId} not found after flagging`);
        return;
      }

      console.log(
        `Sales rep ${salesRep.email} now has ${salesRep.flagsReceived || 0} flags`,
      );

      // Send warning email if not already suspended
      if (!salesRep.suspension?.isActive) {
        try {
          const { sendSalesRepWarningEmail } = await import("./email-service");
          await sendSalesRepWarningEmail(
            salesRep.email,
            salesRep.firstName,
            dmUser.firstName,
            `${dmUser.firstName} ${dmUser.lastName}`,
            dmUser.jobTitle || "Decision Maker",
            dmUser.company || "Unknown Company",
            "Calendar Integration Disconnected",
            new Date().toLocaleDateString(),
            salesRep.flagsReceived || 1,
          );

          console.log(
            `Warning email sent to sales rep ${salesRep.email} for calendar disconnection flag`,
          );
        } catch (emailError) {
          console.error(
            "Failed to send calendar disconnection warning email:",
            emailError,
          );
        }
      }

      // Log activity with required fields
      await storage.createActivityLog({
        action: "CALENDAR_DISCONNECTION_FLAG",
        performedBy: dmId,
        userId: salesRepId, // Required field
        entityType: "user", // Required field
        entityId: salesRepId, // Required field
        details: `DM ${dmUser.email} disconnected calendar, flagging referring sales rep ${salesRep.email}`,
        metadata: {
          salesRepId: salesRepId,
          dmId: dmId,
          dmEmail: dmUser.email,
          repFlagCount: salesRep.flagsReceived || 1,
          flagReason: flagReason,
        },
      });
    } catch (error) {
      console.error("Error handling calendar disconnection flag:", error);
      throw error;
    }
  }

  // Helper function to handle red flag suspension logic
  async function handleRedFlagSuspension(
    salesRepId: string,
    feedbackId: string,
  ) {
    try {
      // Get recent feedback for this rep
      const recentFeedback = await storage.getRecentFeedbackForRep(
        salesRepId,
        10,
      );

      // Count red flags
      const redFlags = recentFeedback.filter((f) =>
        ["poor", "rude"].includes(f.experience),
      );

      // Check for 90-day suspension (3 consecutive red flags)
      let consecutiveRedFlags = 0;
      for (const feedback of recentFeedback) {
        if (["poor", "rude"].includes(feedback.experience)) {
          consecutiveRedFlags++;
        } else {
          break; // Break streak on non-red flag
        }
      }

      // Check current suspension status
      const suspensionStatus =
        await storage.checkRepSuspensionStatus(salesRepId);
      if (suspensionStatus.isSuspended) {
        return; // Already suspended
      }

      let suspensionType = null;
      let suspensionReason = "";

      if (consecutiveRedFlags >= 3) {
        // 90-day suspension for consecutive red flags
        suspensionType = "90-day";
        suspensionReason = `3 consecutive red flags received`;
      } else if (redFlags.length >= 3) {
        // Check if red flags are from different DMs
        const uniqueDMs = new Set(
          redFlags.map((f) => f.decisionMakerId?.toString()),
        );
        if (uniqueDMs.size >= 3) {
          suspensionType = "30-day";
          suspensionReason = `3 red flags from different decision makers`;
        }
      }

      if (suspensionType) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(
          startDate.getDate() + (suspensionType === "90-day" ? 90 : 30),
        );

        const suspensionData = {
          repId: salesRepId,
          type: suspensionType,
          startDate,
          endDate,
          isActive: true,
          suspensionReason,
          triggeringFlags: redFlags.slice(0, 3).map((f) => f._id),
        };

        await storage.createRepSuspension(suspensionData);

        // Log suspension activity
        await storage.createActivityLog({
          action: "REP_SUSPENDED",
          performedBy: "system",
          details: `Sales rep suspended for ${suspensionType}: ${suspensionReason}`,
          metadata: {
            repId: salesRepId,
            suspensionType,
            redFlagCount: redFlags.length,
            consecutiveCount: consecutiveRedFlags,
          },
        });
      }
    } catch (error) {
      console.error("Error handling red flag suspension:", error);
    }
  }

  // Helper function to handle suspension removal
  async function handleSuspensionRemoval(salesRepId: string) {
    try {
      const suspensionStatus =
        await storage.checkRepSuspensionStatus(salesRepId);
      if (suspensionStatus.isSuspended && suspensionStatus.suspension) {
        // Lift the suspension
        await storage.updateRepSuspension(suspensionStatus.suspension._id, {
          isActive: false,
        });

        // Log suspension removal
        await storage.createActivityLog({
          action: "REP_SUSPENSION_LIFTED",
          performedBy: "system",
          details: `Sales rep suspension lifted due to successful call completion without red flag`,
          metadata: {
            repId: salesRepId,
            originalSuspensionType: suspensionStatus.suspension.type,
          },
        });
      }
    } catch (error) {
      console.error("Error handling suspension removal:", error);
    }
  }

  // Get rep suspension status
  app.get(
    "/api/sales-rep/suspension-status",
    authenticateToken,
    async (req, res) => {
      try {
        const suspensionStatus = await storage.checkRepSuspensionStatus(
          req.user!.userId,
        );
        res.json(suspensionStatus);
      } catch (error) {
        console.error("Error checking suspension status:", error);
        res.status(500).json({ message: "Failed to check suspension status" });
      }
    },
  );

  // Demo calendar connection endpoint
  app.patch("/api/users/:userId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const { userId } = req.params;
    const { calendarIntegrationEnabled } = req.body;

    // Verify user can only update their own record
    if (req.session.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      // Get current user state before update
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if this is a calendar disconnection
      const wasConnected = currentUser.calendarIntegrationEnabled;
      const willBeConnected = !!calendarIntegrationEnabled;
      const isDisconnecting = wasConnected && !willBeConnected;

      console.log(`Calendar status change for user ${userId}:`, {
        wasConnected,
        willBeConnected,
        isDisconnecting,
        userRole: currentUser.role,
        invitedBy: currentUser.invitedBy,
      });

      // Handle calendar integration logic
      if (currentUser.role === "decision_maker" && currentUser.invitedBy) {
        if (isDisconnecting) {
          // DM disconnecting calendar - flag the referring sales rep
          console.log(
            `DM ${currentUser.email} disconnecting calendar, flagging referring sales rep ${currentUser.invitedBy}`,
          );

          try {
            await handleCalendarDisconnectionFlag(
              currentUser.invitedBy,
              userId,
              currentUser,
            );
          } catch (flagError) {
            console.error(
              "Error handling calendar disconnection flag:",
              flagError,
            );
            // Continue with the update even if flagging fails
          }
        } else if (!wasConnected && willBeConnected) {
          // DM connecting calendar for the first time - award referral credit
          console.log(
            `DM ${currentUser.email} connecting calendar for first time, awarding credit to referring sales rep ${currentUser.invitedBy}`,
          );

          try {
            await handleCalendarConnectionCredit(
              currentUser.invitedBy,
              userId,
              currentUser,
            );
          } catch (creditError) {
            console.error(
              "Error handling calendar connection credit:",
              creditError,
            );
            // Continue with the update even if credit awarding fails
          }
        }
      }

      const updatedUser = await storage.updateUser(userId, {
        calendarIntegrationEnabled: willBeConnected,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        calendarIntegrationEnabled: updatedUser.calendarIntegrationEnabled,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Get available time slots for a decision maker
  app.get(
    "/api/calendar/availability/:decisionMakerId",
    authenticateToken,
    async (req, res) => {
      try {
        const { decisionMakerId } = req.params;
        const { startDate, endDate, duration = 15 } = req.query;
        const salesRepId = req.user!.userId;

        console.log(`Checking availability for DM ${decisionMakerId} by sales rep ${salesRepId}`);

        // Get decision maker's calendar tokens
        const decisionMaker = await storage.getUser(decisionMakerId);
        
        // Set credentials for the decision maker if available
        if (decisionMaker?.googleCalendarTokens?.access_token) {
          setCredentials(decisionMaker.googleCalendarTokens);
        } else {
          console.log(`DM ${decisionMakerId} calendar not connected, checking database calls only`);
        }

        // Get current sales rep ID for comprehensive conflict checking
        const currentSalesRepId = salesRepId;
        
        console.log(`\n🔍 COMPREHENSIVE AVAILABILITY CHECK REQUEST:`);
        console.log(`- DM ID: ${decisionMakerId}`);
        console.log(`- Sales Rep ID: ${currentSalesRepId}`);
        console.log(`- Date Range: ${startDate} to ${endDate}`);
        console.log(`- Duration: ${duration} minutes`);
        
        // Get available slots for the decision maker with comprehensive checking
        let availableSlots = [];
        try {
          availableSlots = await getAvailableSlots(
            decisionMakerId,
            storage,
            startDate as string,
            endDate as string,
            parseInt(duration as string),
            currentSalesRepId, // Pass sales rep ID for conflict checking
          );
        } catch (error) {
          console.error(`⚠ Comprehensive availability check failed for DM ${decisionMakerId}:`, error);
          
          // Enhanced fallback: Check all three conditions manually
          console.log('🔄 Falling back to manual comprehensive checking...');
          
          // Get DM database calls
          const dmCalls = await storage.getCallsByDateRange(
            decisionMakerId,
            startDate as string,
            endDate as string
          );
          
          // Get sales rep database calls if available
          let salesRepCalls = [];
          if (currentSalesRepId) {
            try {
              salesRepCalls = await storage.getCallsBySalesRepDateRange(
                currentSalesRepId,
                startDate as string,
                endDate as string
              );
            } catch (repError) {
              console.warn('Sales rep calls check failed:', repError);
            }
          }
          
          console.log(`Fallback conflict check: DM has ${dmCalls.length} calls, Sales Rep has ${salesRepCalls.length} calls`);
          
          // Generate all possible time slots and mark conflicts from all sources
          const slotDuration = parseInt(duration as string) * 60 * 1000;
          const start = new Date(startDate as string);
          const end = new Date(endDate as string);
          
          for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
            if (day.getDay() === 0 || day.getDay() === 6) continue;
            
            const dayStart = new Date(day);
            dayStart.setHours(8, 0, 0, 0);
            
            const dayEnd = new Date(day);
            dayEnd.setHours(18, 0, 0, 0);
            
            for (let slotStart = new Date(dayStart); slotStart < dayEnd; slotStart.setTime(slotStart.getTime() + slotDuration)) {
              const slotEnd = new Date(slotStart.getTime() + slotDuration);
              
              // Check conflicts with DM calls
              const dmConflicts = dmCalls.filter(call => {
                const callStart = new Date(call.scheduledAt);
                const callEnd = new Date(call.endTime);
                return (slotStart >= callStart && slotStart < callEnd) ||
                       (slotEnd > callStart && slotEnd <= callEnd) ||
                       (slotStart <= callStart && slotEnd >= callEnd);
              });
              
              // Check conflicts with Sales Rep calls
              const repConflicts = salesRepCalls.filter(call => {
                const callStart = new Date(call.scheduledAt);
                const callEnd = new Date(call.endTime);
                return (slotStart >= callStart && slotStart < callEnd) ||
                       (slotEnd > callStart && slotEnd <= callEnd) ||
                       (slotStart <= callStart && slotEnd >= callEnd);
              });
              
              const allConflicts = [...dmConflicts, ...repConflicts];
              const hasConflict = allConflicts.length > 0;
              
              if (slotEnd <= dayEnd) {
                const slot = {
                  start: new Date(slotStart),
                  end: new Date(slotEnd),
                  duration: parseInt(duration as string),
                  isAvailable: !hasConflict,
                  conflicts: allConflicts.map(call => ({
                    source: dmConflicts.includes(call) ? 'dm_database' : 'salesrep_database',
                    callId: call._id,
                    start: new Date(call.scheduledAt),
                    end: new Date(call.endTime),
                    participantId: dmConflicts.includes(call) ? call.decisionMakerId : call.salesRepId
                  }))
                };
                
                availableSlots.push(slot);
                
                if (hasConflict) {
                  console.log(`❌ Fallback conflict at ${slotStart.toISOString()}: ${dmConflicts.length} DM + ${repConflicts.length} Rep conflicts`);
                }
              }
            }
          }
          
          console.log(`✅ Fallback generated ${availableSlots.length} slots, ${availableSlots.filter(s => !s.isAvailable).length} unavailable due to conflicts`);
        }

        res.json({ availableSlots });
      } catch (error) {
        console.error("Error getting availability:", error);
        res.status(500).json({ message: "Failed to get availability" });
      }
    },
  );

  // Get comprehensive availability checking both sales rep and DM
  app.get(
    "/api/calendar/check-availability",
    authenticateToken,
    async (req, res) => {
      try {
        const { decisionMakerId, startTime, endTime } = req.query;
        const salesRepId = req.user!.userId;

        if (!decisionMakerId || !startTime || !endTime) {
          return res.status(400).json({ message: "Missing required parameters" });
        }

        const start = new Date(startTime as string);
        const end = new Date(endTime as string);

        // Check sales rep availability
        const salesRep = await storage.getUser(salesRepId);
        const salesRepCalls = await storage.getCallsByDateRange(
          salesRepId,
          start,
          end
        );

        // Check decision maker availability
        const decisionMaker = await storage.getUser(decisionMakerId as string);
        const dmCalls = await storage.getCallsByDateRange(
          decisionMakerId as string,
          start,
          end
        );

        const salesRepConflict = salesRepCalls.some(call => {
          const callStart = new Date(call.scheduledAt);
          const callEnd = new Date(call.endTime);
          return (start >= callStart && start < callEnd) ||
                 (end > callStart && end <= callEnd) ||
                 (start <= callStart && end >= callEnd);
        });

        const dmConflict = dmCalls.some(call => {
          const callStart = new Date(call.scheduledAt);
          const callEnd = new Date(call.endTime);
          return (start >= callStart && start < callEnd) ||
                 (end > callStart && end <= callEnd) ||
                 (start <= callStart && end >= callEnd);
        });

        res.json({
          available: !salesRepConflict && !dmConflict,
          salesRepConflict,
          dmConflict,
          salesRepCalls: salesRepCalls.length,
          dmCalls: dmCalls.length,
          conflicts: {
            salesRep: salesRepConflict ? salesRepCalls.filter(call => {
              const callStart = new Date(call.scheduledAt);
              const callEnd = new Date(call.endTime);
              return (start >= callStart && start < callEnd) ||
                     (end > callStart && end <= callEnd) ||
                     (start <= callStart && end >= callEnd);
            }) : [],
            dm: dmConflict ? dmCalls.filter(call => {
              const callStart = new Date(call.scheduledAt);
              const callEnd = new Date(call.endTime);
              return (start >= callStart && start < callEnd) ||
                     (end > callStart && end <= callEnd) ||
                     (start <= callStart && end >= callEnd);
            }) : []
          }
        });
      } catch (error) {
        console.error("Error checking availability:", error);
        res.status(500).json({ message: "Failed to check availability" });
      }
    },
  );

  // Schedule a meeting
  app.post("/api/calendar/schedule", authenticateToken, async (req, res) => {
    try {
      const salesRepId = req.user!.userId;
      const {
        decisionMakerId,
        startTime,
        endTime,
        title,
        description,
        timeZone = "UTC",
      } = req.body;

      // Get both users
      const salesRep = await storage.getUser(salesRepId);
      const decisionMaker = await storage.getUser(decisionMakerId);

      if (!salesRep || !decisionMaker) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!decisionMaker.googleCalendarTokens?.access_token) {
        return res
          .status(400)
          .json({ message: "Decision maker calendar not connected" });
      }

      // Set credentials for the decision maker (event will be created in their calendar)
      setCredentials(decisionMaker.googleCalendarTokens);

      // Create calendar event
      const eventData = {
        summary:
          title || `Meeting with ${salesRep.firstName} ${salesRep.lastName}`,
        description:
          description || `Sales meeting scheduled through Naeberly platform.`,
        start: { dateTime: startTime, timeZone },
        end: { dateTime: endTime, timeZone },
        attendees: [
          {
            email: salesRep.email,
            displayName: `${salesRep.firstName} ${salesRep.lastName}`,
          },
          {
            email: decisionMaker.email,
            displayName: `${decisionMaker.firstName} ${decisionMaker.lastName}`,
          },
        ],
      };

      const calendarEvent = await createCalendarEvent(eventData);

      // Store call in database
      const callData = {
        salesRepId,
        decisionMakerId,
        scheduledAt: new Date(startTime),
        endTime: new Date(endTime),
        googleEventId: calendarEvent.id,
        meetingLink: calendarEvent.hangoutLink,
        timeZone,
        status: "scheduled",
      };

      const call = await storage.createCall(callData);

      res.json({
        success: true,
        call,
        calendarEvent: {
          id: calendarEvent.id,
          link: calendarEvent.htmlLink,
          meetingLink: calendarEvent.hangoutLink,
        },
      });
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      res.status(500).json({ message: "Failed to schedule meeting" });
    }
  });

  // ===== TEAM MANAGEMENT ROUTES =====

  // Get company users (sales reps)
  app.get("/api/company-users", requireEnterpriseAdmin, async (req, res) => {
    try {
      const enterpriseUser = (req as any).enterpriseUser;
      const companyDomain = enterpriseUser.companyDomain;

      // Get sales reps from the company domain
      const salesReps = await storage.getUsersByCompanyDomain(companyDomain);
      const filteredReps = salesReps.filter(
        (user) => user.role === "sales_rep",
      );

      // Format response with team-specific data
      const teamMembers = filteredReps.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        jobTitle: user.jobTitle,
        department: user.department,
        status: user.isActive ? "active" : "suspended",
        permissions: user.permissions || [],
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      }));

      res.json(teamMembers);
    } catch (error) {
      console.error("Error getting company users:", error);
      res.status(500).json({ message: "Failed to get company users" });
    }
  });

  // Invite new sales rep
  app.post(
    "/api/company-users/invite",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;
        const {
          email,
          firstName,
          lastName,
          jobTitle,
          department,
          permissions,
        } = req.body;

        // Verify email domain matches company domain
        const emailDomain = email.split("@")[1];
        if (emailDomain !== companyDomain) {
          return res.status(400).json({
            message: `Email domain must match company domain: ${companyDomain}`,
          });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res
            .status(400)
            .json({ message: "User with this email already exists" });
        }

        // Create invitation/user record
        const userData = {
          email,
          firstName,
          lastName,
          role: "sales_rep",
          jobTitle: jobTitle || "",
          department: department || "",
          companyDomain,
          domainVerified: true,
          isActive: false, // Will be activated when they accept invitation
          packageType: "enterprise",
          standing: "good",
          permissions: permissions || [],
          password: "TempPass123!", // Temporary password
          requirePasswordChange: true,
          invitationStatus: "invited",
          invitedBy: enterpriseUser.id,
          invitedAt: new Date(),
        };

        const newUser = await storage.createUser(userData);

        // Log activity
        await storage.createActivityLog({
          action: "INVITE_SALES_REP",
          performedBy: enterpriseUser.id,
          targetUser: newUser.id,
          details: `Invited sales rep: ${email}`,
          companyDomain,
        });

        res.status(201).json({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          status: "invited",
        });
      } catch (error) {
        console.error("Error inviting sales rep:", error);
        res.status(500).json({ message: "Failed to invite sales rep" });
      }
    },
  );

  // Update company user status or permissions
  app.patch(
    "/api/company-users/:userId",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { userId } = req.params;
        const { status, permissions } = req.body;

        // Verify user belongs to same company domain
        const targetUser = await storage.getUser(userId);
        if (
          !targetUser ||
          targetUser.companyDomain !== enterpriseUser.companyDomain
        ) {
          return res
            .status(404)
            .json({ message: "User not found or access denied" });
        }

        // Prepare updates
        const updates: any = {};
        if (status !== undefined) {
          updates.isActive = status === "active";
          if (status === "active") {
            updates.invitationStatus = "accepted";
          }
        }
        if (permissions !== undefined) {
          updates.permissions = permissions;
        }

        // Update user
        const updatedUser = await storage.updateUser(userId, updates);

        // Log activity
        const action = status
          ? "UPDATE_USER_STATUS"
          : "UPDATE_USER_PERMISSIONS";
        const details = status
          ? `${status === "active" ? "Activated" : "Suspended"} user: ${targetUser.email}`
          : `Updated permissions for: ${targetUser.email}`;

        await storage.createActivityLog({
          action,
          performedBy: enterpriseUser.id,
          targetUser: userId,
          details,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, user: updatedUser });
      } catch (error) {
        console.error("Error updating company user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    },
  );

  // Remove company user
  app.delete(
    "/api/company-users/:userId",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { userId } = req.params;

        // Verify user belongs to same company domain
        const targetUser = await storage.getUser(userId);
        if (
          !targetUser ||
          targetUser.companyDomain !== enterpriseUser.companyDomain
        ) {
          return res
            .status(404)
            .json({ message: "User not found or access denied" });
        }

        // Remove user
        const removed = await storage.deleteUser(userId);
        if (!removed) {
          return res.status(500).json({ message: "Failed to remove user" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "REMOVE_SALES_REP",
          performedBy: enterpriseUser.id,
          targetUser: userId,
          details: `Removed sales rep: ${targetUser.email}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true });
      } catch (error) {
        console.error("Error removing company user:", error);
        res.status(500).json({ message: "Failed to remove user" });
      }
    },
  );

  // Get decision makers for permissions assignment
  app.get(
    "/api/enterprise-admin/decision-makers",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        // Get decision makers from the company domain
        const allUsers = await storage.getUsersByCompanyDomain(companyDomain);
        const decisionMakers = allUsers.filter(
          (user) => user.role === "decision_maker",
        );

        // Format response
        const dms = decisionMakers.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          company: user.company || companyDomain,
        }));

        res.json(dms);
      } catch (error) {
        console.error("Error getting decision makers:", error);
        res.status(500).json({ message: "Failed to get decision makers" });
      }
    },
  );

  // ===== CREDIT MANAGEMENT ROUTES =====

  // Get company credits summary
  app.get(
    "/api/company-credits/summary",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        // Get or create company credits
        let credits = await storage.getCompanyCredits(companyDomain);

        if (!credits) {
          // Create initial credits record for the company
          const currentDate = new Date();
          const periodEnd = new Date(currentDate);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          const creditsData = {
            companyDomain,
            planType: "enterprise",
            monthlyCredits: 1000,
            usedCredits: 0,
            remainingCredits: 1000,
            currentPeriodStart: currentDate,
            currentPeriodEnd: periodEnd,
            perRepLimits: {
              maxCallsPerMonth: null,
              maxDMsPerMonth: null,
            },
            repUsage: [],
          };

          credits = await storage.createCompanyCredits(creditsData);
        }

        // Get all sales reps and populate their usage
        const salesReps = await storage.getUsersByCompanyDomain(companyDomain);
        const activeSalesReps = salesReps.filter(
          (user) => user.role === "sales_rep" && user.isActive,
        );

        // Get call logs and feedback for usage calculation
        const callLogs = await storage.getCallLogsByCompany(companyDomain);
        const feedbacks = await storage.getFeedbackByCompany(companyDomain);

        // Calculate per-rep usage
        const repUsageMap = new Map();

        // Initialize all active reps
        activeSalesReps.forEach((rep) => {
          repUsageMap.set(rep.id, {
            repId: rep.id,
            repEmail: rep.email,
            repName: `${rep.firstName} ${rep.lastName}`,
            callsBooked: 0,
            dmsUnlocked: 0,
            creditsUsed: 0,
            feedbacksReceived: 0,
            flagsReceived: 0,
            averageRating: 0,
          });
        });

        // Calculate usage from call logs
        callLogs.forEach((log) => {
          const repId = log.salesRepId?._id || log.salesRepId;
          if (repUsageMap.has(repId)) {
            const usage = repUsageMap.get(repId);
            usage.callsBooked += 1;
            usage.creditsUsed += log.creditsUsed || 1;

            if (log.status === "completed") {
              usage.dmsUnlocked += 1;
            }
          }
        });

        // Calculate feedback statistics
        const repFeedbackStats = new Map();
        feedbacks.forEach((feedback) => {
          const repId = feedback.salesRepId?._id || feedback.salesRepId;
          if (!repFeedbackStats.has(repId)) {
            repFeedbackStats.set(repId, { total: 0, sum: 0, flags: 0 });
          }
          const stats = repFeedbackStats.get(repId);
          stats.total += 1;
          stats.sum += feedback.rating;
          if (feedback.flags && feedback.flags.length > 0) {
            stats.flags += feedback.flags.length;
          }
        });

        // Update rep usage with feedback stats
        repFeedbackStats.forEach((stats, repId) => {
          if (repUsageMap.has(repId)) {
            const usage = repUsageMap.get(repId);
            usage.feedbacksReceived = stats.total;
            usage.flagsReceived = stats.flags;
            usage.averageRating = stats.total > 0 ? stats.sum / stats.total : 0;
          }
        });

        const repUsageArray = Array.from(repUsageMap.values());

        // Calculate totals
        const totalCreditsUsed = repUsageArray.reduce(
          (sum, rep) => sum + rep.creditsUsed,
          0,
        );
        const totalCallsBooked = repUsageArray.reduce(
          (sum, rep) => sum + rep.callsBooked,
          0,
        );
        const totalDMsUnlocked = repUsageArray.reduce(
          (sum, rep) => sum + rep.dmsUnlocked,
          0,
        );

        const summary = {
          planType: credits.planType,
          monthlyCredits: credits.monthlyCredits,
          usedCredits: totalCreditsUsed,
          remainingCredits: credits.monthlyCredits - totalCreditsUsed,
          utilizationRate:
            credits.monthlyCredits > 0
              ? (totalCreditsUsed / credits.monthlyCredits) * 100
              : 0,
          currentPeriodStart: credits.currentPeriodStart,
          currentPeriodEnd: credits.currentPeriodEnd,
          perRepLimits: credits.perRepLimits,
          totalCallsBooked,
          totalDMsUnlocked,
          activeReps: activeSalesReps.length,
          repUsage: repUsageArray,
        };

        res.json(summary);
      } catch (error) {
        console.error("Error getting company credits summary:", error);
        res.status(500).json({ message: "Failed to get credits summary" });
      }
    },
  );

  // Update per-rep credit limits
  app.patch(
    "/api/company-credits/rep-limit",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;
        const { maxCallsPerMonth, maxDMsPerMonth } = req.body;

        const updates = {
          "perRepLimits.maxCallsPerMonth": maxCallsPerMonth || null,
          "perRepLimits.maxDMsPerMonth": maxDMsPerMonth || null,
        };

        const updatedCredits = await storage.updateCompanyCredits(
          companyDomain,
          updates,
        );

        if (!updatedCredits) {
          return res.status(404).json({ message: "Company credits not found" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "UPDATE_CREDIT_LIMITS",
          performedBy: enterpriseUser.id,
          details: `Updated per-rep limits: ${maxCallsPerMonth} calls, ${maxDMsPerMonth} DMs`,
          companyDomain,
        });

        res.json({
          success: true,
          perRepLimits: updatedCredits.perRepLimits,
        });
      } catch (error) {
        console.error("Error updating rep credit limits:", error);
        res.status(500).json({ message: "Failed to update credit limits" });
      }
    },
  );

  // Reset monthly credits (for testing or manual reset)
  app.post(
    "/api/company-credits/reset",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        const currentDate = new Date();
        const periodEnd = new Date(currentDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const updates = {
          usedCredits: 0,
          remainingCredits: 1000,
          currentPeriodStart: currentDate,
          currentPeriodEnd: periodEnd,
          repUsage: [],
        };

        const updatedCredits = await storage.updateCompanyCredits(
          companyDomain,
          updates,
        );

        // Log activity
        await storage.createActivityLog({
          action: "RESET_CREDITS",
          performedBy: enterpriseUser.id,
          details: "Reset monthly credits and usage statistics",
          companyDomain,
        });

        res.json({ success: true, credits: updatedCredits });
      } catch (error) {
        console.error("Error resetting credits:", error);
        res.status(500).json({ message: "Failed to reset credits" });
      }
    },
  );

  // ===== DM TRACKING ROUTES =====

  // Get company DMs
  app.get("/api/company-dms", requireEnterpriseAdmin, async (req, res) => {
    try {
      const enterpriseUser = (req as any).enterpriseUser;
      const companyDomain = enterpriseUser.companyDomain;

      const companyDMs = await storage.getCompanyDMs(companyDomain);

      // Calculate engagement scores and additional metrics
      const enrichedDMs = await Promise.all(
        companyDMs.map(async (dm) => {
          const flags = await storage.getDMFlags(dm.dmId.id || dm.dmId);
          const callLogs = await storage.getCallLogsByCompany(companyDomain);
          const dmCallLogs = callLogs.filter(
            (log) =>
              (log.decisionMakerId?.id || log.decisionMakerId) ===
              (dm.dmId.id || dm.dmId),
          );

          // Calculate engagement score based on interactions
          let engagementScore = 0;
          if (dmCallLogs.length > 0) {
            const completedCalls = dmCallLogs.filter(
              (log) => log.status === "completed",
            ).length;
            const totalCalls = dmCallLogs.length;
            const completionRate = completedCalls / totalCalls;
            const avgRating =
              dmCallLogs
                .filter((log) => log.feedback?.rating)
                .reduce((sum, log) => sum + log.feedback.rating, 0) /
                dmCallLogs.length || 0;

            engagementScore = Math.round(
              completionRate * 40 +
                avgRating * 12 +
                Math.min(completedCalls, 5) * 10,
            );
          }

          return {
            id: dm.id,
            dmId: dm.dmId.id || dm.dmId,
            name: `${dm.dmId.firstName} ${dm.dmId.lastName}`,
            email: dm.dmId.email,
            title: dm.dmId.jobTitle || "N/A",
            company: dm.dmId.company || companyDomain,
            linkedinUrl: dm.dmId.linkedinUrl,
            verificationStatus: dm.verificationStatus,
            flagCount: flags.filter((f) => f.status === "open").length,
            totalFlags: flags.length,
            engagementScore,
            totalInteractions: dmCallLogs.length,
            lastInteraction: dm.lastInteraction,
            linkedRep: {
              id: dm.linkedRepId.id || dm.linkedRepId,
              name: `${dm.linkedRepId.firstName} ${dm.linkedRepId.lastName}`,
              email: dm.linkedRepId.email,
            },
            referralDate: dm.referralDate,
            removalRequested: dm.removalRequested,
            removalReason: dm.removalReason,
            status: dm.status,
            flags: flags.slice(0, 3), // Recent flags
          };
        }),
      );

      res.json(enrichedDMs);
    } catch (error) {
      console.error("Error getting company DMs:", error);
      res.status(500).json({ message: "Failed to get company DMs" });
    }
  });

  // Request DM removal
  app.post(
    "/api/company-dms/remove",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { dmId, reason } = req.body;

        if (!dmId || !reason) {
          return res
            .status(400)
            .json({ message: "DM ID and reason are required" });
        }

        const result = await storage.requestDMRemoval(
          dmId,
          reason,
          enterpriseUser.id,
        );

        if (!result) {
          return res.status(404).json({ message: "DM not found" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "REQUEST_DM_REMOVAL",
          performedBy: enterpriseUser.id,
          targetUser: dmId,
          details: `Requested DM removal: ${reason}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, dm: result });
      } catch (error) {
        console.error("Error requesting DM removal:", error);
        res.status(500).json({ message: "Failed to request DM removal" });
      }
    },
  );

  // Replace suspended DM
  app.post(
    "/api/company-dms/replace",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { originalDMId, replacementDMId } = req.body;

        if (!originalDMId || !replacementDMId) {
          return res
            .status(400)
            .json({ message: "Original and replacement DM IDs are required" });
        }

        // Verify replacement DM exists and is available
        const replacementDM = await storage.getUser(replacementDMId);
        if (!replacementDM || replacementDM.role !== "decision_maker") {
          return res.status(400).json({ message: "Invalid replacement DM" });
        }

        const result = await storage.replaceDM(
          originalDMId,
          replacementDMId,
          enterpriseUser.id,
        );

        if (!result) {
          return res.status(404).json({ message: "Original DM not found" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "REPLACE_DM",
          performedBy: enterpriseUser.id,
          targetUser: originalDMId,
          details: `Replaced DM with ${replacementDM.email}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, result });
      } catch (error) {
        console.error("Error replacing DM:", error);
        res.status(500).json({ message: "Failed to replace DM" });
      }
    },
  );

  // Flag a DM for quality issues
  app.post(
    "/api/company-dms/flag",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { dmId, flagType, description, severity } = req.body;

        if (!dmId || !flagType || !description) {
          return res.status(400).json({
            message: "DM ID, flag type, and description are required",
          });
        }

        const flagData = {
          dmId,
          flaggedBy: enterpriseUser.id,
          companyDomain: enterpriseUser.companyDomain,
          flagType,
          description,
          severity: severity || "medium",
          status: "open",
        };

        const flag = await storage.createDMFlag(flagData);

        // Log activity
        await storage.createActivityLog({
          action: "FLAG_DM",
          performedBy: enterpriseUser.id,
          targetUser: dmId,
          details: `Flagged DM for: ${flagType} - ${description}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.status(201).json({ success: true, flag });
      } catch (error) {
        console.error("Error flagging DM:", error);
        res.status(500).json({ message: "Failed to flag DM" });
      }
    },
  );

  // Update DM verification status
  app.patch(
    "/api/company-dms/:dmId/verification",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { dmId } = req.params;
        const { verificationStatus } = req.body;

        const validStatuses = ["pending", "verified", "rejected", "suspended"];
        if (!validStatuses.includes(verificationStatus)) {
          return res
            .status(400)
            .json({ message: "Invalid verification status" });
        }

        const result = await storage.updateCompanyDM(dmId, {
          verificationStatus,
        });

        if (!result) {
          return res.status(404).json({ message: "DM not found" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "UPDATE_DM_VERIFICATION",
          performedBy: enterpriseUser.id,
          targetUser: dmId,
          details: `Updated DM verification status to: ${verificationStatus}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, dm: result });
      } catch (error) {
        console.error("Error updating DM verification:", error);
        res.status(500).json({ message: "Failed to update DM verification" });
      }
    },
  );

  // Get DM flags
  app.get(
    "/api/company-dms/:dmId/flags",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const { dmId } = req.params;
        const flags = await storage.getDMFlags(dmId);
        res.json(flags);
      } catch (error) {
        console.error("Error getting DM flags:", error);
        res.status(500).json({ message: "Failed to get DM flags" });
      }
    },
  );

  // ===== CALL ACTIVITY LOG ROUTES =====

  // Get company call logs with filtering
  app.get("/api/company-calls", requireEnterpriseAdmin, async (req, res) => {
    try {
      const enterpriseUser = (req as any).enterpriseUser;
      const companyDomain = enterpriseUser.companyDomain;
      const { rep, dm, outcome, startDate, endDate, search } = req.query;

      let callLogs = await storage.getCallLogsByCompany(companyDomain);

      // Apply filters
      if (rep) {
        callLogs = callLogs.filter(
          (log) =>
            (log.salesRepId?.id || log.salesRepId?.toString()) === rep ||
            (log.salesRepId?.email &&
              log.salesRepId.email.includes(rep as string)),
        );
      }

      if (dm) {
        callLogs = callLogs.filter(
          (log) =>
            (log.decisionMakerId?.id || log.decisionMakerId?.toString()) ===
              dm ||
            (log.decisionMakerId?.email &&
              log.decisionMakerId.email.includes(dm as string)),
        );
      }

      if (outcome) {
        callLogs = callLogs.filter((log) => log.status === outcome);
      }

      if (startDate) {
        const start = new Date(startDate as string);
        callLogs = callLogs.filter((log) => new Date(log.scheduledAt) >= start);
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999); // End of day
        callLogs = callLogs.filter((log) => new Date(log.scheduledAt) <= end);
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        callLogs = callLogs.filter(
          (log) =>
            (log.salesRepId?.firstName &&
              log.salesRepId.firstName.toLowerCase().includes(searchTerm)) ||
            (log.salesRepId?.lastName &&
              log.salesRepId.lastName.toLowerCase().includes(searchTerm)) ||
            (log.salesRepId?.email &&
              log.salesRepId.email.toLowerCase().includes(searchTerm)) ||
            (log.decisionMakerId?.firstName &&
              log.decisionMakerId.firstName
                .toLowerCase()
                .includes(searchTerm)) ||
            (log.decisionMakerId?.lastName &&
              log.decisionMakerId.lastName
                .toLowerCase()
                .includes(searchTerm)) ||
            (log.decisionMakerId?.email &&
              log.decisionMakerId.email.toLowerCase().includes(searchTerm)) ||
            (log.feedback?.summary &&
              log.feedback.summary.toLowerCase().includes(searchTerm)) ||
            (log.notes && log.notes.toLowerCase().includes(searchTerm)),
        );
      }

      // Enrich call logs with additional data
      const enrichedCallLogs = callLogs.map((log) => {
        const repName = log.salesRepId
          ? `${log.salesRepId.firstName} ${log.salesRepId.lastName}`
          : "Unknown Rep";
        const dmName = log.decisionMakerId
          ? `${log.decisionMakerId.firstName} ${log.decisionMakerId.lastName}`
          : "Unknown DM";

        return {
          id: log.id,
          repToDM: `${repName} ↔ ${dmName}`,
          repDetails: {
            id: log.salesRepId?.id || log.salesRepId,
            name: repName,
            email: log.salesRepId?.email || "N/A",
            company: log.salesRepId?.company || companyDomain,
          },
          dmDetails: {
            id: log.decisionMakerId?.id || log.decisionMakerId,
            name: dmName,
            email: log.decisionMakerId?.email || "N/A",
            title: log.decisionMakerId?.jobTitle || "N/A",
            company: log.decisionMakerId?.company || "N/A",
          },
          scheduledAt: log.scheduledAt,
          completedAt: log.completedAt,
          duration: log.duration,
          status: log.status,
          outcome: log.outcome || log.status,
          feedback: {
            rating: log.feedback?.rating,
            summary:
              log.feedback?.summary ||
              log.feedback?.notes ||
              "No feedback provided",
            nextSteps: log.feedback?.nextSteps,
            followUpRequired: log.feedback?.followUpRequired,
          },
          notes: log.notes,
          flagged: log.flagged || false,
          flagReason: log.flagReason,
          meetingUrl: log.meetingUrl,
          recordingUrl: log.recordingUrl,
        };
      });

      // Sort by scheduled date (most recent first)
      enrichedCallLogs.sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );

      res.json(enrichedCallLogs);
    } catch (error) {
      console.error("Error getting company call logs:", error);
      res.status(500).json({ message: "Failed to get company call logs" });
    }
  });

  // Get call analytics for dashboard
  app.get(
    "/api/company-calls/analytics",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        const callLogs = await storage.getCallLogsByCompany(companyDomain);

        const analytics = {
          totalCalls: callLogs.length,
          completedCalls: callLogs.filter((log) => log.status === "completed")
            .length,
          missedCalls: callLogs.filter(
            (log) => log.status === "missed" || log.status === "cancelled",
          ).length,
          flaggedCalls: callLogs.filter((log) => log.flagged).length,
          averageRating: 0,
          callsByOutcome: {
            completed: callLogs.filter((log) => log.status === "completed")
              .length,
            missed: callLogs.filter((log) => log.status === "missed").length,
            cancelled: callLogs.filter((log) => log.status === "cancelled")
              .length,
            scheduled: callLogs.filter((log) => log.status === "scheduled")
              .length,
          },
          recentActivity: callLogs
            .sort(
              (a, b) =>
                new Date(b.scheduledAt).getTime() -
                new Date(a.scheduledAt).getTime(),
            )
            .slice(0, 5)
            .map((log) => ({
              rep: log.salesRepId
                ? `${log.salesRepId.firstName} ${log.salesRepId.lastName}`
                : "Unknown",
              dm: log.decisionMakerId
                ? `${log.decisionMakerId.firstName} ${log.decisionMakerId.lastName}`
                : "Unknown",
              status: log.status,
              scheduledAt: log.scheduledAt,
            })),
        };

        // Calculate average rating
        const ratedCalls = callLogs.filter((log) => log.feedback?.rating);
        if (ratedCalls.length > 0) {
          analytics.averageRating =
            ratedCalls.reduce((sum, log) => sum + log.feedback.rating, 0) /
            ratedCalls.length;
        }

        res.json(analytics);
      } catch (error) {
        console.error("Error getting call analytics:", error);
        res.status(500).json({ message: "Failed to get call analytics" });
      }
    },
  );

  // Flag a call for review
  app.post(
    "/api/company-calls/:callId/flag",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { callId } = req.params;
        const { reason, severity } = req.body;

        if (!reason) {
          return res.status(400).json({ message: "Flag reason is required" });
        }

        const result = await storage.updateCallLog(callId, {
          flagged: true,
          flagReason: reason,
          flagSeverity: severity || "medium",
          flaggedBy: enterpriseUser.id,
          flaggedAt: new Date(),
        });

        if (!result) {
          return res.status(404).json({ message: "Call not found" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "FLAG_CALL",
          performedBy: enterpriseUser.id,
          targetUser: result.salesRepId?.id || result.salesRepId,
          details: `Flagged call for review: ${reason}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, call: result });
      } catch (error) {
        console.error("Error flagging call:", error);
        res.status(500).json({ message: "Failed to flag call" });
      }
    },
  );

  // ===== PERFORMANCE ANALYTICS ROUTES =====

  // Get comprehensive company analytics
  app.get(
    "/api/company-analytics",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        // Get all data sources
        const [callLogs, feedback, companyUsers, companyDMs] =
          await Promise.all([
            storage.getCallLogsByCompany(companyDomain),
            storage.getFeedbackByCompany(companyDomain),
            storage.getUsersByCompanyDomain(companyDomain),
            storage.getCompanyDMs(companyDomain),
          ]);

        const salesReps = companyUsers.filter(
          (user) => user.role === "sales_rep",
        );

        // Calculate average rep feedback score
        const repFeedbackScores = {};
        feedback.forEach((fb) => {
          const repId = fb.salesRepId?.id || fb.salesRepId;
          if (!repFeedbackScores[repId]) {
            repFeedbackScores[repId] = { total: 0, count: 0 };
          }
          if (fb.rating) {
            repFeedbackScores[repId].total += fb.rating;
            repFeedbackScores[repId].count += 1;
          }
        });

        const avgRepFeedbackScore =
          Object.values(repFeedbackScores).length > 0
            ? Object.values(repFeedbackScores).reduce(
                (sum, rep) => sum + (rep.count > 0 ? rep.total / rep.count : 0),
                0,
              ) / Object.values(repFeedbackScores).length
            : 0;

        // Calculate average DM engagement score
        const avgDMEngagementScore =
          companyDMs.length > 0
            ? companyDMs.reduce(
                (sum, dm) => sum + (dm.engagementScore || 0),
                0,
              ) / companyDMs.length
            : 0;

        // Calculate no-show rate
        const totalScheduledCalls = callLogs.filter((log) =>
          ["scheduled", "completed", "missed", "cancelled"].includes(
            log.status,
          ),
        ).length;
        const noShowCalls = callLogs.filter(
          (log) => log.status === "missed" || log.outcome === "no_show",
        ).length;
        const noShowRate =
          totalScheduledCalls > 0
            ? (noShowCalls / totalScheduledCalls) * 100
            : 0;

        // Calculate top performers
        const repPerformance = salesReps.map((rep) => {
          const repId = rep.id;
          const repCalls = callLogs.filter(
            (log) => (log.salesRepId?.id || log.salesRepId) === repId,
          );
          const repFeedback = feedback.filter(
            (fb) => (fb.salesRepId?.id || fb.salesRepId) === repId,
          );
          const repDMs = companyDMs.filter(
            (dm) => (dm.linkedRepId?.id || dm.linkedRepId) === repId,
          );

          const completedCalls = repCalls.filter(
            (call) => call.status === "completed",
          ).length;
          const avgFeedback =
            repFeedback.length > 0
              ? repFeedback
                  .filter((fb) => fb.rating)
                  .reduce((sum, fb) => sum + fb.rating, 0) /
                repFeedback.filter((fb) => fb.rating).length
              : 0;

          return {
            id: repId,
            name: `${rep.firstName} ${rep.lastName}`,
            email: rep.email,
            totalCalls: repCalls.length,
            completedCalls,
            avgFeedback: avgFeedback || 0,
            dmInvites: repDMs.length,
            successRate:
              repCalls.length > 0
                ? (completedCalls / repCalls.length) * 100
                : 0,
          };
        });

        // Sort top performers by different metrics
        const topPerformersByCalls = [...repPerformance]
          .sort((a, b) => b.completedCalls - a.completedCalls)
          .slice(0, 5);

        const topPerformersByFeedback = [...repPerformance]
          .sort((a, b) => b.avgFeedback - a.avgFeedback)
          .slice(0, 5);

        const topPerformersByDMInvites = [...repPerformance]
          .sort((a, b) => b.dmInvites - a.dmInvites)
          .slice(0, 5);

        // Monthly performance trends (last 6 months)
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - i);
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);

          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);
          monthEnd.setHours(23, 59, 59, 999);

          const monthCalls = callLogs.filter((log) => {
            const callDate = new Date(log.scheduledAt);
            return callDate >= monthStart && callDate <= monthEnd;
          });

          const monthFeedback = feedback.filter((fb) => {
            const fbDate = new Date(fb.createdAt);
            return fbDate >= monthStart && fbDate <= monthEnd;
          });

          const avgRating =
            monthFeedback.length > 0
              ? monthFeedback
                  .filter((fb) => fb.rating)
                  .reduce((sum, fb) => sum + fb.rating, 0) /
                monthFeedback.filter((fb) => fb.rating).length
              : 0;

          monthlyData.push({
            month: monthStart.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            }),
            totalCalls: monthCalls.length,
            completedCalls: monthCalls.filter(
              (call) => call.status === "completed",
            ).length,
            avgFeedback: avgRating || 0,
            successRate:
              monthCalls.length > 0
                ? (monthCalls.filter((call) => call.status === "completed")
                    .length /
                    monthCalls.length) *
                  100
                : 0,
          });
        }

        // Call outcome distribution
        const outcomeDistribution = {
          completed: callLogs.filter((log) => log.status === "completed")
            .length,
          missed: callLogs.filter((log) => log.status === "missed").length,
          cancelled: callLogs.filter((log) => log.status === "cancelled")
            .length,
          scheduled: callLogs.filter((log) => log.status === "scheduled")
            .length,
        };

        // DM verification status distribution
        const dmVerificationDistribution = {
          verified: companyDMs.filter(
            (dm) => dm.verificationStatus === "verified",
          ).length,
          pending: companyDMs.filter(
            (dm) => dm.verificationStatus === "pending",
          ).length,
          rejected: companyDMs.filter(
            (dm) => dm.verificationStatus === "rejected",
          ).length,
          suspended: companyDMs.filter(
            (dm) => dm.verificationStatus === "suspended",
          ).length,
        };

        const analytics = {
          overview: {
            avgRepFeedbackScore: Number(avgRepFeedbackScore.toFixed(2)),
            avgDMEngagementScore: Number(avgDMEngagementScore.toFixed(1)),
            noShowRate: Number(noShowRate.toFixed(1)),
            totalCalls: callLogs.length,
            totalDMs: companyDMs.length,
            totalReps: salesReps.length,
            completionRate:
              totalScheduledCalls > 0
                ? Number(
                    (
                      (callLogs.filter((log) => log.status === "completed")
                        .length /
                        totalScheduledCalls) *
                      100
                    ).toFixed(1),
                  )
                : 0,
          },
          topPerformers: {
            byCalls: topPerformersByCalls,
            byFeedback: topPerformersByFeedback,
            byDMInvites: topPerformersByDMInvites,
          },
          trends: {
            monthly: monthlyData,
          },
          distributions: {
            callOutcomes: outcomeDistribution,
            dmVerification: dmVerificationDistribution,
          },
          repPerformance: repPerformance,
        };

        res.json(analytics);
      } catch (error) {
        console.error("Error getting company analytics:", error);
        res.status(500).json({ message: "Failed to get company analytics" });
      }
    },
  );

  // Export analytics data as CSV
  app.get(
    "/api/company-analytics/export",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;
        const { type = "overview" } = req.query;

        // Get all data sources
        const [callLogs, feedback, companyUsers, companyDMs] =
          await Promise.all([
            storage.getCallLogsByCompany(companyDomain),
            storage.getFeedbackByCompany(companyDomain),
            storage.getUsersByCompanyDomain(companyDomain),
            storage.getCompanyDMs(companyDomain),
          ]);

        let csvData = "";
        const timestamp = new Date().toISOString().split("T")[0];

        if (type === "rep_performance") {
          // Export rep performance data
          const salesReps = companyUsers.filter(
            (user) => user.role === "sales_rep",
          );

          csvData =
            "Rep Name,Email,Total Calls,Completed Calls,Success Rate (%),Avg Feedback,DM Invites,Last Activity\n";

          salesReps.forEach((rep) => {
            const repId = rep.id;
            const repCalls = callLogs.filter(
              (log) => (log.salesRepId?.id || log.salesRepId) === repId,
            );
            const repFeedback = feedback.filter(
              (fb) => (fb.salesRepId?.id || fb.salesRepId) === repId,
            );
            const repDMs = companyDMs.filter(
              (dm) => (dm.linkedRepId?.id || dm.linkedRepId) === repId,
            );

            const completedCalls = repCalls.filter(
              (call) => call.status === "completed",
            ).length;
            const successRate =
              repCalls.length > 0
                ? (completedCalls / repCalls.length) * 100
                : 0;
            const avgFeedback =
              repFeedback.length > 0
                ? repFeedback
                    .filter((fb) => fb.rating)
                    .reduce((sum, fb) => sum + fb.rating, 0) /
                  repFeedback.filter((fb) => fb.rating).length
                : 0;

            const lastActivity =
              repCalls.length > 0
                ? new Date(
                    Math.max(
                      ...repCalls.map((call) => new Date(call.scheduledAt)),
                    ),
                  ).toLocaleDateString()
                : "N/A";

            csvData += `"${rep.firstName} ${rep.lastName}","${rep.email}",${repCalls.length},${completedCalls},${successRate.toFixed(1)},${avgFeedback.toFixed(1)},${repDMs.length},"${lastActivity}"\n`;
          });

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="rep_performance_${timestamp}.csv"`,
          );
        } else if (type === "call_logs") {
          // Export call logs data
          csvData =
            "Date,Time,Sales Rep,Decision Maker,Duration (min),Status,Outcome,Rating,Feedback Summary\n";

          callLogs.forEach((log) => {
            const scheduledDate = new Date(log.scheduledAt);
            const repName = log.salesRepId
              ? `${log.salesRepId.firstName} ${log.salesRepId.lastName}`
              : "Unknown";
            const dmName = log.decisionMakerId
              ? `${log.decisionMakerId.firstName} ${log.decisionMakerId.lastName}`
              : "Unknown";
            const rating = log.feedback?.rating || "";
            const summary = (log.feedback?.summary || "").replace(/"/g, '""'); // Escape quotes in CSV

            csvData += `"${scheduledDate.toLocaleDateString()}","${scheduledDate.toLocaleTimeString()}","${repName}","${dmName}",${log.duration || 0},"${log.status}","${log.outcome || ""}","${rating}","${summary}"\n`;
          });

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="call_logs_${timestamp}.csv"`,
          );
        } else {
          // Export overview analytics
          csvData = "Metric,Value\n";
          csvData += `Total Calls,${callLogs.length}\n`;
          csvData += `Completed Calls,${callLogs.filter((log) => log.status === "completed").length}\n`;
          csvData += `Missed Calls,${callLogs.filter((log) => log.status === "missed").length}\n`;
          csvData += `Total Decision Makers,${companyDMs.length}\n`;
          csvData += `Verified DMs,${companyDMs.filter((dm) => dm.verificationStatus === "verified").length}\n`;
          csvData += `Total Sales Reps,${companyUsers.filter((user) => user.role === "sales_rep").length}\n`;

          const totalScheduled = callLogs.filter((log) =>
            ["scheduled", "completed", "missed", "cancelled"].includes(
              log.status,
            ),
          ).length;
          const noShows = callLogs.filter(
            (log) => log.status === "missed",
          ).length;
          const noShowRate =
            totalScheduled > 0 ? (noShows / totalScheduled) * 100 : 0;

          csvData += `No-Show Rate (%),${noShowRate.toFixed(1)}\n`;

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="analytics_overview_${timestamp}.csv"`,
          );
        }

        res.send(csvData);
      } catch (error) {
        console.error("Error exporting analytics:", error);
        res.status(500).json({ message: "Failed to export analytics" });
      }
    },
  );

  // ===== ACCOUNT SETTINGS ROUTES =====

  // Get company settings and plan information
  app.get("/api/company-settings", requireEnterpriseAdmin, async (req, res) => {
    try {
      const enterpriseUser = (req as any).enterpriseUser;
      const companyDomain = enterpriseUser.companyDomain;

      // Get company users to find admin contact
      const companyUsers = await storage.getUsersByCompanyDomain(companyDomain);
      const adminUser =
        companyUsers.find((user) => user.role === "enterprise_admin") ||
        enterpriseUser;

      // Get company analytics for usage metrics
      const [callLogs, companyDMs] = await Promise.all([
        storage.getCallLogsByCompany(companyDomain),
        storage.getCompanyDMs(companyDomain),
      ]);

      // Calculate usage metrics
      const currentDate = new Date();
      const currentMonthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const currentMonthCalls = callLogs.filter(
        (log) => new Date(log.scheduledAt) >= currentMonthStart,
      ).length;

      // Company information
      const companySettings = {
        company: {
          name:
            companyDomain.split(".")[0].replace(/^\w/, (c) => c.toUpperCase()) +
            " Corp",
          domain: companyDomain,
          verifiedDomain: companyDomain,
          adminContact: {
            name: `${adminUser.firstName} ${adminUser.lastName}`,
            email: adminUser.email,
            role: adminUser.role,
            joinedDate: adminUser.createdAt || currentDate,
          },
          totalUsers: companyUsers.length,
          salesReps: companyUsers.filter((user) => user.role === "sales_rep")
            .length,
          decisionMakers: companyDMs.length,
        },
        plan: {
          type: "Enterprise Pro",
          status: "active",
          billingCycle: "monthly",
          currentPeriodStart: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1,
          ),
          currentPeriodEnd: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0,
          ),
          renewalDate: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1,
          ),
          features: [
            "Unlimited sales reps",
            "Advanced analytics dashboard",
            "DM tracking and verification",
            "Call activity monitoring",
            "Performance analytics",
            "CSV data export",
            "Priority customer support",
            "Team management tools",
            "Credit usage monitoring",
          ],
          limits: {
            monthlyCallCredits: 1000,
            dmReferrals: 100,
            analyticsRetention: "12 months",
            supportLevel: "Priority",
          },
          pricing: {
            basePrice: 199,
            currency: "USD",
            perUser: false,
          },
        },
        usage: {
          currentMonth: {
            calls: currentMonthCalls,
            dmsReferred: companyDMs.filter(
              (dm) => new Date(dm.referralDate) >= currentMonthStart,
            ).length,
            creditUsage: currentMonthCalls,
            remainingCredits: Math.max(0, 1000 - currentMonthCalls),
          },
          billingHistory: [
            {
              date: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                1,
              ),
              amount: 199,
              status: "paid",
              description: "Enterprise Pro - Monthly",
            },
            {
              date: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - 1,
                1,
              ),
              amount: 199,
              status: "paid",
              description: "Enterprise Pro - Monthly",
            },
            {
              date: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - 2,
                1,
              ),
              amount: 199,
              status: "paid",
              description: "Enterprise Pro - Monthly",
            },
          ],
        },
        support: {
          contactEmail: "support@naeborly.com",
          helpCenterUrl: "https://help.naeborly.com",
          statusPageUrl: "https://status.naeborly.com",
          prioritySupport: true,
          accountManager: {
            name: "Sarah Johnson",
            email: "sarah.johnson@naeborly.com",
            phone: "+1 (555) 123-4567",
          },
        },
      };

      res.json(companySettings);
    } catch (error) {
      console.error("Error getting company settings:", error);
      res.status(500).json({ message: "Failed to get company settings" });
    }
  });

  // Get Stripe billing portal link
  app.get(
    "/api/billing-portal-link",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;

        // In a real implementation, you would:
        // 1. Get the customer's Stripe customer ID from your database
        // 2. Create a billing portal session using Stripe API
        // 3. Return the portal URL

        // For demo purposes, we'll return a mock portal link
        const portalLink = {
          url: "https://billing.stripe.com/p/login/test_demo_portal",
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          customerId: "cus_demo_customer_id",
        };

        // Log activity
        await storage.createActivityLog({
          action: "ACCESS_BILLING_PORTAL",
          performedBy: enterpriseUser.id,
          details: "Accessed Stripe billing portal",
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json(portalLink);
      } catch (error) {
        console.error("Error creating billing portal link:", error);
        res
          .status(500)
          .json({ message: "Failed to create billing portal link" });
      }
    },
  );

  // Update company settings
  app.patch(
    "/api/company-settings",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = (req as any).enterpriseUser;
        const { companyName, adminContact } = req.body;

        // In a real implementation, you would update the company record
        // For now, we'll just log the activity and return success

        await storage.createActivityLog({
          action: "UPDATE_COMPANY_SETTINGS",
          performedBy: enterpriseUser.id,
          details: `Updated company settings: ${companyName ? "company name, " : ""}${adminContact ? "admin contact" : ""}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({
          success: true,
          message: "Company settings updated successfully",
        });
      } catch (error) {
        console.error("Error updating company settings:", error);
        res.status(500).json({ message: "Failed to update company settings" });
      }
    },
  );

  // Contact support
  app.post("/api/contact-support", requireEnterpriseAdmin, async (req, res) => {
    try {
      const enterpriseUser = (req as any).enterpriseUser;
      const { subject, message, priority, category } = req.body;

      if (!subject || !message) {
        return res
          .status(400)
          .json({ message: "Subject and message are required" });
      }

      // In a real implementation, you would:
      // 1. Create a support ticket in your helpdesk system
      // 2. Send email notification to support team
      // 3. Send confirmation email to user

      const supportTicket = {
        id: `TICKET-${Date.now()}`,
        subject,
        message,
        priority: priority || "medium",
        category: category || "general",
        status: "open",
        submittedBy: {
          name: `${enterpriseUser.firstName} ${enterpriseUser.lastName}`,
          email: enterpriseUser.email,
          company: enterpriseUser.companyDomain,
        },
        submittedAt: new Date(),
        estimatedResponse:
          priority === "high"
            ? "2 hours"
            : priority === "medium"
              ? "8 hours"
              : "24 hours",
      };

      // Log activity
      await storage.createActivityLog({
        action: "CONTACT_SUPPORT",
        performedBy: enterpriseUser.id,
        details: `Submitted support ticket: ${subject}`,
        companyDomain: enterpriseUser.companyDomain,
      });

      res.status(201).json({
        success: true,
        ticket: supportTicket,
        message: "Support ticket submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      res.status(500).json({ message: "Failed to submit support ticket" });
    }
  });

  // ===== CALENDAR & BOOKING ROUTES =====

  // Get DM availability for calendar view
  app.get(
    "/api/calendar/dm-availability/:dmId",
    authenticateToken,
    async (req, res) => {
      try {
        const { dmId } = req.params;
        const { startDate, endDate } = req.query;
        const currentUser = await storage.getUserById(req.user!.userId);

        // Get DM availability slots
        const dm = await storage.getUserById(dmId);
        if (!dm || dm.role !== "decision_maker") {
          return res.status(404).json({ message: "Decision maker not found" });
        }

        // Generate availability slots for the date range
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const availabilitySlots = [];
        const bookedSlots = await storage.getCallsByDateRange(dmId, start, end);

        // Get Google Calendar events if user has calendar integration
        let googleCalendarEvents = [];
        if (
          currentUser.calendarIntegrationEnabled &&
          currentUser.googleCalendarTokens
        ) {
          try {
            const { setCredentials, getCalendarEvents } = await import(
              "./google-calendar"
            );
            setCredentials(currentUser.googleCalendarTokens);

            googleCalendarEvents = await getCalendarEvents(
              "primary",
              start.toISOString(),
              end.toISOString(),
            );
          } catch (calendarError) {
            console.error(
              "Error fetching Google Calendar events:",
              calendarError,
            );
          }
        }

        // Generate time slots for each day (9 AM to 5 PM, 30-minute intervals)
        for (
          let date = new Date(start);
          date <= end;
          date.setDate(date.getDate() + 1)
        ) {
          // Skip weekends for business meetings
          if (date.getDay() === 0 || date.getDay() === 6) continue;

          for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const slotStart = new Date(date);
              slotStart.setHours(hour, minute, 0, 0);

              const slotEnd = new Date(slotStart);
              slotEnd.setMinutes(slotEnd.getMinutes() + 30);

              // Check if slot is already booked in database
              const isBookedInDb = bookedSlots.some((booking) => {
                const bookingStart = new Date(booking.scheduledAt);
                return (
                  Math.abs(bookingStart.getTime() - slotStart.getTime()) <
                  30 * 60 * 1000
                );
              });

              // Check if slot conflicts with Google Calendar events
              const hasCalendarConflict = googleCalendarEvents.some((event) => {
                if (!event.start?.dateTime || !event.end?.dateTime)
                  return false;
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);

                // Check if times overlap
                return slotStart < eventEnd && slotEnd > eventStart;
              });

              const isBooked = isBookedInDb || hasCalendarConflict;

              availabilitySlots.push({
                id: `${dmId}-${slotStart.getTime()}`,
                dmId,
                dmName: `${dm.firstName} ${dm.lastName}`,
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                available: !isBooked,
                booked: isBooked,
                bookingId: isBookedInDb
                  ? bookedSlots.find(
                      (b) =>
                        Math.abs(
                          new Date(b.scheduledAt).getTime() -
                            slotStart.getTime(),
                        ) <
                        30 * 60 * 1000,
                    )?.id
                  : null,
                conflictType: hasCalendarConflict
                  ? "google_calendar"
                  : isBookedInDb
                    ? "platform_booking"
                    : null,
              });
            }
          }
        }

        res.json({
          dmId,
          dmName: `${dm.firstName} ${dm.lastName}`,
          dmTitle: dm.jobTitle,
          dmCompany: dm.company,
          availabilitySlots,
          calendarIntegrated: !!(
            currentUser.calendarIntegrationEnabled &&
            currentUser.googleCalendarTokens
          ),
        });
      } catch (error) {
        console.error("Error getting DM availability:", error);
        res.status(500).json({ message: "Failed to get DM availability" });
      }
    },
  );

  // Get all available DMs for calendar selection
  app.get(
    "/api/calendar/available-dms",
    authenticateToken,
    async (req, res) => {
      try {
        const currentUser = await storage.getUserById(req.user!.userId);
        console.log("Current user role:", currentUser.role);

        let availableDMs;
        if (currentUser.role === "sales_rep") {
          // Sales reps can see all active decision makers for calendar booking
          const allDMs = await storage.getUsersByRole("decision_maker");
          console.log("All DMs found:", allDMs.length);
          console.log(
            "Sample DM:",
            allDMs[0]
              ? {
                  id: allDMs[0].id,
                  role: allDMs[0].role,
                  isActive: allDMs[0].isActive,
                  invitationStatus: allDMs[0].invitationStatus,
                }
              : "None",
          );

          availableDMs = allDMs.filter((dm) => dm.isActive && dm.jobTitleStatus !== "pending");
          console.log("Filtered available DMs:", availableDMs.length);
        } else {
          // Enterprise admins can see all DMs in their company (including pending approvals for admin purposes)
          availableDMs = await storage.getUsersByRole("decision_maker");
          if (currentUser.companyDomain) {
            availableDMs = availableDMs.filter(
              (dm) => dm.companyDomain === currentUser.companyDomain,
            );
          }
        }

        const dmsWithDetails = availableDMs
          .filter((dm) => dm)
          .map((dm) => ({
            id: dm.id || dm._id,
            name: `${dm.firstName} ${dm.lastName}`,
            email: dm.email,
            title: dm.jobTitle,
            company: dm.company,
            industry: dm.industry,
            department: dm.department,
            profileImage: dm.profileImageUrl || null,
          }));

        console.log("Final DMs with details:", dmsWithDetails.length);
        res.json(dmsWithDetails);
      } catch (error) {
        console.error("Error getting available DMs:", error);
        res.status(500).json({ message: "Failed to get available DMs" });
      }
    },
  );

  // Book a meeting slot
  app.post("/api/calendar/book-slot", authenticateToken, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.userId);
      const { dmId, startTime, endTime, agenda, notes } = req.body;

      // Validate DM exists and is available
      const dm = await storage.getUserById(dmId);
      if (!dm || dm.role !== "decision_maker") {
        return res.status(404).json({ message: "Decision maker not found" });
      }

      // Check if slot is still available
      const existingBooking = await storage.getCallByTime(
        dmId,
        new Date(startTime),
      );
      if (existingBooking) {
        return res
          .status(409)
          .json({ message: "This time slot is no longer available" });
      }

      // Check Google Calendar integration and availability
      let googleCalendarEventId = null;
      let googleMeetLink = null;
      if (
        currentUser.calendarIntegrationEnabled &&
        currentUser.googleCalendarTokens
      ) {
        try {
          // Set up Google Calendar with user's tokens
          const { setCredentials, createCalendarEvent, refreshAccessToken } =
            await import("./google-calendar");

          // Check if token is expired and refresh if needed
          if (
            currentUser.googleCalendarTokens.expiry_date &&
            new Date(currentUser.googleCalendarTokens.expiry_date) < new Date()
          ) {
            console.log("Google Calendar token expired, refreshing...");
            try {
              await refreshAccessToken(currentUser.id, storage);
              // Get updated user with new tokens
              const updatedUser = await storage.getUser(currentUser.id);
              currentUser.googleCalendarTokens =
                updatedUser.googleCalendarTokens;
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              // If refresh fails, create booking without Google Calendar integration
              const booking = await storage.createCall({
                salesRepId: currentUser.id,
                decisionMakerId: dmId,
                scheduledAt: new Date(startTime),
                endTime: new Date(endTime),
                status: "scheduled",
                agenda: agenda || "Business discussion",
                notes: notes || "",
                company: dm.company,
                platform: "calendar_booking",
                decisionMakerName: `${dm.firstName} ${dm.lastName}`,
              });

              // Send booking confirmation emails (fallback case)
              try {
                const scheduledDate = new Date(startTime);
                const callDate = scheduledDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const callTime = scheduledDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const timezone = "America/New_York";

                // Send confirmation email to sales rep
                await sendBookingConfirmationToRep(
                  currentUser.email,
                  currentUser.firstName,
                  `${dm.firstName} ${dm.lastName}`,
                  dm.firstName,
                  dm.jobTitle || "Decision Maker",
                  dm.company || "Company",
                  callDate,
                  callTime,
                  timezone,
                  null, // No Google Meet link in fallback case
                );

                // Send confirmation email to decision maker
                await sendBookingConfirmationToDM(
                  dm.email,
                  dm.firstName,
                  `${currentUser.firstName} ${currentUser.lastName}`,
                  currentUser.jobTitle || "Sales Representative",
                  currentUser.company || "Company",
                  callDate,
                  callTime,
                  timezone,
                  null, // No Google Meet link in fallback case
                );

                console.log(
                  "Booking confirmation emails sent successfully (fallback case)",
                );
              } catch (emailError) {
                console.error(
                  "Error sending booking confirmation emails (fallback):",
                  emailError,
                );
                // Don't fail the booking if email fails
              }

              return res.status(201).json({
                success: true,
                booking: {
                  id: booking.id,
                  dmName: `${dm.firstName} ${dm.lastName}`,
                  startTime,
                  endTime,
                  status: "scheduled",
                  agenda,
                  confirmationCode: `MTG-${booking.id.slice(-6).toUpperCase()}`,
                  calendarIntegrated: false,
                  warning:
                    "Google Calendar integration temporarily unavailable. Please reconnect your calendar.",
                },
                message:
                  "Meeting booked successfully (calendar integration unavailable)",
              });
            }
          }

          setCredentials(currentUser.googleCalendarTokens);

          console.log("Creating Google Calendar event...");

          // Create Google Calendar event directly (skip conflict checking for now)
          const calendarEvent = await createCalendarEvent({
            summary: `Meeting with ${dm.firstName} ${dm.lastName}`,
            description: `Business Meeting\n\nAgenda: ${agenda || "Business discussion"}\nNotes: ${notes || ""}\n\nDM: ${dm.firstName} ${dm.lastName} (${dm.email})\nCompany: ${dm.company}`,
            start: {
              dateTime: startTime,
              timeZone: "America/New_York", // You can make this configurable
            },
            end: {
              dateTime: endTime,
              timeZone: "America/New_York",
            },
            attendees: [
              {
                email: dm.email,
                displayName: `${dm.firstName} ${dm.lastName}`,
              },
            ],
          });

          googleCalendarEventId = calendarEvent.id;
          console.log("Google Calendar event created:", googleCalendarEventId);

          // Extract Google Meet link from calendar event
          googleMeetLink =
            calendarEvent.hangoutLink ||
            calendarEvent.conferenceData?.entryPoints?.find(
              (ep) => ep.entryPointType === "video",
            )?.uri;
          console.log("Google Meet link:", googleMeetLink);
        } catch (calendarError) {
          console.error("Google Calendar integration error:", calendarError);
          // Continue without Google Calendar integration but log the error
        }
      }

      // Create the meeting booking
      const booking = await storage.createCall({
        salesRepId: currentUser.id,
        decisionMakerId: dmId,
        scheduledAt: new Date(startTime),
        endTime: new Date(endTime),
        status: "scheduled",
        agenda: agenda || "Business discussion",
        notes: notes || "",
        company: dm.company,
        platform: "calendar_booking",
        googleCalendarEventId: googleCalendarEventId,
        googleMeetLink: googleMeetLink,
        decisionMakerName: `${dm.firstName} ${dm.lastName}`,
      });

      // Log the booking activity
      await storage.createActivityLog({
        userId: currentUser.id,
        action: "BOOK_MEETING",
        entityType: "call",
        entityId: booking.id,
        details: `Booked meeting with ${dm.firstName} ${dm.lastName} for ${startTime}${googleCalendarEventId ? " (Google Calendar event created)" : ""}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Send booking confirmation emails
      try {
        const scheduledDate = new Date(startTime);
        const callDate = scheduledDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const callTime = scheduledDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const timezone = "America/New_York"; // You can make this configurable based on user preferences

        // Send confirmation email to sales rep
        await sendBookingConfirmationToRep(
          currentUser.email,
          currentUser.firstName,
          `${dm.firstName} ${dm.lastName}`,
          dm.firstName,
          dm.jobTitle || "Decision Maker",
          dm.company || "Company",
          callDate,
          callTime,
          timezone,
          googleMeetLink,
        );

        // Send confirmation email to decision maker
        await sendBookingConfirmationToDM(
          dm.email,
          dm.firstName,
          `${currentUser.firstName} ${currentUser.lastName}`,
          currentUser.jobTitle || "Sales Representative",
          currentUser.company || "Company",
          callDate,
          callTime,
          timezone,
          googleMeetLink,
        );

        console.log("Booking confirmation emails sent successfully");
      } catch (emailError) {
        console.error("Error sending booking confirmation emails:", emailError);
        // Don't fail the booking if email fails
      }

      res.status(201).json({
        success: true,
        booking: {
          id: booking.id,
          dmName: `${dm.firstName} ${dm.lastName}`,
          startTime,
          endTime,
          status: "scheduled",
          agenda,
          confirmationCode: `MTG-${booking.id.slice(-6).toUpperCase()}`,
          googleCalendarEventId,
          googleMeetLink,
          calendarIntegrated: !!googleCalendarEventId,
        },
        message: `Meeting booked successfully${googleCalendarEventId ? " and added to your Google Calendar" : ""}`,
      });
    } catch (error) {
      console.error("Error booking meeting slot:", error);
      res.status(500).json({ message: "Failed to book meeting slot" });
    }
  });

  // Cancel a booked meeting
  app.delete(
    "/api/calendar/cancel-booking/:bookingId",
    authenticateToken,
    async (req, res) => {
      try {
        const { bookingId } = req.params;
        const { reason } = req.body;
        const currentUser = await storage.getUserById(req.user!.userId);

        const booking = await storage.getCallById(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify user can cancel this booking
        if (
          booking.salesRepId !== currentUser.id &&
          currentUser.role !== "enterprise_admin"
        ) {
          return res.status(403).json({
            message: "You don't have permission to cancel this booking",
          });
        }

        // Cancel Google Calendar event if it exists
        if (
          booking.googleCalendarEventId &&
          currentUser.calendarIntegrationEnabled &&
          currentUser.googleCalendarTokens
        ) {
          try {
            const { setCredentials, deleteCalendarEvent } = await import(
              "./google-calendar"
            );
            setCredentials(currentUser.googleCalendarTokens);

            await deleteCalendarEvent(booking.googleCalendarEventId);
            console.log(
              "Google Calendar event deleted:",
              booking.googleCalendarEventId,
            );
          } catch (calendarError) {
            console.error(
              "Error deleting Google Calendar event:",
              calendarError,
            );
            // Continue with cancellation even if Google Calendar deletion fails
          }
        }

        // Update booking status
        await storage.updateCall(bookingId, {
          status: "cancelled",
          cancellationReason: reason || "Cancelled by user",
          cancelledAt: new Date(),
          cancelledBy: currentUser.id,
        });

        // Log the cancellation
        await storage.createActivityLog({
          userId: currentUser.id,
          action: "CANCEL_MEETING",
          entityType: "call",
          entityId: bookingId,
          details: `Cancelled meeting: ${reason || "No reason provided"}${booking.googleCalendarEventId ? " (Google Calendar event deleted)" : ""}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({
          success: true,
          message: "Meeting cancelled successfully",
        });
      } catch (error) {
        console.error("Error cancelling booking:", error);
        res.status(500).json({ message: "Failed to cancel booking" });
      }
    },
  );

  // Get user's flag count
  app.get("/api/user/flags-count", authenticateToken, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.userId);

      let flagCount = 0;
      if (currentUser.role === "decision_maker") {
        // Get flags raised against this DM
        const flags = await storage.getDMFlags(currentUser.id);
        flagCount = flags.filter(
          (flag) => flag.status === "open" || flag.status === "pending",
        ).length;
      } else if (currentUser.role === "sales_rep") {
        // Use the flagsReceived field from the User collection for sales reps
        flagCount = currentUser.flagsReceived || 0;
      }

      res.json({ flags: flagCount });
    } catch (error) {
      console.error("Error getting user flag count:", error);
      res.status(500).json({ message: "Failed to get flag count" });
    }
  });

  // Update user notification settings
  app.put("/api/user/notifications", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const notificationSettings = req.body;

      // Update user with notification settings
      const updatedUser = await storage.updateUser(userId, {
        notificationSettings,
        updatedAt: new Date(),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Notification settings updated for user:", userId);
      res.json({
        success: true,
        message: "Notification settings updated successfully",
        settings: notificationSettings,
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({
        message: "Failed to update notification settings",
        error: error.message,
      });
    }
  });

  // Update user privacy settings
  app.put("/api/user/privacy", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const privacySettings = req.body;

      // Update user with privacy settings
      const updatedUser = await storage.updateUser(userId, {
        privacySettings,
        updatedAt: new Date(),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Privacy settings updated for user:", userId);
      res.json({
        success: true,
        message: "Privacy settings updated successfully",
        settings: privacySettings,
      });
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      res.status(500).json({
        message: "Failed to update privacy settings",
        error: error.message,
      });
    }
  });

  // Get user's upcoming meetings
  app.get("/api/calendar/my-meetings", authenticateToken, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.userId);
      const { startDate, endDate } = req.query;

      let meetings;
      if (currentUser.role === "sales_rep") {
        meetings = await storage.getCallsByUserId(currentUser.id);
      } else if (currentUser.role === "decision_maker") {
        meetings = await storage.getCallsByDMId(currentUser.id);
      } else {
        // Enterprise admin can see all company meetings
        meetings = await storage.getCallLogsByCompany(
          currentUser.companyDomain,
        );
      }

      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        meetings = meetings.filter((meeting) => {
          const meetingDate = new Date(meeting.scheduledAt);
          return meetingDate >= start && meetingDate <= end;
        });
      }

      // Enhance meetings with participant details
      const enhancedMeetings = await Promise.all(
        meetings.map(async (meeting) => {
          const [salesRep, dm] = await Promise.all([
            storage.getUserById(meeting.salesRepId),
            storage.getUserById(meeting.decisionMakerId),
          ]);

          return {
            id: meeting.id,
            title: meeting.agenda || "Business Meeting",
            startTime: meeting.scheduledAt,
            endTime: meeting.endTime,
            status: meeting.status,
            salesRep: salesRep
              ? {
                  id: salesRep.id,
                  name: `${salesRep.firstName} ${salesRep.lastName}`,
                  email: salesRep.email,
                }
              : null,
            decisionMaker: dm
              ? {
                  id: dm.id,
                  name: `${dm.firstName} ${dm.lastName}`,
                  email: dm.email,
                  title: dm.jobTitle,
                }
              : null,
            notes: meeting.notes,
            platform: meeting.platform || "in-person",
            confirmationCode: `MTG-${meeting.id.slice(-6).toUpperCase()}`,
          };
        }),
      );

      res.json(enhancedMeetings);
    } catch (error) {
      console.error("Error getting user meetings:", error);
      res.status(500).json({ message: "Failed to get meetings" });
    }
  });

  // ===== ENTERPRISE ADMIN ROUTES =====

  // Get enterprise analytics
  app.get(
    "/api/enterprise-admin/analytics",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = req.enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        // Get company users analytics
        const companyUsers =
          await storage.getUsersByCompanyDomain(companyDomain);
        const totalUsers = companyUsers.length;
        const salesReps = companyUsers.filter(
          (u) => u.role === "sales_rep",
        ).length;
        const decisionMakers = companyUsers.filter(
          (u) => u.role === "decision_maker",
        ).length;
        const activeUsers = companyUsers.filter((u) => u.isActive).length;

        // Get current month data
        const currentMonth = new Date();
        currentMonth.setDate(1);
        const newUsersThisMonth = companyUsers.filter(
          (u) => new Date(u.createdAt) >= currentMonth,
        ).length;

        // Get meeting analytics for company
        const companyUserIds = companyUsers.map((u) => u.id);
        const allCalls = await storage.getAllCalls();
        const companyCalls = allCalls.filter(
          (call) =>
            companyUserIds.includes(call.salesRepId) ||
            companyUserIds.includes(call.decisionMakerId),
        );

        const monthlyMeetings = companyCalls.filter(
          (call) => new Date(call.createdAt) >= currentMonth,
        ).length;

        const scheduledMeetings = companyCalls.filter(
          (call) => call.status === "scheduled",
        ).length;
        const completedMeetings = companyCalls.filter(
          (call) => call.status === "completed",
        ).length;
        const completionRate =
          companyCalls.length > 0
            ? Math.round((completedMeetings / companyCalls.length) * 100)
            : 0;

        res.json({
          totalUsers,
          salesReps,
          decisionMakers,
          activeUsers,
          activeSalesReps: salesReps,
          newUsersThisMonth,
          monthlyMeetings,
          scheduledMeetings,
          totalInvitations:
            await storage.getCompanyInvitationsCount(companyDomain),
          meetingTrend: 15, // Mock trend data
          salesRepGrowth: 8,
          completionRate,
        });
      } catch (error) {
        console.error("Error getting enterprise analytics:", error);
        res.status(500).json({ message: "Failed to get analytics" });
      }
    },
  );

  // Get company users
  app.get(
    "/api/enterprise-admin/users",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = req.enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;

        const users = await storage.getUsersByCompanyDomain(companyDomain);

        // Filter out sensitive information
        const filteredUsers = users.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          jobTitle: user.jobTitle,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        }));

        res.json(filteredUsers);
      } catch (error) {
        console.error("Error getting company users:", error);
        res.status(500).json({ message: "Failed to get users" });
      }
    },
  );

  // Create enterprise user
  app.post(
    "/api/enterprise-admin/create-user",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = req.enterpriseUser;
        const companyDomain = enterpriseUser.companyDomain;
        const {
          email,
          firstName,
          lastName,
          role,
          jobTitle,
          department,
          password,
        } = req.body;

        // Verify email domain matches company domain
        const emailDomain = email.split("@")[1];
        if (emailDomain !== companyDomain) {
          return res.status(400).json({
            message: `Email domain must match company domain: ${companyDomain}`,
          });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res
            .status(400)
            .json({ message: "User with this email already exists" });
        }

        // Validate password requirements
        if (!password || password.length < 8) {
          return res
            .status(400)
            .json({ message: "Password must be at least 8 characters long" });
        }

        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(password)) {
          return res.status(400).json({
            message:
              "Password must contain uppercase, lowercase, number and special character",
          });
        }

        // Create user with enterprise settings
        const userData = {
          email,
          firstName,
          lastName,
          role,
          jobTitle: jobTitle || "",
          department: department || "",
          companyDomain,
          domainVerified: true,
          isActive: true,
          packageType: "enterprise",
          standing: "excellent",
          password: password,
          requirePasswordChange: false,
        };

        const newUser = await storage.createUser(userData);

        // Log enterprise activity
        await storage.createActivityLog({
          action: "CREATE_ENTERPRISE_USER",
          performedBy: enterpriseUser.id,
          targetUser: newUser.id,
          details: `Created enterprise user: ${email}`,
          companyDomain,
        });

        res.status(201).json({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          temporaryPassword: "TempPass123!", // Return temp password for setup
        });
      } catch (error) {
        console.error("Error creating enterprise user:", error);
        res.status(500).json({ message: "Failed to create user" });
      }
    },
  );

  // Update user status
  app.patch(
    "/api/enterprise-admin/users/:userId/status",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = req.enterpriseUser;
        const { userId } = req.params;
        const { isActive } = req.body;

        // Verify user belongs to same company domain
        const targetUser = await storage.getUser(userId);
        if (
          !targetUser ||
          targetUser.companyDomain !== enterpriseUser.companyDomain
        ) {
          return res
            .status(404)
            .json({ message: "User not found or access denied" });
        }

        // Update user status
        const updatedUser = await storage.updateUser(userId, { isActive });

        // Log enterprise activity
        await storage.createActivityLog({
          action: "UPDATE_USER_STATUS",
          performedBy: enterpriseUser.id,
          targetUser: userId,
          details: `${isActive ? "Activated" : "Deactivated"} user: ${targetUser.email}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, user: updatedUser });
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Failed to update user status" });
      }
    },
  );

  // Delete enterprise user
  app.delete(
    "/api/enterprise-admin/users/:userId",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = req.enterpriseUser;
        const { userId } = req.params;

        // Verify user belongs to same company domain
        const targetUser = await storage.getUser(userId);
        if (
          !targetUser ||
          targetUser.companyDomain !== enterpriseUser.companyDomain
        ) {
          return res
            .status(404)
            .json({ message: "User not found or access denied" });
        }

        // Prevent deletion of enterprise admin users
        if (targetUser.role === "enterprise_admin") {
          return res
            .status(400)
            .json({ message: "Cannot delete enterprise admin users" });
        }

        // Delete the user
        const deleted = await storage.deleteUser(userId);
        if (!deleted) {
          return res.status(500).json({ message: "Failed to delete user" });
        }

        // Log enterprise activity
        await storage.createActivityLog({
          action: "DELETE_USER",
          performedBy: enterpriseUser.id,
          targetUser: userId,
          details: `Deleted user: ${targetUser.email}`,
          companyDomain: enterpriseUser.companyDomain,
        });

        res.json({ success: true, message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    },
  );

  // Get domain settings
  app.get(
    "/api/enterprise-admin/domain-settings",
    requireEnterpriseAdmin,
    async (req, res) => {
      try {
        const enterpriseUser = req.enterpriseUser;

        res.json({
          verifiedDomain: enterpriseUser.companyDomain,
          autoApproveUsers: true,
          domainRestrictions: true,
          verificationDate: enterpriseUser.domainVerifiedAt || new Date(),
          settings: {
            requireMFA: false,
            sessionTimeout: 8, // hours
            allowGuestAccess: false,
          },
        });
      } catch (error) {
        console.error("Error getting domain settings:", error);
        res.status(500).json({ message: "Failed to get domain settings" });
      }
    },
  );

  // ===== DECISION MAKER SIGNUP ROUTES =====

  // Save decision maker personal information
  app.post("/api/decision-maker/personal-info", async (req, res) => {
    try {
      console.log("Received decision maker signup request:", req.body);
      const validatedData = decisionMakerPersonalInfoSchema.parse(req.body);
      console.log("Validated decision maker data:", validatedData);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log("Email already exists:", validatedData.email);
        return res
          .status(400)
          .json({ message: "Email address is already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Determine verification status based on LinkedIn name matching
      const linkedinNameMatches = req.body.linkedinNameMatches || false;
      let verificationStatus = "unverified";
      let verifiedVia = null;

      if (req.body.linkedinVerified && linkedinNameMatches) {
        // Condition 1: LinkedIn name matches - automatically verified
        verificationStatus = "verified";
        verifiedVia = "linkedin";
        console.log("User automatically verified via LinkedIn name match");
      }

      // Save decision maker data
      const userData = {
        email: validatedData.email,
        password: hashedPassword,
        role: "decision_maker",
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        linkedinUrl: validatedData.linkedinUrl,
        linkedinVerified: req.body.linkedinVerified || false,
        companyDomain: validatedData.companyDomain,
        calendarIntegrationEnabled: false, // Default: calendar disconnected for new DMs
        isActive: false, // Mark as inactive until signup is complete
        verification_status: verificationStatus,
        verified_via: verifiedVia,
      };

      // Check for invitation context from frontend
      if (req.body.invitationContext) {
        const { salesRepId, invitationId } = req.body.invitationContext;
        if (salesRepId) {
          userData.invitedBy = salesRepId;
          userData.invitationStatus = "accepted";
          userData.invitedAt = new Date();
          console.log(`DM invited by sales rep: ${salesRepId}`);
        }
      }

      console.log("Creating decision maker with data:", userData);
      const user = await storage.createUser(userData);
      console.log("Decision maker created successfully:", user.id);

      // Create Invitation record if DM was invited by a sales rep
      if (req.body.invitationContext && req.body.invitationContext.salesRepId) {
        const { salesRepId } = req.body.invitationContext;
        try {
          const invitationData = {
            salesRepId: salesRepId,
            repId: salesRepId, // For backward compatibility
            dmId: user.id,
            status: "accepted",
            sentAt: new Date(),
            acceptedAt: new Date(),
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            decisionMakerEmail: userData.email,
            decisionMakerName: `${userData.firstName} ${userData.lastName}`,
          };

          await storage.createInvitation(invitationData);
          console.log(
            `✅ Invitation record created linking DM ${user.id} to sales rep ${salesRepId}`,
          );
        } catch (error) {
          console.error("❌ Failed to create invitation record:", error);
          // Don't fail the user creation, just log the error
        }
      }

      // Store user ID in session for multi-step process
      (req.session as any).signupUserId = user.id;

      res.json({
        success: true,
        message: "Personal information saved",
        userId: user.id,
        verificationStatus: verificationStatus,
        needsEmailVerification: !linkedinNameMatches, // If LinkedIn name doesn't match, email verification will be needed
      });
    } catch (error: any) {
      console.error("Decision maker signup error:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to save personal information",
        error: error.message,
      });
    }
  });

  // Send email verification for decision makers
  app.post("/api/decision-maker/send-email-verification", async (req, res) => {
    try {
      const { email, userId: bodyUserId } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get user ID from session or request body (fallback for VPS deployment)
      const userId = (req.session as any)?.signupUserId || bodyUserId;
      console.log("🔧 Email verification - Session userId:", (req.session as any)?.signupUserId);
      console.log("🔧 Email verification - Body userId:", bodyUserId);
      console.log("🔧 Email verification - Final userId:", userId);
      
      if (!userId) {
        return res.status(400).json({ message: "No active signup session found or user ID provided" });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store verification code in user record
      await storage.updateUser(userId, {
        emailVerificationToken: verificationCode,
        emailVerificationTokenExpiry: verificationExpiry,
      });

      // Send verification email
      const { sendWorkEmailVerification } = await import("./email-service");
      await sendWorkEmailVerification(email, verificationCode);

      res.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      res.status(500).json({
        message: "Failed to send verification email",
        error: error.message,
      });
    }
  });

  // Verify email code for decision makers
  app.post("/api/decision-maker/verify-email-code", async (req, res) => {
    try {
      const { code, email, userId: bodyUserId } = req.body;
      
      if (!code || !email) {
        return res.status(400).json({ message: "Code and email are required" });
      }

      // Get user ID from session or request body (fallback for VPS deployment)
      const userId = (req.session as any)?.signupUserId || bodyUserId;
      console.log("🔧 Email verification code - Session userId:", (req.session as any)?.signupUserId);
      console.log("🔧 Email verification code - Body userId:", bodyUserId);
      console.log("🔧 Email verification code - Final userId:", userId);
      
      if (!userId) {
        return res.status(400).json({ message: "No active signup session found or user ID provided" });
      }

      // Get user and verify code
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if code matches and hasn't expired
      if (
        user.emailVerificationToken !== code ||
        !user.emailVerificationTokenExpiry ||
        new Date() > new Date(user.emailVerificationTokenExpiry)
      ) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Update user as verified via domain
      await storage.updateUser(userId, {
        emailVerified: true,
        verification_status: "verified",
        verified_via: "domain",
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      });

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error: any) {
      console.error("Error verifying email code:", error);
      res.status(500).json({
        message: "Failed to verify email code",
        error: error.message,
      });
    }
  });

  // Send email verification for sales rep
  app.post("/api/sales-rep/send-email-verification", async (req, res) => {
    try {
      const { email, userId: bodyUserId } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get user ID from session or request body (fallback for VPS deployment)
      const userId = (req.session as any)?.signupUserId || bodyUserId;
      console.log("🔧 Sales Rep Email verification - Session userId:", (req.session as any)?.signupUserId);
      console.log("🔧 Sales Rep Email verification - Body userId:", bodyUserId);
      console.log("🔧 Sales Rep Email verification - Final userId:", userId);
      
      if (!userId) {
        return res.status(400).json({ message: "No active signup session found or user ID provided" });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store verification code in user record
      await storage.updateUser(userId, {
        emailVerificationToken: verificationCode,
        emailVerificationTokenExpiry: verificationExpiry,
      });

      // Send verification email
      const { sendWorkEmailVerification } = await import("./email-service");
      await sendWorkEmailVerification(email, verificationCode);

      res.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      res.status(500).json({
        message: "Failed to send verification email",
        error: error.message,
      });
    }
  });

  // Verify email code for sales rep
  app.post("/api/sales-rep/verify-email-code", async (req, res) => {
    try {
      const { code, email, userId: bodyUserId } = req.body;
      
      if (!code || !email) {
        return res.status(400).json({ message: "Code and email are required" });
      }

      // Get user ID from session or request body (fallback for VPS deployment)
      const userId = (req.session as any)?.signupUserId || bodyUserId;
      console.log("🔧 Sales Rep Email verification code - Session userId:", (req.session as any)?.signupUserId);
      console.log("🔧 Sales Rep Email verification code - Body userId:", bodyUserId);
      console.log("🔧 Sales Rep Email verification code - Final userId:", userId);
      
      if (!userId) {
        return res.status(400).json({ message: "No active signup session found or user ID provided" });
      }

      // Get user and verify code
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if code matches and hasn't expired
      if (
        user.emailVerificationToken !== code ||
        !user.emailVerificationTokenExpiry ||
        new Date() > new Date(user.emailVerificationTokenExpiry)
      ) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Update user as verified via domain
      await storage.updateUser(userId, {
        emailVerified: true,
        verification_status: "verified",
        verified_via: "domain",
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      });

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error: any) {
      console.error("Error verifying email code:", error);
      res.status(500).json({
        message: "Failed to verify email code",
        error: error.message,
      });
    }
  });

  // Save decision maker professional background
  app.post("/api/decision-maker/professional-info", async (req, res) => {
    try {
      const validatedData = decisionMakerProfessionalSchema.parse(req.body);

      // Get user ID from session or request body (VPS fallback)
      const userId = (req.session as any)?.signupUserId || req.body.userId;
      console.log("🚀 BACKEND DM PROFESSIONAL INFO - Session userId:", (req.session as any)?.signupUserId);
      console.log("🚀 BACKEND DM PROFESSIONAL INFO - Body userId:", req.body.userId);
      console.log("🚀 BACKEND DM PROFESSIONAL INFO - Using userId:", userId);
      
      if (!userId) {
        return res
          .status(400)
          .json({ message: "Please complete personal information first" });
      }

      // Determine job title + status
      let jobTitleStatus: "approved" | "pending" | "rejected" | "none" = "approved";
      let submittedCustomJobTitle: string | undefined = undefined;

      if (validatedData.jobTitle === "Other") {
        jobTitleStatus = "pending";
        submittedCustomJobTitle = validatedData.customJobTitle?.trim();
      }

      const updatedUser = await storage.updateUser(userId, {
        jobTitle: validatedData.jobTitle, // remains enum-valid ("Other") until approval
        jobTitleStatus,
        submittedCustomJobTitle,
        company: validatedData.company,
        industry: validatedData.industry,
        companySize: validatedData.companySize,
        yearsInRole: validatedData.yearsInRole,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, message: "Professional information saved" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res
        .status(500)
        .json({ message: "Failed to save professional information" });
    }
  });

  // Save decision maker availability preferences
  app.post("/api/decision-maker/availability", async (req, res) => {
    try {
      const validatedData = decisionMakerAvailabilitySchema.parse(req.body);

      // Get user ID from session or request body (VPS fallback)
      const userId = (req.session as any)?.signupUserId || req.body.userId;
      console.log("🚀 BACKEND DM AVAILABILITY - Session userId:", (req.session as any)?.signupUserId);
      console.log("🚀 BACKEND DM AVAILABILITY - Body userId:", req.body.userId);
      console.log("🚀 BACKEND DM AVAILABILITY - Using userId:", userId);
      
      if (!userId) {
        return res
          .status(400)
          .json({ message: "Please complete previous steps first" });
      }

      // Store availability preferences (in a real app, this would go to a separate table)
      // For now, we'll store as JSON in user record or handle differently
      const updatedUser = await storage.updateUser(userId, {
        // Store availability as additional fields or JSON
        availabilityData: JSON.stringify(validatedData),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, message: "Availability preferences saved" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res
        .status(500)
        .json({ message: "Failed to save availability preferences" });
    }
  });

  // Save decision maker nominations and complete registration
  app.post("/api/decision-maker/nominate", async (req, res) => {
    try {
      const validatedData = decisionMakerNominationSchema.parse(req.body);

      // Get user ID from session or request body (VPS fallback)
      const userId = (req.session as any)?.signupUserId || req.body.userId;
      console.log("🚀 BACKEND DM NOMINATE - Session userId:", (req.session as any)?.signupUserId);
      console.log("🚀 BACKEND DM NOMINATE - Body userId:", req.body.userId);
      console.log("🚀 BACKEND DM NOMINATE - Using userId:", userId);
      
      if (!userId) {
        return res
          .status(400)
          .json({ message: "Please complete previous steps first" });
      }

      // Get the user to check if they were invited
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Store nominations (in a real app, this would create nomination records)
      // For now, we'll store as JSON or handle differently
      const nominations = [];
      if (validatedData.nominatedSalesReps) {
        for (const rep of validatedData.nominatedSalesReps) {
          if (rep.name && rep.email) {
            nominations.push({
              nominatorId: userId,
              name: rep.name,
              email: rep.email,
              company: rep.company,
              referralReason: rep.referralReason,
              status: "pending",
            });
          }
        }
      }

      // Complete registration by setting packageType to free and activating account
      // But check verification status first
      const updateData: any = {
        packageType: "free", // All DMs get free plan by default
        isActive: true,
      };

      // If user is not verified, add to manual verification list
      if (user.verification_status === "unverified") {
        console.log(`User ${userId} completing signup without verification - adding to manual verification list`);
        
        // Import ManualVerification model
        const { connectToMongoDB, ManualVerification } = await import("./mongodb");
        await connectToMongoDB();

        // Check if already in manual verification list
        const existingEntry = await ManualVerification.findOne({ userId: userId });
        if (!existingEntry) {
          await ManualVerification.create({
            userId: userId,
            userEmail: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            linkedinUrl: user.linkedinUrl,
            companyDomain: user.companyDomain,
            linkedinVerificationFailed: !user.linkedinVerified,
            emailVerificationFailed: !user.emailVerified,
            status: "pending",
          });
          console.log(`Added user ${userId} to manual verification queue`);
        }
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create initial monthly call limit of 3 calls for the DM
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      try {
        await storage.getMonthlyCallLimit(
          userId,
          "decision_maker",
          currentMonth,
        );
        console.log(
          `Monthly call limit (3 calls) initialized for DM ${userId}`,
        );
      } catch (error) {
        console.error("Error initializing monthly call limit:", error);
      }

      // Clear signup session now that signup is fully completed
      delete (req.session as any).signupUserId;

      res.json({
        success: true,
        message:
          "Registration completed successfully! You have been allocated 3 calls per month.",
        nominations: nominations,
        callsAllocated: 3,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save nominations" });
    }
  });

  // Complete decision maker availability preferences
  app.post("/api/decision-maker/availability", async (req, res) => {
    try {
      console.log("Request body:", req.body);

      // Transform the data to match the expected schema
      const transformedData = {
        availabilityType: req.body.availabilityType || "flexible",
        preferredDays: req.body.availableDays || [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        preferredTimes: req.body.preferredTimes || [
          "9:00 AM - 11:00 AM",
          "11:00 AM - 1:00 PM",
          "1:00 PM - 3:00 PM",
          "3:00 PM - 5:00 PM",
          "5:00 PM - 7:00 PM",
          "7:00 PM - 9:00 PM",
        ],
        timezone:
          req.body.preferredTimeZone ||
          req.body.timezone ||
          req.body.timeZone ||
          "UTC-7", // Provide a fallback
        callDuration: "30", // Default to 30 minutes
      };

      console.log("Transformed data:", transformedData);

      const validatedData = z
        .object({
          availabilityType: z.enum([
            "flexible",
            "specific_times",
            "by_appointment",
          ]),
          preferredDays: z.array(z.string()).optional(),
          preferredTimes: z.array(z.string()).optional(),
          timezone: z.string().min(1, "Please select your timezone"),
          callDuration: z.enum(["15", "30", "45"]).default("30"),
        })
        .safeParse(transformedData);

      if (!validatedData.success) {
        console.log("Validation failed:", validatedData.error);
        return res.status(400).json({
          message: "Validation failed",
          errors: validatedData.error.errors,
        });
      }

      const data = validatedData.data;

      // Get user ID from session
      const userId = (req.session as any)?.signupUserId;
      if (!userId) {
        return res
          .status(400)
          .json({ message: "Please complete previous steps first" });
      }

      // Update user with availability preferences
      const updatedUser = await storage.updateUser(userId, {
        availabilityPreferences: {
          availabilityType: data.availabilityType,
          preferredDays: data.preferredDays,
          preferredTimes: data.preferredTimes,
          timezone: data.timezone,
          callDuration: data.callDuration,
          // Keep backward compatibility
          preferredTimeZone: data.timezone,
          availableDays: data.preferredDays,
          maxCallsPerWeek: "3",
        },
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        success: true,
        message: "Availability preferences saved successfully",
        user: updatedUser,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      }
      res
        .status(500)
        .json({ message: "Failed to save availability preferences" });
    }
  });

  // Legacy package endpoint - now redirects to nominate (package selection removed)
  app.post("/api/decision-maker/package", async (req, res) => {
    return res.status(400).json({
      message:
        "Package selection has been removed. All decision makers get 3 free calls per month.",
      redirect: "/signup/decision-maker/nominate",
    });
  });

  // ===== LOGIN ROUTE =====

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("Login attempt:", {
        email,
        password: password ? "***" : "missing",
      });

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      console.log(
        "User found:",
        user
          ? {
              id: user.id,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
            }
          : "NOT FOUND",
      );

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if account is active (completed signup)
      if (!user.isActive) {
        console.log("User account inactive");
        return res
          .status(401)
          .json({ message: "Please complete your signup process first" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("Password valid:", isPasswordValid);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check email verification for sales reps
      if (user.role === "sales_rep") {
        // New verification system: Check verification_status first
        if (user.verification_status === "unverified") {
          console.log("Sales rep not verified - restricted access");
          return res.status(403).json({
            message: "Your account is pending verification. You will receive email notification once approved.",
            needsVerification: true,
            verificationStatus: "unverified"
          });
        }
        
        // Backward compatibility: Also check old emailVerified field for existing users
        if (!user.emailVerified && (!user.verification_status || user.verification_status === "pending")) {
          console.log("User email not verified");
          return res.status(401).json({ 
            message: "Please verify your email address before logging in. Check your inbox for the verification link.",
            emailVerificationRequired: true 
          });
        }
      }

      // Check verification status for decision makers
      if (user.role === "decision_maker" && user.verification_status === "unverified") {
        console.log("Decision maker not verified - restricted access");
        return res.status(403).json({
          message: "Your account is pending verification. You will receive email notification once approved.",
          needsVerification: true,
          verificationStatus: "unverified"
        });
      }

      // Check for user suspension (especially for sales reps with 3+ flags)
      if (user.role === "sales_rep") {
        const suspensionStatus = await storage.checkUserSuspensionStatus(
          user.id,
        );
        if (suspensionStatus.isSuspended) {
          console.log(
            `Sales rep ${user.email} attempted login while suspended`,
          );
          return res.status(403).json({
            message: suspensionStatus.message,
            suspended: true,
            suspensionDetails: suspensionStatus.suspension,
          });
        }
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      console.log("Login successful for:", user.email, "Token generated");

      // Log login activity
      await storage.createActivityLog({
        userId: user.id,
        action: "LOGIN",
        entityType: "user",
        entityId: user.id,
        details: `User logged in: ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Return user data (excluding password)
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: "Login successful",
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed", error: error.message });
    }
  });

  // Logout route (JWT-based - client handles token removal)
  app.post("/api/logout", authenticateToken, async (req, res) => {
    console.log("Logout request received");

    // Log logout activity
    await storage.createActivityLog({
      userId: req.user!.userId,
      action: "LOGOUT",
      entityType: "user",
      entityId: req.user!.userId,
      details: `User logged out: ${req.user!.email}`,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // With JWT, logout is handled client-side by removing the token
    // Server doesn't need to do anything special unless implementing token blacklisting
    res.json({ success: true, message: "Logout successful" });
  });

  // ===== TEMPORARY ADMIN ENDPOINT FOR TESTING =====
  // Remove suspension from user (for testing purposes)
  app.post("/api/admin/remove-suspension/:email", async (req, res) => {
    try {
      const { email } = req.params;
      console.log(`Admin request to remove suspension for: ${email}`);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove suspension using MongoDB direct update
      const { connectToMongoDB, User } = await import("./mongodb");
      await connectToMongoDB();

      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        {
          $set: {
            "suspension.isActive": false,
            "suspension.endDate": new Date(),
            "suspension.reason": "Suspension removed via admin endpoint",
          },
        },
        { new: true },
      );

      console.log("Updated user suspension:", updatedUser?.suspension);

      console.log(`Suspension removed for user: ${email}`);
      res.json({
        success: true,
        message: "Suspension removed successfully",
        user: { email: updatedUser.email, role: updatedUser.role },
      });
    } catch (error) {
      console.error("Error removing suspension:", error);
      res.status(500).json({ message: "Failed to remove suspension" });
    }
  });

  // ===== DUPLICATE CURRENT USER ROUTE - REMOVED =====
  // JWT-based current user route is already implemented above

  // Check if user can book calls (monthly limit check)
  app.get("/api/user/can-book-calls", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userRole =
        user.role === "sales_rep" ? "sales_rep" : "decision_maker";
      const canBookResult = await storage.canUserBookCall(userId, userRole);

      res.json(canBookResult);
    } catch (error) {
      console.error("Error checking booking eligibility:", error);
      res.status(500).json({
        canBook: false,
        remainingCalls: 0,
        message: "Failed to check booking eligibility",
      });
    }
  });

  // ===== SALES REP DASHBOARD ROUTES =====

  // Get sales rep's invitations
  app.get("/api/sales-rep/invitations", authenticateToken, async (req, res) => {
    try {
      const invitations = await storage.getInvitationsByUserId(
        req.user!.userId,
      );
      res.json(invitations);
    } catch (error: any) {
      console.error("Get invitations error:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Get sales rep's remaining invitations
  app.get("/api/sales-rep/invitations/remaining", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const invitations = await storage.getInvitationsByUserId(req.user!.userId);
      const totalInvitations = invitations.length;

      // Get user's plan limits
      let maxInvitations = 3; // Default fallback
      try {
        const subscriptionPlans = await storage.getAllSubscriptionPlans();
        
        if (subscriptionPlans && subscriptionPlans.length > 0) {
          const userPlan = subscriptionPlans.find(plan => 
            plan.name.toLowerCase() === (user.packageType || '').toLowerCase() ||
            plan.name.toLowerCase().replace(/\s+/g, '-') === (user.packageType || '').toLowerCase()
          );
          
          if (userPlan) {
            maxInvitations = userPlan.maxInvitations;
          } else {
            // Fallback to hardcoded limits if plan not found in database
            const packageLimits = {
              free: 3,
              basic: 10,
              pro: 25,
              "pro-team": 50,
              enterprise: 500,
            };
            maxInvitations = packageLimits[user.packageType as keyof typeof packageLimits] || 3;
          }
        } else {
          // Fallback limits when no plans in database
          const packageLimits = {
            free: 3,
            basic: 10,
            pro: 25,
            "pro-team": 50,
            enterprise: 500,
          };
          maxInvitations = packageLimits[user.packageType as keyof typeof packageLimits] || 3;
        }
      } catch (planError) {
        console.error('Error fetching subscription plans for remaining invitations:', planError);
        // Use basic fallback if there's an error
        const packageLimits = {
          free: 3,
          basic: 10,
          pro: 25,
          "pro-team": 50,
          enterprise: 500,
        };
        maxInvitations = packageLimits[user.packageType as keyof typeof packageLimits] || 3;
      }

      const remainingInvitations = Math.max(0, maxInvitations - totalInvitations);

      res.json({
        remaining: remainingInvitations,
        used: totalInvitations,
        total: maxInvitations,
        planName: user.packageType || 'free'
      });
    } catch (error: any) {
      console.error("Get remaining invitations error:", error);
      res.status(500).json({ message: "Failed to fetch remaining invitations" });
    }
  });

  // Add more invitations for sales rep
  app.post("/api/sales-rep/invitations/add", authenticateToken, async (req, res) => {
    try {
      // Validate input using schema
      let validatedData;
      try {
        validatedData = addInvitationsSchema.parse(req.body);
      } catch (error: any) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors || []
        });
      }

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { invitations } = validatedData;
      // No need for additional validation since schema already validates

      // Get existing invitations and check limits
      const existingInvitations = await storage.getInvitationsByUserId(req.user!.userId);
      const totalInvitations = existingInvitations.length;

      // Get user's plan limits
      let maxInvitations = 3; // Default fallback
      try {
        const subscriptionPlans = await storage.getAllSubscriptionPlans();
        
        if (subscriptionPlans && subscriptionPlans.length > 0) {
          const userPlan = subscriptionPlans.find(plan => 
            plan.name.toLowerCase() === (user.packageType || '').toLowerCase() ||
            plan.name.toLowerCase().replace(/\s+/g, '-') === (user.packageType || '').toLowerCase()
          );
          
          if (userPlan) {
            maxInvitations = userPlan.maxInvitations;
          } else {
            const packageLimits = {
              free: 3,
              basic: 10,
              pro: 25,
              "pro-team": 50,
              enterprise: 500,
            };
            maxInvitations = packageLimits[user.packageType as keyof typeof packageLimits] || 3;
          }
        } else {
          const packageLimits = {
            free: 3,
            basic: 10,
            pro: 25,
            "pro-team": 50,
            enterprise: 500,
          };
          maxInvitations = packageLimits[user.packageType as keyof typeof packageLimits] || 3;
        }
      } catch (planError) {
        console.error('Error fetching subscription plans for add invitations:', planError);
        const packageLimits = {
          free: 3,
          basic: 10,
          pro: 25,
          "pro-team": 50,
          enterprise: 500,
        };
        maxInvitations = packageLimits[user.packageType as keyof typeof packageLimits] || 3;
      }

      // Check if adding these invitations would exceed the limit
      const remainingInvitations = Math.max(0, maxInvitations - totalInvitations);
      if (invitations.length > remainingInvitations) {
        return res.status(400).json({
          message: `Adding ${invitations.length} invitations would exceed your plan limit. You have ${remainingInvitations} invitations remaining.`,
          remaining: remainingInvitations,
          requested: invitations.length,
          limit: maxInvitations,
          planName: user.packageType || 'free'
        });
      }

      // Check for duplicate emails (case insensitive)
      const existingEmails = existingInvitations.map(inv => inv.decisionMakerEmail?.toLowerCase());
      const duplicates = invitations.filter(dm => 
        existingEmails.includes(dm.email.toLowerCase())
      );

      if (duplicates.length > 0) {
        return res.status(400).json({
          message: `Some email addresses have already been invited: ${duplicates.map(d => d.email).join(', ')}`,
          duplicates: duplicates.map(d => d.email)
        });
      }

      // Create invitations for each decision maker
      const newInvitations = [];
      const emailResults = [];

      for (const dm of invitations) {
        try {
          // Create invitation
          const invitation = await storage.createInvitation({
            salesRepId: req.user!.userId,
            decisionMakerEmail: dm.email,
            decisionMakerName: dm.name,
            decisionMakerJobTitle: dm.jobTitle,
            status: "pending",
          });
          newInvitations.push(invitation);

          // Send invitation email
          const emailResult = await sendDecisionMakerInvitation(
            dm.email,
            dm.name,
            `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            invitation.id.toString()
          );
          console.log(`📧 Email result for ${dm.email}:`, emailResult);
          emailResults.push({ 
            email: dm.email, 
            sent: emailResult.success, 
            error: emailResult.success ? null : emailResult.error 
          });
        } catch (error: any) {
          console.error(`❌ Error creating invitation for ${dm.email}:`, error);
          emailResults.push({ email: dm.email, sent: false, error: error.message });
        }
      }

      // Calculate success statistics
      const successfulInvitations = newInvitations.length;
      const successfulEmails = emailResults.filter(r => r.sent).length;

      res.json({
        success: true,
        message: `Successfully created ${successfulInvitations} invitation(s). ${successfulEmails} email(s) sent.`,
        count: successfulInvitations,
        invitations: newInvitations,
        emailResults,
        remaining: remainingInvitations - successfulInvitations
      });
    } catch (error: any) {
      console.error("Add invitations error:", error);
      res.status(500).json({ message: "Failed to add invitations" });
    }
  });

  // Get sales rep's calls
  app.get("/api/sales-rep/calls", authenticateToken, async (req, res) => {
    try {
      const calls = await storage.getCallsByUserId(req.user!.userId);
      res.json(calls);
    } catch (error: any) {
      console.error("Get calls error:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Get sales rep's metrics
  app.get("/api/sales-rep/metrics", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const invitations = await storage.getInvitationsByUserId(
        req.user!.userId,
      );
      const calls = await storage.getCallsByUserId(req.user!.userId);

      // Calculate metrics
      const totalInvitations = invitations.length;
      const acceptedInvitations = invitations.filter(
        (inv) => inv.status === "accepted",
      ).length;
      const pendingInvitations = invitations.filter(
        (inv) => inv.status === "pending",
      ).length;
      const completedCalls = calls.filter(
        (call) => call.status === "completed",
      ).length;
      const upcomingCalls = calls.filter(
        (call) => call.status === "scheduled",
      ).length;

      // Calculate success rate
      const successRate =
        completedCalls > 0
          ? Math.round((completedCalls / calls.length) * 100)
          : 0;

      // Get user's subscription plan to determine proper limits
      let maxDmInvitations = 3; // Default fallback
      let limits = { dmLimit: 1, callCredits: 1 }; // Default fallback

      try {
        // Try to get subscription plans from database
        const subscriptionPlans = await storage.getAllSubscriptionPlans();
        
        if (subscriptionPlans && subscriptionPlans.length > 0) {
          // Find the user's current plan
          const userPlan = subscriptionPlans.find(plan => 
            plan.name.toLowerCase() === (user.packageType || '').toLowerCase() ||
            plan.name.toLowerCase().replace(/\s+/g, '-') === (user.packageType || '').toLowerCase()
          );
          
          if (userPlan) {
            console.log(`Found subscription plan for ${user.packageType}:`, userPlan.name);
            maxDmInvitations = userPlan.maxInvitations;
            limits = {
              dmLimit: userPlan.maxInvitations,
              callCredits: userPlan.maxCallCredits
            };
          } else {
            console.log(`No subscription plan found for packageType: ${user.packageType}, using fallback limits`);
            
            // Fallback to hardcoded limits if plan not found in database
            const packageLimits = {
              free: { dmLimit: 3, callCredits: 1, maxInvitations: 3 },
              basic: { dmLimit: 10, callCredits: 5, maxInvitations: 10 },
              pro: { dmLimit: 25, callCredits: 15, maxInvitations: 25 },
              "pro-team": { dmLimit: 50, callCredits: 50, maxInvitations: 50 },
              enterprise: { dmLimit: 500, callCredits: 500, maxInvitations: 500 },
            };

            const fallbackLimits = packageLimits[user.packageType as keyof typeof packageLimits] || packageLimits["free"];
            maxDmInvitations = fallbackLimits.maxInvitations;
            limits = fallbackLimits;
          }
        } else {
          console.log('No subscription plans in database, using hardcoded fallback limits');
          
          // Fallback limits when no plans in database
          const packageLimits = {
            free: { dmLimit: 3, callCredits: 1, maxInvitations: 3 },
            basic: { dmLimit: 10, callCredits: 5, maxInvitations: 10 },
            pro: { dmLimit: 25, callCredits: 15, maxInvitations: 25 },
            "pro-team": { dmLimit: 50, callCredits: 50, maxInvitations: 50 },
            enterprise: { dmLimit: 500, callCredits: 500, maxInvitations: 500 },
          };

          const fallbackLimits = packageLimits[user.packageType as keyof typeof packageLimits] || packageLimits["free"];
          maxDmInvitations = fallbackLimits.maxInvitations;
          limits = fallbackLimits;
        }
      } catch (planError) {
        console.error('Error fetching subscription plans for metrics:', planError);
        // Use basic fallback if there's an error
        const packageLimits = {
          free: { dmLimit: 3, callCredits: 1 },
          basic: { dmLimit: 10, callCredits: 5 },
          pro: { dmLimit: 25, callCredits: 15 },
          "pro-team": { dmLimit: 50, callCredits: 50 },
          enterprise: { dmLimit: 500, callCredits: 500 },
        };

        limits = packageLimits[user.packageType as keyof typeof packageLimits] || packageLimits["free"];
        maxDmInvitations = limits.dmLimit;
      }

      const metrics = {
        callCredits: limits.callCredits - completedCalls,
        maxCallCredits: limits.callCredits,
        dmInvitations: totalInvitations,
        maxDmInvitations: maxDmInvitations,
        acceptedInvitations,
        pendingInvitations,
        upcomingCalls,
        completedCalls,
        successRate: completedCalls > 0 ? successRate : null,
        packageType: user.packageType,
        standing: user.standing || "good",
        databaseUnlocked: acceptedInvitations > 0,
      };

      res.json(metrics);
    } catch (error: any) {
      console.error("Get metrics error:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // ===== DECISION MAKER DASHBOARD ROUTES =====

  // Get decision maker's calls
  app.get("/api/decision-maker/calls", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;

      const calls = await storage.getCallsByUserId(userId);
      res.json(calls);
    } catch (error: any) {
      console.error("Get decision maker calls error:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Mark call as completed (Decision Maker only)
  app.post(
    "/api/decision-maker/complete-call/:callId",
    authenticateToken,
    async (req, res) => {
      try {
        const { callId } = req.params;
        const userId = req.user!.userId;

        // Verify user is decision maker
        const user = await storage.getUserById(userId);
        if (!user || user.role !== "decision_maker") {
          return res
            .status(403)
            .json({ message: "Only decision makers can complete calls" });
        }

        // Get the call to verify it belongs to this decision maker
        const call = await storage.getCallById(callId);
        if (!call) {
          return res.status(404).json({ message: "Call not found" });
        }

        console.log("Complete call debug:", {
          callId,
          userId,
          callDecisionMakerId: call.decisionMakerId,
          callDecisionMakerIdString: call.decisionMakerId?.toString(),
          match: call.decisionMakerId?.toString() === userId,
        });

        if (call.decisionMakerId?.toString() !== userId) {
          return res
            .status(403)
            .json({ message: "You can only complete your own calls" });
        }

        if (call.status !== "scheduled") {
          return res
            .status(400)
            .json({ message: "Call is not in scheduled status" });
        }

        // Update call status to completed
        const updatedCall = await storage.updateCall(callId, {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        if (!updatedCall) {
          return res
            .status(500)
            .json({ message: "Failed to update call status" });
        }

        // Decrement monthly call limits for both DM and Sales Rep
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        try {
          // Decrement DM's monthly call limit
          await storage.updateMonthlyCallLimit(
            userId,
            "decision_maker",
            currentMonth,
            1,
          );

          // Decrement Sales Rep's monthly call limit
          const salesRepId = call.salesRepId?.toString();
          if (salesRepId) {
            await storage.updateMonthlyCallLimit(
              salesRepId,
              "sales_rep",
              currentMonth,
              1,
            );
          }

          console.log(
            `Monthly call limits decremented for DM ${userId} and Sales Rep ${salesRepId} for month ${currentMonth}`,
          );
        } catch (limitError) {
          console.error("Error updating monthly call limits:", limitError);
          // Don't fail the call completion if limit update fails, just log it
        }

        // Log the completion activity
        await storage.createActivityLog({
          userId,
          action: "COMPLETE_CALL",
          entityType: "call",
          entityId: callId,
          details: `Marked call as completed - monthly limits decremented for both participants`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({
          success: true,
          message: "Call marked as completed successfully",
          call: updatedCall,
        });
      } catch (error: any) {
        console.error("Complete call error:", error);
        res.status(500).json({ message: "Failed to complete call" });
      }
    },
  );

  // Get single call (Decision Maker only)
  app.get(
    "/api/decision-maker/call/:callId",
    authenticateToken,
    async (req, res) => {
      try {
        const { callId } = req.params;
        const userId = req.user!.userId;

        // Verify user is decision maker
        const user = await storage.getUserById(userId);
        if (!user || user.role !== "decision_maker") {
          return res
            .status(403)
            .json({ message: "Only decision makers can access calls" });
        }

        // Get the call
        const call = await storage.getCallById(callId);
        if (!call) {
          return res.status(404).json({ message: "Call not found" });
        }

        // Verify it belongs to this decision maker
        if (call.decisionMakerId?.toString() !== userId) {
          return res
            .status(403)
            .json({ message: "You can only access your own calls" });
        }

        res.json(call);
      } catch (error: any) {
        console.error("Get call error:", error);
        res.status(500).json({ message: "Failed to fetch call" });
      }
    },
  );

  // Submit call evaluation (Decision Maker only)
  app.post(
    "/api/decision-maker/evaluate-call",
    authenticateToken,
    async (req, res) => {
      try {
        const { callId, experience, experienceTitle, rating, comments } =
          req.body;
        const userId = req.user!.userId;

        // Verify user is decision maker
        const user = await storage.getUserById(userId);
        if (!user || user.role !== "decision_maker") {
          return res
            .status(403)
            .json({ message: "Only decision makers can evaluate calls" });
        }

        // Get the call to verify it belongs to this decision maker
        const call = await storage.getCallById(callId);
        if (!call) {
          return res.status(404).json({ message: "Call not found" });
        }

        if (call.decisionMakerId?.toString() !== userId) {
          return res
            .status(403)
            .json({ message: "You can only evaluate your own calls" });
        }

        // Update call with evaluation data
        const updatedCall = await storage.updateCall(callId, {
          rating: rating,
          feedback: comments,
          experience: experience,
          experienceTitle: experienceTitle,
          evaluatedAt: new Date(),
          updatedAt: new Date(),
        });

        if (!updatedCall) {
          return res
            .status(500)
            .json({ message: "Failed to update call evaluation" });
        }

        // Increment flag count and send warning email for rating of 1 (rude behavior)
        if (rating === 1 && call.salesRepId) {
          try {
            console.log(
              `Rating is 1, incrementing flag for sales rep: ${call.salesRepId}`,
            );
            console.log(`Call details:`, {
              callId: call.id,
              salesRepId: call.salesRepId,
              evaluatedBy: userId,
              rating: rating,
              experienceTitle: experienceTitle,
            });

            const flagResult = await storage.incrementUserFlag(
              call.salesRepId.toString(),
              `Poor call rating (${rating}/5) - ${experienceTitle}`,
              userId,
            );

            console.log(
              `Flag incremented successfully for sales rep: ${call.salesRepId}`,
              flagResult,
            );
          } catch (flagError) {
            console.error("Error incrementing flag count:", flagError);
            console.error("Flag error details:", flagError.message);
            // Don't fail the evaluation submission if flagging fails
          }
        } else {
          console.log(
            `No flagging needed - Rating: ${rating}, Has salesRepId: ${!!call.salesRepId}`,
          );
        }

        // Log the evaluation activity
        await storage.createActivityLog({
          userId,
          action: "EVALUATE_CALL",
          entityType: "call",
          entityId: callId,
          details: `Evaluated call with rating ${rating}/5`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({
          success: true,
          message: "Call evaluation submitted successfully",
          call: updatedCall,
        });
      } catch (error: any) {
        console.error("Evaluate call error:", error);
        res.status(500).json({ message: "Failed to submit evaluation" });
      }
    },
  );

  // Get decision maker's metrics
  app.get(
    "/api/decision-maker/metrics",
    authenticateToken,
    async (req, res) => {
      try {
        const user = await storage.getUserById(req.user!.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const calls = await storage.getCallsByUserId(req.user!.userId);

        // Calculate metrics
        const completedCalls = calls.filter(
          (call) => call.status === "completed",
        );
        const upcomingCalls = calls.filter(
          (call) => call.status === "scheduled",
        );
        const totalCalls = calls.length;

        // Calculate average rating
        const ratedCalls = completedCalls.filter((call) => call.rating);
        const avgRating =
          ratedCalls.length > 0
            ? ratedCalls.reduce((sum, call) => sum + call.rating, 0) /
              ratedCalls.length
            : null;

        // Get monthly call limit data from the comprehensive system
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const monthlyLimit = await storage.getMonthlyCallLimit(
          req.user!.userId,
          "decision_maker",
          currentMonth,
        );

        // Calculate quality score based on ratings and completion rate
        const qualityScore =
          avgRating && totalCalls > 0
            ? Math.round((avgRating / 5) * 100)
            : null;

        const metrics = {
          completedCalls: completedCalls.length,
          remainingCalls: monthlyLimit.remainingCalls,
          totalCallLimit: monthlyLimit.maxCalls,
          upcomingCalls: upcomingCalls.length,
          avgRating: avgRating,
          qualityScore,
          packageType: user.packageType,
          standing: user.standing || "good",
        };

        res.json(metrics);
      } catch (error: any) {
        console.error("Get decision maker metrics error:", error);
        res.status(500).json({ message: "Failed to fetch metrics" });
      }
    },
  );

  // Rate a call
  app.post(
    "/api/decision-maker/calls/:callId/rate",
    authenticateToken,
    async (req, res) => {
      try {
        const { callId } = req.params;
        const { rating, feedback } = req.body;

        if (!rating || rating < 1 || rating > 5) {
          return res
            .status(400)
            .json({ message: "Rating must be between 1 and 5" });
        }

        const ratingValue = parseInt(rating);

        // Get the call to find the sales rep
        const call = await storage.getCallById(callId);
        if (!call) {
          return res.status(404).json({ message: "Call not found" });
        }

        const updatedCall = await storage.updateCall(callId, {
          rating: ratingValue,
          feedback: feedback || "",
          status: "completed",
        });

        if (!updatedCall) {
          return res.status(404).json({ message: "Call not found" });
        }

        // If rating is 1, increase flag count for the sales rep
        if (ratingValue === 1 && call.salesRepId) {
          try {
            await storage.incrementUserFlag(
              call.salesRepId,
              "Low rating from decision maker",
              req.user!.userId,
            );

            // Log the flag activity
            await storage.createActivityLog({
              userId: req.user!.userId,
              action: "FLAG_USER",
              entityType: "user",
              entityId: call.salesRepId.toString(),
              details: `Flagged sales rep for rating of 1 on call ${callId}`,
              ipAddress: req.ip,
              userAgent: req.get("User-Agent"),
            });
          } catch (flagError: any) {
            console.error("Error incrementing flag count:", flagError);
            // Don't fail the rating process if flagging fails
          }
        }

        res.json({
          success: true,
          message: "Call rated successfully",
          call: updatedCall,
        });
      } catch (error: any) {
        console.error("Rate call error:", error);
        res.status(500).json({ message: "Failed to rate call" });
      }
    },
  );

  // Rate a call (Sales Rep)
  app.post(
    "/api/sales-rep/calls/:callId/rate",
    authenticateToken,
    async (req, res) => {
      try {
        const { callId } = req.params;
        const { rating, feedback } = req.body;

        if (!rating || rating < 1 || rating > 5) {
          return res
            .status(400)
            .json({ message: "Rating must be between 1 and 5" });
        }

        const ratingValue = parseInt(rating);

        // Get the call to verify it belongs to this sales rep
        const call = await storage.getCallById(callId);
        if (!call) {
          return res.status(404).json({ message: "Call not found" });
        }

        // Verify the call belongs to the requesting sales rep
        if (call.salesRepId.toString() !== req.user!.userId) {
          return res
            .status(403)
            .json({ message: "You can only rate your own calls" });
        }

        const updatedCall = await storage.updateCall(callId, {
          salesRepRating: ratingValue,
          salesRepFeedback: feedback || "",
          status: "completed",
        });

        if (!updatedCall) {
          return res.status(404).json({ message: "Call not found" });
        }

        // Increment flag count and send warning email for rating of 1 (poor DM behavior)
        if (ratingValue === 1 && call.decisionMakerId) {
          try {
            console.log(
              `Sales rep gave rating of 1, flagging decision maker: ${call.decisionMakerId}`,
            );

            // Get the sales rep and decision maker details
            const salesRep = await storage.getUserById(req.user!.userId);
            const decisionMaker = await storage.getUserById(
              call.decisionMakerId.toString(),
            );

            if (salesRep && decisionMaker) {
              // Increment flag count for the decision maker
              const flagResult = await storage.incrementUserFlag(
                call.decisionMakerId.toString(),
                `Poor call rating (${ratingValue}/5) from sales rep - ${feedback || "No specific feedback"}`,
                req.user!.userId,
              );

              console.log(
                `Flag incremented successfully for decision maker: ${call.decisionMakerId}`,
                flagResult,
              );

              // Send warning email to the decision maker
              const { sendDecisionMakerWarningEmail } = await import(
                "./email-service"
              );

              await sendDecisionMakerWarningEmail(
                decisionMaker.email,
                decisionMaker.firstName || "Decision Maker",
                `Poor call rating (${ratingValue}/5) - ${feedback || "Call performance issues"}`,
                call.scheduledAt
                  ? new Date(call.scheduledAt).toLocaleDateString()
                  : new Date().toLocaleDateString(),
                `${salesRep.firstName} ${salesRep.lastName}`,
                salesRep.company || "Company",
                (decisionMaker.flagsReceived || 0) + 1,
              );

              console.log(
                `Warning email sent to decision maker: ${decisionMaker.email}`,
              );
            }
          } catch (flagError) {
            console.error("Error flagging decision maker:", flagError);
            // Don't fail the rating process if flagging fails
          }
        }

        res.json({
          success: true,
          message: "Call rated successfully",
          call: updatedCall,
        });
      } catch (error: any) {
        console.error("Sales rep rate call error:", error);
        res.status(500).json({ message: "Failed to rate call" });
      }
    },
  );

  // ===== ADMIN PANEL ROUTES =====

  // Get admin statistics
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const userRole = (req.session as any)?.userRole;

      if (!userId || userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all users
      const allUsers = await storage.getAllUsers();
      const allCalls = await storage.getAllCalls();
      const allInvitations = await storage.getAllInvitations();

      // Calculate statistics
      const totalUsers = allUsers.length;
      const activeSalesReps = allUsers.filter(
        (user) => user.role === "sales_rep" && user.isActive,
      ).length;
      const totalCalls = allCalls.length;
      const completedCalls = allCalls.filter(
        (call) => call.status === "completed",
      ).length;
      const scheduledCalls = allCalls.filter(
        (call) => call.status === "scheduled",
      ).length;

      // Calculate average rating
      const completedCallsWithRating = allCalls.filter(
        (call: any) => call.rating && call.rating > 0,
      );
      const avgRating =
        completedCallsWithRating.length > 0
          ? (
              completedCallsWithRating.reduce(
                (sum: number, call: any) => sum + call.rating,
                0,
              ) / completedCallsWithRating.length
            ).toFixed(1)
          : "0";

      // Calculate revenue based on package types
      const totalRevenue = allUsers.reduce((sum: number, user: any) => {
        if (user.packageType === "pro-team") return sum + 199;
        if (user.packageType === "enterprise") return sum + 499;
        if (user.packageType === "starter") return sum + 99;
        return sum;
      }, 0);

      const stats = {
        totalUsers,
        activeSalesReps,
        totalCalls,
        completedCalls,
        scheduledCalls,
        avgRating: parseFloat(avgRating),
        totalRevenue,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  // Get all users for admin
  app.get("/api/admin/users", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const userRole = (req.session as any)?.userRole;

      if (!userId || userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users for admin:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all calls for admin
  app.get("/api/admin/calls", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const userRole = (req.session as any)?.userRole;

      if (!userId || userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const calls = await storage.getAllCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls for admin:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Get all invitations for admin
  app.get("/api/admin/invitations", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const userRole = (req.session as any)?.userRole;

      if (!userId || userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const invitations = await storage.getAllInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations for admin:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Update user status
  app.patch("/api/admin/users/:userId/status", async (req, res) => {
    try {
      const adminUserId = (req.session as any)?.userId;
      const userRole = (req.session as any)?.userRole;

      if (!adminUserId || userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { status } = req.body;

      const isActive = status === "active";
      const updatedUser = await storage.updateUser(userId, { isActive });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:userId", async (req, res) => {
    try {
      const adminUserId = (req.session as any)?.userId;
      const userRole = (req.session as any)?.userRole;

      if (!adminUserId || userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;

      const deleted = await storage.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // =============================================================================
  // FLAGS MANAGEMENT ENDPOINTS
  // =============================================================================

  // Get flags based on user role
  app.get("/api/flags", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let flags = [];

      if (user.role === "sales_rep") {
        // Sales reps can see flags they created
        flags = await storage.getFlagsByRep(req.user!.userId);
      } else if (user.role === "decision_maker") {
        // Decision makers can see flags against them
        flags = await storage.getDMFlags(req.user!.userId);
      } else if (user.role === "enterprise_admin") {
        // Enterprise admins can see flags for their company
        const userDomain = user.email.split("@")[1];
        flags = await storage.getFlagsByCompany(userDomain);
      } else if (user.role === "super_admin") {
        // Super admins can see all flags
        flags = await storage.getAllFlags();
      }

      res.json(flags);
    } catch (error: any) {
      console.error("Error fetching flags:", error);
      res.status(500).json({ message: "Failed to fetch flags" });
    }
  });

  // Create a new flag
  app.post("/api/flags", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only sales reps can create flags
      if (user.role !== "sales_rep") {
        return res
          .status(403)
          .json({ message: "Only sales representatives can create flags" });
      }

      const { dmId, reason, description, priority, flagType } = req.body;

      if (!dmId || !reason || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const flagData = {
        dmId,
        flaggedBy: req.user!.userId,
        flaggedByRole: user.role,
        reason,
        description,
        priority: priority || "medium",
        flagType: flagType || "behavior",
        status: "open",
        reportedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const flag = await storage.createDMFlag(flagData);
      res.json({ success: true, flag });
    } catch (error: any) {
      console.error("Error creating flag:", error);
      res.status(500).json({ message: "Failed to create flag" });
    }
  });

  // Update flag status (PATCH for specific status updates)
  app.patch(
    "/api/flags/:flagId/status",
    authenticateToken,
    async (req, res) => {
      try {
        // Check if user is super admin
        const user = await storage.getUserById(req.user!.userId);
        if (!user || user.role !== "super_admin") {
          return res
            .status(403)
            .json({ message: "Super admin access required" });
        }

        const { flagId } = req.params;
        const { status, action } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const validStatuses = [
          "open",
          "investigating",
          "resolved",
          "dismissed",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const updateData: any = {
          status,
          updatedAt: new Date(),
        };

        if (status === "resolved") {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = req.user!.userId;
          if (action) {
            updateData.resolution = action;
          }
        }

        const updatedFlag = await storage.updateDMFlag(flagId, updateData);

        if (!updatedFlag) {
          return res.status(404).json({ message: "Flag not found" });
        }

        // Log activity
        await storage.createActivityLog({
          action: "FLAG_STATUS_UPDATED",
          performedBy: req.user!.userId,
          entityType: "flag",
          entityId: flagId,
          details: `Updated flag status to ${status}${action ? ` with action: ${action}` : ""}`,
          metadata: {
            flagId,
            previousStatus: updatedFlag.status,
            newStatus: status,
            action,
          },
        });

        res.json({ success: true, flag: updatedFlag });
      } catch (error: any) {
        console.error("Error updating flag status:", error);
        res.status(500).json({ message: "Failed to update flag status" });
      }
    },
  );

  // Update flag status (PUT for full flag updates)
  app.put("/api/flags/:flagId", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only admins can update flag status
      if (!["enterprise_admin", "super_admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { flagId } = req.params;
      const { status, resolution } = req.body;

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === "resolved") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = user.email;
        if (resolution) {
          updateData.resolution = resolution;
        }
      }

      const updatedFlag = await storage.updateFlagStatus(
        flagId,
        status,
        resolution,
        user.email,
      );
      res.json({ success: true, flag: updatedFlag });
    } catch (error: any) {
      console.error("Error updating flag:", error);
      res.status(500).json({ message: "Failed to update flag" });
    }
  });

  // Super Admin flag statistics endpoint
  app.get(
    "/api/super-admin/flag-statistics",
    requireSuperAdmin,
    async (req, res) => {
      try {
        const statistics = await storage.getFlagStatistics();
        res.json(statistics);
      } catch (error: any) {
        console.error("Error fetching flag statistics:", error);
        res.status(500).json({ message: "Failed to fetch flag statistics" });
      }
    },
  );

  // Credit management endpoints
  app.post(
    "/api/dm/complete-onboarding",
    authenticateToken,
    async (req, res) => {
      try {
        const dmId = req.user!.userId;
        const { invitedByRepId } = req.body;

        if (!invitedByRepId) {
          return res.status(400).json({
            success: false,
            message: "Inviting sales rep ID is required",
          });
        }

        const result = await storage.markDMOnboardingComplete(
          dmId,
          invitedByRepId,
        );

        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        console.error("Error completing DM onboarding:", error);
        res.status(500).json({
          success: false,
          message: "Failed to complete onboarding",
        });
      }
    },
  );

  app.get("/api/sales-rep/credits", authenticateToken, async (req, res) => {
    try {
      const repId = req.user!.userId;
      const credits = await storage.getRepCredits(repId);
      const totalCredits = await storage.getRepTotalCredits(repId);

      res.json({
        credits,
        totalCredits,
        databaseAccess: totalCredits > 0,
      });
    } catch (error) {
      console.error("Error fetching rep credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.get(
    "/api/sales-rep/database-access",
    authenticateToken,
    async (req, res) => {
      try {
        const repId = req.user!.userId;
        const hasAccess = await storage.checkDatabaseAccess(repId);

        res.json({
          hasAccess,
          message: hasAccess
            ? "Database access granted"
            : "Complete a DM onboarding to unlock database access",
        });
      } catch (error) {
        console.error("Error checking database access:", error);
        res.status(500).json({
          hasAccess: false,
          message: "Failed to check database access",
        });
      }
    },
  );

  // Enhanced DM listing with gated information
  app.get(
    "/api/sales-rep/available-dms-gated",
    authenticateToken,
    async (req, res) => {
      try {
        console.log("🎯 GATED DMs ENDPOINT HIT - Starting processing...");
        const repId = req.user!.userId;
        const user = await storage.getUserById(repId);

        if (!user || user.role !== "sales_rep") {
          return res.status(403).json({ message: "Access denied" });
        }

        // Check if rep has database access
        const hasAccess = await storage.checkDatabaseAccess(repId);
        if (!hasAccess) {
          return res.json({
            dms: [],
            message: "Invite decision makers to unlock database access",
            accessGranted: false,
          });
        }

        // Get all available DMs
        const allDMs = await storage.getUsersByRole("decision_maker");
        console.log(`📊 Total DMs fetched: ${allDMs.length}`);
        
        const activeAvailableDMs = allDMs.filter(
          (dm) => {
            const isActive = dm.isActive;
            const isAccepted = dm.invitationStatus === "accepted";
            const jobTitleNotPending = dm.jobTitleStatus !== "pending";
            
            // Debug logging for ALL DMs to see their status
            console.log(`🔍 DM: ${dm.email} - isActive: ${isActive}, invitationStatus: ${dm.invitationStatus}, jobTitle: ${dm.jobTitle}, jobTitleStatus: ${dm.jobTitleStatus}`);
            
            // Debug logging for pending job titles
            if (dm.jobTitleStatus === "pending") {
              console.log(`🚫 Filtering out DM with pending job title: ${dm.email} - jobTitle: ${dm.jobTitle}, jobTitleStatus: ${dm.jobTitleStatus}`);
            }
            
            const shouldInclude = isActive && isAccepted && jobTitleNotPending;
            console.log(`✅ DM ${dm.email} included: ${shouldInclude}`);
            
            return shouldInclude;
          }
        );

        // Deduplicate DMs by ID to prevent duplicate display
        const uniqueDMsMap = new Map();
        activeAvailableDMs.forEach((dm) => {
          const dmId = dm._id?.toString() || dm.id;
          if (!uniqueDMsMap.has(dmId)) {
            uniqueDMsMap.set(dmId, dm);
          }
        });
        const deduplicatedDMs = Array.from(uniqueDMsMap.values());

        // Check which DMs this rep can see full info for
        const isEnterprisePlan = user.packageType === "enterprise";
        const hasEmailAddon = user.hasEmailAddon;
        console.log(
          "EMAIL ADDON DEBUG: User email:",
          user.email,
          "packageType:",
          user.packageType,
          "hasEmailAddon:",
          hasEmailAddon,
        );
        const repCalls = await storage.getCallsByRep(repId);
        const bookedDMIds = new Set(
          repCalls.map((call) => call.decisionMakerId?.toString()),
        );

        // Use deduplicated DMs
        const allAvailableDMs = [...deduplicatedDMs];
        console.log(
          `Fixed duplicate DMs: Original count=${activeAvailableDMs.length}, Deduplicated count=${allAvailableDMs.length}`,
        );

        // Get current month for credit cap and call limit checking
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        // Check if sales rep has reached their monthly call limit
        const repCallLimit = await storage.getMonthlyCallLimit(
          repId,
          "sales_rep",
          currentMonth,
        );
        const repCanBookCalls = repCallLimit.remainingCalls > 0;

        const gatedDMs = await Promise.all(
          allAvailableDMs.map(async (dm, index) => {
            const dmId = dm._id?.toString() || dm.id;
            const canSeeDetails =
              isEnterprisePlan || hasEmailAddon || bookedDMIds.has(dmId);
            if (dm.email?.includes("mlp.yashkumar@gmail.com")) {
              console.log(
                "EMAIL ADDON DEBUG: DM processing - canSeeDetails:",
                canSeeDetails,
                "isEnterprise:",
                isEnterprisePlan,
                "hasAddon:",
                hasEmailAddon,
                "bookedBefore:",
                bookedDMIds.has(dmId),
              );
            }

            // For demo purposes, make some profiles unlocked randomly
            const isDemoUnlocked =
              dm.id &&
              dm.id.includes("dummy") &&
              (index % 3 === 0 || Math.random() > 0.6);
            const shouldUnlock = canSeeDetails || isDemoUnlocked;

            // Generate engagement score (60-100% range)
            const engagementScore = Math.floor(Math.random() * 40) + 60;

            // Check if DM has reached their monthly call limit
            const dmCallLimit = await storage.getMonthlyCallLimit(
              dmId,
              "decision_maker",
              currentMonth,
            );
            const dmCanBookCalls = dmCallLimit.remainingCalls > 0;

            // Check DM credit eligibility based on engagement score
            const isEligibleForCredits = engagementScore >= 40; // DMs below 40% can't help reps earn credits

            // Check monthly credit cap (3 credits per month per DM-Rep pair)
            let monthlyCreditsUsed = 0;
            let canEarnCredits = false;

            try {
              const creditUsage = await storage.getDMRepCreditUsage(
                repId,
                dmId,
                currentMonth,
              );
              monthlyCreditsUsed = creditUsage ? creditUsage.creditsUsed : 0;
              canEarnCredits = isEligibleForCredits && monthlyCreditsUsed < 3;
            } catch (error) {
              console.error("Error checking DM credit usage:", error);
              // Default to allowing credits if we can't check usage
              canEarnCredits = isEligibleForCredits;
            }

            return {
              id: dmId,
              role: dm.role,
              company: dm.company || "Unknown Company",
              industry: dm.industry || "Technology",
              engagementScore: engagementScore,

              // Monthly Call Limit Information
              totalCalls: dmCallLimit.totalCalls,
              maxCalls: dmCallLimit.maxCalls,
              remainingCalls: dmCallLimit.remainingCalls,
              canBookCalls: dmCanBookCalls,

              // Credit eligibility indicators
              isEligibleForCredits: isEligibleForCredits,
              canEarnCredits: canEarnCredits,
              monthlyCreditsUsed: monthlyCreditsUsed,
              maxMonthlyCredits: 3,

              // Gated information
              name: shouldUnlock
                ? `${dm.firstName} ${dm.lastName}`
                : `${dm.firstName?.charAt(0)}*** ${dm.lastName?.charAt(0)}***`,
              email: shouldUnlock
                ? dm.email
                : `${dm.email?.charAt(0)}***@***.com`,
              jobTitle: shouldUnlock ? dm.jobTitle : "****** ******",

              // Access indicators
              isUnlocked: shouldUnlock,
              unlockReason: shouldUnlock
                ? isEnterprisePlan
                  ? "enterprise_plan"
                  : hasEmailAddon
                    ? "email_addon"
                    : "call_booked"
                : null,
            };
          }),
        );

        // Filter out DMs who have reached their monthly call limit (remaining calls = 0)
        const availableDMs = gatedDMs.filter((dm) => dm.canBookCalls);

        const unlockedCount = availableDMs.filter((dm) => dm.isUnlocked).length;

        console.log(
          `Sales rep has ${repCallLimit.remainingCalls}/${repCallLimit.maxCalls} calls remaining this month`,
        );
        console.log(
          `Returning ${availableDMs.length} available DMs (${gatedDMs.length - availableDMs.length} filtered out for call limits), ${unlockedCount} unlocked`,
        );

        // Count accepted DM invitations for this rep (for call limit calculation)
        const repInvitations = await storage.getInvitationsByRep(repId);
        const acceptedDMsCount = repInvitations.filter(
          (inv) => inv.status === "accepted",
        ).length;

        res.json({
          dms: availableDMs,
          accessGranted: true,
          totalCount: availableDMs.length,
          unlockedCount: unlockedCount,

          // Sales rep call limit information
          repCallLimit: {
            totalCalls: repCallLimit.totalCalls,
            maxCalls: repCallLimit.maxCalls,
            remainingCalls: repCallLimit.remainingCalls,
            canBookCalls: repCanBookCalls,
            month: currentMonth,
          },

          // Count of accepted DMs for call limit calculation
          acceptedDMsCount: acceptedDMsCount,
        });
      } catch (error) {
        console.error("Error fetching available DMs (gated):", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch decision makers",
          dms: [],
          accessGranted: false,
          totalCount: 0,
          unlockedCount: 0,
        });
      }
    },
  );

  // Simulate DM onboarding completion (for testing)
  app.post(
    "/api/simulate/dm-onboarding-complete",
    authenticateToken,
    async (req, res) => {
      try {
        const { dmEmail, repId } = req.body;

        if (!dmEmail || !repId) {
          return res.status(400).json({
            success: false,
            message: "DM email and rep ID are required",
          });
        }

        // Find the DM
        const dm = await storage.getUserByEmail(dmEmail);
        if (!dm || dm.role !== "decision_maker") {
          return res.status(404).json({
            success: false,
            message: "Decision maker not found",
          });
        }

        // Complete onboarding
        const result = await storage.markDMOnboardingComplete(
          dm._id || dm.id,
          repId,
        );
        res.json(result);
      } catch (error) {
        console.error("Error simulating DM onboarding:", error);
        res.status(500).json({
          success: false,
          message: "Failed to simulate onboarding completion",
        });
      }
    },
  );

  // Create sample invitation for testing credit system
  app.post(
    "/api/create-sample-invitation",
    authenticateToken,
    async (req, res) => {
      try {
        const { dmEmail, dmName } = req.body;
        const salesRepId = req.user!.userId;

        if (!dmEmail || !dmName) {
          return res.status(400).json({
            success: false,
            message: "DM email and name are required",
          });
        }

        // Create invitation
        const invitation = await storage.createInvitation({
          salesRepId,
          decisionMakerEmail: dmEmail,
          decisionMakerName: dmName,
          status: "pending",
        });

        // Generate invitation link (in production this would be a secure token)
        const inviteUrl = `${req.protocol}://${req.get("host")}/invite/${invitation.id}`;

        res.json({
          success: true,
          message: "Sample invitation created",
          invitation,
          inviteUrl,
        });
      } catch (error) {
        console.error("Error creating sample invitation:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create sample invitation",
        });
      }
    },
  );

  // Test Google Calendar event creation
  app.post("/api/test-calendar-event", authenticateToken, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.userId);

      if (
        !currentUser.calendarIntegrationEnabled ||
        !currentUser.googleCalendarTokens
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Google Calendar not connected. Please complete the OAuth flow first.",
        });
      }

      // Set up Google Calendar with user's tokens
      const { setCredentials, createCalendarEvent } = await import(
        "./google-calendar"
      );
      setCredentials(currentUser.googleCalendarTokens);

      // Create a test event
      const testEvent = await createCalendarEvent({
        summary: "Test Event from Naeberly Platform",
        description:
          "This is a test event created from the Naeberly platform to verify Google Calendar integration.",
        start: {
          dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          timeZone: "America/New_York",
        },
        end: {
          dateTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 1.5 hours from now
          timeZone: "America/New_York",
        },
        attendees: [
          {
            email: currentUser.email,
            displayName: `${currentUser.firstName} ${currentUser.lastName}`,
          },
        ],
      });

      console.log("Test Google Calendar event created:", testEvent.id);

      res.json({
        success: true,
        message: "Test calendar event created successfully",
        eventId: testEvent.id,
        eventUrl: testEvent.htmlLink,
      });
    } catch (error) {
      console.error("Error creating test calendar event:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create test calendar event",
        error: error.message,
      });
    }
  });

  // Google Calendar configuration check
  app.get("/api/calendar/config-check", authenticateToken, async (req, res) => {
    try {
      const hasCredentials = !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      );
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

      res.json({
        success: true,
        hasCredentials,
        clientId: process.env.GOOGLE_CLIENT_ID
          ? process.env.GOOGLE_CLIENT_ID.substring(0, 12) + "..."
          : "Missing",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "Present" : "Missing",
        redirectUri,
        currentDomain: req.get("host"),
        requiredDomains: ["replit.dev", "janeway.replit.dev", req.get("host")],
        expectedClientId:
          "917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com",
        clientIdMatches:
          process.env.GOOGLE_CLIENT_ID ===
          "917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com",
      });
    } catch (error) {
      console.error("Error checking calendar config:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check calendar configuration",
        error: error.message,
      });
    }
  });

  // Report issue endpoint for decision makers
  app.post(
    "/api/decision-maker/report-issue",
    authenticateToken,
    async (req, res) => {
      try {
        const { type, description, priority } = req.body;

        if (!type || !description) {
          return res
            .status(400)
            .json({ message: "Issue type and description are required" });
        }

        // Get current user
        const currentUser = await storage.getUserById(req.user!.userId);
        if (!currentUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Map the issue type to valid flagType enum values
        const flagTypeMapping = {
          technical: "quality_concern",
          behavior: "inappropriate_behavior",
          quality: "quality_concern",
          scheduling: "scheduling_issues",
          other: "quality_concern",
        };

        const flagType = flagTypeMapping[type] || "quality_concern";
        const companyDomain = currentUser.company
          ? currentUser.company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com"
          : currentUser.email.split("@")[1];

        // Create a flag for tracking (using the existing flag system)
        const flag = await storage.createDMFlag({
          dmId: currentUser._id.toString(),
          flaggedBy: currentUser._id.toString(),
          companyDomain: companyDomain,
          flagType: flagType,
          description: `${type}: ${description}`,
          severity: priority || "medium",
          status: "open",
        });

        // Log activity
        await storage.createActivityLog({
          action: "REPORT_ISSUE",
          performedBy: req.user!.userId,
          details: `Reported issue: ${type}`,
          metadata: {
            issueType: type,
            priority,
            flagId: flag._id,
          },
        });

        res.json({
          success: true,
          message: "Issue reported successfully",
          issueId: flag._id,
        });
      } catch (error) {
        console.error("Error reporting issue:", error);
        res.status(500).json({ message: "Failed to report issue" });
      }
    },
  );

  // Get feedback history for decision makers
  app.get(
    "/api/decision-maker/feedback-history",
    authenticateToken,
    async (req, res) => {
      try {
        const currentUser = await storage.getUserById(req.user!.userId);
        if (!currentUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Get feedback where this DM provided evaluations
        const feedback = await storage.getFeedbackByRep(
          currentUser._id.toString(),
        );

        // Format feedback for frontend
        const formattedFeedback = feedback.map((item) => ({
          id: item._id,
          callId: item.callId,
          salesRepId: item.salesRepId,
          salesRepName: item.salesRepName,
          company: item.company,
          rating: item.rating,
          experience: item.experience,
          experienceTitle: item.experienceTitle,
          comments: item.comments,
          callDate: item.callDate,
          evaluatedAt: item.evaluatedAt,
          isRedFlag: item.isRedFlag || false,
        }));

        res.json(formattedFeedback);
      } catch (error) {
        console.error("Error fetching feedback history:", error);
        res.status(500).json({ message: "Failed to fetch feedback history" });
      }
    },
  );

  // Initial feedback endpoints for post-call emails

  // Decision Maker initial feedback submission
  app.post("/api/decision-maker/initial-feedback/:callId", async (req, res) => {
    try {
      const { callId } = req.params;
      const { callTookPlace, wasPoliteEngaged, comments } = req.body;

      // Get call information
      const call = await storage.getCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Store initial feedback
      const initialFeedback = {
        callId,
        userId: call.decisionMakerId,
        userType: "decision_maker",
        callTookPlace: callTookPlace === "yes",
        wasPoliteEngaged,
        comments: comments || "",
        submittedAt: new Date(),
      };

      await storage.saveInitialFeedback(initialFeedback);

      // Determine if should proceed to rating system
      let proceedToRating = false;
      if (callTookPlace === "yes") {
        proceedToRating = true;
      }

      res.json({
        success: true,
        proceedToRating,
        message: proceedToRating
          ? "Proceeding to rating system"
          : "Feedback submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting DM initial feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Sales Rep initial feedback submission
  app.post("/api/sales-rep/initial-feedback/:callId", async (req, res) => {
    try {
      const { callId } = req.params;
      const { callTookPlace, wasPoliteEngaged, comments } = req.body;

      // Get call information
      const call = await storage.getCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Store initial feedback
      const initialFeedback = {
        callId,
        userId: call.salesRepId,
        userType: "sales_rep",
        callTookPlace: callTookPlace === "yes",
        wasPoliteEngaged,
        comments: comments || "",
        submittedAt: new Date(),
      };

      await storage.saveInitialFeedback(initialFeedback);

      // Determine if should proceed to rating system
      let proceedToRating = false;
      if (callTookPlace === "yes") {
        proceedToRating = true;
      }

      res.json({
        success: true,
        proceedToRating,
        message: proceedToRating
          ? "Proceeding to rating system"
          : "Feedback submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting Rep initial feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Manual trigger for the background email job (for testing)
  app.post("/api/test/trigger-email-job", async (req, res) => {
    try {
      console.log("Manual trigger of post-call feedback email job");
      await sendPostCallFeedbackEmails();
      res.json({ success: true, message: "Email job triggered successfully" });
    } catch (error) {
      console.error("Error triggering email job:", error);
      res.status(500).json({ message: "Failed to trigger email job" });
    }
  });

  // Debug endpoint to check call status (for testing)
  app.get("/api/test/check-calls", async (req, res) => {
    try {
      const allCalls = await storage.getAllCalls();
      const callsInfo = allCalls.map((call) => ({
        id: call._id,
        status: call.status,
        scheduledAt: call.scheduledAt,
        completedAt: call.completedAt,
        endTime: call.endTime,
        salesRepId: call.salesRepId,
        decisionMakerId: call.decisionMakerId,
      }));

      res.json({
        totalCalls: allCalls.length,
        calls: callsInfo,
      });
    } catch (error) {
      console.error("Error checking calls:", error);
      res.status(500).json({ message: "Failed to check calls" });
    }
  });

  // Test endpoint to manually complete a call and trigger emails (for testing)
  app.post("/api/test/complete-call/:callId", async (req, res) => {
    try {
      const { callId } = req.params;

      // Get call information
      const call = await storage.getCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Mark call as completed
      const completedAt = new Date();
      await storage.updateCall(callId, {
        status: "completed",
        completedAt: completedAt,
      });

      console.log(`Manually completed call ${callId} for testing`);

      // Trigger email job to send feedback emails
      await sendPostCallFeedbackEmails();

      res.json({
        success: true,
        message: `Call ${callId} marked as completed and feedback emails triggered`,
        completedAt: completedAt,
      });
    } catch (error) {
      console.error("Error completing call:", error);
      res.status(500).json({ message: "Failed to complete call" });
    }
  });

  // Test endpoint to force send email to a specific call (for testing)
  app.get("/api/test/send-email/:callId", async (req, res) => {
    try {
      const { callId } = req.params;

      // Get call information
      const call = await storage.getCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Ensure call has completedAt timestamp
      if (!call.completedAt) {
        console.log(`Setting completedAt for call ${callId}`);
        const completedAt = new Date();
        await storage.updateCall(callId, { completedAt });
        call.completedAt = completedAt;
      }

      // Get user details
      const salesRep = await storage.getUser(call.salesRepId);
      const decisionMaker = await storage.getUser(call.decisionMakerId);

      if (!salesRep || !decisionMaker) {
        return res.status(404).json({ message: "User data not found" });
      }

      const results = [];

      // Send emails regardless of existing feedback
      try {
        await sendPostCallFeedbackToDM(
          decisionMaker.email,
          decisionMaker.firstName,
          salesRep.firstName,
          callId,
        );
        results.push("DM email sent successfully");
        console.log(`✓ Email sent to DM: ${decisionMaker.email}`);
      } catch (error) {
        results.push(`DM email failed: ${error.message}`);
        console.error("✗ DM email error:", error);
      }

      try {
        await sendPostCallFeedbackToRep(
          salesRep.email,
          salesRep.firstName,
          decisionMaker.firstName,
          callId,
        );
        results.push("Rep email sent successfully");
        console.log(`✓ Email sent to Rep: ${salesRep.email}`);
      } catch (error) {
        results.push(`Rep email failed: ${error.message}`);
        console.error("✗ Rep email error:", error);
      }

      res.json({
        success: true,
        results,
        callDetails: {
          callId,
          salesRep: `${salesRep.firstName} ${salesRep.lastName} (${salesRep.email})`,
          decisionMaker: `${decisionMaker.firstName} ${decisionMaker.lastName} (${decisionMaker.email})`,
          callTime: call.scheduledAt,
        },
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Test endpoint for sending post-call feedback emails manually
  app.post(
    "/api/test/send-feedback-emails/:callId",
    authenticateToken,
    async (req, res) => {
      try {
        const { callId } = req.params;

        // Get call information
        const call = await storage.getCallById(callId);
        if (!call) {
          return res.status(404).json({ message: "Call not found" });
        }

        // Get user details
        const salesRep = await storage.getUser(call.salesRepId);
        const decisionMaker = await storage.getUser(call.decisionMakerId);

        if (!salesRep || !decisionMaker) {
          return res.status(404).json({ message: "User data not found" });
        }

        // Send feedback emails
        const results = [];

        try {
          await sendPostCallFeedbackToDM(
            decisionMaker.email,
            decisionMaker.firstName,
            salesRep.firstName,
            callId,
          );
          results.push("DM email sent successfully");
        } catch (error) {
          results.push(`DM email failed: ${error.message}`);
        }

        try {
          await sendPostCallFeedbackToRep(
            salesRep.email,
            salesRep.firstName,
            decisionMaker.firstName,
            callId,
          );
          results.push("Rep email sent successfully");
        } catch (error) {
          results.push(`Rep email failed: ${error.message}`);
        }

        res.json({
          success: true,
          results,
          callDetails: {
            salesRep: `${salesRep.firstName} ${salesRep.lastName} (${salesRep.email})`,
            decisionMaker: `${decisionMaker.firstName} ${decisionMaker.lastName} (${decisionMaker.email})`,
            callTime: call.scheduledAt,
          },
        });
      } catch (error) {
        console.error("Error testing feedback emails:", error);
        res.status(500).json({ message: "Failed to test feedback emails" });
      }
    },
  );

  // Background job for sending post-call feedback emails
  const sendPostCallFeedbackEmails = async () => {
    try {
      console.log("🔄 Running post-call feedback email job...");
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get all calls
      const allCalls = await storage.getAllCalls();
      console.log(`📊 Found ${allCalls.length} total calls in database`);

      const callsToUpdate = [];
      const completedCallsForEmail = [];

      // Process each call and track what needs to be done
      for (const call of allCalls) {
        console.log(
          `🔍 Checking call ${call._id}: status=${call.status}, scheduledAt=${call.scheduledAt}, completedAt=${call.completedAt}`,
        );

        // Handle calls that need completedAt timestamp
        if (call.status === "completed" && !call.completedAt) {
          console.log(`🔧 Call ${call._id} needs completedAt timestamp`);
          const completedAt = new Date();
          callsToUpdate.push({
            id: call._id.toString(),
            updates: { completedAt },
            reason: "Adding missing completedAt to completed call"
          });
          // Update the in-memory object for processing
          call.completedAt = completedAt;
        }

        // Handle calls that need auto-completion
        if (call.status === "scheduled" && call.scheduledAt) {
          const scheduledTime = new Date(call.scheduledAt);
          const callEndTime = new Date(scheduledTime.getTime() + 15 * 60 * 1000); // Add 15 minutes duration

          if (callEndTime <= fiveMinutesAgo) {
            console.log(`⏰ Auto-completing call ${call._id} that ended at ${callEndTime}`);
            const completedAt = new Date();
            callsToUpdate.push({
              id: call._id.toString(),
              updates: { status: "completed", completedAt },
              reason: "Auto-completing scheduled call that has ended"
            });
            // Update the in-memory object for processing
            call.status = "completed";
            call.completedAt = completedAt;
          }
        }
      }

      // Batch update all calls that need changes
      if (callsToUpdate.length > 0) {
        console.log(`💾 Updating ${callsToUpdate.length} calls in database`);
        for (const update of callsToUpdate) {
          try {
            await storage.updateCall(update.id, update.updates);
            console.log(`✅ Updated call ${update.id}: ${update.reason}`);
          } catch (error) {
            console.error(`❌ Failed to update call ${update.id}:`, error);
          }
        }
      }

      // Now filter calls that should trigger emails
      for (const call of allCalls) {
        // Only process completed calls with completedAt timestamp
        if (call.status === "completed" && call.completedAt) {
          const completedTime = new Date(call.completedAt);
          const isWithinTimeRange = completedTime >= twentyFourHoursAgo && completedTime <= now;
          
          if (isWithinTimeRange) {
            console.log(`📧 Call ${call._id} eligible for feedback emails (completed: ${completedTime})`);
            completedCallsForEmail.push(call);
          } else {
            console.log(`📅 Call ${call._id} outside time range for emails (completed: ${completedTime})`);
          }
        }
      }

      console.log(`📬 Found ${completedCallsForEmail.length} calls eligible for feedback emails`);

      // Send feedback emails for eligible calls
      for (const call of completedCallsForEmail) {
        try {
          console.log(`🎯 Processing feedback emails for call ${call._id}`);
          
          // Check if feedback emails already sent
          const dmFeedbackExists = await storage.getInitialFeedback(
            call._id.toString(),
            "decision_maker",
          );
          const repFeedbackExists = await storage.getInitialFeedback(
            call._id.toString(),
            "sales_rep",
          );

          // Get user details
          const salesRep = await storage.getUser(call.salesRepId);
          const decisionMaker = await storage.getUser(call.decisionMakerId);

          if (!salesRep || !decisionMaker) {
            console.log(`⚠️ Skipping call ${call._id} - missing user data`);
            continue;
          }

          // Send DM feedback email if not already sent
          if (!dmFeedbackExists) {
            console.log(`📩 Sending feedback email to DM: ${decisionMaker.email}`);
            try {
              await sendPostCallFeedbackToDM(
                decisionMaker.email,
                decisionMaker.firstName,
                salesRep.firstName,
                call._id.toString(),
              );
              console.log(`✅ DM email sent successfully to ${decisionMaker.email}`);
            } catch (emailError) {
              console.error(`❌ Failed to send DM email:`, emailError);
            }
          } else {
            console.log(`📨 DM feedback already exists for call ${call._id}`);
          }

          // Send Rep feedback email if not already sent
          if (!repFeedbackExists) {
            console.log(`📩 Sending feedback email to Rep: ${salesRep.email}`);
            try {
              await sendPostCallFeedbackToRep(
                salesRep.email,
                salesRep.firstName,
                decisionMaker.firstName,
                call._id.toString(),
              );
              console.log(`✅ Rep email sent successfully to ${salesRep.email}`);
            } catch (emailError) {
              console.error(`❌ Failed to send Rep email:`, emailError);
            }
          } else {
            console.log(`📨 Rep feedback already exists for call ${call._id}`);
          }
        } catch (processingError) {
          console.error(`❌ Error processing call ${call._id}:`, processingError);
        }
      }

      console.log(`🏁 Feedback email job completed. Processed ${completedCallsForEmail.length} calls.`);
    } catch (error) {
      console.error("💥 Error in post-call feedback email job:", error);
    }
  };

  // Run the background job every 5 minutes for testing
  setInterval(sendPostCallFeedbackEmails, 5 * 60 * 1000);

  // Run once on startup (after a 30-second delay to ensure everything is loaded)
  setTimeout(sendPostCallFeedbackEmails, 30 * 1000);

  console.log("Post-call feedback email job scheduled to run every 5 minutes");

  // Debug endpoint to check DM users and their invitedBy status
  app.get("/api/debug/dm-users-status", async (req, res) => {
    try {
      const dmUsers = await storage.getUsersByRole("decision_maker");
      const dmStatus = dmUsers.map((dm) => ({
        id: dm.id,
        email: dm.email,
        name: `${dm.firstName} ${dm.lastName}`,
        calendarEnabled: dm.calendarIntegrationEnabled,
        invitedBy: dm.invitedBy,
        flagsReceived: dm.flagsReceived || 0,
      }));

      console.log("DM Users Status:", dmStatus);
      res.json({ dmUsers: dmStatus });
    } catch (error) {
      console.error("Error checking DM users status:", error);
      res.status(500).json({ error: "Failed to check DM users status" });
    }
  });

  // Debug endpoint to manually test calendar disconnection flagging
  app.post("/api/debug/test-calendar-disconnection", async (req, res) => {
    try {
      const { dmId, salesRepId } = req.body;

      if (!dmId || !salesRepId) {
        return res.status(400).json({ error: "dmId and salesRepId required" });
      }

      const dmUser = await storage.getUser(dmId);
      const salesRep = await storage.getUser(salesRepId);

      if (!dmUser || !salesRep) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(
        `Manual test: DM ${dmUser.email} disconnecting calendar, flagging sales rep ${salesRep.email}`,
      );

      // Manually trigger the calendar disconnection flag
      await handleCalendarDisconnectionFlag(salesRepId, dmId, dmUser);

      res.json({
        success: true,
        message: `Calendar disconnection flag processed for sales rep ${salesRep.email}`,
      });
    } catch (error) {
      console.error("Error testing calendar disconnection:", error);
      res.status(500).json({ error: "Failed to test calendar disconnection" });
    }
  });

  // Debug endpoint to test referral credit award
  app.post("/api/debug/test-referral-credit", async (req, res) => {
    try {
      const { dmId, salesRepId } = req.body;

      if (!dmId || !salesRepId) {
        return res.status(400).json({ error: "dmId and salesRepId required" });
      }

      const dmUser = await storage.getUser(dmId);
      if (!dmUser) {
        return res.status(404).json({ error: "DM not found" });
      }

      console.log(
        `Testing referral credit award for DM ${dmUser.email} to sales rep ${salesRepId}`,
      );

      // Manually trigger the referral credit award
      await handleCalendarConnectionCredit(salesRepId, dmId, dmUser);

      res.json({
        success: true,
        message: `Referral credit test completed for DM ${dmUser.email}`,
      });
    } catch (error) {
      console.error("Error testing referral credit:", error);
      res.status(500).json({ error: "Failed to test referral credit" });
    }
  });

  // Debug endpoint to test call booking capability
  app.post("/api/debug/can-book-call", async (req, res) => {
    try {
      const { userId, userRole } = req.body;

      if (!userId || !userRole) {
        return res.status(400).json({ error: "userId and userRole required" });
      }

      const result = await storage.canUserBookCall(userId, userRole);
      res.json(result);
    } catch (error) {
      console.error("Error testing call booking:", error);
      res.status(500).json({ error: "Failed to test call booking capability" });
    }
  });

  // Debug endpoint to disconnect DM calendar
  app.post("/api/debug/disconnect-dm-calendar", async (req, res) => {
    try {
      const { dmId } = req.body;

      if (!dmId) {
        return res.status(400).json({ error: "dmId required" });
      }

      const updatedUser = await storage.updateUser(dmId, {
        calendarIntegrationEnabled: false,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "DM not found" });
      }

      res.json({
        success: true,
        message: `DM ${updatedUser.email} calendar disconnected`,
        calendarEnabled: updatedUser.calendarIntegrationEnabled,
      });
    } catch (error) {
      console.error("Error disconnecting DM calendar:", error);
      res.status(500).json({ error: "Failed to disconnect DM calendar" });
    }
  });

  // Debug endpoint to get sales rep IDs
  app.get("/api/debug/sales-rep-ids", async (req, res) => {
    try {
      const salesReps = await storage.getUsersByRole("sales_rep");
      const salesRepData = salesReps.map((rep) => ({
        id: rep.id,
        email: rep.email,
        name: `${rep.firstName} ${rep.lastName}`,
        flagsReceived: rep.flagsReceived || 0,
      }));

      console.log("Sales Rep IDs:", salesRepData);
      res.json({ salesReps: salesRepData });
    } catch (error) {
      console.error("Error getting sales rep IDs:", error);
      res.status(500).json({ error: "Failed to get sales rep IDs" });
    }
  });

  // Debug endpoint to manually link a DM to a sales rep
  app.post("/api/debug/link-dm-to-rep", async (req, res) => {
    try {
      const { dmId, salesRepId } = req.body;

      if (!dmId || !salesRepId) {
        return res.status(400).json({ error: "dmId and salesRepId required" });
      }

      const updatedDM = await storage.updateUser(dmId, {
        invitedBy: salesRepId,
        calendarIntegrationEnabled: true,
      });

      if (!updatedDM) {
        return res.status(404).json({ error: "DM not found" });
      }

      console.log(
        `Linked DM ${updatedDM.email} to sales rep ${salesRepId} and enabled calendar`,
      );
      res.json({
        success: true,
        message: `DM ${updatedDM.email} linked to sales rep and calendar enabled`,
      });
    } catch (error) {
      console.error("Error linking DM to rep:", error);
      res.status(500).json({ error: "Failed to link DM to rep" });
    }
  });

  // Email Addon Purchase Route (for basic/pro users)
  app.post("/api/purchase-email-addon", authenticateToken, async (req, res) => {
    console.log(
      "EMAIL ADDON PURCHASE: Route hit with userId:",
      req.user?.userId,
    );
    try {
      const userId = req.user!.userId;
      console.log("EMAIL ADDON PURCHASE: Getting user by ID:", userId);
      const user = await storage.getUserById(userId);
      console.log("EMAIL ADDON PURCHASE: User found:", user ? "Yes" : "No");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has addon
      if (user.hasEmailAddon) {
        return res
          .status(400)
          .json({ message: "Email addon already purchased" });
      }

      // Check if user is on enterprise plan (they get it for free)
      if (user.packageType === "enterprise") {
        return res
          .status(400)
          .json({ message: "Enterprise users have full access included" });
      }

      // Create Stripe payment intent for $5
      console.log("EMAIL ADDON PURCHASE: Creating Stripe payment intent...");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 500, // $5.00 in cents
        currency: "usd",
        metadata: {
          userId: userId.toString(),
          addonType: "email_access",
        },
      });

      console.log(
        "EMAIL ADDON PURCHASE: Payment intent created:",
        paymentIntent.id,
      );
      const response = {
        clientSecret: paymentIntent.client_secret,
        amount: 500,
      };
      console.log("EMAIL ADDON PURCHASE: Sending response:", response);
      res.json(response);
    } catch (error: any) {
      console.error("Email addon purchase error:", error);
      res.status(500).json({
        message:
          "Error creating payment intent: " +
          (error?.message || "Unknown error"),
      });
    }
  });

  // Test endpoint to verify authentication is working
  app.get("/api/test-auth", authenticateToken, async (req, res) => {
    console.log("TEST AUTH: Route hit with userId:", req.user?.userId);
    const user = await storage.getUserById(req.user!.userId);
    res.json({
      success: true,
      userId: req.user?.userId,
      userEmail: user?.email,
      hasEmailAddon: user?.hasEmailAddon,
    });
  });

  // Confirm Email Addon Purchase
  app.post(
    "/api/confirm-email-addon-purchase",
    authenticateToken,
    async (req, res) => {
      console.log("CONFIRM ADDON: Route hit with userId:", req.user?.userId);
      console.log("CONFIRM ADDON: Request body:", req.body);
      try {
        const { paymentIntentId } = req.body;
        const userId = req.user!.userId;
        console.log(
          "CONFIRM ADDON: PaymentIntentId:",
          paymentIntentId,
          "UserId:",
          userId,
        );

        if (!paymentIntentId) {
          console.log("CONFIRM ADDON: Missing payment intent ID");
          return res
            .status(400)
            .json({ message: "Payment intent ID is required" });
        }

        // Verify payment with Stripe
        console.log("CONFIRM ADDON: Retrieving payment intent from Stripe...");
        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log(
          "CONFIRM ADDON: Payment intent status:",
          paymentIntent.status,
        );
        console.log(
          "CONFIRM ADDON: Payment intent metadata:",
          paymentIntent.metadata,
        );

        if (paymentIntent.status !== "succeeded") {
          console.log(
            "CONFIRM ADDON: Payment not succeeded, status:",
            paymentIntent.status,
          );
          return res.status(400).json({
            message: `Payment not completed. Status: ${paymentIntent.status}`,
          });
        }

        // Verify payment belongs to user (if metadata exists)
        if (paymentIntent.metadata?.userId) {
          const expectedUserId = userId.toString();
          const actualUserId = paymentIntent.metadata.userId;
          console.log(
            "CONFIRM ADDON: User ID check - Expected:",
            expectedUserId,
            "Actual:",
            actualUserId,
          );

          if (actualUserId !== expectedUserId) {
            console.log("CONFIRM ADDON: User ID mismatch");
            return res
              .status(400)
              .json({ message: "Payment not associated with this user" });
          }
        } else {
          console.log(
            "CONFIRM ADDON: No metadata found, proceeding with payment confirmation",
          );
        }

        // Check if user already has addon before updating
        console.log("CONFIRM ADDON: Checking current user status...");
        const currentUser = await storage.getUserById(userId);
        if (!currentUser) {
          console.log("CONFIRM ADDON: User not found");
          return res.status(404).json({ message: "User not found" });
        }

        if (currentUser.hasEmailAddon) {
          console.log("CONFIRM ADDON: User already has addon");
          return res.json({
            success: true,
            message: "Email addon already active",
            alreadyActive: true,
          });
        }

        // Update user with email addon
        console.log("CONFIRM ADDON: Updating user with addon...");
        const updateData = {
          hasEmailAddon: true,
          emailAddonPurchaseDate: new Date(),
        };
        console.log("CONFIRM ADDON: Update data:", updateData);

        const updatedUser = await storage.updateUser(userId, updateData);
        console.log(
          "CONFIRM ADDON: User updated result:",
          updatedUser ? "Success" : "Failed",
        );

        if (!updatedUser) {
          console.log("CONFIRM ADDON: Failed to update user");
          return res
            .status(500)
            .json({ message: "Failed to update user with addon" });
        }

        // Verify the update worked
        const verifyUser = await storage.getUserById(userId);
        console.log(
          "CONFIRM ADDON: Verification - hasEmailAddon:",
          verifyUser?.hasEmailAddon,
        );

        res.json({
          success: true,
          message: "Email addon purchased successfully",
          hasEmailAddon: verifyUser?.hasEmailAddon || false,
        });
      } catch (error: any) {
        console.error("Email addon confirmation error:", error);
        res.status(500).json({
          message:
            "Error confirming purchase: " + (error?.message || "Unknown error"),
          error: error?.message,
        });
      }
    },
  );

  // Temporary admin endpoint to fix email addon status
  app.post("/api/admin/fix-email-addon/:email", async (req, res) => {
    try {
      const email = req.params.email;
      console.log("ADMIN: Fixing email addon for:", email);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(user._id, {
        hasEmailAddon: true,
        emailAddonPurchaseDate: new Date(),
      });

      console.log(
        "ADMIN: User email addon activated:",
        updatedUser ? "Success" : "Failed",
      );
      res.json({
        success: true,
        message: "Email addon activated",
        user: updatedUser,
      });
    } catch (error: any) {
      console.error("Admin fix error:", error);
      res.status(500).json({ message: "Error: " + error.message });
    }
  });

  // Test email service for manual verification
  app.post("/api/test-email", async (req, res) => {
    try {
      const { type = "approval", email = "test@example.com", name = "Test User", role = "decision_maker", notes = "Test approval from admin" } = req.body;
      
      if (type === "approval") {
        const { sendManualVerificationApprovalEmail } = await import("./email-service");
        await sendManualVerificationApprovalEmail(email, name, role, notes);
        res.json({ success: true, message: "Approval email sent successfully" });
      } else if (type === "rejection") {
        const { sendManualVerificationRejectionEmail } = await import("./email-service");
        await sendManualVerificationRejectionEmail(email, name, role, notes);
        res.json({ success: true, message: "Rejection email sent successfully" });
      } else {
        res.status(400).json({ message: "Invalid email type. Use 'approval' or 'rejection'" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Failed to send test email", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
