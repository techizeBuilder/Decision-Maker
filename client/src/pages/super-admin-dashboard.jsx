import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Shield,
  Users,
  Phone,
  CreditCard,
  Activity,
  Search,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  LogOut,
  UserCheck,
  X,
  MessageSquare,
  Calendar,
  DollarSign,
  BarChart,
  Download,
  ExternalLink,
  Settings,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Wifi,
  Database,
  Mail,
  Zap,
  Flag,
  Eye,
  Ban,
  Coins,
  Lock,
  Unlock,
  UserX,
  Filter,
} from "lucide-react";
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  updateUserSchema,
} from "@shared/schema";

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userFilters, setUserFilters] = useState({
    role: "all",
    search: "",
    page: 1,
  });
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [showCompanyCreditsModal, setShowCompanyCreditsModal] = useState(false);
  const [showCompanyEditModal, setShowCompanyEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyData, setCompanyData] = useState([
    {
      id: 1,
      name: "TechCorp Inc.",
      plan: "Enterprise",
      allocated: 500,
      used: 342,
      remaining: 158,
      renewal: "15/07/2025",
      planColor: "bg-purple-100 text-purple-800",
      remainingColor: "text-green-600",
    },
    {
      id: 2,
      name: "StartupHub LLC",
      plan: "Pro",
      allocated: 200,
      used: 187,
      remaining: 13,
      renewal: "22/07/2025",
      planColor: "bg-blue-100 text-blue-800",
      remainingColor: "text-orange-600",
    },
    {
      id: 3,
      name: "Enterprise Solutions",
      plan: "Enterprise",
      allocated: 1000,
      used: 445,
      remaining: 555,
      renewal: "30/07/2025",
      planColor: "bg-purple-100 text-purple-800",
      remainingColor: "text-green-600",
    },
  ]);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    // User Limits
    maxDmsPerMonth: 50,
    freeCallLimit: 3,

    // Credit System
    creditRefundNoShows: true,
    creditValue: 5.0,
    refundWindow: 24,

    // Enterprise Features
    nameVisibilityToggle: true,
    emailUnlockFeature: true,
    advancedAnalytics: true,
    apiAccess: false,

    // Security & Compliance
    twoFactorAuth: false,
    activityLogging: true,
    sessionTimeout: 60,
    passwordPolicy: "medium",
  });

  // Activity Logs Filters State
  const [activityFilters, setActivityFilters] = useState({
    search: "",
    action: "all",
    entityType: "all",
    page: 1,
    limit: 20,
  });

  // Flag Filters State
  const [flagFilters, setFlagFilters] = useState({
    status: "all",
    flagType: "all",
    dateRange: "all",
    search: "",
  });

  // Flag Review Modal State
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [showFlagReviewModal, setShowFlagReviewModal] = useState(false);
  const [showFlagActionModal, setShowFlagActionModal] = useState(false);

  // Platform Settings Query
  const { data: platformSettingsData, refetch: refetchPlatformSettings } =
    useQuery({
      queryKey: ["/api/super-admin/platform-settings"],
      retry: false,
    });

  // Update platform settings when data is loaded
  useEffect(() => {
    if (platformSettingsData) {
      setPlatformSettings({
        maxDmsPerMonth: platformSettingsData.maxDmsPerMonth || 50,
        freeCallLimit: platformSettingsData.freeCallLimit || 3,
        creditRefundNoShows:
          platformSettingsData.creditRefundNoShows !== undefined
            ? platformSettingsData.creditRefundNoShows
            : true,
        creditValue: platformSettingsData.creditValue || 5.0,
        refundWindow: platformSettingsData.refundWindow || 24,
        nameVisibilityToggle:
          platformSettingsData.nameVisibilityToggle !== undefined
            ? platformSettingsData.nameVisibilityToggle
            : true,
        emailUnlockFeature:
          platformSettingsData.emailUnlockFeature !== undefined
            ? platformSettingsData.emailUnlockFeature
            : true,
        advancedAnalytics:
          platformSettingsData.advancedAnalytics !== undefined
            ? platformSettingsData.advancedAnalytics
            : true,
        apiAccess:
          platformSettingsData.apiAccess !== undefined
            ? platformSettingsData.apiAccess
            : false,
        twoFactorAuth:
          platformSettingsData.twoFactorAuth !== undefined
            ? platformSettingsData.twoFactorAuth
            : false,
        activityLogging:
          platformSettingsData.activityLogging !== undefined
            ? platformSettingsData.activityLogging
            : true,
        sessionTimeout: platformSettingsData.sessionTimeout || 60,
        passwordPolicy: platformSettingsData.passwordPolicy || "medium",
      });
    }
  }, [platformSettingsData]);

  // Analytics Queries
  const { data: userAnalytics } = useQuery({
    queryKey: ["/api/super-admin/analytics/users"],
    retry: false,
  });

  const { data: callAnalytics } = useQuery({
    queryKey: ["/api/super-admin/analytics/calls"],
    retry: false,
  });

  const { data: subscriptionAnalytics } = useQuery({
    queryKey: ["/api/super-admin/analytics/subscriptions"],
    retry: false,
  });
  const { data: pendingJobTitlesData, refetch: refetchPendingJobTitles, isLoading: pendingTitlesLoading } = useQuery({
    queryKey: ["/api/admin/decision-maker/pending-job-titles"],
    retry: false,
  });
  // Track which row is currently being approved for granular UI feedback
  const [approvingJobTitleId, setApprovingJobTitleId] = useState(null);

  const approveJobTitleMutation = useMutation({
    mutationFn: async (userId) => {
      setApprovingJobTitleId(userId);
      try {
        // Use shared apiRequest helper so auth (token / cookies) is included
        return await apiRequest(`/api/admin/decision-maker/${userId}/approve-job-title`, {
          method: 'POST'
        });
      } finally {
        // Ensure we clear the row-level loading state even on error
        setApprovingJobTitleId(null);
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Job Title Approved',
        description: data?.message || 'The custom job title has been approved successfully.'
      });
      refetchPendingJobTitles();
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
    },
    onError: (error) => {
      const status = error?.status;
      toast({
        title: 'Approval Failed',
        description: `${status ? status + ': ' : ''}${error.message || 'Failed to approve job title'}`,
        variant: 'destructive'
      });
    }
  });
  const pendingJobTitles = pendingJobTitlesData?.pending || [];

  // Flag Statistics Query
  const { data: flagStatistics } = useQuery({
    queryKey: ["/api/super-admin/flag-statistics"],
    retry: false,
  });

  // All Flags Query for the reports table with filters
  const { data: allFlagsData = [] } = useQuery({
    queryKey: ["/api/flags"],
    retry: false,
  });

  // Filter flags based on filters
  const filteredFlags = useMemo(() => {
    let filtered = allFlagsData;

    // Apply status filter
    if (flagFilters.status !== "all") {
      filtered = filtered.filter((flag) => flag.status === flagFilters.status);
    }

    // Apply flag type filter
    if (flagFilters.flagType !== "all") {
      filtered = filtered.filter(
        (flag) => flag.flagType === flagFilters.flagType,
      );
    }

    // Apply date range filter
    if (flagFilters.dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (flagFilters.dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter(
        (flag) => new Date(flag.createdAt) >= filterDate,
      );
    }

    // Apply search filter
    if (flagFilters.search.trim()) {
      const searchTerm = flagFilters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (flag) =>
          flag.description?.toLowerCase().includes(searchTerm) ||
          flag.flaggedBy?.email?.toLowerCase().includes(searchTerm) ||
          flag.dmId?.email?.toLowerCase().includes(searchTerm) ||
          flag.flagType?.toLowerCase().includes(searchTerm),
      );
    }

    return filtered;
  }, [allFlagsData, flagFilters]);

  // Flag action mutations
  const updateFlagStatusMutation = useMutation({
    mutationFn: async ({ flagId, status, action }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/flags/${flagId}/status`,
        {
          status,
          action,
        },
      );
      if (!response.ok) {
        let errorMessage = "Failed to update flag";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/flag-statistics"],
      });
      toast({
        title: "Flag Updated",
        description: "Flag status has been updated successfully.",
      });
      setShowFlagActionModal(false);
      setShowFlagReviewModal(false);
      setSelectedFlag(null);
    },
    onError: (error) => {
      console.error("Flag update error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to update flag status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Flag review handlers
  const handleFlagReview = (flag) => {
    setSelectedFlag(flag);
    setShowFlagReviewModal(true);
  };

  const handleFlagAction = (flag) => {
    setSelectedFlag(flag);
    setShowFlagActionModal(true);
  };

  const handleUpdateFlagStatus = (status, action = null) => {
    if (selectedFlag) {
      updateFlagStatusMutation.mutate({
        flagId: selectedFlag._id,
        status,
        action,
      });
    }
  };

  // Users Query
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/super-admin/users", userFilters],
    retry: false,
    onSuccess: (data) => {
      // Debug: Check user data
      if (data?.users) {
        const suspendedUsers = data.users.filter(
          (u) => u.standing === "suspended",
        );
        console.log("Frontend Debug - Total users:", data.users.length);
        console.log(
          "Frontend Debug - Suspended users:",
          suspendedUsers.map((u) => ({
            name: `${u.firstName} ${u.lastName}`,
            standing: u.standing,
            isActive: u.isActive,
          })),
        );
        console.log(
          "Frontend Debug - All user standings:",
          data.users.map((u) => ({
            name: `${u.firstName} ${u.lastName}`,
            standing: u.standing,
          })),
        );
      }
    },
  });

  // Filter users based on selected role and search
  const filteredUsers = useMemo(() => {
    let filtered = usersData?.users || [];

    // Apply role filter
    if (userFilters.role !== "all") {
      if (userFilters.role === "flagged") {
        filtered = filtered.filter(
          (user) =>
            user.standing === "flagged" || (user.flags && user.flags > 0),
        );
      } else if (userFilters.role === "suspended") {
        filtered = filtered.filter(
          (user) => user.standing === "suspended" || !user.isActive,
        );
      } else {
        filtered = filtered.filter((user) => user.role === userFilters.role);
      }
    }

    // Apply search filter
    if (userFilters.search.trim()) {
      const searchTerm = userFilters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchTerm) ||
          user.lastName?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm) ||
          user.company?.toLowerCase().includes(searchTerm),
      );
    }

    return filtered;
  }, [usersData?.users, userFilters]);

  // Get user counts for tabs
  const userCounts = useMemo(() => {
    const users = usersData?.users || [];
    return {
      all: users.length,
      sales_rep: users.filter((u) => u.role === "sales_rep").length,
      decision_maker: users.filter((u) => u.role === "decision_maker").length,
      flagged: users.filter(
        (u) => u.standing === "flagged" || (u.flags && u.flags > 0),
      ).length,
      suspended: users.filter((u) => u.standing === "suspended" || !u.isActive)
        .length,
    };
  }, [usersData?.users]);

  // Subscription Plans Query
  const { data: subscriptionPlans } = useQuery({
    queryKey: ["/api/super-admin/subscription-plans"],
    retry: false,
  });

  // Activity Logs Query
  const { data: activityLogs, isLoading: activityLogsLoading } = useQuery({
    queryKey: ["/api/super-admin/activity-logs", activityFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", activityFilters.page.toString());
      params.append("limit", activityFilters.limit.toString());
      if (activityFilters.search)
        params.append("search", activityFilters.search);
      if (activityFilters.action !== "all")
        params.append("action", activityFilters.action);
      if (activityFilters.entityType !== "all")
        params.append("entityType", activityFilters.entityType);

      const url = `/api/super-admin/activity-logs?${params}`;
      return apiRequest(url, { method: "GET" });
    },
    retry: false,
  });

  // Manual Verification Query
  const { data: manualVerificationsData, isLoading: verificationsLoading, refetch: refetchVerifications } = useQuery({
    queryKey: ["/api/super-admin/manual-verification"],
    queryFn: async () => {
      return apiRequest("/api/super-admin/manual-verification", { method: "GET" });
    },
    retry: false,
  });

  // Extract the verifications array from the response
  const manualVerifications = manualVerificationsData?.verifications || [];

  // Helper function to get action badge variant
  const getActionBadgeVariant = (action) => {
    switch (action) {
      case "USER_CREATED":
      case "PLAN_CREATED":
        return "default";
      case "USER_UPDATED":
      case "PLAN_UPDATED":
      case "UPDATE_PLATFORM_SETTINGS":
        return "secondary";
      case "USER_SUSPENDED":
      case "USER_DELETED":
      case "PLAN_DELETED":
        return "destructive";
      case "USER_REINSTATED":
      case "CREDITS_UPDATED":
        return "outline";
      case "LOGIN":
      case "LOGOUT":
        return "secondary";
      default:
        return "default";
    }
  };

  // Helper function to format action text
  const formatActionText = (action) => {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Since we're doing server-side filtering, we just use the logs from the API
  const filteredActivityLogs = activityLogs?.logs || [];

  // Edit User Form
  const editUserForm = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "",
      packageType: "",
      isActive: true,
      standing: "good",
    },
  });

  // Create Plan Form
  const createPlanForm = useForm({
    resolver: zodResolver(createSubscriptionPlanSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      billingInterval: "monthly",
      features: [""],
      maxCallCredits: 0,
      maxInvitations: 0,
      prioritySupport: false,
      bestSeller: false,
      isActive: true,
    },
  });

  // Edit Plan Form
  const editPlanForm = useForm({
    resolver: zodResolver(updateSubscriptionPlanSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      billingInterval: "monthly",
      features: [""],
      maxCallCredits: 0,
      maxInvitations: 0,
      prioritySupport: false,
      bestSeller: false,
      isActive: true,
    },
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await apiRequest(`/api/super-admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/analytics/users"],
      });
      setIsEditUserOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/super-admin/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/analytics/users"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (planData) => {
      return await apiRequest("/api/super-admin/subscription-plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription plan created successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/subscription-plans"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setIsCreatePlanOpen(false);
      createPlanForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await apiRequest(`/api/super-admin/subscription-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription plan updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/subscription-plans"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setIsEditPlanOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/super-admin/subscription-plans/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/subscription-plans"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/logout", { method: "POST" });
    },
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
      setLocation("/super-admin/login");
    },
  });

  const handleEditUser = (user) => {
    setSelectedUser(user);
    editUserForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      packageType: user.packageType,
      isActive: user.isActive,
      standing: user.standing,
    });
    setIsEditUserOpen(true);
  };

  const handleDeleteUser = (userId) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      deleteUserMutation.mutate(userId);
    }
  };

  // User Management Action Handlers
  const handleSuspendUser = async (userId) => {
    const user = usersData?.users?.find((u) => u._id === userId);
    if (!user) return;

    setActionUser(user);
    setShowSuspendModal(true);
  };

  const handleReinstateUser = async (userId) => {
    const user = usersData?.users?.find((u) => u._id === userId);
    if (!user) return;

    if (
      confirm(
        `Are you sure you want to reinstate ${user.firstName} ${user.lastName}? This will restore their account access.`,
      )
    ) {
      try {
        await apiRequest("/api/super-admin/users/" + userId + "/reinstate", {
          method: "POST",
        });
        toast({
          title: "User Reinstated",
          description: `${user.firstName} ${user.lastName} has been successfully reinstated.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reinstate user. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveUser = async (userId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this user? This action cannot be undone.",
      )
    ) {
      try {
        await apiRequest(`/api/super-admin/users/${userId}`, {
          method: "DELETE",
        });
        toast({
          title: "User Removed",
          description: "User has been successfully removed from the platform.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove user. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleManageCredits = (userId) => {
    const user = usersData?.users?.find((u) => u._id === userId);
    if (!user) return;

    setActionUser(user);
    setShowCreditsModal(true);
  };

  const handleMessageUser = (userId) => {
    const user = usersData?.users?.find((u) => u._id === userId);
    if (!user) return;

    setActionUser(user);
    setShowMessageModal(true);
  };

  // Company Credits Management Handlers
  const handleAddCompanyCredits = (company) => {
    setSelectedCompany(company);
    setShowCompanyCreditsModal(true);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setShowCompanyEditModal(true);
  };

  const updateCompanyCredits = (companyId, additionalCredits) => {
    setCompanyData((prevData) =>
      prevData.map((company) => {
        if (company.id === companyId) {
          const newRemaining = company.remaining + parseInt(additionalCredits);
          const newAllocated = company.allocated + parseInt(additionalCredits);
          return {
            ...company,
            remaining: newRemaining,
            allocated: newAllocated,
            remainingColor:
              newRemaining > 100
                ? "text-green-600"
                : newRemaining > 50
                  ? "text-orange-600"
                  : "text-red-600",
          };
        }
        return company;
      }),
    );
  };

  const updateCompanySettings = (companyId, updates) => {
    setCompanyData((prevData) =>
      prevData.map((company) => {
        if (company.id === companyId) {
          const newRemaining = updates.allocated
            ? updates.allocated - company.used
            : company.remaining;
          return {
            ...company,
            ...updates,
            remaining: newRemaining,
            remainingColor:
              newRemaining > 100
                ? "text-green-600"
                : newRemaining > 50
                  ? "text-orange-600"
                  : "text-red-600",
          };
        }
        return company;
      }),
    );
  };

  // Platform Settings Handlers
  const updatePlatformSetting = (key, value) => {
    setPlatformSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Platform Settings Save Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      return apiRequest("/api/super-admin/platform-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
    onSuccess: (updatedSettings) => {
      // Update local state with saved settings
      setPlatformSettings({
        maxDmsPerMonth: updatedSettings.maxDmsPerMonth || 50,
        freeCallLimit: updatedSettings.freeCallLimit || 3,
        creditRefundNoShows:
          updatedSettings.creditRefundNoShows !== undefined
            ? updatedSettings.creditRefundNoShows
            : true,
        creditValue: updatedSettings.creditValue || 5.0,
        refundWindow: updatedSettings.refundWindow || 24,
        nameVisibilityToggle:
          updatedSettings.nameVisibilityToggle !== undefined
            ? updatedSettings.nameVisibilityToggle
            : true,
        emailUnlockFeature:
          updatedSettings.emailUnlockFeature !== undefined
            ? updatedSettings.emailUnlockFeature
            : true,
        advancedAnalytics:
          updatedSettings.advancedAnalytics !== undefined
            ? updatedSettings.advancedAnalytics
            : true,
        apiAccess:
          updatedSettings.apiAccess !== undefined
            ? updatedSettings.apiAccess
            : false,
        twoFactorAuth:
          updatedSettings.twoFactorAuth !== undefined
            ? updatedSettings.twoFactorAuth
            : false,
        activityLogging:
          updatedSettings.activityLogging !== undefined
            ? updatedSettings.activityLogging
            : true,
        sessionTimeout: updatedSettings.sessionTimeout || 60,
        passwordPolicy: updatedSettings.passwordPolicy || "medium",
      });

      // Invalidate and refetch platform settings
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/platform-settings"],
      });

      toast({
        title: "Settings Saved",
        description: "Platform settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving platform settings:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(platformSettings);
  };

  // Manual Verification Mutations
  const approveVerificationMutation = useMutation({
    mutationFn: async (verificationId) => {
      return apiRequest(`/api/super-admin/manual-verification/${verificationId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      refetchVerifications();
      toast({
        title: "Verification Approved",
        description: "User has been manually verified and approved.",
      });
    },
    onError: (error) => {
      console.error("Error approving verification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectVerificationMutation = useMutation({
    mutationFn: async (verificationId) => {
      return apiRequest(`/api/super-admin/manual-verification/${verificationId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      refetchVerifications();
      toast({
        title: "Verification Rejected",
        description: "User verification has been rejected.",
      });
    },
    onError: (error) => {
      console.error("Error rejecting verification:", error);
      toast({
        title: "Error", 
        description: error.message || "Failed to reject verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmSuspendUser = async (reason) => {
    try {
      await apiRequest(`/api/super-admin/users/${actionUser._id}/suspend`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          suspendedBy: "super_admin",
        }),
      });
      toast({
        title: "User Suspended",
        description: `${actionUser.firstName} ${actionUser.lastName} has been suspended.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setShowSuspendModal(false);
      setActionUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to suspend user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEditUserSubmit = (data) => {
    updateUserMutation.mutate({ id: selectedUser.id, updates: data });
  };

  const onCreatePlanSubmit = (data) => {
    // Filter out empty features before submission
    const cleanData = {
      ...data,
      features: data.features.filter((feature) => feature.trim() !== ""),
    };
    createPlanMutation.mutate(cleanData);
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    // Ensure features array has at least one empty string if empty
    const features =
      plan.features && plan.features.length > 0 ? plan.features : [""];
    editPlanForm.reset({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingInterval: plan.billingInterval,
      features: features,
      maxCallCredits: plan.maxCallCredits,
      maxInvitations: plan.maxInvitations,
      prioritySupport: plan.prioritySupport,
      bestSeller: plan.bestSeller,
      isActive: plan.isActive,
    });
    setIsEditPlanOpen(true);
  };

  const handleDeletePlan = (planId) => {
    if (
      confirm(
        "Are you sure you want to delete this subscription plan? This action cannot be undone.",
      )
    ) {
      deletePlanMutation.mutate(planId);
    }
  };

  const onEditPlanSubmit = (data) => {
    // Filter out empty features before submission
    const cleanData = {
      ...data,
      features: data.features.filter((feature) => feature.trim() !== ""),
    };
    updatePlanMutation.mutate({ id: selectedPlan.id, updates: cleanData });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800";
      case "sales_rep":
        return "bg-blue-100 text-blue-800";
      case "decision_maker":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    return status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Super Admin Panel
                </h1>
                <p className="text-sm text-gray-600">
                  Naeberly Platform Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-12 p-1 gap-1">
              <TabsTrigger
                value="overview"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                User Management
              </TabsTrigger>
              <TabsTrigger
                value="flags"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Flags
              </TabsTrigger>
              <TabsTrigger
                value="credits"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Credits
              </TabsTrigger>
              <TabsTrigger
                value="subscriptions"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Subscriptions
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Activity Logs
              </TabsTrigger>
              <TabsTrigger
                value="verification"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Manual Verification
              </TabsTrigger>
              {/* <TabsTrigger
                value="settings"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="text-sm whitespace-nowrap px-4 py-2"
              >
                System
              </TabsTrigger> */}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userAnalytics?.totalUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{userAnalytics?.newUsersThisMonth || 0} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Calls
                  </CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {callAnalytics?.totalCalls || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {callAnalytics?.completionRate || 0}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Users
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userAnalytics?.activeUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userAnalytics?.inactiveUsers || 0} inactive
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Premium Users
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {subscriptionAnalytics?.premiumUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {subscriptionAnalytics?.premiumPercentage || 0}% of total
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Breakdown by user roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sales Representatives</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {userAnalytics?.salesReps || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Decision Makers</span>
                      <Badge className="bg-green-100 text-green-800">
                        {userAnalytics?.decisionMakers || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription Breakdown</CardTitle>
                  <CardDescription>Users by subscription type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Free Plan</span>
                      <Badge variant="outline">
                        {subscriptionAnalytics?.freeUsers || 0} (
                        {subscriptionAnalytics?.freePercentage || 0}%)
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Basic Plan</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {subscriptionAnalytics?.basicUsers || 0} (
                        {subscriptionAnalytics?.basicPercentage || 0}%)
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Premium Plan</span>
                      <Badge className="bg-purple-100 text-purple-800">
                        {subscriptionAnalytics?.premiumUsers || 0} (
                        {subscriptionAnalytics?.premiumPercentage || 0}%)
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Decision Maker Job Titles */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Pending Decision Maker Job Titles
                    {pendingTitlesLoading && (
                      <span className="text-xs text-gray-500">Loading…</span>
                    )}
                    {!pendingTitlesLoading && pendingJobTitles.length > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {pendingJobTitles.length} awaiting approval
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Custom titles submitted during signup that require manual approval.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchPendingJobTitles()}
                  disabled={pendingTitlesLoading}
                >
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {pendingJobTitles.length === 0 && !pendingTitlesLoading && (
                  <div className="text-sm text-gray-500">No pending custom job titles.</div>
                )}
                {pendingJobTitles.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">User</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Submitted Title</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Company</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Requested</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingJobTitles.map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="px-4 py-2">{p.name}</td>
                            <td className="px-4 py-2 font-medium">{p.submittedCustomJobTitle}</td>
                            <td className="px-4 py-2">{p.company || '—'}</td>
                            <td className="px-4 py-2 text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={approvingJobTitleId === p.id || approveJobTitleMutation.isPending}
                                onClick={() => approveJobTitleMutation.mutate(p.id)}
                                aria-busy={approvingJobTitleId === p.id}
                              >
                                {approvingJobTitleId === p.id ? 'Approving…' : 'Approve'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-gray-700" />
                  <CardTitle className="text-xl">User Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Search and Filters */}
                <div className="p-6 border-b">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, company, or email..."
                      className="pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={userFilters.search}
                      onChange={(e) =>
                        setUserFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                          page: 1,
                        }))
                      }
                    />
                  </div>

                  {/* Role Tabs - Responsive */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        userFilters.role === "all"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setUserFilters((prev) => ({
                          ...prev,
                          role: "all",
                          page: 1,
                        }))
                      }
                    >
                      <span className="hidden sm:inline">All</span>
                      <span className="sm:hidden">All</span>
                      <span className="ml-1">({userCounts.all})</span>
                    </button>
                    <button
                      className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        userFilters.role === "sales_rep"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setUserFilters((prev) => ({
                          ...prev,
                          role: "sales_rep",
                          page: 1,
                        }))
                      }
                    >
                      <span className="hidden sm:inline">Sales Reps</span>
                      <span className="sm:hidden">Sales</span>
                      <span className="ml-1">({userCounts.sales_rep})</span>
                    </button>
                    <button
                      className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        userFilters.role === "decision_maker"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setUserFilters((prev) => ({
                          ...prev,
                          role: "decision_maker",
                          page: 1,
                        }))
                      }
                    >
                      <span className="hidden sm:inline">Decision Makers</span>
                      <span className="sm:hidden">DMs</span>
                      <span className="ml-1">
                        ({userCounts.decision_maker})
                      </span>
                    </button>
                    <button
                      className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        userFilters.role === "flagged"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setUserFilters((prev) => ({
                          ...prev,
                          role: "flagged",
                          page: 1,
                        }))
                      }
                    >
                      Flagged{" "}
                      <span className="ml-1">({userCounts.flagged})</span>
                    </button>
                    <button
                      className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        userFilters.role === "suspended"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setUserFilters((prev) => ({
                          ...prev,
                          role: "suspended",
                          page: 1,
                        }))
                      }
                    >
                      Suspended{" "}
                      <span className="ml-1">({userCounts.suspended})</span>
                    </button>
                  </div>
                </div>

                {/* Responsive Table Header */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-gray-700 text-sm font-medium">
                  <div className="col-span-3">Name & Email</div>
                  <div className="col-span-2">Company</div>
                  <div className="col-span-1">Plan</div>
                  <div className="col-span-1">Flags</div>
                  <div className="col-span-1">Score</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-3">Actions</div>
                </div>

                {/* User Rows */}
                <div className="divide-y divide-gray-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id || user._id}
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        {/* Desktop Layout */}
                        <div className="hidden lg:grid lg:grid-cols-12 gap-4">
                          <div className="col-span-3">
                            <div className="text-gray-900 font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {user.email}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-gray-700">
                              {user.company || "N/A"}
                            </div>
                          </div>
                          <div className="col-span-1">
                            <Badge
                              className={
                                user.packageType === "enterprise"
                                  ? "bg-orange-100 text-orange-800"
                                  : user.packageType === "premium"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {user.packageType === "enterprise"
                                ? "Enterprise"
                                : user.packageType === "premium"
                                  ? "Pro"
                                  : "Free"}
                            </Badge>
                          </div>
                          <div className="col-span-1">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                              {user.flags || 0}
                            </div>
                          </div>
                          <div className="col-span-1">
                            <div className="text-green-600 font-medium">
                              {user.role === "sales_rep" ? "85%" : "92%"}
                            </div>
                          </div>
                          <div className="col-span-1">
                            <Badge
                              className={
                                user.standing === "suspended"
                                  ? "bg-red-100 text-red-800"
                                  : user.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {user.standing === "suspended"
                                ? "Suspended"
                                : user.isActive
                                  ? "Active"
                                  : "Inactive"}
                            </Badge>
                          </div>
                          <div className="col-span-3 flex gap-2 flex-wrap">
                            {user.standing === "suspended" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReinstateUser(user._id || user.id)
                                }
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Reinstate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSuspendUser(user._id || user.id)
                                }
                                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Suspend
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRemoveUser(user._id || user.id)
                              }
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleManageCredits(user._id || user.id)
                              }
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Credits
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleMessageUser(user._id || user.id)
                              }
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                          </div>
                        </div>

                        {/* Mobile/Tablet Layout */}
                        <div className="lg:hidden space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-gray-900 font-medium text-lg">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-gray-500 text-sm">
                                {user.email}
                              </div>
                              <div className="text-gray-600 text-sm mt-1">
                                {user.company || "N/A"}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge
                                className={
                                  user.packageType === "enterprise"
                                    ? "bg-orange-100 text-orange-800"
                                    : user.packageType === "premium"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {user.packageType === "enterprise"
                                  ? "Enterprise"
                                  : user.packageType === "premium"
                                    ? "Pro"
                                    : "Free"}
                              </Badge>
                              <Badge
                                className={
                                  user.standing === "suspended"
                                    ? "bg-red-100 text-red-800"
                                    : user.isActive
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {user.standing === "suspended"
                                  ? "Suspended"
                                  : user.isActive
                                    ? "Active"
                                    : "Inactive"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Flags:</span>
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                  {user.flags || 0}
                                </div>
                              </div>
                              <div className="text-gray-500">
                                Score:{" "}
                                <span className="text-green-600 font-medium">
                                  {user.role === "sales_rep" ? "85%" : "92%"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {user.standing === "suspended" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReinstateUser(user._id || user.id)
                                }
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Reinstate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSuspendUser(user._id || user.id)
                                }
                                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Suspend
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRemoveUser(user._id || user.id)
                              }
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleManageCredits(user._id || user.id)
                              }
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Credits
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleMessageUser(user._id || user.id)
                              }
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      {userFilters.search
                        ? "No users found matching your search"
                        : "No users found"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Plans Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Subscription Plans</CardTitle>
                    <CardDescription>
                      Manage platform subscription plans
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isCreatePlanOpen}
                    onOpenChange={setIsCreatePlanOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Subscription Plan</DialogTitle>
                        <DialogDescription>
                          Add a new subscription plan to the platform
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...createPlanForm}>
                        <form
                          onSubmit={createPlanForm.handleSubmit(
                            onCreatePlanSubmit,
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={createPlanForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Plan Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Premium Plan"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createPlanForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., $29" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createPlanForm.control}
                            name="maxCallCredits"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Call Credits</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="10"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createPlanForm.control}
                            name="maxInvitations"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Invitations</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="5"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Features Management */}
                          <div className="col-span-2">
                            <FormLabel>Plan Features</FormLabel>
                            <div className="space-y-2 mt-2">
                              {createPlanForm
                                .watch("features")
                                .map((feature, index) => (
                                  <div key={index} className="flex gap-2">
                                    <FormField
                                      control={createPlanForm.control}
                                      name={`features.${index}`}
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormControl>
                                            <Input
                                              placeholder="Enter feature description"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    {createPlanForm.watch("features").length >
                                      1 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const features =
                                            createPlanForm.getValues(
                                              "features",
                                            );
                                          features.splice(index, 1);
                                          createPlanForm.setValue(
                                            "features",
                                            features,
                                          );
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const features =
                                    createPlanForm.getValues("features");
                                  features.push("");
                                  createPlanForm.setValue("features", features);
                                }}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Feature
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <FormField
                              control={createPlanForm.control}
                              name="prioritySupport"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 flex-1">
                                  <div className="space-y-0.5">
                                    <FormLabel>Priority Support</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createPlanForm.control}
                              name="bestSeller"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 flex-1">
                                  <div className="space-y-0.5">
                                    <FormLabel>Best Seller</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={createPlanMutation.isPending}
                            >
                              Create Plan
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subscriptionPlans?.map((plan) => (
                    <Card key={plan.id} className="relative">
                      {plan.bestSeller && (
                        <div className="absolute -top-3 -right-3">
                          <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">
                            Best Seller
                          </Badge>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {plan.name}
                            </CardTitle>
                            <CardDescription>
                              {plan.description}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              className={
                                plan.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {plan.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-3xl font-bold">{plan.price}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Call Credits:</span>
                              <span>
                                {plan.maxCallCredits === -1
                                  ? "Unlimited"
                                  : plan.maxCallCredits}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Invitations:</span>
                              <span>
                                {plan.maxInvitations === -1
                                  ? "Unlimited"
                                  : plan.maxInvitations}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Priority Support:</span>
                              <span>{plan.prioritySupport ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Best Seller:</span>
                              <span>{plan.bestSeller ? "Yes" : "No"}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlan(plan)}
                              className="flex-1"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="flex-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Call Analytics</CardTitle>
                  <CardDescription>
                    Platform call performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Calls</span>
                      <span className="font-semibold">
                        {callAnalytics?.totalCalls || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed</span>
                      <span className="font-semibold text-green-600">
                        {callAnalytics?.completedCalls || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Scheduled</span>
                      <span className="font-semibold text-blue-600">
                        {callAnalytics?.scheduledCalls || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cancelled</span>
                      <span className="font-semibold text-red-600">
                        {callAnalytics?.cancelledCalls || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Rating</span>
                      <span className="font-semibold">
                        {callAnalytics?.averageRating || 0}/5
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>
                    Platform user growth metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Users</span>
                      <span className="font-semibold">
                        {userAnalytics?.totalUsers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>New This Month</span>
                      <span className="font-semibold text-green-600">
                        {userAnalytics?.newUsersThisMonth || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Growth Rate</span>
                      <span className="font-semibold">
                        {userAnalytics?.userGrowthRate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Users</span>
                      <span className="font-semibold text-blue-600">
                        {userAnalytics?.activeUsers || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Settings className="w-6 h-6 text-purple-600" />
                Platform Settings Panel
              </h2>
              <p className="text-gray-600">
                Configure platform-wide settings and restrictions. Changes are
                saved automatically when you click "Save Settings".
              </p>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  All fields are live-editable. Modify values and click Save
                  Settings to apply changes.
                </p>
              </div>
            </div>

            {/* User Limits & Restrictions */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  User Limits & Restrictions
                </CardTitle>
                <CardDescription>
                  Set platform usage limits and user restrictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label
                      htmlFor="max-dms"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Max DMs per Rep/Month
                    </Label>
                    <Input
                      id="max-dms"
                      type="number"
                      value={platformSettings.maxDmsPerMonth}
                      onChange={(e) =>
                        updatePlatformSetting(
                          "maxDmsPerMonth",
                          parseInt(e.target.value),
                        )
                      }
                      className="bg-white border-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum decision makers a sales rep can contact monthly
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="free-call-limit"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Free Plan Call Limit
                    </Label>
                    <Input
                      id="free-call-limit"
                      type="number"
                      value={platformSettings.freeCallLimit}
                      onChange={(e) =>
                        updatePlatformSetting(
                          "freeCallLimit",
                          parseInt(e.target.value),
                        )
                      }
                      className="bg-white border-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of calls allowed for free plan users
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit System */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">Credit System</CardTitle>
                <CardDescription>
                  Configure credit management and refund policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Credit Refund for No-Shows
                      </h4>
                      <p className="text-sm text-gray-600">
                        Automatically refund credits when DMs don't show up
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.creditRefundNoShows}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("creditRefundNoShows", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="credit-value"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Credit Value (USD)
                      </Label>
                      <Input
                        id="credit-value"
                        type="number"
                        step="0.01"
                        value={platformSettings.creditValue}
                        onChange={(e) =>
                          updatePlatformSetting(
                            "creditValue",
                            parseFloat(e.target.value),
                          )
                        }
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="refund-window"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Refund Window (hours)
                      </Label>
                      <Input
                        id="refund-window"
                        type="number"
                        value={platformSettings.refundWindow}
                        onChange={(e) =>
                          updatePlatformSetting(
                            "refundWindow",
                            parseInt(e.target.value),
                          )
                        }
                        className="bg-white border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Features */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Enterprise Features
                </CardTitle>
                <CardDescription>
                  Control enterprise-level functionality and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Name Visibility Toggle
                      </h4>
                      <p className="text-sm text-gray-600">
                        Allow enterprise users to see real DM names before
                        booking
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.nameVisibilityToggle}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("nameVisibilityToggle", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Email Unlock Feature
                      </h4>
                      <p className="text-sm text-gray-600">
                        Allow enterprise users to unlock DM email addresses
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.emailUnlockFeature}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("emailUnlockFeature", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Advanced Analytics
                      </h4>
                      <p className="text-sm text-gray-600">
                        Enable detailed performance analytics for enterprise
                        accounts
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.advancedAnalytics}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("advancedAnalytics", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  {/* <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        API Access
                      </h4>
                      <p className="text-sm text-gray-600">
                        Allow enterprise users to access platform APIs
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.apiAccess}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("apiAccess", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div> */}
                </div>
              </CardContent>
            </Card>

            {/* Security & Compliance */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Security & Compliance
                </CardTitle>
                <CardDescription>
                  Configure security policies and compliance settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-sm text-gray-600">
                        Require 2FA for enterprise admin accounts
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("twoFactorAuth", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Activity Logging
                      </h4>
                      <p className="text-sm text-gray-600">
                        Log all user actions for audit purposes
                      </p>
                    </div>
                    <Switch
                      checked={platformSettings.activityLogging}
                      onCheckedChange={(checked) =>
                        updatePlatformSetting("activityLogging", checked)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="session-timeout"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Session Timeout (minutes)
                      </Label>
                      <Input
                        id="session-timeout"
                        type="number"
                        value={platformSettings.sessionTimeout}
                        onChange={(e) =>
                          updatePlatformSetting(
                            "sessionTimeout",
                            parseInt(e.target.value),
                          )
                        }
                        className="bg-white border-gray-300"
                      />
                    </div>

                    {/* <div>
                      <Label
                        htmlFor="password-policy"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Password Policy
                      </Label>
                      <Select
                        value={platformSettings.passwordPolicy}
                        onValueChange={(value) =>
                          updatePlatformSetting("passwordPolicy", value)
                        }
                      >
                        <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Basic (8+ chars)</SelectItem>
                          <SelectItem value="medium">
                            Medium (8+ chars, mixed case)
                          </SelectItem>
                          <SelectItem value="high">
                            Strong (12+ chars, mixed case, symbols)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Settings Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2"
              >
                <Settings className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Server className="w-6 h-6 text-purple-600" />
                System Logs & Diagnostics
              </h2>
              <p className="text-gray-600">
                Monitor system health and troubleshoot issues
              </p>
            </div>

            {/* System Health Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  System Health Status
                </CardTitle>
                <CardDescription>
                  Real-time status of all system components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Calendar Sync
                      </span>
                    </div>
                    <span className="text-xs text-red-600 font-medium">
                      Issues Detected
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Email Delivery
                      </span>
                    </div>
                    <span className="text-xs text-red-600 font-medium">
                      Issues Detected
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        API Services
                      </span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                      All OK
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Payments
                      </span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                      All OK
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Database
                      </span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                      All OK
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Performance
                      </span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                      All OK
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-red-700 font-medium">Errors</p>
                      <p className="text-2xl font-bold text-red-900">2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        Warnings
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Resolved
                      </p>
                      <p className="text-2xl font-bold text-green-900">1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent System Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Recent System Logs
                </CardTitle>
                <CardDescription>
                  Latest system events and error reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Error Log Entry */}
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-red-100 rounded">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Failed to sync calendar for user john.doe@company.com
                        </p>
                        <p className="text-xs text-gray-500">
                          30/06/2025, 10:00:58
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-300"
                    >
                      Mark Resolved
                    </Button>
                  </div>

                  {/* Warning Log Entry */}
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-yellow-100 rounded">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className="text-xs bg-yellow-100 text-yellow-800"
                          >
                            Warning
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Email bounced for jane.smith@invaliddomain.com
                        </p>
                        <p className="text-xs text-gray-500">
                          30/06/2025, 14:45:22
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-300"
                    >
                      Mark Resolved
                    </Button>
                  </div>

                  {/* Resolved Log Entry */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="text-xs bg-red-100 text-red-800">
                            Error
                          </Badge>
                          <Badge className="text-xs bg-green-100 text-green-800">
                            Resolved
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          LinkedIn verification API timeout
                        </p>
                        <p className="text-xs text-gray-500">
                          30/06/2025, 14:30:56
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600 font-medium">
                        Resolved
                      </span>
                    </div>
                  </div>

                  {/* Another Error Log Entry */}
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-red-100 rounded">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Stripe webhook verification failed
                        </p>
                        <p className="text-xs text-gray-500">
                          30/06/2025, 14:10:56
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-300"
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>

                {/* View More Logs */}
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    className="bg-white border-gray-300"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    View All System Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flags Tab */}
          <TabsContent value="flags" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Flag className="w-6 h-6 text-purple-600" />
                Flag & Behavior Reports
              </h2>
              <p className="text-gray-600">
                Monitor and manage user behavior reports and flagged content
              </p>
            </div>

            {/* Flag Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <Flag className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-red-700 font-medium">
                        Open Reports
                      </p>
                      <p className="text-2xl font-bold text-red-900">
                        {flagStatistics?.open || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Eye className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        Under Review
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {flagStatistics?.investigating || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <UserX className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-700 font-medium">
                        Suspended Users
                      </p>
                      <p className="text-2xl font-bold text-orange-900">
                        {flagStatistics?.suspendedUsers || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Resolved
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {flagStatistics?.resolved || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">Filter Reports</CardTitle>
                <CardDescription>
                  Filter and search through behavior reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label
                      htmlFor="report-status"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Report Status
                    </Label>
                    <Select
                      value={flagFilters.status}
                      onValueChange={(value) =>
                        setFlagFilters((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Reports</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">
                          Under Review
                        </SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="report-type"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Report Type
                    </Label>
                    <Select
                      value={flagFilters.flagType}
                      onValueChange={(value) =>
                        setFlagFilters((prev) => ({ ...prev, flagType: value }))
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="inappropriate_behavior">
                          Inappropriate Behavior
                        </SelectItem>
                        <SelectItem value="unresponsive">
                          Unresponsive
                        </SelectItem>
                        <SelectItem value="fake_profile">
                          Fake Profile
                        </SelectItem>
                        <SelectItem value="low_engagement">
                          Low Engagement
                        </SelectItem>
                        <SelectItem value="scheduling_issues">
                          Scheduling Issues
                        </SelectItem>
                        <SelectItem value="quality_concern">
                          Quality Concern
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="date-range"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Date Range
                    </Label>
                    <Select
                      value={flagFilters.dateRange}
                      onValueChange={(value) =>
                        setFlagFilters((prev) => ({
                          ...prev,
                          dateRange: value,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="search-reports"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Search
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="search-reports"
                        placeholder="Search reports..."
                        className="pl-10 bg-white border-gray-300"
                        value={flagFilters.search}
                        onChange={(e) =>
                          setFlagFilters((prev) => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Flag Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Recent Flag Reports
                </CardTitle>
                <CardDescription>
                  Latest behavior reports and moderation actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Reported User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFlags.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No flag reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFlags.slice(0, 10).map((flag) => {
                          const getStatusColor = (status) => {
                            switch (status) {
                              case "open":
                                return "bg-red-100 text-red-800";
                              case "investigating":
                                return "bg-yellow-100 text-yellow-800";
                              case "resolved":
                                return "bg-green-100 text-green-800";
                              case "dismissed":
                                return "bg-gray-100 text-gray-800";
                              default:
                                return "bg-gray-100 text-gray-800";
                            }
                          };

                          const getFlagTypeColor = (flagType) => {
                            switch (flagType) {
                              case "inappropriate_behavior":
                                return "bg-red-100 text-red-800";
                              case "unresponsive":
                                return "bg-orange-100 text-orange-800";
                              case "fake_profile":
                                return "bg-red-100 text-red-800";
                              case "low_engagement":
                                return "bg-yellow-100 text-yellow-800";
                              case "scheduling_issues":
                                return "bg-orange-100 text-orange-800";
                              case "quality_concern":
                                return "bg-purple-100 text-purple-800";
                              default:
                                return "bg-gray-100 text-gray-800";
                            }
                          };

                          const formatFlagType = (flagType) => {
                            return (
                              flagType
                                ?.replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                              "Unknown"
                            );
                          };

                          const formatDate = (dateString) => {
                            if (!dateString) return "N/A";
                            return new Date(dateString).toLocaleDateString(
                              "en-GB",
                            );
                          };

                          return (
                            <TableRow key={flag._id}>
                              <TableCell>
                                {flag.flaggedBy?.email || "Unknown"}
                              </TableCell>
                              <TableCell>
                                {flag.dmId?.email || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={getFlagTypeColor(flag.flagType)}
                                >
                                  {formatFlagType(flag.flagType)}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {flag.description || "No description"}
                              </TableCell>
                              <TableCell>
                                {formatDate(flag.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(flag.status)}>
                                  {flag.status?.charAt(0).toUpperCase() +
                                    flag.status?.slice(1) || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white border-gray-300"
                                    onClick={() => handleFlagReview(flag)}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    {flag.status === "resolved"
                                      ? "View"
                                      : "Review"}
                                  </Button>
                                  {flag.status !== "resolved" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-white border-gray-300 text-red-600"
                                      onClick={() => handleFlagAction(flag)}
                                    >
                                      <Ban className="w-3 h-3 mr-1" />
                                      Action
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    className="bg-white border-gray-300"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    View All Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Coins className="w-6 h-6 text-purple-600" />
                Credits & Access Management
              </h2>
              <p className="text-gray-600">
                Manage credit allocations and access permissions across the
                platform
              </p>
            </div>

            {/* Credit Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Coins className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">
                        Total Credits Issued
                      </p>
                      <p className="text-2xl font-bold text-blue-900">15,742</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Credits Used
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        12,389
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        Pending Credits
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        3,353
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Lock className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 font-medium">
                        Access Requests
                      </p>
                      <p className="text-2xl font-bold text-purple-900">23</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Company Credit Management */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Company Credit Allocations
                </CardTitle>
                <CardDescription>
                  Manage credit pools for enterprise clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Credits Allocated</TableHead>
                        <TableHead>Credits Used</TableHead>
                        <TableHead>Credits Remaining</TableHead>
                        <TableHead>Next Renewal</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyData.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">
                            {company.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={company.planColor}>
                              {company.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>{company.allocated}</TableCell>
                          <TableCell>{company.used}</TableCell>
                          <TableCell>
                            <span
                              className={`${company.remainingColor} font-medium`}
                            >
                              {company.remaining}
                            </span>
                          </TableCell>
                          <TableCell>{company.renewal}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white border-gray-300"
                                onClick={() => handleAddCompanyCredits(company)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Credits
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white border-gray-300"
                                onClick={() => handleEditCompany(company)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Access Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Access Management
                </CardTitle>
                <CardDescription>
                  Manage special access permissions and feature unlocks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Enterprise Email Unlock
                      </h4>
                      <p className="text-sm text-gray-600">
                        Allow enterprise users to unlock DM email addresses
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-green-600 font-medium">
                        47 companies enabled
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white border-gray-300"
                      >
                        <Unlock className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Premium Analytics Access
                      </h4>
                      <p className="text-sm text-gray-600">
                        Advanced reporting and analytics features
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-blue-600 font-medium">
                        23 companies enabled
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white border-gray-300"
                      >
                        <BarChart className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        API Access
                      </h4>
                      <p className="text-sm text-gray-600">
                        Platform API access for enterprise integrations
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-purple-600 font-medium">
                        12 companies enabled
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white border-gray-300"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        White-label Features
                      </h4>
                      <p className="text-sm text-gray-600">
                        Custom branding and white-label capabilities
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-orange-600 font-medium">
                        8 companies enabled
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white border-gray-300"
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Monitor platform activity and admin actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Activity Logs Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search activity logs..."
                          className="pl-9"
                          value={activityFilters.search}
                          onChange={(e) =>
                            setActivityFilters((prev) => ({
                              ...prev,
                              search: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <Select
                      value={activityFilters.action}
                      onValueChange={(value) =>
                        setActivityFilters((prev) => ({
                          ...prev,
                          action: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="USER_CREATED">
                          User Created
                        </SelectItem>
                        <SelectItem value="USER_UPDATED">
                          User Updated
                        </SelectItem>
                        <SelectItem value="USER_SUSPENDED">
                          User Suspended
                        </SelectItem>
                        <SelectItem value="USER_REINSTATED">
                          User Reinstated
                        </SelectItem>
                        <SelectItem value="USER_DELETED">
                          User Deleted
                        </SelectItem>
                        <SelectItem value="CREDITS_UPDATED">
                          Credits Updated
                        </SelectItem>
                        <SelectItem value="PLAN_CREATED">
                          Plan Created
                        </SelectItem>
                        <SelectItem value="PLAN_UPDATED">
                          Plan Updated
                        </SelectItem>
                        <SelectItem value="PLAN_DELETED">
                          Plan Deleted
                        </SelectItem>
                        <SelectItem value="UPDATE_PLATFORM_SETTINGS">
                          Platform Settings
                        </SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                        <SelectItem value="LOGOUT">Logout</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={activityFilters.entityType}
                      onValueChange={(value) =>
                        setActivityFilters((prev) => ({
                          ...prev,
                          entityType: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="subscription_plan">
                          Subscription Plan
                        </SelectItem>
                        <SelectItem value="platform_settings">
                          Platform Settings
                        </SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="invitation">Invitation</SelectItem>
                        <SelectItem value="credits">Credits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activity Logs Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2">
                                  Loading activity logs...
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredActivityLogs.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-8 text-gray-500"
                            >
                              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>No activity logs found</p>
                              <p className="text-sm">
                                {activityFilters.search ||
                                activityFilters.action !== "all" ||
                                activityFilters.entityType !== "all"
                                  ? "Try adjusting your filters"
                                  : "Activity logs will appear here as actions are performed"}
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredActivityLogs.map((log) => (
                            <TableRow key={log._id}>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(log.timestamp).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {log.user?.firstName} {log.user?.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {log.user?.email}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getActionBadgeVariant(log.action)}
                                >
                                  {formatActionText(log.action)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{log.entityType}</div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className="text-sm max-w-xs truncate"
                                  title={log.details}
                                >
                                  {log.details}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-mono">
                                  {log.ipAddress || "N/A"}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Activity Logs Pagination */}
                  {activityLogs?.total > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing{" "}
                        {(activityFilters.page - 1) * activityFilters.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          activityFilters.page * activityFilters.limit,
                          activityLogs.total,
                        )}{" "}
                        of {activityLogs.total} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActivityFilters((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }))
                          }
                          disabled={activityFilters.page === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            {
                              length: Math.min(
                                5,
                                Math.ceil(
                                  activityLogs.total / activityFilters.limit,
                                ),
                              ),
                            },
                            (_, i) => {
                              const page = i + 1;
                              return (
                                <Button
                                  key={page}
                                  variant={
                                    activityFilters.page === page
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    setActivityFilters((prev) => ({
                                      ...prev,
                                      page,
                                    }))
                                  }
                                >
                                  {page}
                                </Button>
                              );
                            },
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActivityFilters((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={
                            activityFilters.page >=
                            Math.ceil(
                              activityLogs.total / activityFilters.limit,
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Verification Tab */}
          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Verification Queue</CardTitle>
                <CardDescription>
                  Review and approve users who need manual verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : !manualVerifications || manualVerifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No pending verifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {manualVerifications.map((verification) => (
                      <Card key={verification._id} className="border-l-4 border-l-yellow-400">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {verification.firstName} {verification.lastName}
                              </h3>
                              <p className="text-gray-600">{verification.userEmail}</p>
                              <Badge variant="outline" className="mt-2">
                                {verification.userRole === "sales_rep" ? "Sales Rep" : "Decision Maker"}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                Submitted: {new Date(verification.submittedAt).toLocaleDateString()}
                              </p>
                              <Badge variant="secondary" className="mt-1">
                                {verification.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">LinkedIn Profile:</p>
                              <a 
                                href={verification.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm break-all"
                              >
                                {verification.linkedinUrl}
                              </a>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Company Domain:</p>
                              <p className="text-sm">{verification.companyDomain}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700">Reason for Manual Review:</p>
                            <p className="text-sm text-gray-600">{verification.reason}</p>
                          </div>
                          
                          <div className="flex space-x-3">
                            <Button
                              onClick={() => approveVerificationMutation.mutate(verification._id)}
                              disabled={approveVerificationMutation.isPending || rejectVerificationMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => rejectVerificationMutation.mutate(verification._id)}
                              disabled={approveVerificationMutation.isPending || rejectVerificationMutation.isPending}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user information and settings
            </DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form
              onSubmit={editUserForm.handleSubmit(onEditUserSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editUserForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales_rep">Sales Rep</SelectItem>
                        <SelectItem value="decision_maker">
                          Decision Maker
                        </SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="packageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan details
            </DialogDescription>
          </DialogHeader>
          <Form {...editPlanForm}>
            <form
              onSubmit={editPlanForm.handleSubmit(onEditPlanSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editPlanForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter plan name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPlanForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $29/month" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editPlanForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Plan description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editPlanForm.control}
                  name="billingInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Interval</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPlanForm.control}
                  name="maxCallCredits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Call Credits</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter credits (-1 for unlimited)"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editPlanForm.control}
                  name="maxInvitations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Invitations</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter invitations (-1 for unlimited)"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormField
                    control={editPlanForm.control}
                    name="prioritySupport"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Priority Support</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Features Management for Edit Form */}
              <div>
                <FormLabel>Plan Features</FormLabel>
                <div className="space-y-2 mt-2">
                  {editPlanForm.watch("features").map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <FormField
                        control={editPlanForm.control}
                        name={`features.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Enter feature description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {editPlanForm.watch("features").length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const features = editPlanForm.getValues("features");
                            features.splice(index, 1);
                            editPlanForm.setValue("features", features);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const features = editPlanForm.getValues("features");
                      features.push("");
                      editPlanForm.setValue("features", features);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feature
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editPlanForm.control}
                  name="bestSeller"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Best Seller</FormLabel>
                        <FormDescription>
                          Only one plan can be marked as best seller
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPlanForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Plan visibility status
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  Update Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Suspend User Modal */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend {actionUser?.firstName} {actionUser?.lastName} from the
              platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Reason for suspension
              </label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows="3"
                placeholder="Enter reason for suspension..."
                id="suspension-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => {
                const reason =
                  document.getElementById("suspension-reason").value;
                if (reason.trim()) {
                  confirmSuspendUser(reason);
                } else {
                  toast({
                    title: "Error",
                    description: "Please provide a reason for suspension.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credits Management Modal */}
      <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Credits</DialogTitle>
            <DialogDescription>
              Manage credits for {actionUser?.firstName} {actionUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Current Credits</label>
                <div className="mt-1 p-2 border rounded-md bg-gray-50">
                  {actionUser?.role === "sales_rep" ? "25" : "N/A"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Add/Remove Credits
                </label>
                <input
                  type="number"
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="Enter amount (+ or -)"
                  id="credits-amount"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows="2"
                placeholder="Optional notes for credit adjustment..."
                id="credits-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreditsModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={async () => {
                const amount = document.getElementById("credits-amount").value;
                const notes = document.getElementById("credits-notes").value;
                if (amount) {
                  try {
                    await apiRequest(
                      `/api/super-admin/users/${actionUser._id}/credits`,
                      {
                        method: "POST",
                        body: JSON.stringify({ amount, notes }),
                      },
                    );
                    toast({
                      title: "Credits Updated",
                      description: `Credits adjusted by ${amount} for ${actionUser?.firstName} ${actionUser?.lastName}`,
                    });
                    setShowCreditsModal(false);
                    setActionUser(null);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description:
                        "Failed to update credits. Please try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Error",
                    description: "Please enter a credit amount.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Update Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message User Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {actionUser?.firstName} {actionUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                className="w-full mt-1 p-2 border rounded-md"
                placeholder="Message subject..."
                id="message-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows="4"
                placeholder="Type your message here..."
                id="message-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                const subject =
                  document.getElementById("message-subject").value;
                const content =
                  document.getElementById("message-content").value;
                if (subject && content) {
                  try {
                    await apiRequest(
                      `/api/super-admin/users/${actionUser._id}/message`,
                      {
                        method: "POST",
                        body: JSON.stringify({ subject, message: content }),
                      },
                    );
                    toast({
                      title: "Message Sent",
                      description: `Message sent to ${actionUser?.firstName} ${actionUser?.lastName}`,
                    });
                    setShowMessageModal(false);
                    setActionUser(null);
                    // Clear form
                    document.getElementById("message-subject").value = "";
                    document.getElementById("message-content").value = "";
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to send message. Please try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Error",
                    description: "Please fill in both subject and message.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Credits Modal */}
      <Dialog
        open={showCompanyCreditsModal}
        onOpenChange={setShowCompanyCreditsModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add credits to {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Current Credits</label>
                <div className="mt-1 p-2 border rounded-md bg-gray-50">
                  {selectedCompany?.remaining || 0}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Add Credits</label>
                <input
                  type="number"
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="Enter amount to add"
                  id="company-credits-amount"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows="2"
                placeholder="Optional notes for credit addition..."
                id="company-credits-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompanyCreditsModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={async () => {
                const amount = document.getElementById(
                  "company-credits-amount",
                ).value;
                const notes = document.getElementById(
                  "company-credits-notes",
                ).value;
                if (amount && parseInt(amount) > 0) {
                  try {
                    // Update the company credits in state
                    updateCompanyCredits(selectedCompany.id, amount);

                    // Simulate API call
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    toast({
                      title: "Credits Added",
                      description: `Successfully added ${amount} credits to ${selectedCompany?.name}`,
                    });
                    setShowCompanyCreditsModal(false);
                    setSelectedCompany(null);
                    // Clear form
                    document.getElementById("company-credits-amount").value =
                      "";
                    document.getElementById("company-credits-notes").value = "";
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to add credits. Please try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Error",
                    description: "Please enter a valid credit amount.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Add Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Edit Modal */}
      <Dialog
        open={showCompanyEditModal}
        onOpenChange={setShowCompanyEditModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company Settings</DialogTitle>
            <DialogDescription>
              Modify settings for {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <input
                type="text"
                className="w-full mt-1 p-2 border rounded-md"
                defaultValue={selectedCompany?.name}
                id="company-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Plan Type</label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                defaultValue={selectedCompany?.plan}
                id="company-plan"
              >
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Monthly Credit Allocation
              </label>
              <input
                type="number"
                className="w-full mt-1 p-2 border rounded-md"
                defaultValue={selectedCompany?.allocated}
                id="company-allocation"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Next Renewal Date</label>
              <input
                type="date"
                className="w-full mt-1 p-2 border rounded-md"
                id="company-renewal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompanyEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                const name = document.getElementById("company-name").value;
                const plan = document.getElementById("company-plan").value;
                const allocation = parseInt(
                  document.getElementById("company-allocation").value,
                );
                const renewal =
                  document.getElementById("company-renewal").value;

                if (name && plan && allocation) {
                  try {
                    // Update the company settings in state
                    const updates = {
                      name: name,
                      plan: plan,
                      allocated: allocation,
                      renewal: renewal || selectedCompany.renewal,
                      planColor:
                        plan === "Enterprise"
                          ? "bg-purple-100 text-purple-800"
                          : plan === "Pro"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800",
                    };

                    updateCompanySettings(selectedCompany.id, updates);

                    // Simulate API call
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    toast({
                      title: "Company Updated",
                      description: `Successfully updated settings for ${name}`,
                    });
                    setShowCompanyEditModal(false);
                    setSelectedCompany(null);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description:
                        "Failed to update company. Please try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Review Modal */}
      <Dialog open={showFlagReviewModal} onOpenChange={setShowFlagReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flag Report Review</DialogTitle>
            <DialogDescription>
              Review the details of this flag report and take appropriate
              action.
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-gray-700">
                    Reporter
                  </Label>
                  <p className="text-sm text-gray-600">
                    {selectedFlag.flaggedBy?.email || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">
                    Reported User
                  </Label>
                  <p className="text-sm text-gray-600">
                    {selectedFlag.dmId?.email || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-gray-700">
                    Flag Type
                  </Label>
                  <p className="text-sm text-gray-600">
                    {selectedFlag.flagType
                      ?.replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">Status</Label>
                  <Badge
                    className={
                      selectedFlag.status === "open"
                        ? "bg-red-100 text-red-800"
                        : selectedFlag.status === "investigating"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedFlag.status === "resolved"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }
                  >
                    {selectedFlag.status?.charAt(0).toUpperCase() +
                      selectedFlag.status?.slice(1)}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="font-semibold text-gray-700">
                  Description
                </Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {selectedFlag.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-gray-700">
                    Reported Date
                  </Label>
                  <p className="text-sm text-gray-600">
                    {selectedFlag.createdAt
                      ? new Date(selectedFlag.createdAt).toLocaleDateString(
                          "en-GB",
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">
                    Severity
                  </Label>
                  <p className="text-sm text-gray-600">
                    {selectedFlag.severity || "Medium"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFlagReviewModal(false)}
            >
              Close
            </Button>
            {selectedFlag?.status !== "resolved" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleUpdateFlagStatus("investigating");
                  }}
                  disabled={updateFlagStatusMutation.isPending}
                >
                  Mark Under Review
                </Button>
                <Button
                  onClick={() => {
                    setShowFlagReviewModal(false);
                    setShowFlagActionModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Take Action
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Action Modal */}
      <Dialog open={showFlagActionModal} onOpenChange={setShowFlagActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take Action on Flag</DialogTitle>
            <DialogDescription>
              Choose the appropriate action for this flag report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() =>
                handleUpdateFlagStatus("resolved", "warning_issued")
              }
              disabled={updateFlagStatusMutation.isPending}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Issue Warning
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() =>
                handleUpdateFlagStatus("resolved", "user_suspended")
              }
              disabled={updateFlagStatusMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-2" />
              Suspend User
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() =>
                handleUpdateFlagStatus("dismissed", "no_action_required")
              }
              disabled={updateFlagStatusMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss Flag
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() =>
                handleUpdateFlagStatus("resolved", "resolved_with_contact")
              }
              disabled={updateFlagStatusMutation.isPending}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Resolve with Contact
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFlagActionModal(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
