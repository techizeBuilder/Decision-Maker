export interface IStorage {
  // User methods
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  getUserByEmail(email: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, updates: any): Promise<any | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<any[]>;
  getUsersByRole(role: string): Promise<any[]>;
  getRecentInactiveSalesReps(limit: number): Promise<any[]>;
  getUsersWithPagination(
    page: number,
    limit: number,
    filters?: any,
  ): Promise<{ users: any[]; total: number }>;

  // Invitation methods
  getInvitationsByUserId(userId: string): Promise<any[]>;
  getInvitationsByRep(repId: string): Promise<any[]>;
  createInvitation(invitation: any): Promise<any>;
  updateInvitationStatus(id: string, status: string): Promise<any | undefined>;
  getAllInvitations(): Promise<any[]>;

  // Call methods
  getCallsByUserId(userId: string): Promise<any[]>;
  createCall(call: any): Promise<any>;
  updateCall(id: string, updates: any): Promise<any | undefined>;
  getAllCalls(): Promise<any[]>;

  // Subscription Plan methods
  getAllSubscriptionPlans(): Promise<any[]>;
  getSubscriptionPlan(id: string): Promise<any | undefined>;
  createSubscriptionPlan(plan: any): Promise<any>;
  updateSubscriptionPlan(id: string, updates: any): Promise<any | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;

  // Activity Log methods
  createActivityLog(log: any): Promise<any>;
  getActivityLogs(
    page: number,
    limit: number,
    filters?: any,
  ): Promise<{ logs: any[]; total: number }>;

  // Analytics methods
  getUserAnalytics(): Promise<any>;
  getCallAnalytics(): Promise<any>;
  getSubscriptionAnalytics(): Promise<any>;

  // Calendar integration methods
  getCallById(id: string): Promise<any | undefined>;

  // Enterprise admin methods
  getUsersByCompanyDomain(domain: string): Promise<any[]>;
  getCompanyInvitationsCount(domain: string): Promise<number>;

  // Credit management methods
  getCompanyCredits(companyDomain: string): Promise<any | undefined>;
  updateCompanyCredits(
    companyDomain: string,
    updates: any,
  ): Promise<any | undefined>;
  createCompanyCredits(creditsData: any): Promise<any>;
  updateRepCreditUsage(
    companyDomain: string,
    repId: string,
    usage: any,
  ): Promise<any>;

  // Call logs methods
  createCallLog(callData: any): Promise<any>;
  getCallLogsByCompany(companyDomain: string): Promise<any[]>;
  getCallLogsByRep(repId: string): Promise<any[]>;
  updateCallLog(callId: string, updates: any): Promise<any | undefined>;

  // Feedback methods
  createFeedback(feedbackData: any): Promise<any>;
  getFeedbackByCompany(companyDomain: string): Promise<any[]>;
  getFeedbackByRep(repId: string): Promise<any[]>;

  // DM tracking methods
  getCompanyDMs(companyDomain: string): Promise<any[]>;
  createCompanyDM(dmData: any): Promise<any>;
  updateCompanyDM(dmId: string, updates: any): Promise<any | undefined>;
  requestDMRemoval(
    dmId: string,
    reason: string,
    requestedBy: string,
  ): Promise<any>;
  replaceDM(
    originalDMId: string,
    replacementDMId: string,
    replacedBy: string,
  ): Promise<any>;

  // DM flags methods
  createDMFlag(flagData: any): Promise<any>;
  getDMFlags(dmId: string): Promise<any[]>;
  getFlagsByCompany(companyDomain: string): Promise<any[]>;
  updateFlagStatus(
    flagId: string,
    status: string,
    resolution?: string,
    resolvedBy?: string,
  ): Promise<any>;

  // Calendar and booking methods
  getUserById(id: string): Promise<any | undefined>;
  getCallsByDateRange(
    dmId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]>;
  getCallByTime(dmId: string, scheduledAt: Date): Promise<any | undefined>;
  getCallsByDMId(dmId: string): Promise<any[]>;
  getCallsByCompany(companyDomain: string): Promise<any[]>;

  // Additional flags methods
  getFlagsByRep(repId: string): Promise<any[]>;
  getAllFlags(): Promise<any[]>;

  // Rep suspension methods
  createRepSuspension(suspensionData: any): Promise<any>;
  getActiveRepSuspension(repId: string): Promise<any | undefined>;
  updateRepSuspension(
    suspensionId: string,
    updates: any,
  ): Promise<any | undefined>;
  getRepSuspensionHistory(repId: string): Promise<any[]>;
  checkRepSuspensionStatus(
    repId: string,
  ): Promise<{ isSuspended: boolean; suspension?: any }>;
  getRecentFeedbackForRep(repId: string, limit?: number): Promise<any[]>;

  // Credit management methods
  awardCreditToDMCompletion(
    repId: string,
    dmId: string,
  ): Promise<{ success: boolean; message: string; creditAwarded?: any }>;
  checkDMCreditUsage(
    repId: string,
    dmId: string,
    month: string,
  ): Promise<number>;
  updateDMCreditUsage(repId: string, dmId: string, month: string): Promise<any>;
  getDMRepCreditUsage(repId: string, dmId: string, month: string): Promise<any>;
  getRepCredits(repId: string): Promise<any[]>;
  getRepTotalCredits(repId: string): Promise<number>;
  checkDatabaseAccess(repId: string): Promise<boolean>;

  // DM onboarding completion
  markDMOnboardingComplete(
    dmId: string,
    invitedByRepId: string,
  ): Promise<{ success: boolean; message: string }>;

  // Platform settings methods
  getPlatformSettings(): Promise<any>;
  updatePlatformSettings(updates: any, updatedBy: string): Promise<any>;

  // User flag methods
  incrementUserFlag(
    userId: string,
    reason: string,
    flaggedBy: string,
  ): Promise<any>;

  // Initial feedback methods (for post-call emails)
  saveInitialFeedback(feedbackData: any): Promise<any>;
  getInitialFeedback(
    callId: string,
    userType: string,
  ): Promise<any | undefined>;
}

// Import and use only MongoDB storage
import { SimpleMongoDBStorage } from "./simple-mongodb-storage";

export const storage = new SimpleMongoDBStorage();
