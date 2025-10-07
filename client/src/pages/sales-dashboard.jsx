import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  Users,
  Calendar,
  Plus,
  TrendingUp,
  Lock,
  CalendarPlus,
  Loader2,
  User,
  Clock,
  Menu,
  Search,
  MapPin,
  Star,
  Crown,
  BarChart3,
  Settings,
  HelpCircle,
  Lightbulb,
  CheckCircle,
  RefreshCw,
  Eye,
  AlertCircle,
  ExternalLink,
  Copy,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CalendarBooking from "@/components/CalendarBooking";
import FlagsBadge from "@/components/FlagsBadge";
import SuspensionAlert from "@/components/SuspensionAlert";
import BookingModal from "@/components/BookingModal";
import EmailAddonModal from "@/components/EmailAddonModal";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Helper function to format time remaining with days, hours, and minutes
const formatTimeRemaining = (milliseconds) => {
  const totalMinutes = Math.ceil(milliseconds / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export default function SalesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDecisionMaker, setSelectedDecisionMaker] = useState(null);

  // Email addon modal state
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [addonClientSecret, setAddonClientSecret] = useState(null);

  // Invite More DMs modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([{ name: "", email: "" }]);

  // View DMs modal state
  const [isViewDMsModalOpen, setIsViewDMsModalOpen] = useState(false);

  // Upgrade modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgradeClientSecret, setUpgradeClientSecret] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedCompanySize, setSelectedCompanySize] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [selectedEngagement, setSelectedEngagement] = useState("");

  // Fetch sales rep's invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["/api/sales-rep/invitations"],
    enabled: !!user?.id,
  });

  // Fetch sales rep's calls
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ["/api/sales-rep/calls"],
    enabled: !!user?.id,
  });

  // Fetch sales rep's metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/sales-rep/metrics"],
    enabled: !!user?.id,
  });

  // Fetch suspension status
  const { data: suspensionStatus } = useQuery({
    queryKey: ["/api/sales-rep/suspension-status"],
    retry: false,
  });

  // Calendar integration queries
  const { data: calendarStatus, isLoading: calendarStatusLoading } = useQuery({
    queryKey: ["/api/calendar/status"],
    retry: false,
  });

  const { data: upcomingMeetings, isLoading: upcomingMeetingsLoading } =
    useQuery({
      queryKey: ["/api/calendar/upcoming-meetings"],
      enabled: calendarStatus?.connected,
      retry: false,
    });

  // New queries for credit system
  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/sales-rep/credits"],
  });

  const { data: databaseAccess, isLoading: databaseAccessLoading } = useQuery({
    queryKey: ["/api/sales-rep/database-access"],
  });

  // Fetch remaining invitations
  const { data: remainingInvitations, isLoading: remainingInvitationsLoading } = useQuery({
    queryKey: ["/api/sales-rep/invitations/remaining"],
    enabled: !!user?.id,
  });

  // Fetch upgrade plans
  const { data: upgradePlansData, isLoading: upgradePlansLoading } = useQuery({
    queryKey: ["/api/upgrade-plans"],
    enabled: !!user?.id,
  });

  const hasAccess = databaseAccess?.hasAccess;

  const {
    data: gatedDMs,
    isLoading: gatedDMsLoading,
    error: gatedDMsError,
  } = useQuery({
    queryKey: ["/api/sales-rep/available-dms-gated"],
    enabled: hasAccess,
    retry: 3,
    refetchOnWindowFocus: false,
  });

  // Debug logging
  console.log("Gated DMs Debug:", {
    hasAccess,
    gatedDMsLoading,
    gatedDMs,
    gatedDMsError,
    dmsLength: gatedDMs?.dms?.length,
  });

  // Check URL parameters for calendar connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const calendarStatus = urlParams.get("calendar");
    const reason = urlParams.get("reason");

    if (calendarStatus === "connected") {
      toast({
        title: "Calendar Connected!",
        description: "Google Calendar has been connected successfully.",
      });
      // Refresh calendar status
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (calendarStatus === "error") {
      let errorMessage;
      let errorTitle = "Calendar Connection Failed";

      if (reason === "token_exchange_failed") {
        errorTitle = "Google Cloud Console Configuration Required";
        errorMessage =
          "Google is rejecting the OAuth connection with 'invalid_client' error. This means the Google Cloud Console is not configured correctly. Click the setup guide button (?) next to the Connect button for step-by-step instructions.";
      } else if (reason === "missing_params") {
        errorMessage = "Missing authorization parameters";
      } else if (reason === "google_oauth_error") {
        errorMessage = "Google OAuth returned an error during authorization";
      } else if (reason === "missing_credentials") {
        errorMessage = "Google OAuth credentials are not configured";
      } else {
        errorMessage = "There was an error connecting to Google Calendar";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [queryClient, toast]);

  // Force show DM list for debugging
  const shouldShowDMList = true;

  // Calendar integration toggle state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Calendar toggle mutation
  const calendarToggleMutation = useMutation({
    mutationFn: async (enabled) => {
      return apiRequest("/api/current-user", {
        method: "PUT",
        body: JSON.stringify({ calendarIntegrationEnabled: enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/current-user"]);
      queryClient.invalidateQueries(["/api/calendar/status"]);
      queryClient.invalidateQueries(["/api/calendar/upcoming-meetings"]);
      toast({
        title: "Success",
        description: "Calendar integration updated successfully",
      });
    },
    onError: (error) => {
      console.error("Calendar toggle error:", error);
      toast({
        title: "Error",
        description: "Failed to update calendar integration",
        variant: "destructive",
      });
    },
  });

  // Calculate total credits from API data
  const totalCredits =
    creditsData?.credits?.reduce(
      (sum, credit) => sum + (credit.amount || 0),
      0,
    ) || 0;

  const simulateAcceptanceMutation = useMutation({
    mutationFn: async () => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/metrics"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-rep/invitations"],
      });
      toast({
        title: "Database Unlocked!",
        description: "You can now browse decision makers",
      });
    },
  });

  const simulateOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "/api/simulate/dm-onboarding-complete",
        {
          method: "POST",
          body: JSON.stringify({
            dmEmail: "mlp.yashkumar@gmail.com",
            repId: user?.id || user?._id,
          }),
        },
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/credits"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-rep/database-access"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-rep/available-dms-gated"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/metrics"] });
      toast({
        title: "Success!",
        description:
          data.message || "DM onboarding completed and credit awarded!",
      });
    },
    onError: (error) => {
      console.error("Onboarding simulation error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to simulate onboarding completion",
        variant: "destructive",
      });
    },
  });

  // Create sample invitation mutation for testing credit system
  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/create-sample-invitation", {
        method: "POST",
        body: JSON.stringify({
          dmEmail: "testdm@example.com",
          dmName: "Test Decision Maker",
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Test Invitation Created!",
        description: `Visit: ${data.inviteUrl}`,
        duration: 10000,
      });
      console.log("Invitation created:", data);
    },
    onError: (error) => {
      console.error("Invitation creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test invitation",
        variant: "destructive",
      });
    },
  });

  // Test Google Calendar event creation
  const testCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/test-calendar-event", {
        method: "POST",
        body: JSON.stringify({}),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Test Calendar Event Created!",
        description: `Event ID: ${data.eventId}. Check your Google Calendar!`,
        duration: 10000,
      });
      console.log("Calendar event created:", data);
    },
    onError: (error) => {
      console.error("Calendar event creation error:", error);
      toast({
        title: "Calendar Test Failed",
        description: error.message || "Failed to create test calendar event",
        variant: "destructive",
      });
    },
  });

  // Booking modal handlers
  const handleOpenBookingModal = (decisionMaker) => {
    setSelectedDecisionMaker(decisionMaker);
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedDecisionMaker(null);
  };

  // Email addon purchase mutation
  const purchaseAddonMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/purchase-email-addon", {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data) => {
      setAddonClientSecret(data.clientSecret);
      setIsAddonModalOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Purchase Error",
        description: error.message || "Failed to initiate addon purchase",
        variant: "destructive",
      });
    },
  });

  const handleAddonPurchase = () => {
    if (user?.packageType === "enterprise") {
      toast({
        title: "Not Available",
        description: "Enterprise users already have full access to DM emails",
      });
      return;
    }

    if (user?.packageType === "free") {
      toast({
        title: "Upgrade Required",
        description:
          "Free users must upgrade to Basic or higher to purchase email addon",
      });
      return;
    }

    if (user?.hasEmailAddon) {
      toast({
        title: "Already Purchased",
        description: "You already have email access addon",
      });
      return;
    }

    purchaseAddonMutation.mutate();
  };

  const handleAddonSuccess = () => {
    // Refresh user data to show updated addon status
    queryClient.invalidateQueries({ queryKey: ["/api/current-user"] });
    setAddonClientSecret(null);
    setIsAddonModalOpen(false);
  };

  // Add invitations mutation
  const addInvitationsMutation = useMutation({
    mutationFn: async (decisionMakers) => {
      const response = await apiRequest("/api/sales-rep/invitations/add", {
        method: "POST",
        body: JSON.stringify({ decisionMakers }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Invitations Sent!",
        description: data.message || "Invitations have been sent successfully.",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/invitations/remaining"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/metrics"] });
      // Reset form
      setInviteEmails([{ name: "", email: "" }]);
      setIsInviteModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Invitation Error",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    },
  });

  // Create payment intent for upgrade
  const createUpgradePaymentMutation = useMutation({
    mutationFn: async ({ planId, amount, planName }) => {
      const response = await apiRequest("/api/create-payment-intent", {
        method: "POST",
        body: JSON.stringify({
          amount,
          packageType: planName,
          userEmail: user?.email,
        }),
      });
      return { ...response, planId, planName };
    },
    onSuccess: (data) => {
      setUpgradeClientSecret(data.clientSecret);
      setSelectedPlan({ 
        id: data.planId, 
        name: data.planName,
        paymentIntentId: data.paymentIntentId 
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProcessingPlanId(null);
    },
  });

  // Process upgrade after payment
  const processUpgradeMutation = useMutation({
    mutationFn: async ({ planId, paymentIntentId }) => {
      const response = await apiRequest("/api/upgrade-plan", {
        method: "POST",
        body: JSON.stringify({ planId, paymentIntentId }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Upgrade Successful!",
        description: data.message || "Your plan has been upgraded successfully.",
      });
      // Refresh user data and close modals
      queryClient.invalidateQueries({ queryKey: ["/api/current-user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/upgrade-plans"] });
      setIsUpgradeModalOpen(false);
      setUpgradeClientSecret(null);
      setSelectedPlan(null);
    },
    onError: (error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to process upgrade",
        variant: "destructive",
      });
    },
  });

  const handleBookingConfirm = async (bookingData) => {
    // This is now handled by the BookingModal component directly
    // The onConfirm prop is no longer used but kept for compatibility
    console.log("Booking confirm called - now handled by modal");
  };

  // Invite modal handlers - DEPRECATED: Now using separate page at /invite-decision-makers
  // These functions are kept for backward compatibility but are no longer used
  const handleAddInviteEmail = () => {
    setInviteEmails([...inviteEmails, { name: "", email: "", jobTitle: "" }]);
  };

  const handleRemoveInviteEmail = (index) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index));
    }
  };

  const handleInviteEmailChange = (index, field, value) => {
    const updated = [...inviteEmails];
    updated[index][field] = value;
    setInviteEmails(updated);
  };

  const handleSendInvitations = () => {
    // Redirect to new invite page instead of using modal
    window.location.href = '/invite-decision-makers';
  };

  // Upgrade handlers
  const handleUpgradeClick = () => {
    setIsUpgradeModalOpen(true);
  };

  const handleSelectPlan = (plan) => {
    setProcessingPlanId(plan.id);
    const amount = parseFloat(plan.price.replace(/[^0-9.]/g, ''));
    createUpgradePaymentMutation.mutate({
      planId: plan.id,
      amount,
      planName: plan.name.toLowerCase().replace(/\s+/g, '-'),
    });
  };

  const handleUpgradeSuccess = () => {
    if (selectedPlan) {
      processUpgradeMutation.mutate({
        planId: selectedPlan.id,
        paymentIntentId: selectedPlan.paymentIntentId,
      });
    }
  };

  // Filter functions
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedIndustry("");
    setSelectedCompanySize("");
    setSelectedRating("");
    setSelectedEngagement("");
  };

  const filteredDMs = gatedDMs?.dms
    ? gatedDMs.dms.filter((dm) => {
        // Search term filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch =
            dm.name?.toLowerCase().includes(searchLower) ||
            dm.company?.toLowerCase().includes(searchLower) ||
            dm.jobTitle?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Industry filter
        if (selectedIndustry && selectedIndustry !== "Industry") {
          if (dm.industry !== selectedIndustry) return false;
        }

        // Company size filter (mock data - would come from actual DM data)
        if (selectedCompanySize && selectedCompanySize !== "Company Size") {
          // This would be based on actual company size data
          // For now, we'll use a mock implementation
        }

        // Rating filter (using engagement score as proxy)
        if (selectedRating && selectedRating !== "Rating") {
          const ratingThreshold =
            parseFloat(selectedRating.replace("+", "")) * 20; // Convert rating to percentage
          if (dm.engagementScore < ratingThreshold) return false;
        }

        // Engagement filter
        if (selectedEngagement && selectedEngagement !== "Engagement") {
          const engagementThreshold = parseFloat(
            selectedEngagement.replace("%+", ""),
          );
          if (dm.engagementScore < engagementThreshold) return false;
        }

        return true;
      })
    : [];

  // Get unique industries for filter dropdown
  const availableIndustries = [
    ...new Set(gatedDMs?.dms?.map((dm) => dm.industry).filter(Boolean)),
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPackageDisplayName = (packageType, maxInvitations) => {
    // Base package name mapping
    const packageNames = {
      free: "Free",
      basic: "Basic",
      pro: "Pro",
      professional: "Professional",
      premium: "Premium",
      "pro-team": "Pro Team",
      enterprise: "Enterprise",
    };

    // Get the base name
    const baseName = packageNames[packageType] || "Free";

    // Add dynamic invitation limit if available
    const invitationLimit = maxInvitations || metrics?.maxDmInvitations || 1;

    return `${baseName} • ${invitationLimit} DM/month`;
  };

  if (!user || metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const databaseUnlocked = metrics?.databaseUnlocked || false;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sales Rep Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.firstName}!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                {getPackageDisplayName(
                  user?.packageType,
                  metrics?.maxDmInvitations,
                )}
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                {metrics?.standing === "good"
                  ? "Good Standing"
                  : "Standing: " + metrics?.standing}
              </Badge>
              <FlagsBadge />
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = "/analytics")}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </div>
              <div className="sm:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white h-32">
            <CardContent className="p-5 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col justify-between h-full">
                  <p className="text-blue-100 text-sm font-medium">
                    Monthly Call Limit
                  </p>
                  <p className="text-2xl font-bold">
                    {gatedDMs?.repCallLimit
                      ? `${gatedDMs.repCallLimit.totalCalls}/${gatedDMs.repCallLimit.maxCalls}`
                      : `${metrics?.completedCalls || 0}/${gatedDMs?.acceptedDMsCount || 3}`}
                  </p>
                  <p className="text-blue-100 text-xs">
                    {gatedDMs?.repCallLimit?.remainingCalls !== undefined
                      ? `${gatedDMs.repCallLimit.remainingCalls} calls remaining`
                      : "based on invited DMs"}
                  </p>
                </div>
                <Phone className="text-blue-200 w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white h-32">
            <CardContent className="p-4 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col justify-between h-full min-w-0 flex-1">
                  <p className="text-green-100 text-sm font-medium">
                    DM Invitations
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold whitespace-nowrap">
                      {metrics?.dmInvitations || 0}/
                      {metrics?.maxDmInvitations || 1}
                    </p>
                    {remainingInvitations && (
                      <span className="text-green-100 text-xs whitespace-nowrap">
                        ({remainingInvitations.remaining} left)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(metrics?.dmInvitations || 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-100 hover:text-white hover:bg-white/20 px-2 py-1 h-auto text-xs rounded whitespace-nowrap"
                        onClick={() => setIsViewDMsModalOpen(true)}
                      >
                        <Eye className="w-3 h-3" />
                        <span className="ml-1 hidden sm:inline">View</span>
                      </Button>
                    )}
                    {!remainingInvitationsLoading && remainingInvitations?.remaining > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-100 hover:text-white hover:bg-white/20 px-2 py-1 h-auto text-xs rounded whitespace-nowrap"
                        onClick={() => window.location.href = '/invite-decision-makers'}
                      >
                        <Plus className="w-3 h-3" />
                        <span className="ml-1 hidden sm:inline">Add</span>
                      </Button>
                    )}
                  </div>
                </div>
                <Users className="text-green-200 w-6 h-6 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-32">
            <CardContent className="p-5 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col justify-between h-full">
                  <p className="text-gray-500 text-sm font-medium">
                    Upcoming Calls
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.upcomingCalls || 0}
                  </p>
                  <p className="text-xs text-gray-600">scheduled meetings</p>
                </div>
                <Calendar className="text-gray-400 w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-32">
            <CardContent className="p-5 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="text-gray-600 text-sm font-semibold">
                      Success Rate
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {metrics?.successRate ? `${metrics.successRate}%` : "-"}
                    </div>
                    <div className="flex items-center bg-green-50 px-2 py-1 rounded-full border border-green-200">
                      <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                      <span className="text-xs font-bold text-green-700">
                        +2.5%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration Card */}
          <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white h-32">
            <CardContent className="p-5 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col justify-between h-full">
                  <p className="text-purple-100 text-sm font-medium">
                    Calendar Status
                  </p>
                  <p className="text-lg font-bold">
                    {calendarStatusLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : calendarStatus?.connected &&
                      calendarStatus?.hasTokens ? (
                      "Connected"
                    ) : calendarStatus?.connected &&
                      !calendarStatus?.hasTokens ? (
                      "Needs Reauth"
                    ) : (
                      "Not Connected"
                    )}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-white p-1 h-auto text-xs transition-all duration-300 ${
                        calendarStatus?.connected && calendarStatus?.hasTokens
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                      onClick={async () => {
                        if (
                          calendarStatus?.connected &&
                          !calendarStatus?.hasTokens
                        ) {
                          // Need to reconnect Google Calendar
                          const userId = user?.id || user?._id;
                          if (userId) {
                            window.location.href = `/api/auth/google?userId=${userId}`;
                          } else {
                            toast({
                              title: "Error",
                              description:
                                "User ID not found. Please try logging in again.",
                              variant: "destructive",
                            });
                          }
                        } else {
                          calendarToggleMutation.mutate(
                            !calendarStatus?.connected,
                          );
                        }
                      }}
                      disabled={calendarToggleMutation.isPending}
                    >
                      {calendarToggleMutation.isPending ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Updating...
                        </>
                      ) : calendarStatus?.connected &&
                        calendarStatus?.hasTokens ? (
                        "Disconnect"
                      ) : calendarStatus?.connected &&
                        !calendarStatus?.hasTokens ? (
                        "Reauth"
                      ) : (
                        "Connect"
                      )}
                    </Button>
                    {calendarStatus?.connected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-100 hover:text-white hover:bg-white/20 p-1 h-auto text-xs"
                        onClick={() => setShowCalendarModal(true)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-100 hover:text-white hover:bg-white/20 p-1 h-auto text-xs"
                      onClick={() => setShowSetupGuide(true)}
                    >
                      <HelpCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <Calendar className="text-purple-200 w-6 h-6" />
                  {calendarStatus?.connected && (
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1"></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Database Access Section */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {!hasAccess ? (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center">
                    <Lock className="text-blue-500 mr-3 w-5 h-5" />
                    Database Access Locked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="text-gray-400 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Waiting for DM Acceptance
                    </h3>
                    <p className="text-gray-600 mb-6">
                      At least one of your invited decision makers must accept
                      to unlock the database.
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Invitation Status:
                      </h4>

                      <div className="space-y-3">
                        {invitations.length > 0 ? (
                          invitations.map((invitation) => (
                            <div
                              key={invitation._id || invitation.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    invitation.status === "accepted"
                                      ? "bg-green-100 text-green-600"
                                      : "bg-blue-100 text-blue-600"
                                  }`}
                                >
                                  {getInitials(
                                    invitation.decisionMakerName ||
                                      invitation.name ||
                                      "DM",
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {invitation.decisionMakerName ||
                                      invitation.name ||
                                      "Decision Maker"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {invitation.decisionMakerEmail ||
                                      invitation.email ||
                                      "email@example.com"}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(invitation.status)}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-gray-500">
                              No invitations sent yet
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* <Button
                        onClick={() => simulateAcceptanceMutation.mutate()}
                        disabled={simulateAcceptanceMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                      >
                        {simulateAcceptanceMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Simulating...
                          </>
                        ) : (
                          "Simulate DM Acceptance (Demo)"
                        )}
                      </Button>
 */}
                      {/* <Button
                        onClick={() => simulateOnboardingMutation.mutate()}
                        disabled={simulateOnboardingMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 w-full"
                      >
                        {simulateOnboardingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          "Complete DM Onboarding (Award Credit)"
                        )}
                      </Button> */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  {/* Header with Search and Filters */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-600 text-sm font-medium">
                          {filteredDMs.length} of {gatedDMs?.dms?.length || 0}{" "}
                          Decision Makers
                          {(searchTerm ||
                            selectedIndustry ||
                            selectedRating ||
                            selectedEngagement) &&
                            " (filtered)"}
                        </span>
                      </div>
                      <button
                        onClick={clearAllFilters}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>Clear Filters</span>
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, company, or title..."
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      />
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <select
                        value={selectedIndustry}
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">Industry</option>
                        {availableIndustries.map((industry) => (
                          <option key={industry} value={industry}>
                            {industry}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedCompanySize}
                        onChange={(e) => setSelectedCompanySize(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">Company Size</option>
                        <option value="1-50">1-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-1000">201-1000</option>
                        <option value="1000+">1000+</option>
                      </select>
                      <select
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">Rating</option>
                        <option value="4.5+">4.5+</option>
                        <option value="4.0+">4.0+</option>
                        <option value="3.5+">3.5+</option>
                      </select>
                      <select
                        value={selectedEngagement}
                        onChange={(e) => setSelectedEngagement(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">Engagement</option>
                        <option value="90+">90%+</option>
                        <option value="80+">80%+</option>
                        <option value="70+">70%+</option>
                      </select>
                    </div>
                  </div>

                  {gatedDMsLoading ? (
                    <div className="text-center py-6 ">
                      <Loader2 className="animate-spin h-6 w-6 mx-auto mb-3 text-blue-500" />
                      <p className="text-gray-600">
                        Loading decision makers...
                      </p>
                    </div>
                  ) : (
                    <div className="h-[800px] overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDMs &&
                        Array.isArray(filteredDMs) &&
                        filteredDMs.length > 0 ? (
                          filteredDMs.slice(0, 12).map((dm) => (
                            <div
                              key={dm.id}
                              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all duration-200 h-full flex flex-col shadow-sm"
                            >
                              {/* Status Header - Fixed Height */}
                              <div className="flex items-center justify-between mb-3 min-h-[20px]">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-xs text-gray-500 font-medium truncate">
                                    {dm.remainingCalls} call{dm.remainingCalls !== 1 ? "s" : ""} available
                                  </span>
                                </div>
                              </div>

                              {/* Title and Company - Fixed Height */}
                              <div className="mb-3 min-h-[60px] flex flex-col">
                                <h3 className="text-gray-900 font-semibold text-sm mb-2 leading-tight overflow-hidden" 
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical'
                                    }}>
                                  {dm.jobTitle || dm.name || "Chief Revenue Officer"}
                                </h3>
                                <p className="text-blue-600 text-sm font-medium truncate">
                                  {dm.company}
                                </p>
                              </div>

                              {/* Location - Fixed Height */}
                              <div className="flex items-center text-gray-600 text-sm mb-3 min-h-[20px] overflow-hidden">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">San Francisco, CA</span>
                              </div>

                              {/* Tags - Fixed Height */}
                              <div className="flex gap-1 mb-4 min-h-[24px] overflow-hidden">
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium truncate max-w-[80px]">
                                  {dm.industry}
                                </span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                                  201-1000
                                </span>
                              </div>

                              {/* Rating and Engagement - Fixed Height */}
                              <div className="mb-4 min-h-[48px] flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current flex-shrink-0" />
                                    <span className="text-gray-900 font-medium text-sm">4.8</span>
                                  </div>
                                  <span className="text-green-600 text-sm font-medium truncate ml-2">
                                    {dm.engagementScore}% engagement
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      dm.engagementScore >= 40 ? "bg-green-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(100, dm.engagementScore)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Action Buttons - Fixed at Bottom */}
                              <div className="flex gap-2 mt-auto pt-2">
                                <button className="flex-1 bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-2 rounded-lg text-xs transition-colors font-medium min-h-[36px] flex items-center justify-center">
                                  View Contact
                                </button>
                                <button
                                  className={`flex-1 py-2 px-2 rounded-lg text-xs transition-colors font-medium min-h-[36px] flex items-center justify-center ${
                                    calendarStatus?.connected
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  }`}
                                  onClick={() => {
                                    if (calendarStatus?.connected) {
                                      handleOpenBookingModal(dm);
                                    } else {
                                      toast({
                                        title: "Calendar Required",
                                        description:
                                          "Please connect your Google Calendar first to book calls. You can connect it from the Calendar Integration section below.",
                                        variant: "destructive",
                                        duration: 5000,
                                      });
                                    }
                                  }}
                                  disabled={!calendarStatus?.connected}
                                  title={
                                    !calendarStatus?.connected
                                      ? "Connect your calendar first to book calls"
                                      : ""
                                  }
                                >
                                  {calendarStatus?.connected ? (
                                    "Request Call"
                                  ) : (
                                    <div className="flex items-center gap-1 justify-center">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      <span className="text-xs truncate">Calendar Required</span>
                                    </div>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-6">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Users className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-2">
                              No Decision Makers Available
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Check back later for new opportunities
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Package Status Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-gray-900">
                    Package Status
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Current Plan</span>
                  <Badge className="bg-purple-100 text-purple-700">
                    {getPackageDisplayName(
                      user?.packageType,
                      metrics?.maxDmInvitations,
                    )?.split(" • ")[0] || "Free"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Call Credits</span>
                    <span className="text-gray-900 font-medium">
                      {metrics?.callCredits || 0}/
                      {metrics?.maxCallCredits || 500}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${metrics?.maxCallCredits ? ((metrics?.callCredits || 0) / metrics.maxCallCredits) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Referral Credits</span>
                    <span className="text-gray-900 font-medium">
                      {totalCredits}/{metrics?.maxDmInvitations || 1}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${metrics?.maxDmInvitations && totalCredits ? (totalCredits / metrics.maxDmInvitations) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Email Addon Button for Basic/Pro Users Only (not free) */}
                {user?.packageType !== "enterprise" &&
                  user?.packageType !== "free" &&
                  !user?.hasEmailAddon && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <h4 className="font-medium text-amber-900 mb-1">
                            Email Access Addon
                          </h4>
                          <p className="text-sm text-amber-700 mb-2">
                            Get DM email addresses after call booking for just
                            $5
                          </p>
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                            onClick={handleAddonPurchase}
                            disabled={purchaseAddonMutation.isPending}
                          >
                            {purchaseAddonMutation.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Purchase for $5"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Show addon status if purchased */}
                {user?.hasEmailAddon && (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Email Access Addon Active
                      </span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleUpgradeClick}
                  disabled={upgradePlansLoading}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {upgradePlansLoading ? "Loading..." : "Upgrade Plan"}
                </Button>
              </CardContent>
            </Card>

            {/* Your Upcoming Calls */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-gray-900">
                    Your Upcoming Calls
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                {!calendarStatus?.connected ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-red-500" />
                      <div>
                        <h4 className="font-medium text-red-900 mb-1">
                          Connect Google Calendar
                        </h4>
                        <p className="text-sm text-red-700">
                          Please connect your Google Calendar to view upcoming
                          calls
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Filter only upcoming calls (scheduled status and future dates)
                    const upcomingCalls = calls
                      .filter((call) => {
                        const callDate = new Date(call.endTime);
                        const now = new Date();
                        return call.status === "scheduled" && callDate > now;
                      })
                      .sort(
                        (a, b) =>
                          new Date(a.scheduledAt) - new Date(b.scheduledAt),
                      ); // Sort by date (earliest first)

                    return upcomingCalls.length > 0 ? (
                      upcomingCalls.slice(0, 3).map((call) => (
                        <div
                          key={call._id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-400 hover:border-purple-500 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-gray-900 font-medium text-sm">
                                  {call.decisionMakerName ||
                                    call.dmName ||
                                    "Decision Maker"}
                                </span>
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  upcoming
                                </Badge>
                              </div>
                              <div className="text-gray-600 text-xs">
                                {call.company || call.dmCompany || "Company"}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {new Date(call.scheduledAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}{" "}
                                •{" "}
                                {new Date(call.scheduledAt).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="w-2 h-2 bg-green-500 rounded-full mb-1"></div>
                              <div className="text-green-600 text-xs font-medium">
                                {call.engagementScore || "--"}%
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className={`flex-1 h-7 text-xs ${(() => {
                                const now = new Date();
                                const callTime = new Date(call.scheduledAt);
                                const joinWindowStart = new Date(
                                  callTime.getTime() - 2 * 60 * 1000,
                                ); // 2 minutes before
                                const joinWindowEnd = new Date(
                                  callTime.getTime() + 30 * 60 * 1000,
                                ); // 30 minutes after
                                const canJoin =
                                  now >= joinWindowStart &&
                                  now <= joinWindowEnd;

                                return canJoin
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-gray-400 text-gray-200 cursor-not-allowed";
                              })()}`}
                              disabled={(() => {
                                const now = new Date();
                                const callTime = new Date(call.scheduledAt);
                                const joinWindowStart = new Date(
                                  callTime.getTime() - 2 * 60 * 1000,
                                ); // 2 minutes before
                                const joinWindowEnd = new Date(
                                  callTime.getTime() + 30 * 60 * 1000,
                                ); // 30 minutes after
                                return !(
                                  now >= joinWindowStart && now <= joinWindowEnd
                                );
                              })()}
                              onClick={() => {
                                const now = new Date();
                                const callTime = new Date(call.scheduledAt);
                                const joinWindowStart = new Date(
                                  callTime.getTime() - 2 * 60 * 1000,
                                );
                                const joinWindowEnd = new Date(
                                  callTime.getTime() + 30 * 60 * 1000,
                                );

                                if (now < joinWindowStart) {
                                  const timeRemaining = formatTimeRemaining(joinWindowStart - now);
                                  toast({
                                    title: "Meeting Not Yet Available",
                                    description: `You can join 2 minutes before the scheduled time. Available in ${timeRemaining}`,
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                if (now > joinWindowEnd) {
                                  toast({
                                    title: "Meeting Window Closed",
                                    description:
                                      "The meeting window has passed. Contact support if you need assistance.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Join call logic - open Google Meet link if available
                                if (call.googleMeetLink) {
                                  window.open(call.googleMeetLink, "_blank");
                                } else if (call.meetingLink) {
                                  window.open(call.meetingLink, "_blank");
                                } else if (call.googleCalendarEventId) {
                                  toast({
                                    title: "Opening Meeting",
                                    description:
                                      "Redirecting to Google Calendar event...",
                                  });
                                  window.open(
                                    `https://calendar.google.com/calendar/event?eid=${call.googleCalendarEventId}`,
                                    "_blank",
                                  );
                                } else {
                                  toast({
                                    title: "Meeting Link Not Available",
                                    description:
                                      "The meeting link will be available closer to the meeting time.",
                                  });
                                }
                              }}
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              {(() => {
                                const now = new Date();
                                const callTime = new Date(call.scheduledAt);
                                const joinWindowStart = new Date(
                                  callTime.getTime() - 2 * 60 * 1000,
                                );

                                if (now < joinWindowStart) {
                                  const timeRemaining = formatTimeRemaining(joinWindowStart - now);
                                  return `Available in ${timeRemaining}`;
                                } else {
                                  return "Join Call";
                                }
                              })()}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 h-7 text-xs"
                              onClick={() => {
                                // Pitch assistant logic - could open AI assistant modal
                                console.log(
                                  "Opening Pitch Assistant for call:",
                                  call._id,
                                );
                                toast({
                                  title: "Pitch Assistant",
                                  description:
                                    "AI-powered pitch assistance will be available soon!",
                                });
                              }}
                            >
                              <Lightbulb className="w-3 h-3 mr-1" />
                              Pitch Assistant
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">
                          No upcoming calls scheduled
                        </p>
                        <p className="text-sm text-gray-400">
                          Book a call with one of your decision makers to get
                          started
                        </p>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            {/* <Card className="border border-gray-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-gray-900">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                  Smart Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-1">
                          Follow up with high-engagement DMs
                        </h4>
                        <p className="text-sm text-blue-700">
                          {gatedDMs?.dms?.filter(
                            (dm) => dm.engagementScore >= 90,
                          ).length || 0}{" "}
                          decision makers with 90%+ engagement available
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 p-0 h-auto mt-1"
                        >
                          View opportunities →
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900 mb-1">
                          Optimal calling window
                        </h4>
                        <p className="text-sm text-green-700">
                          {metrics?.successRate
                            ? `${metrics.successRate}% success rate`
                            : "Track calls to see optimal times"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 p-0 h-auto mt-1"
                        >
                          Schedule calls →
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-900 mb-1">
                          Credit optimization
                        </h4>
                        <p className="text-sm text-orange-700">
                          {totalCredits > 0
                            ? `You have ${totalCredits} referral credit${totalCredits === 1 ? "" : "s"} available`
                            : "Complete DM onboarding to earn referral credits"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 p-0 h-auto mt-1"
                        >
                          Use credits →
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <Button
                    variant="outline"
                    className="w-full text-gray-600 hover:text-gray-700 border-gray-300"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View all insights
                  </Button>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleCloseBookingModal}
        decisionMaker={selectedDecisionMaker}
        onConfirm={handleBookingConfirm}
      />

      {/* Email Addon Modal */}
      {addonClientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: addonClientSecret,
            appearance: {
              theme: "stripe",
            },
          }}
        >
          <EmailAddonModal
            isOpen={isAddonModalOpen}
            onClose={() => {
              setIsAddonModalOpen(false);
              setAddonClientSecret(null);
            }}
            onSuccess={handleAddonSuccess}
          />
        </Elements>
      )}
      {/* Calendar Modal */}
      <Dialog open={showCalendarModal} onOpenChange={setShowCalendarModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upcoming Calendar Events</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {upcomingMeetingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading meetings...</span>
              </div>
            ) : upcomingMeetings && upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {meeting.summary || "Meeting"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {meeting.start?.dateTime
                          ? new Date(meeting.start.dateTime).toLocaleString()
                          : "Time not specified"}
                      </p>
                      {meeting.description && (
                        <p className="text-sm text-gray-500 mb-2">
                          {meeting.description}
                        </p>
                      )}
                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {meeting.attendees.length} attendee
                            {meeting.attendees.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    {meeting.htmlLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(meeting.htmlLink, "_blank")}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming meetings found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Calendar Setup Guide Modal */}
      <Dialog open={showSetupGuide} onOpenChange={setShowSetupGuide}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Google Calendar Setup Guide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">
                    Issue Identified
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    The Google Cloud Console needs to be configured with the
                    correct redirect URI. Our application is correctly
                    configured, but Google is rejecting the connection during
                    token exchange.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Step 1: Access Google Cloud Console
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  1. Go to{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <p className="text-sm text-gray-700">
                  2. Navigate to: <strong>APIs & Services → Credentials</strong>
                </p>
                <p className="text-sm text-gray-700">
                  3. Find your OAuth 2.0 Client ID and click on it
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Step 2: Configure Redirect URI
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  In the "Authorized redirect URIs" section, add this exact URL:
                </p>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-800">
                      https://decisionmaker.shrawantravels.com/api/auth/google/callback
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          "https://decisionmaker.shrawantravels.com/api/auth/google/callback",
                        );
                        toast({
                          title: "Copied!",
                          description: "Redirect URI copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        Important:
                      </p>
                      <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                        <li>Must be HTTPS (not HTTP)</li>
                        <li>Must match exactly (case-sensitive)</li>
                        <li>
                          Do NOT add authorized domains (Google rejects
                          replit.dev subdomains)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Add Test User</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  1. Go to:{" "}
                  <strong>APIs & Services → OAuth consent screen</strong>
                </p>
                <p className="text-sm text-gray-700">
                  2. Scroll to "Test users" section and click "Add users"
                </p>
                <p className="text-sm text-gray-700">
                  3. Add your email address:{" "}
                  <strong>salesrep@techize.com</strong>
                </p>
                <div className="bg-gray-50 border rounded-lg p-3 mt-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-800">
                      salesrep@techize.com
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText("salesrep@techize.com");
                        toast({
                          title: "Copied!",
                          description: "Test user email copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-700">4. Click "Save"</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Step 4: Enable Google Calendar API
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  1. Go to: <strong>APIs & Services → Library</strong>
                </p>
                <p className="text-sm text-gray-700">
                  2. Search for "Google Calendar API"
                </p>
                <p className="text-sm text-gray-700">
                  3. Click it and click "Enable"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Step 5: Test the Connection
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  1. Wait 5-10 minutes for changes to propagate
                </p>
                <p className="text-sm text-gray-700">
                  2. Try connecting your calendar again
                </p>
                <p className="text-sm text-gray-700">
                  3. Use an incognito browser window if you still encounter
                  issues
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    Once Setup is Complete
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    The calendar integration will work immediately. You'll be
                    able to sync your Google Calendar, view upcoming meetings,
                    and automatically create calendar events for scheduled
                    calls.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Quick Test</h3>
                  <p className="text-sm text-blue-700 mt-1 mb-3">
                    After completing the setup above, test the OAuth flow
                    directly:
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const testUrl =
                        "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&prompt=consent&state=test-user-id&response_type=code&client_id=917137353724-ftng1fau0pm0hdl65l1i5et8fmssvedj.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fdecisionmaker.shrawantravels.com%2Fapi%2Fauth%2Fgoogle%2Fcallback";
                      window.open(testUrl, "_blank");
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Test OAuth Flow
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowSetupGuide(false)}
                variant="outline"
                className="flex-1"
              >
                Close Guide
              </Button>
              <Button
                onClick={() => {
                  window.open(
                    "https://console.cloud.google.com/apis/credentials",
                    "_blank",
                  );
                }}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Google Cloud Console
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View DMs Modal */}
      <Dialog open={isViewDMsModalOpen} onOpenChange={setIsViewDMsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Invited Decision Makers ({metrics?.dmInvitations || 0})
            </DialogTitle>
            <p className="text-sm text-gray-600">
              View the status of your invited decision makers and manage your invitations.
            </p>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            {invitationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading invitations...</span>
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No decision makers invited yet</p>
                <Button
                  onClick={() => window.location.href = '/invite-decision-makers'}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Send Your First Invitation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation, index) => (
                  <div
                    key={invitation.id || index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {getInitials(invitation.decisionMakerName || 'DM')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {invitation.decisionMakerName || 'Decision Maker'}
                        </p>
                        {invitation.decisionMakerJobTitle && (
                          <p className="text-sm text-blue-600 font-medium">
                            {invitation.decisionMakerJobTitle}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {invitation.decisionMakerEmail}
                        </p>
                        {invitation.createdAt && (
                          <p className="text-xs text-gray-400">
                            Invited {new Date(invitation.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusBadgeVariant(invitation.status)}>
                      {invitation.status === 'accepted' && '✓ Accepted'}
                      {invitation.status === 'pending' && '⏳ Pending'}
                      {invitation.status === 'declined' && '✗ Declined'}
                      {!['accepted', 'pending', 'declined'].includes(invitation.status) && 
                        (invitation.status || 'Unknown')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsViewDMsModalOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
            {remainingInvitations?.remaining > 0 && (
              <Button
                onClick={() => window.location.href = '/invite-decision-makers'}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Invite More DMs
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite More DMs Modal - Removed: Now using separate page at /invite-decision-makers */}

      {/* Upgrade Plan Modal */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="max-w-6xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Crown className="h-6 w-6 text-blue-600" />
              Upgrade Your Plan
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center">
              Current Plan: <strong>{upgradePlansData?.currentPlan || user?.packageType || 'Free'}</strong> • 
              Choose a higher tier plan to unlock more features
            </p>
          </DialogHeader>

          {upgradeClientSecret ? (
            // Payment form
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Complete Your Upgrade</h3>
                <p className="text-gray-600">
                  Upgrading to <strong>{selectedPlan?.name}</strong> plan
                </p>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret: upgradeClientSecret }}>
                <div className="max-w-md mx-auto">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-4">
                      Complete payment to upgrade your plan immediately.
                    </p>
                    {/* Note: You'll need to create a proper Stripe payment form component */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUpgradeClientSecret(null);
                          setSelectedPlan(null);
                        }}
                        className="flex-1"
                      >
                        Back to Plans
                      </Button>
                      <Button
                        onClick={handleUpgradeSuccess}
                        disabled={processUpgradeMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {processUpgradeMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Complete Upgrade'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Elements>
            </div>
          ) : (
            // Plan selection
            <div className="max-h-96 overflow-y-auto">
              {upgradePlansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading upgrade options...</span>
                </div>
              ) : !upgradePlansData?.upgradePlans || upgradePlansData.upgradePlans.length === 0 ? (
                <div className="text-center py-8">
                  <Crown className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">You're already on the highest available plan!</p>
                  <Button
                    onClick={() => setIsUpgradeModalOpen(false)}
                    className="mt-3"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {upgradePlansData.upgradePlans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 h-full ${
                        plan.bestSeller 
                          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {plan.bestSeller && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                          MOST POPULAR
                        </div>
                      )}
                      
                      <CardContent className="p-6 h-full flex flex-col">
                        {/* Header Section */}
                        <div className="text-center mb-6">
                          <div className="flex items-center justify-center mb-3">
                            <Crown className={`h-8 w-8 ${plan.bestSeller ? 'text-blue-500' : 'text-gray-400'}`} />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {plan.name}
                          </h3>
                          <div className="mb-3">
                            <span className="text-4xl font-bold text-blue-600">
                              {plan.price}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">
                              /{plan.billingInterval}
                            </span>
                          </div>
                          {plan.description && (
                            <p className="text-gray-600 text-sm">
                              {plan.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Features Section - Flex grow to fill space */}
                        <div className="flex-1 space-y-4 mb-6">
                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <div className="text-lg font-bold text-green-700">
                                {plan.maxInvitations}
                              </div>
                              <div className="text-xs text-green-600">
                                DM Invites
                              </div>
                            </div>
                            
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <Phone className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                              <div className="text-lg font-bold text-blue-700">
                                {plan.maxCallCredits}
                              </div>
                              <div className="text-xs text-blue-600">
                                Call Credits
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional Features */}
                          <div className="space-y-2">
                            {plan.prioritySupport && (
                              <div className="flex items-center text-sm text-gray-700 p-2 bg-purple-50 rounded">
                                <HelpCircle className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0" />
                                <span className="font-medium">Priority Support</span>
                              </div>
                            )}
                            
                            {plan.features && plan.features.slice(0, 4).map((feature, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-700">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                            
                            {plan.features && plan.features.length > 4 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{plan.features.length - 4} more features
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Button at bottom */}
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          disabled={processingPlanId === plan.id}
                          className={`w-full h-12 font-semibold transition-all duration-200 ${
                            plan.bestSeller
                              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                              : 'bg-gray-800 hover:bg-gray-900'
                          }`}
                        >
                          {processingPlanId === plan.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Crown className="h-4 w-4 mr-2" />
                              Upgrade to {plan.name}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {!upgradeClientSecret && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
