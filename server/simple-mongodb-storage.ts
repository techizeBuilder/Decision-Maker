import {
  User,
  Invitation,
  Call,
  SubscriptionPlan,
  CompanyCredits,
  CallLog,
  Feedback,
  CompanyDMs,
  DMFlags,
  RepSuspension,
  CallCredits,
  DMRepCreditUsage,
  PlatformSettings,
  ActivityLog,
  MonthlyCallLimit,
  InitialFeedback,
  connectToMongoDB,
} from "./mongodb";
import type { IStorage } from "./storage";
import bcrypt from "bcrypt";

export class SimpleMongoDBStorage implements IStorage {
  async getUser(id: string): Promise<any | undefined> {
    try {
      const user = await User.findById(id);
      return user ? this.toPlainObject(user) : undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // MongoDB doesn't have username field, use email instead
    return this.getUserByEmail(username);
  }

  async getUserByEmail(email: string): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      console.log("Looking for user with email:", email);
      const user = await User.findOne({ email });
      console.log("Found user:", user ? "YES" : "NO");
      return user ? this.toPlainObject(user) : undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(userData: any): Promise<any> {
    try {
      // Hash password if not already hashed
      if (userData.password && !userData.password.startsWith("$2b$")) {
        const saltRounds = 10;
        userData.password = await bcrypt.hash(userData.password, saltRounds);
      }

      const user = new User(userData);
      await user.save();
      return this.toPlainObject(user);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: any): Promise<any | undefined> {
    try {
      const user = await User.findByIdAndUpdate(id, updates, { new: true });
      return user ? this.toPlainObject(user) : undefined;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async getInvitationsByUserId(userId: string): Promise<any[]> {
    try {
      const invitations = await Invitation.find({ salesRepId: userId });
      return invitations.map((inv) => this.toPlainObject(inv));
    } catch (error) {
      console.error("Error getting invitations:", error);
      return [];
    }
  }

  async getInvitationsByRep(repId: string): Promise<any[]> {
    try {
      const invitations = await Invitation.find({ salesRepId: repId });
      return invitations.map((inv) => this.toPlainObject(inv));
    } catch (error) {
      console.error("Error getting invitations by rep:", error);
      return [];
    }
  }

  async getInvitationById(id: string): Promise<any | undefined> {
    try {
      const invitation = await Invitation.findById(id);
      return invitation ? this.toPlainObject(invitation) : undefined;
    } catch (error) {
      console.error("Error getting invitation by ID:", error);
      return undefined;
    }
  }

  async createInvitation(invitationData: any): Promise<any> {
    try {
      const invitation = new Invitation(invitationData);
      await invitation.save();
      return this.toPlainObject(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      throw error;
    }
  }

  async updateInvitationStatus(
    id: string,
    status: string,
  ): Promise<any | undefined> {
    try {
      const invitation = await Invitation.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );
      return invitation ? this.toPlainObject(invitation) : undefined;
    } catch (error) {
      console.error("Error updating invitation status:", error);
      return undefined;
    }
  }

  async getCallsByUserId(userId: string): Promise<any[]> {
    try {
      const calls = await Call.find({
        $or: [{ salesRepId: userId }, { decisionMakerId: userId }],
      });

      // Populate decision maker names for sales rep calls
      const populatedCalls = [];
      for (const call of calls) {
        const callObj = this.toPlainObject(call);

        // If this is a sales rep viewing their calls, populate DM name
        if (call.salesRepId.toString() === userId) {
          const decisionMaker = await User.findById(call.decisionMakerId);
          callObj.decisionMakerName = decisionMaker
            ? `${decisionMaker.firstName} ${decisionMaker.lastName}`
            : "Unknown";
          callObj.dmName = callObj.decisionMakerName; // Also set dmName for backward compatibility
        }

        // If this is a decision maker viewing their calls, populate sales rep name
        if (call.decisionMakerId.toString() === userId) {
          const salesRep = await User.findById(call.salesRepId);
          callObj.salesRepName = salesRep
            ? `${salesRep.firstName} ${salesRep.lastName}`
            : "Unknown";
          callObj.company = salesRep ? salesRep.company : "";
        }

        populatedCalls.push(callObj);
      }

      return populatedCalls;
    } catch (error) {
      console.error("Error getting calls:", error);
      return [];
    }
  }

  async createCall(callData: any): Promise<any> {
    try {
      const call = new Call(callData);
      await call.save();
      return this.toPlainObject(call);
    } catch (error) {
      console.error("Error creating call:", error);
      throw error;
    }
  }

  async updateCall(id: string, updates: any): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const call = await Call.findByIdAndUpdate(id, updates, { new: true });
      return call ? this.toPlainObject(call) : undefined;
    } catch (error) {
      console.error("Error updating call:", error);
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await connectToMongoDB();
      const result = await User.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      await connectToMongoDB();
      const users = await User.find({}).sort({ createdAt: -1 });
      return users.map((user) => this.toPlainObject(user));
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async getAllInvitations(): Promise<any[]> {
    try {
      await connectToMongoDB();
      const invitations = await Invitation.find({}).sort({ createdAt: -1 });

      // Populate sales rep names
      const populatedInvitations = [];
      for (const invitation of invitations) {
        const salesRep = await User.findById(invitation.salesRepId);
        const invitationObj = this.toPlainObject(invitation);
        invitationObj.salesRepName = salesRep
          ? `${salesRep.firstName} ${salesRep.lastName}`
          : "Unknown";
        populatedInvitations.push(invitationObj);
      }

      return populatedInvitations;
    } catch (error) {
      console.error("Error getting all invitations:", error);
      return [];
    }
  }

  async getAllCalls(): Promise<any[]> {
    try {
      await connectToMongoDB();
      const calls = await Call.find({}).sort({ createdAt: -1 });
      console.log(`getAllCalls: Found ${calls.length} calls in database`);

      // Populate user names
      const populatedCalls = [];
      for (const call of calls) {
        const salesRep = await User.findById(call.salesRepId);
        const decisionMaker = await User.findById(call.decisionMakerId);
        const callObj = this.toPlainObject(call);
        callObj.salesRepName = salesRep
          ? `${salesRep.firstName} ${salesRep.lastName}`
          : "Unknown";
        callObj.decisionMakerName = decisionMaker
          ? `${decisionMaker.firstName} ${decisionMaker.lastName}`
          : "Unknown";
        populatedCalls.push(callObj);
      }

      return populatedCalls;
    } catch (error) {
      console.error("Error getting all calls:", error);
      return [];
    }
  }

  // Super Admin methods
  async getUsersByRole(role: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const users = await User.find({ role }).sort({ createdAt: -1 });
      return users.map((user) => this.toPlainObject(user));
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  async getRecentInactiveSalesReps(limit: number): Promise<any[]> {
    try {
      console.log('getRecentInactiveSalesReps called with limit:', limit);
      await connectToMongoDB();
      
      const users = await User.find({ 
        role: 'sales_rep', 
        isActive: false 
      })
      .sort({ createdAt: -1 })
      .limit(limit);
      
      console.log('Found inactive sales reps from DB:', users.length);
      if (users.length > 0) {
        console.log('Inactive users found:', users.map(u => ({ id: u._id, email: u.email, isActive: u.isActive })));
      }
      
      return users.map((user) => this.toPlainObject(user));
    } catch (error) {
      console.error("Error getting recent inactive sales reps:", error);
      return [];
    }
  }

  async getUsersWithPagination(
    page: number,
    limit: number,
    filters?: any,
  ): Promise<{ users: any[]; total: number }> {
    try {
      await connectToMongoDB();
      const skip = (page - 1) * limit;
      const query = filters || {};

      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      return {
        users: users.map((user) => this.toPlainObject(user)),
        total,
      };
    } catch (error) {
      console.error("Error getting users with pagination:", error);
      return { users: [], total: 0 };
    }
  }

  // Subscription Plan CRUD methods
  async getAllSubscriptionPlans(): Promise<any[]> {
    try {
      await connectToMongoDB();
      const plans = await SubscriptionPlan.find({ isActive: true }).sort({
        createdAt: 1,
      });
      return plans.map((plan) => ({
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billingInterval: plan.billingInterval,
        features: plan.features,
        maxCallCredits: plan.maxCallCredits,
        maxInvitations: plan.maxInvitations,
        prioritySupport: plan.prioritySupport,
        bestSeller: plan.bestSeller,
        isActive: plan.isActive,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }));
    } catch (error) {
      console.error("Error getting subscription plans:", error);
      return [];
    }
  }

  async getSubscriptionPlan(id: string): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const plan = await SubscriptionPlan.findById(id);
      if (plan) {
        return {
          id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          price: plan.price,
          billingInterval: plan.billingInterval,
          features: plan.features,
          maxCallCredits: plan.maxCallCredits,
          maxInvitations: plan.maxInvitations,
          prioritySupport: plan.prioritySupport,
          bestSeller: plan.bestSeller,
          isActive: plan.isActive,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        };
      }
      return undefined;
    } catch (error) {
      console.error("Error getting subscription plan:", error);
      return undefined;
    }
  }

  async createSubscriptionPlan(planData: any): Promise<any> {
    try {
      await connectToMongoDB();

      // If this plan is marked as best seller, remove best seller from all other plans
      if (planData.bestSeller) {
        await SubscriptionPlan.updateMany({}, { $set: { bestSeller: false } });
      }

      const plan = new SubscriptionPlan(planData);
      const savedPlan = await plan.save();

      return {
        id: savedPlan._id.toString(),
        name: savedPlan.name,
        description: savedPlan.description,
        price: savedPlan.price,
        billingInterval: savedPlan.billingInterval,
        features: savedPlan.features,
        maxCallCredits: savedPlan.maxCallCredits,
        maxInvitations: savedPlan.maxInvitations,
        prioritySupport: savedPlan.prioritySupport,
        bestSeller: savedPlan.bestSeller,
        isActive: savedPlan.isActive,
        createdAt: savedPlan.createdAt,
        updatedAt: savedPlan.updatedAt,
      };
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      throw error;
    }
  }

  async updateSubscriptionPlan(
    id: string,
    updates: any,
  ): Promise<any | undefined> {
    try {
      await connectToMongoDB();

      // If this plan is being marked as best seller, remove best seller from all other plans
      if (updates.bestSeller === true) {
        await SubscriptionPlan.updateMany(
          { _id: { $ne: id } },
          { $set: { bestSeller: false } },
        );
      }

      const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true },
      );

      if (updatedPlan) {
        return {
          id: updatedPlan._id.toString(),
          name: updatedPlan.name,
          description: updatedPlan.description,
          price: updatedPlan.price,
          billingInterval: updatedPlan.billingInterval,
          features: updatedPlan.features,
          maxCallCredits: updatedPlan.maxCallCredits,
          maxInvitations: updatedPlan.maxInvitations,
          prioritySupport: updatedPlan.prioritySupport,
          bestSeller: updatedPlan.bestSeller,
          isActive: updatedPlan.isActive,
          createdAt: updatedPlan.createdAt,
          updatedAt: updatedPlan.updatedAt,
        };
      }
      return undefined;
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      throw error;
    }
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    try {
      await connectToMongoDB();
      const result = await SubscriptionPlan.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      return false;
    }
  }

  // Activity Log methods
  async createActivityLog(log: any): Promise<any> {
    try {
      await connectToMongoDB();

      const activityLog = new ActivityLog({
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        timestamp: log.timestamp || new Date(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      });

      const savedLog = await activityLog.save();
      console.log("Activity Log saved to database:", savedLog);

      return this.toPlainObject(savedLog);
    } catch (error) {
      console.error("Error creating activity log:", error);
      console.log("Activity Log (console fallback):", log);
      return { ...log, id: Date.now().toString(), createdAt: new Date() };
    }
  }

  async getActivityLogs(
    page: number,
    limit: number,
    filters?: any,
  ): Promise<{ logs: any[]; total: number }> {
    try {
      await connectToMongoDB();

      // Build query object
      let query: any = {};

      if (filters) {
        if (filters.action && filters.action !== "all") {
          query.action = filters.action;
        }
        if (filters.entityType && filters.entityType !== "all") {
          query.entityType = filters.entityType;
        }
        if (filters.search) {
          query.$or = [
            { details: { $regex: filters.search, $options: "i" } },
            { action: { $regex: filters.search, $options: "i" } },
            { entityType: { $regex: filters.search, $options: "i" } },
          ];
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count
      const total = await ActivityLog.countDocuments(query);

      // Get logs with pagination, sorted by timestamp descending
      const logs = await ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "firstName lastName email")
        .exec();

      // Transform logs to include user info
      const transformedLogs = logs.map((log) => ({
        _id: log._id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        user: log.userId
          ? {
              firstName: log.userId.firstName,
              lastName: log.userId.lastName,
              email: log.userId.email,
            }
          : null,
      }));

      return {
        logs: transformedLogs,
        total,
      };
    } catch (error) {
      console.error("Error getting activity logs:", error);
      return { logs: [], total: 0 };
    }
  }

  // Analytics methods
  async getUserAnalytics(): Promise<any> {
    try {
      await connectToMongoDB();

      const totalUsers = await User.countDocuments();
      const salesReps = await User.countDocuments({ role: "sales_rep" });
      const decisionMakers = await User.countDocuments({
        role: "decision_maker",
      });
      const activeUsers = await User.countDocuments({ isActive: true });
      const inactiveUsers = await User.countDocuments({ isActive: false });

      // Get user growth over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsersThisMonth = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      return {
        totalUsers,
        salesReps,
        decisionMakers,
        activeUsers,
        inactiveUsers,
        newUsersThisMonth,
        userGrowthRate:
          totalUsers > 0
            ? ((newUsersThisMonth / totalUsers) * 100).toFixed(1)
            : 0,
      };
    } catch (error) {
      console.error("Error getting user analytics:", error);
      return {
        totalUsers: 0,
        salesReps: 0,
        decisionMakers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        newUsersThisMonth: 0,
        userGrowthRate: 0,
      };
    }
  }

  async getCallAnalytics(): Promise<any> {
    try {
      await connectToMongoDB();

      const totalCalls = await Call.countDocuments();
      const completedCalls = await Call.countDocuments({ status: "completed" });
      const scheduledCalls = await Call.countDocuments({ status: "scheduled" });
      const cancelledCalls = await Call.countDocuments({ status: "cancelled" });

      // Get calls this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const callsThisMonth = await Call.countDocuments({
        createdAt: { $gte: thisMonth },
      });

      // Calculate average rating
      const callsWithRating = await Call.find({
        rating: { $exists: true, $ne: null },
      });
      const averageRating =
        callsWithRating.length > 0
          ? (
              callsWithRating.reduce(
                (sum, call) => sum + (call.rating || 0),
                0,
              ) / callsWithRating.length
            ).toFixed(1)
          : 0;

      return {
        totalCalls,
        completedCalls,
        scheduledCalls,
        cancelledCalls,
        callsThisMonth,
        averageRating,
        completionRate:
          totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0,
      };
    } catch (error) {
      console.error("Error getting call analytics:", error);
      return {
        totalCalls: 0,
        completedCalls: 0,
        scheduledCalls: 0,
        cancelledCalls: 0,
        callsThisMonth: 0,
        averageRating: 0,
        completionRate: 0,
      };
    }
  }

  async getSubscriptionAnalytics(): Promise<any> {
    try {
      await connectToMongoDB();

      const freeUsers = await User.countDocuments({ packageType: "free" });
      const basicUsers = await User.countDocuments({ packageType: "basic" });
      const premiumUsers = await User.countDocuments({
        packageType: "premium",
      });
      const totalUsers = await User.countDocuments();

      return {
        freeUsers,
        basicUsers,
        premiumUsers,
        totalUsers,
        freePercentage:
          totalUsers > 0 ? ((freeUsers / totalUsers) * 100).toFixed(1) : 0,
        basicPercentage:
          totalUsers > 0 ? ((basicUsers / totalUsers) * 100).toFixed(1) : 0,
        premiumPercentage:
          totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0,
      };
    } catch (error) {
      console.error("Error getting subscription analytics:", error);
      return {
        freeUsers: 0,
        basicUsers: 0,
        premiumUsers: 0,
        totalUsers: 0,
        freePercentage: 0,
        basicPercentage: 0,
        premiumPercentage: 0,
      };
    }
  }

  // Calendar integration methods
  async getCallById(id: string): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const call = await Call.findById(id);
      return call ? this.toPlainObject(call) : undefined;
    } catch (error) {
      console.error("Error getting call by ID:", error);
      return undefined;
    }
  }

  // Enterprise admin methods
  async getUsersByCompanyDomain(domain: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const users = await User.find({
        $or: [
          { companyDomain: domain },
          { email: { $regex: `@${domain}$`, $options: "i" } },
        ],
      });
      return users.map((user) => this.toPlainObject(user));
    } catch (error) {
      console.error("Error getting users by company domain:", error);
      return [];
    }
  }

  async getCompanyInvitationsCount(domain: string): Promise<number> {
    try {
      await connectToMongoDB();
      // Get all users from the company domain
      const companyUsers = await User.find({
        $or: [
          { companyDomain: domain },
          { email: { $regex: `@${domain}$`, $options: "i" } },
        ],
      });

      const userIds = companyUsers.map((user) => user._id.toString());

      // Count invitations sent by company users
      const invitationCount = await Invitation.countDocuments({
        salesRepId: { $in: userIds },
      });

      return invitationCount;
    } catch (error) {
      console.error("Error getting company invitations count:", error);
      return 0;
    }
  }

  // Credit management methods
  async getCompanyCredits(companyDomain: string): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const credits = await CompanyCredits.findOne({ companyDomain });
      return credits ? this.toPlainObject(credits) : undefined;
    } catch (error) {
      console.error("Error getting company credits:", error);
      return undefined;
    }
  }

  async updateCompanyCredits(
    companyDomain: string,
    updates: any,
  ): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const credits = await CompanyCredits.findOneAndUpdate(
        { companyDomain },
        { $set: updates },
        { new: true },
      );
      return credits ? this.toPlainObject(credits) : undefined;
    } catch (error) {
      console.error("Error updating company credits:", error);
      return undefined;
    }
  }

  async createCompanyCredits(creditsData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const credits = new CompanyCredits(creditsData);
      const savedCredits = await credits.save();
      return this.toPlainObject(savedCredits);
    } catch (error) {
      console.error("Error creating company credits:", error);
      throw error;
    }
  }

  async updateRepCreditUsage(
    companyDomain: string,
    repId: string,
    usage: any,
  ): Promise<any> {
    try {
      await connectToMongoDB();
      const credits = await CompanyCredits.findOneAndUpdate(
        {
          companyDomain,
          "repUsage.repId": repId,
        },
        {
          $set: {
            "repUsage.$.callsBooked": usage.callsBooked,
            "repUsage.$.dmsUnlocked": usage.dmsUnlocked,
            "repUsage.$.creditsUsed": usage.creditsUsed,
            "repUsage.$.feedbacksReceived": usage.feedbacksReceived,
            "repUsage.$.flagsReceived": usage.flagsReceived,
            "repUsage.$.lastUpdated": new Date(),
          },
        },
        { new: true },
      );

      if (!credits) {
        // Add new rep usage if not found
        const updatedCredits = await CompanyCredits.findOneAndUpdate(
          { companyDomain },
          {
            $push: {
              repUsage: {
                repId,
                repEmail: usage.repEmail,
                ...usage,
                lastUpdated: new Date(),
              },
            },
          },
          { new: true },
        );
        return updatedCredits ? this.toPlainObject(updatedCredits) : undefined;
      }

      return this.toPlainObject(credits);
    } catch (error) {
      console.error("Error updating rep credit usage:", error);
      throw error;
    }
  }

  // Call logs methods
  async createCallLog(callData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const callLog = new CallLog(callData);
      const savedLog = await callLog.save();
      return this.toPlainObject(savedLog);
    } catch (error) {
      console.error("Error creating call log:", error);
      throw error;
    }
  }

  async getCallLogsByCompany(companyDomain: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const logs = await CallLog.find({ companyDomain })
        .populate("salesRepId", "firstName lastName email")
        .populate("decisionMakerId", "firstName lastName email")
        .sort({ createdAt: -1 });
      return logs.map((log) => this.toPlainObject(log));
    } catch (error) {
      console.error("Error getting call logs by company:", error);
      return [];
    }
  }

  async getCallLogsByRep(repId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const logs = await CallLog.find({ salesRepId: repId })
        .populate("decisionMakerId", "firstName lastName email")
        .sort({ createdAt: -1 });
      return logs.map((log) => this.toPlainObject(log));
    } catch (error) {
      console.error("Error getting call logs by rep:", error);
      return [];
    }
  }

  async updateCallLog(callId: string, updates: any): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const log = await CallLog.findByIdAndUpdate(callId, updates, {
        new: true,
      });
      return log ? this.toPlainObject(log) : undefined;
    } catch (error) {
      console.error("Error updating call log:", error);
      return undefined;
    }
  }

  // Feedback methods
  async createFeedback(feedbackData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const feedback = new Feedback(feedbackData);
      const savedFeedback = await feedback.save();
      return this.toPlainObject(savedFeedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      throw error;
    }
  }

  async getFeedbackByCompany(companyDomain: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const feedback = await Feedback.find({ companyDomain })
        .populate("salesRepId", "firstName lastName email")
        .populate("decisionMakerId", "firstName lastName email")
        .sort({ createdAt: -1 });
      return feedback.map((f) => this.toPlainObject(f));
    } catch (error) {
      console.error("Error getting feedback by company:", error);
      return [];
    }
  }

  async getFeedbackByRep(repId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const feedback = await Feedback.find({ salesRepId: repId })
        .populate("decisionMakerId", "firstName lastName email")
        .sort({ createdAt: -1 });
      return feedback.map((f) => this.toPlainObject(f));
    } catch (error) {
      console.error("Error getting feedback by rep:", error);
      return [];
    }
  }

  // DM tracking methods
  async getCompanyDMs(companyDomain: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const companyDMs = await CompanyDMs.find({
        companyDomain,
        status: { $ne: "removed" },
      })
        .populate(
          "dmId",
          "firstName lastName email jobTitle company linkedinUrl",
        )
        .populate("linkedRepId", "firstName lastName email")
        .populate("replacementDMId", "firstName lastName email")
        .sort({ createdAt: -1 });
      return companyDMs.map((dm) => this.toPlainObject(dm));
    } catch (error) {
      console.error("Error getting company DMs:", error);
      return [];
    }
  }

  async createCompanyDM(dmData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const companyDM = new CompanyDMs(dmData);
      const savedDM = await companyDM.save();
      return this.toPlainObject(savedDM);
    } catch (error) {
      console.error("Error creating company DM:", error);
      throw error;
    }
  }

  async updateCompanyDM(dmId: string, updates: any): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const dm = await CompanyDMs.findOneAndUpdate(
        { dmId },
        { $set: updates },
        { new: true },
      );
      return dm ? this.toPlainObject(dm) : undefined;
    } catch (error) {
      console.error("Error updating company DM:", error);
      return undefined;
    }
  }

  async requestDMRemoval(
    dmId: string,
    reason: string,
    requestedBy: string,
  ): Promise<any> {
    try {
      await connectToMongoDB();
      const dm = await CompanyDMs.findOneAndUpdate(
        { dmId },
        {
          $set: {
            removalRequested: true,
            removalReason: reason,
            status: "inactive",
          },
        },
        { new: true },
      );

      if (dm) {
        // Create activity log
        await this.createActivityLog({
          action: "REQUEST_DM_REMOVAL",
          performedBy: requestedBy,
          targetUser: dmId,
          details: `Requested removal of DM: ${reason}`,
          companyDomain: dm.companyDomain,
        });
      }

      return dm ? this.toPlainObject(dm) : undefined;
    } catch (error) {
      console.error("Error requesting DM removal:", error);
      throw error;
    }
  }

  async replaceDM(
    originalDMId: string,
    replacementDMId: string,
    replacedBy: string,
  ): Promise<any> {
    try {
      await connectToMongoDB();

      // Update original DM record
      const originalDM = await CompanyDMs.findOneAndUpdate(
        { dmId: originalDMId },
        {
          $set: {
            status: "removed",
            replacementDMId,
            removalRequested: false,
          },
        },
        { new: true },
      );

      if (originalDM) {
        // Create new DM record for replacement
        const replacementData = {
          companyDomain: originalDM.companyDomain,
          dmId: replacementDMId,
          linkedRepId: originalDM.linkedRepId,
          verificationStatus: "pending",
          engagementScore: 0,
          flagCount: 0,
          totalInteractions: 0,
          referralDate: new Date(),
          status: "active",
        };

        const replacementDM = await this.createCompanyDM(replacementData);

        // Create activity log
        await this.createActivityLog({
          action: "REPLACE_DM",
          performedBy: replacedBy,
          targetUser: originalDMId,
          details: `Replaced DM with new DM: ${replacementDMId}`,
          companyDomain: originalDM.companyDomain,
        });

        return {
          original: this.toPlainObject(originalDM),
          replacement: replacementDM,
        };
      }

      return undefined;
    } catch (error) {
      console.error("Error replacing DM:", error);
      throw error;
    }
  }

  // DM flags methods
  async createDMFlag(flagData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const flag = new DMFlags(flagData);
      const savedFlag = await flag.save();

      // Update flag count in CompanyDMs
      await CompanyDMs.findOneAndUpdate(
        { dmId: flagData.dmId },
        { $inc: { flagCount: 1 } },
      );

      return this.toPlainObject(savedFlag);
    } catch (error) {
      console.error("Error creating DM flag:", error);
      throw error;
    }
  }

  async getDMFlags(dmId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const flags = await DMFlags.find({ dmId })
        .populate("flaggedBy", "firstName lastName email")
        .populate("resolvedBy", "firstName lastName email")
        .sort({ createdAt: -1 });
      return flags.map((flag) => this.toPlainObject(flag));
    } catch (error) {
      console.error("Error getting DM flags:", error);
      return [];
    }
  }

  async getFlagsByCompany(companyDomain: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const flags = await DMFlags.find({ companyDomain })
        .populate("dmId", "firstName lastName email")
        .populate("flaggedBy", "firstName lastName email")
        .populate("resolvedBy", "firstName lastName email")
        .sort({ createdAt: -1 });
      return flags.map((flag) => this.toPlainObject(flag));
    } catch (error) {
      console.error("Error getting flags by company:", error);
      return [];
    }
  }

  async updateFlagStatus(
    flagId: string,
    status: string,
    resolution?: string,
    resolvedBy?: string,
  ): Promise<any> {
    try {
      await connectToMongoDB();
      const updates: any = { status };

      if (resolution) updates.resolution = resolution;
      if (resolvedBy) updates.resolvedBy = resolvedBy;
      if (status === "resolved") updates.resolvedAt = new Date();

      const flag = await DMFlags.findByIdAndUpdate(flagId, updates, {
        new: true,
      });
      return flag ? this.toPlainObject(flag) : undefined;
    } catch (error) {
      console.error("Error updating flag status:", error);
      return undefined;
    }
  }

  // Calendar and booking methods
  async getUserById(id: string): Promise<any | undefined> {
    await connectToMongoDB();
    const user = await User.findById(id);
    return user ? this.toPlainObject(user) : undefined;
  }

  // Get calls for sales rep by date range
  async getCallsBySalesRepDateRange(
    salesRepId: string,
    startDate: string | Date,
    endDate: string | Date,
  ): Promise<any[]> {
    await connectToMongoDB();
    
    // Convert strings to Date objects if needed
    const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    console.log(`getCallsBySalesRepDateRange for Rep ${salesRepId}:`, {
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString()
    });
    
    const [calls, callLogs] = await Promise.all([
      Call.find({
        salesRepId: salesRepId,
        scheduledAt: {
          $gte: startDateObj,
          $lte: endDateObj,
        },
        status: { $in: ["scheduled", "completed"] },
      }).sort({ scheduledAt: 1 }),
      
      CallLog.find({
        salesRepId: salesRepId,
        scheduledAt: {
          $gte: startDateObj,
          $lte: endDateObj,
        },
        status: { $in: ["scheduled", "completed"] },
      }).sort({ scheduledAt: 1 })
    ]);

    const allCalls = [...calls, ...callLogs];
    const uniqueCalls = allCalls.filter((call, index, arr) => 
      arr.findIndex(c => c._id.toString() === call._id.toString()) === index
    );

    console.log(`Sales rep ${salesRepId} has ${uniqueCalls.length} calls in date range`);
    return uniqueCalls.map((call) => this.toPlainObject(call));
  }

  async getCallsByDateRange(
    dmId: string,
    startDate: string | Date,
    endDate: string | Date,
  ): Promise<any[]> {
    await connectToMongoDB();
    
    // Convert strings to Date objects if needed
    const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    console.log(`getCallsByDateRange for DM ${dmId}:`, {
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      startDateLocal: startDateObj.toString(),
      endDateLocal: endDateObj.toString()
    });
    
    // Check both Call and CallLog collections for scheduled calls
    const [calls, callLogs] = await Promise.all([
      Call.find({
        decisionMakerId: dmId,
        scheduledAt: {
          $gte: startDateObj,
          $lte: endDateObj,
        },
        status: { $in: ["scheduled", "completed"] },
      }).sort({ scheduledAt: 1 }),
      
      CallLog.find({
        decisionMakerId: dmId,
        scheduledAt: {
          $gte: startDateObj,
          $lte: endDateObj,
        },
        status: { $in: ["scheduled", "completed"] },
      }).sort({ scheduledAt: 1 })
    ]);

    // Combine both results and deduplicate by ID
    const allCalls = [...calls, ...callLogs];
    const uniqueCalls = allCalls.filter((call, index, arr) => 
      arr.findIndex(c => c._id.toString() === call._id.toString()) === index
    );

    console.log(`getCallsByDateRange results for DM ${dmId}:`, {
      callsFound: calls.length,
      callLogsFound: callLogs.length,
      totalUnique: uniqueCalls.length,
      calls: uniqueCalls.map(call => ({
        id: call._id,
        scheduledAt: call.scheduledAt,
        status: call.status
      }))
    });

    return uniqueCalls.map((call) => this.toPlainObject(call));
  }

  async getCallByTime(
    dmId: string,
    scheduledAt: Date,
  ): Promise<any | undefined> {
    await connectToMongoDB();
    const startWindow = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
    const endWindow = new Date(scheduledAt.getTime() + 15 * 60 * 1000);

    const existingCall = await CallLog.findOne({
      decisionMakerId: dmId,
      scheduledAt: {
        $gte: startWindow,
        $lte: endWindow,
      },
      status: { $in: ["scheduled", "completed"] },
    });

    return existingCall ? this.toPlainObject(existingCall) : undefined;
  }

  async getCallsByDMId(dmId: string): Promise<any[]> {
    await connectToMongoDB();
    const calls = await CallLog.find({
      decisionMakerId: dmId,
      status: { $in: ["scheduled", "completed"] },
    }).sort({ scheduledAt: 1 });

    return calls.map((call) => this.toPlainObject(call));
  }

  async getCallsByCompany(companyDomain: string): Promise<any[]> {
    await connectToMongoDB();
    const companyUsers = await User.find({
      $or: [
        { companyDomain: companyDomain },
        { company: companyDomain.split(".")[0] },
      ],
    });

    const userIds = companyUsers.map((user) => user._id.toString());

    const calls = await CallLog.find({
      $or: [
        { salesRepId: { $in: userIds } },
        { decisionMakerId: { $in: userIds } },
      ],
      status: { $in: ["scheduled", "completed"] },
    }).sort({ scheduledAt: 1 });

    return calls.map((call) => this.toPlainObject(call));
  }

  async getFlagsByRep(repId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const { DMFlags } = await import("./mongodb");
      const flags = await DMFlags.find({ flaggedBy: repId }).sort({
        createdAt: -1,
      });
      return flags.map((flag) => this.toPlainObject(flag));
    } catch (error) {
      console.error("Error fetching flags by rep:", error);
      return [];
    }
  }

  async getAllFlags(): Promise<any[]> {
    try {
      await connectToMongoDB();
      const { DMFlags } = await import("./mongodb");
      const flags = await DMFlags.find({})
        .populate("dmId", "firstName lastName email company jobTitle")
        .populate("flaggedBy", "firstName lastName email role")
        .sort({ createdAt: -1 });
      return flags.map((flag) => this.toPlainObject(flag));
    } catch (error) {
      console.error("Error fetching all flags:", error);
      return [];
    }
  }

  async updateDMFlag(flagId: string, updateData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const { DMFlags } = await import("./mongodb");
      const updatedFlag = await DMFlags.findByIdAndUpdate(
        flagId,
        updateData,
        { new: true }
      )
        .populate("dmId", "firstName lastName email company jobTitle")
        .populate("flaggedBy", "firstName lastName email role");
      
      return updatedFlag ? this.toPlainObject(updatedFlag) : null;
    } catch (error) {
      console.error("Error updating DM flag:", error);
      throw error;
    }
  }

  async getFlagStatistics(): Promise<any> {
    try {
      await connectToMongoDB();
      const { DMFlags, User } = await import("./mongodb");
      
      // Get flag statistics
      const totalFlags = await DMFlags.countDocuments({});
      const openFlags = await DMFlags.countDocuments({ status: "open" });
      const investigatingFlags = await DMFlags.countDocuments({ status: "investigating" });
      const resolvedFlags = await DMFlags.countDocuments({ status: "resolved" });
      const dismissedFlags = await DMFlags.countDocuments({ status: "dismissed" });

      // Get suspended users count
      const suspendedUsers = await User.countDocuments({ standing: "suspended" });

      return {
        total: totalFlags,
        open: openFlags,
        investigating: investigatingFlags,
        resolved: resolvedFlags,
        dismissed: dismissedFlags,
        suspendedUsers: suspendedUsers
      };
    } catch (error) {
      console.error("Error fetching flag statistics:", error);
      return {
        total: 0,
        open: 0,
        investigating: 0,
        resolved: 0,
        dismissed: 0,
        suspendedUsers: 0
      };
    }
  }

  // Suspension-related methods
  async checkRepSuspensionStatus(repId: string): Promise<any> {
    try {
      await connectToMongoDB();
      const user = await User.findById(repId);
      if (!user) {
        return { isSuspended: false, suspension: null };
      }

      const suspension = user.suspension;
      if (!suspension || !suspension.isActive) {
        return { isSuspended: false, suspension: null };
      }

      // Check if suspension has expired
      const now = new Date();
      const endDate = new Date(suspension.endDate);

      if (endDate < now) {
        // Suspension has expired, deactivate it
        await User.findByIdAndUpdate(repId, {
          "suspension.isActive": false,
        });
        return { isSuspended: false, suspension: null };
      }

      return { isSuspended: true, suspension };
    } catch (error) {
      console.error("Error checking rep suspension status:", error);
      return { isSuspended: false, suspension: null };
    }
  }

  async suspendRep(repId: string, suspensionData: any): Promise<any> {
    try {
      await connectToMongoDB();

      const suspension = {
        type: suspensionData.type, // '30-day' or '90-day'
        startDate: new Date(),
        endDate: suspensionData.endDate,
        suspensionReason: suspensionData.reason,
        isActive: true,
        triggeredBy: suspensionData.triggeredBy || "automatic",
      };

      const updatedUser = await User.findByIdAndUpdate(
        repId,
        { $set: { suspension } },
        { new: true },
      );

      if (updatedUser) {
        // Log the suspension
        await this.createActivityLog({
          action: "SUSPEND_REP",
          performedBy: "system",
          targetUser: repId,
          details: `Sales rep suspended: ${suspension.suspensionReason}`,
          metadata: {
            suspensionType: suspension.type,
            endDate: suspension.endDate,
          },
        });
      }

      return updatedUser ? this.toPlainObject(updatedUser) : null;
    } catch (error) {
      console.error("Error suspending rep:", error);
      throw error;
    }
  }

  async liftRepSuspension(
    repId: string,
    liftedBy: string,
    reason?: string,
  ): Promise<any> {
    try {
      await connectToMongoDB();

      const updatedUser = await User.findByIdAndUpdate(
        repId,
        {
          $set: {
            "suspension.isActive": false,
            "suspension.liftedAt": new Date(),
            "suspension.liftedBy": liftedBy,
            "suspension.liftReason": reason || "Manual lift",
          },
        },
        { new: true },
      );

      if (updatedUser) {
        // Log the suspension lift
        await this.createActivityLog({
          action: "LIFT_SUSPENSION",
          performedBy: liftedBy,
          targetUser: repId,
          details: `Sales rep suspension lifted: ${reason || "Manual lift"}`,
          metadata: {
            originalSuspensionType: updatedUser.suspension?.type,
          },
        });
      }

      return updatedUser ? this.toPlainObject(updatedUser) : null;
    } catch (error) {
      console.error("Error lifting rep suspension:", error);
      throw error;
    }
  }

  async getRecentFeedbackForRep(
    repId: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      await connectToMongoDB();
      const feedback = await Feedback.find({ salesRepId: repId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("decisionMakerId", "firstName lastName email");
      return feedback.map((f) => this.toPlainObject(f));
    } catch (error) {
      console.error("Error getting recent feedback for rep:", error);
      return [];
    }
  }

  async getSuspendedReps(): Promise<any[]> {
    try {
      await connectToMongoDB();
      const suspendedUsers = await User.find({
        "suspension.isActive": true,
        "suspension.endDate": { $gt: new Date() },
      });
      return suspendedUsers.map((user) => this.toPlainObject(user));
    } catch (error) {
      console.error("Error getting suspended reps:", error);
      return [];
    }
  }

  // Credit management methods
  async awardCreditToDMCompletion(
    repId: string,
    dmId: string,
  ): Promise<{ success: boolean; message: string; creditAwarded?: any }> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Get DM to check engagement score eligibility
      const dm = await this.getUser(dmId);
      if (!dm || dm.role !== "decision_maker") {
        return {
          success: false,
          message: "Decision Maker not found",
        };
      }

      // Check DM credit eligibility based on engagement score
      // For demo purposes, we'll simulate engagement score (normally this would be calculated)
      const engagementScore = dm.engagementScore || Math.floor(Math.random() * 40) + 60; // 60-100% range
      const isEligibleForCredits = engagementScore >= 40; // DMs below 40% can't help reps earn credits

      if (!isEligibleForCredits) {
        return {
          success: false,
          message: `Decision Maker's engagement score (${engagementScore}%) is below the 40% threshold required for credit eligibility`,
        };
      }

      // Check if rep has already earned max credits from this DM this month
      const currentUsage = await this.checkDMCreditUsage(
        repId,
        dmId,
        currentMonth,
      );
      if (currentUsage >= 3) {
        return {
          success: false,
          message:
            "Maximum credits (3) already earned from this Decision Maker this month",
        };
      }

      // Check if credit already exists for this rep-dm pair this month (any onboarding source)
      const existingCredit = await CallCredits.findOne({
        repId: repId,
        dmId: dmId,
        month: currentMonth,
        source: "dm_onboarding"
      });

      if (existingCredit) {
        return {
          success: false,
          message:
            "Credit already awarded for this Decision Maker's onboarding",
        };
      }

      // Award credit
      const creditData = {
        repId: repId,
        dmId: dmId,
        month: currentMonth,
        source: "dm_onboarding", // Valid enum value from schema
        creditAmount: 1,
        earnedAt: new Date(),
      };

      const credit = await CallCredits.create(creditData);

      // Update DM credit usage
      await this.updateDMCreditUsage(repId, dmId, currentMonth);

      return {
        success: true,
        message:
          "Credit successfully awarded for Decision Maker onboarding completion with calendar integration",
        creditAwarded: this.toPlainObject(credit),
      };
    } catch (error) {
      console.error("Error awarding DM completion credit:", error);
      return {
        success: false,
        message: "Failed to award credit",
      };
    }
  }

  async checkDMCreditUsage(
    repId: string,
    dmId: string,
    month: string,
  ): Promise<number> {
    try {
      const usage = await DMRepCreditUsage.findOne({
        repId: repId,
        dmId: dmId,
        month: month,
      });
      return usage?.creditsUsed || 0;
    } catch (error) {
      console.error("Error checking DM credit usage:", error);
      return 0;
    }
  }

  async updateDMCreditUsage(
    repId: string,
    dmId: string,
    month: string,
  ): Promise<any> {
    try {
      const result = await DMRepCreditUsage.findOneAndUpdate(
        { repId: repId, dmId: dmId, month: month },
        { $inc: { creditsUsed: 1 } },
        { upsert: true, new: true },
      );
      return this.toPlainObject(result);
    } catch (error) {
      console.error("Error updating DM credit usage:", error);
      throw error;
    }
  }

  async getDMRepCreditUsage(
    repId: string,
    dmId: string,
    month: string,
  ): Promise<any> {
    try {
      const usage = await DMRepCreditUsage.findOne({
        repId: repId,
        dmId: dmId,
        month: month,
      });
      return usage ? this.toPlainObject(usage) : null;
    } catch (error) {
      console.error("Error getting DM-Rep credit usage:", error);
      return null;
    }
  }

  // Monthly Call Limit Management
  async getMonthlyCallLimit(
    userId: string,
    userRole: "sales_rep" | "decision_maker",
    month: string,
  ): Promise<any> {
    try {
      await connectToMongoDB();
      let callLimit = await MonthlyCallLimit.findOne({
        userId: userId,
        month: month,
      });

      // Get user to determine their subscription plan
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get user's subscription plan based on packageType
      const plans = await this.getAllSubscriptionPlans();
      const userPlan = plans.find(plan => 
        plan.name.toLowerCase() === user.packageType?.toLowerCase()
      );

      // Calculate max calls based on user's subscription plan
      let maxCalls = userPlan?.maxCallCredits || (userRole === "decision_maker" ? 3 : 1); // Default fallbacks
      
      console.log(`User ${userId} (${userRole}) with ${user.packageType || 'free'} plan gets ${maxCalls} monthly calls`);
      
      // For sales reps, also consider accepted DM invitations that have connected calendar
      if (userRole === "sales_rep") {
        const invitations = await this.getInvitationsByRep(userId);
        const acceptedDMs = invitations.filter(inv => inv.status === 'accepted');
        
        // Check which accepted DMs have connected their calendar
        let connectedCalendarDMsCount = 0;
        
        // First try using dmId from invitations
        for (const invitation of acceptedDMs) {
          if (invitation.dmId) {
            const dm = await this.getUserById(invitation.dmId);
            if (dm && dm.calendarIntegrationEnabled) {
              connectedCalendarDMsCount++;
            }
          }
        }
        
        // If no dmIds in invitations, check Users collection directly
        if (connectedCalendarDMsCount === 0) {
          const directDMs = await User.find({
            invitedBy: userId,
            role: 'decision_maker',
            calendarIntegrationEnabled: true
          });
          connectedCalendarDMsCount = directDMs.length;
        }
        
        // Sales rep gets 1 credit per connected-calendar DM
        // Changed from 5 credits to 1 credit per DM as per requirements
        maxCalls = connectedCalendarDMsCount; // Each connected DM = 1 call credit
        
        console.log(`Sales rep ${userId}: Accepted DMs=${acceptedDMs.length}, Connected calendar DMs=${connectedCalendarDMsCount}, Final limit=${maxCalls} (1 credit per connected DM)`);
      }

      // Create new record if doesn't exist
      if (!callLimit) {
        callLimit = await MonthlyCallLimit.create({
          userId: userId,
          userRole: userRole,
          month: month,
          totalCalls: 0,
          maxCalls: maxCalls,
          remainingCalls: maxCalls,
          lastUpdated: new Date(),
        });
      } else {
        // Update maxCalls if it has changed (for sales reps with new accepted invitations)
        if (callLimit.maxCalls !== maxCalls) {
          const newRemainingCalls = maxCalls - callLimit.totalCalls;
          callLimit = await MonthlyCallLimit.findByIdAndUpdate(
            callLimit._id,
            { 
              maxCalls: maxCalls,
              remainingCalls: Math.max(0, newRemainingCalls),
              lastUpdated: new Date()
            },
            { new: true }
          );
        }
      }

      return this.toPlainObject(callLimit);
    } catch (error) {
      console.error("Error getting monthly call limit:", error);
      return {
        userId: userId,
        userRole: userRole,
        month: month,
        totalCalls: 0,
        maxCalls: userRole === "decision_maker" ? 3 : 0,
        remainingCalls: userRole === "decision_maker" ? 3 : 0,
        lastUpdated: new Date(),
      };
    }
  }

  async updateMonthlyCallLimit(
    userId: string,
    userRole: "sales_rep" | "decision_maker",
    month: string,
    increment: number = 1,
  ): Promise<any> {
    try {
      await connectToMongoDB();
      const result = await MonthlyCallLimit.findOneAndUpdate(
        { userId: userId, month: month },
        {
          $inc: { totalCalls: increment, remainingCalls: -increment },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true, new: true },
      );
      return this.toPlainObject(result);
    } catch (error) {
      console.error("Error updating monthly call limit:", error);
      throw error;
    }
  }

  async canUserBookCall(
    userId: string,
    userRole: "sales_rep" | "decision_maker",
  ): Promise<{ canBook: boolean; remainingCalls: number; message?: string }> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const callLimit = await this.getMonthlyCallLimit(userId, userRole, currentMonth);
      
      // Check monthly call limit first
      const hasCallsRemaining = callLimit.remainingCalls > 0;
      if (!hasCallsRemaining) {
        return {
          canBook: false,
          remainingCalls: callLimit.remainingCalls,
          message: `Monthly call limit reached (${callLimit.maxCalls}/${callLimit.maxCalls} calls used)`
        };
      }

      // For sales reps, also check if any referred DMs have disconnected calendar
      if (userRole === "sales_rep") {
        const calendarBlockResult = await this.checkSalesRepCalendarBlock(userId);
        if (!calendarBlockResult.canBook) {
          return {
            canBook: false,
            remainingCalls: callLimit.remainingCalls,
            message: calendarBlockResult.message
          };
        }
      }
      
      return {
        canBook: true,
        remainingCalls: callLimit.remainingCalls,
      };
    } catch (error) {
      console.error("Error checking if user can book call:", error);
      return { canBook: false, remainingCalls: 0, message: "Error checking call limits" };
    }
  }

  async checkSalesRepCalendarBlock(salesRepId: string): Promise<{ canBook: boolean; message?: string }> {
    try {
      await connectToMongoDB();
      
      // Find all DMs that were invited by this sales rep
      const referredDMs = await User.find({ 
        invitedBy: salesRepId, 
        role: "decision_maker" 
      }).select('email firstName lastName calendarIntegrationEnabled');
      
      if (referredDMs.length === 0) {
        // No referred DMs - sales rep can book calls normally
        return { canBook: true };
      }
      
      // Check if any referred DM has disconnected calendar
      const disconnectedDMs = referredDMs.filter(dm => !dm.calendarIntegrationEnabled);
      
      if (disconnectedDMs.length > 0) {
        // Build message listing disconnected DMs
        const dmNames = disconnectedDMs.map(dm => 
          `${dm.firstName} ${dm.lastName} (${dm.email})`
        ).join(', ');
        
        const message = disconnectedDMs.length === 1 
          ? `Cannot book calls: Your referred Decision Maker ${dmNames} must reconnect their calendar to enable call booking.`
          : `Cannot book calls: Your referred Decision Makers (${dmNames}) must reconnect their calendars to enable call booking.`;
          
        return { 
          canBook: false, 
          message 
        };
      }
      
      // All referred DMs have calendars connected
      return { canBook: true };
      
    } catch (error) {
      console.error("Error checking sales rep calendar block:", error);
      return { 
        canBook: false, 
        message: "Error checking referred Decision Maker calendar status" 
      };
    }
  }

  async getRepCredits(repId: string): Promise<any[]> {
    try {
      const credits = await CallCredits.find({ repId: repId, isActive: true })
        .populate("dmId", "firstName lastName email company")
        .sort({ earnedAt: -1 });
      return credits.map((credit) => this.toPlainObject(credit));
    } catch (error) {
      console.error("Error getting rep credits:", error);
      return [];
    }
  }

  async getRepTotalCredits(repId: string): Promise<number> {
    try {
      const total = await CallCredits.countDocuments({
        repId: repId,
        isActive: true,
      });
      return total;
    } catch (error) {
      console.error("Error getting rep total credits:", error);
      return 0;
    }
  }

  async checkDatabaseAccess(repId: string): Promise<boolean> {
    try {
      // Sales rep can only access database if they have at least one ACCEPTED invitation
      // AND that DM has connected their calendar (which awards credits)
      const invitations = await this.getInvitationsByRep(repId);
      const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
      
      // No accepted invitations = no database access
      if (acceptedInvitations.length === 0) {
        console.log(`Sales rep ${repId}: No accepted invitations - database access denied`);
        return false;
      }
      
      // Check if any accepted DMs have connected calendar (which awards credits)
      let hasConnectedDMs = false;
      for (const invitation of acceptedInvitations) {
        if (invitation.dmId) {
          const dm = await this.getUserById(invitation.dmId);
          if (dm && dm.calendarIntegrationEnabled) {
            hasConnectedDMs = true;
            break;
          }
        }
      }
      
      // Also check direct Users collection for DMs invited by this rep
      if (!hasConnectedDMs) {
        const directDMs = await User.find({
          invitedBy: repId,
          role: 'decision_maker',
          calendarIntegrationEnabled: true
        });
        hasConnectedDMs = directDMs.length > 0;
      }
      
      console.log(`Sales rep ${repId}: Accepted invitations=${acceptedInvitations.length}, Connected DMs=${hasConnectedDMs}, Database access=${hasConnectedDMs}`);
      return hasConnectedDMs;
    } catch (error) {
      console.error("Error checking database access:", error);
      return false;
    }
  }

  async markDMOnboardingComplete(
    dmId: string,
    invitedByRepId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Update DM to mark onboarding as complete
      await User.findByIdAndUpdate(dmId, {
        onboardingComplete: true,
        calendarIntegrationEnabled: true,
        termsAccepted: true,
        onboardingCompletedAt: new Date(),
      });

      // Award credit to the inviting sales rep
      const creditResult = await this.awardCreditToDMCompletion(
        invitedByRepId,
        dmId,
      );

      return {
        success: true,
        message: creditResult.success
          ? "DM onboarding completed and credit awarded to sales rep"
          : `DM onboarding completed. Credit note: ${creditResult.message}`,
      };
    } catch (error) {
      console.error("Error marking DM onboarding complete:", error);
      return {
        success: false,
        message: "Failed to complete DM onboarding process",
      };
    }
  }

  // Rep suspension methods (implementation needed)
  async createRepSuspension(suspensionData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const suspension = await RepSuspension.create(suspensionData);
      return this.toPlainObject(suspension);
    } catch (error) {
      console.error("Error creating rep suspension:", error);
      throw error;
    }
  }

  async getActiveRepSuspension(repId: string): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const suspension = await RepSuspension.findOne({
        salesRepId: repId,
        isActive: true,
      });
      return suspension ? this.toPlainObject(suspension) : undefined;
    } catch (error) {
      console.error("Error getting active rep suspension:", error);
      return undefined;
    }
  }

  async updateRepSuspension(
    suspensionId: string,
    updates: any,
  ): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const suspension = await RepSuspension.findByIdAndUpdate(
        suspensionId,
        updates,
        { new: true },
      );
      return suspension ? this.toPlainObject(suspension) : undefined;
    } catch (error) {
      console.error("Error updating rep suspension:", error);
      return undefined;
    }
  }

  async getRepSuspensionHistory(repId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const suspensions = await RepSuspension.find({ salesRepId: repId }).sort({
        createdAt: -1,
      });
      return suspensions.map((s) => this.toPlainObject(s));
    } catch (error) {
      console.error("Error getting rep suspension history:", error);
      return [];
    }
  }

  async getCallsByRep(repId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const calls = await Call.find({ salesRepId: repId });
      return calls.map((call) => this.toPlainObject(call));
    } catch (error) {
      console.error("Error getting calls by rep:", error);
      return [];
    }
  }

  // Platform Settings methods
  async getPlatformSettings(): Promise<any> {
    try {
      await connectToMongoDB();
      let settings = await PlatformSettings.findOne();

      // If no settings exist, create default settings
      if (!settings) {
        settings = await PlatformSettings.create({});
      }

      return this.toPlainObject(settings);
    } catch (error) {
      console.error("Error getting platform settings:", error);
      throw error;
    }
  }

  async updatePlatformSettings(updates: any, updatedBy: string): Promise<any> {
    try {
      await connectToMongoDB();

      // Add metadata about who updated the settings
      const updateData = {
        ...updates,
        lastUpdatedBy: updatedBy,
        lastUpdatedAt: new Date(),
      };

      let settings = await PlatformSettings.findOne();

      if (!settings) {
        // Create new settings if none exist
        settings = await PlatformSettings.create(updateData);
      } else {
        // Update existing settings
        settings = await PlatformSettings.findOneAndUpdate({}, updateData, {
          new: true,
        });
      }

      return this.toPlainObject(settings);
    } catch (error) {
      console.error("Error updating platform settings:", error);
      throw error;
    }
  }

  // Increment user flag count
  async incrementUserFlag(userId: string, reason: string, flaggedBy: string): Promise<any> {
    try {
      await connectToMongoDB();
      const { User, DMFlags } = await import("./mongodb");
      
      console.log(`Starting flag increment for user ${userId}, reason: ${reason}, flagged by: ${flaggedBy}`);
      
      // Get the user being flagged and the user who flagged
      const flaggedUser = await User.findById(userId);
      const flaggingUser = await User.findById(flaggedBy);
      
      if (!flaggedUser) {
        console.error(`Flagged user not found: ${userId}`);
        throw new Error("Flagged user not found");
      }
      
      if (!flaggingUser) {
        console.error(`Flagging user not found: ${flaggedBy}`);
        throw new Error("Flagging user not found");
      }
      
      console.log(`Found users - Flagged: ${flaggedUser.email} (${flaggedUser.role}), Flagging: ${flaggingUser.email} (${flaggingUser.role})`);
      
      // Create a flag record
      const flagData = {
        dmId: userId, // Reusing the dmId field but this will be for any user
        flaggedBy: flaggedBy,
        flagType: 'quality_concern', // Using valid enum value
        description: reason, // Using description instead of reason
        status: 'open',
        severity: 'medium',
        companyDomain: flaggedUser.companyDomain || 'naeberly.com'
      };
      
      console.log('Creating flag record:', flagData);
      const flag = new DMFlags(flagData);
      await flag.save();
      console.log('Flag record created successfully');
      
      // Increment the user's flag count in the User collection
      console.log(`Incrementing flag count for user ${userId}`);
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $inc: { flagsReceived: 1 },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );
      
      const newFlagCount = updatedUser?.flagsReceived || 1;
      console.log(`Flag count incremented to: ${newFlagCount}`);
      
      // Check if user should be suspended (3 flags = 90-day suspension)
      if (newFlagCount >= 3 && flaggedUser.role === 'sales_rep') {
        console.log(`Sales rep ${flaggedUser.email} has reached ${newFlagCount} flags, applying 90-day suspension`);
        
        const suspensionStartDate = new Date();
        const suspensionEndDate = new Date();
        suspensionEndDate.setDate(suspensionStartDate.getDate() + 90);
        
        // Update user with suspension details
        await User.findByIdAndUpdate(userId, {
          $set: {
            suspension: {
              isActive: true,
              startDate: suspensionStartDate,
              endDate: suspensionEndDate,
              reason: `Automatic 90-day suspension: ${newFlagCount} flags received`,
              type: '90-day-flags'
            },
            updatedAt: new Date()
          }
        });
        
        console.log(`90-day suspension applied to ${flaggedUser.email} until ${suspensionEndDate.toDateString()}`);
      }
      
      // Send warning email to the flagged sales rep
      if (flaggedUser.role === 'sales_rep') {
        console.log('Attempting to send warning email to sales rep...');
        try {
          const { sendSalesRepWarningEmail } = await import("./email-service");
          
          const emailResult = await sendSalesRepWarningEmail(
            flaggedUser.email,
            flaggedUser.firstName,
            flaggingUser.firstName,
            `${flaggingUser.firstName} ${flaggingUser.lastName}`,
            flaggingUser.jobTitle || 'Decision Maker',
            flaggingUser.company || 'Unknown Company',
            reason,
            new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            newFlagCount
          );
          
          console.log(`Warning email sent successfully to ${flaggedUser.email}:`, emailResult);
        } catch (emailError) {
          console.error("Error sending warning email:", emailError);
          console.error("Email error details:", emailError.message);
          // Don't fail the flagging process if email fails
        }
      } else {
        console.log(`User ${flaggedUser.email} is not a sales rep (role: ${flaggedUser.role}), skipping warning email`);
      }
      
      return this.toPlainObject(updatedUser);
    } catch (error) {
      console.error("Error incrementing user flag:", error);
      console.error("Error details:", error.message);
      throw error;
    }
  }

  // Get user flags
  async getUserFlags(userId: string): Promise<any[]> {
    try {
      await connectToMongoDB();
      const { DMFlags } = await import("./mongodb");
      
      const flags = await DMFlags.find({ dmId: userId }).sort({ createdAt: -1 });
      return flags.map(flag => this.toPlainObject(flag));
    } catch (error) {
      console.error("Error getting user flags:", error);
      return [];
    }
  }

  // Check if a user is currently suspended
  async checkUserSuspensionStatus(userId: string): Promise<{ isSuspended: boolean; suspension?: any; message?: string }> {
    try {
      await connectToMongoDB();
      const { User } = await import("./mongodb");
      
      const user = await User.findById(userId);
      if (!user || !user.suspension || !user.suspension.isActive) {
        return { isSuspended: false };
      }
      
      const now = new Date();
      const endDate = new Date(user.suspension.endDate);
      
      // Check if suspension has expired
      if (now > endDate) {
        // Automatically deactivate expired suspension
        await User.findByIdAndUpdate(userId, {
          $set: {
            'suspension.isActive': false,
            updatedAt: new Date()
          }
        });
        return { isSuspended: false };
      }
      
      // User is still suspended
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const message = `Your account has been suspended due to ${user.suspension.reason}. Suspension will be lifted on ${endDate.toDateString()} (${daysRemaining} days remaining).`;
      
      return { 
        isSuspended: true, 
        suspension: user.suspension,
        message
      };
    } catch (error) {
      console.error("Error checking suspension status:", error);
      return { isSuspended: false };
    }
  }

  // Initial feedback methods
  async saveInitialFeedback(feedbackData: any): Promise<any> {
    try {
      await connectToMongoDB();
      const feedback = new InitialFeedback(feedbackData);
      await feedback.save();
      return this.toPlainObject(feedback);
    } catch (error) {
      console.error("Error saving initial feedback:", error);
      throw error;
    }
  }

  async getInitialFeedback(callId: string, userType: string): Promise<any | undefined> {
    try {
      await connectToMongoDB();
      const feedback = await InitialFeedback.findOne({ callId, userType });
      return feedback ? this.toPlainObject(feedback) : undefined;
    } catch (error) {
      console.error("Error getting initial feedback:", error);
      return undefined;
    }
  }

  private toPlainObject(mongooseDoc: any): any {
    const obj = mongooseDoc.toObject();
    // Convert MongoDB _id to id for consistency
    if (obj._id) {
      obj.id = obj._id.toString();
    }
    return obj;
  }
}
