import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Calendar,
  Star,
  TrendingUp,
  Clock,
  User,
  Settings,
  Repeat,
  ExternalLink,
  Phone,
  AlertTriangle,
  MessageCircle,
  Loader2,
  RefreshCw,
  CalendarDays,
  Video,
  Users,
  Edit,
  Lock,
  Bell,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import FlagsBadge from "@/components/FlagsBadge";
import ratingBadgeImage from "@assets/shared_image__1_-removebg-preview_1751516866961.png";

// Integrated Meeting Card Component for Calendar Integration
function IntegratedMeetingCard({ meeting }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday)
      return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (isTomorrow)
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const extractMeetingLink = (description = "") => {
    const zoomRegex = /https:\/\/[\w-]*\.?zoom\.us\/j\/[\d\w?=-]+/g;
    const meetRegex = /https:\/\/meet\.google\.com\/[\w-]+/g;
    const teamsRegex = /https:\/\/teams\.microsoft\.com\/[\w\/?=-]+/g;

    const zoomMatch = description.match(zoomRegex);
    const meetMatch = description.match(meetRegex);
    const teamsMatch = description.match(teamsRegex);

    return zoomMatch?.[0] || meetMatch?.[0] || teamsMatch?.[0] || null;
  };

  const meetingLink = extractMeetingLink(meeting.description);

  return (
    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
          <Video className="text-green-600" size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-gray-900">
              {meeting.summary || "Meeting with Sales Rep"}
            </h3>
            <Badge className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 text-sm font-semibold">
              CALENDAR
            </Badge>
          </div>
          <p className="font-medium text-green-600">
            {meeting.organizer?.email || "Sales Rep"}
          </p>
          <p className="text-sm text-gray-600">
            {meeting.attendees?.length > 0
              ? `${meeting.attendees.length} attendees`
              : "Google Calendar"}
          </p>
          <p className="text-sm font-medium italic text-green-600">
            "Calendar meeting"
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-green-600">
          {formatDate(meeting.start?.dateTime || meeting.start?.date)}
        </p>
        <p className="text-sm text-gray-500">
          {meeting.status === "confirmed" ? "Confirmed" : "Scheduled"}
        </p>
        <div className="mt-2 space-x-2">
          {meetingLink && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              asChild
            >
              <a href={meetingLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1" size={12} />
                Join Meeting
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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

export default function DecisionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Fetch decision maker's calls
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ["/api/decision-maker/calls"],
    enabled: !!user?.id,
  });

  // Fetch decision maker's metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/decision-maker/metrics"],
    enabled: !!user?.id,
  });

  // Fetch calendar integration status
  const { data: calendarStatus, isLoading: calendarStatusLoading } = useQuery({
    queryKey: ["/api/calendar/status"],
    enabled: !!user?.id,
  });

  // Fetch upcoming meetings
  const {
    data: upcomingMeetings = [],
    isLoading: meetingsLoading,
    refetch: refetchMeetings,
  } = useQuery({
    queryKey: ["/api/calendar/upcoming-meetings"],
    enabled: !!user?.id && !!calendarStatus?.connected,
  });

  // Fetch flags count
  const { data: flagsData } = useQuery({
    queryKey: ["/api/user/flags-count"],
    enabled: !!user?.id,
  });
  const flagsCount = flagsData?.flags || 0;

  // Fetch user's monthly call limit data
  const { data: userCallLimit } = useQuery({
    queryKey: ["/api/user/can-book-calls"],
    enabled: !!user?.id,
  });

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
        size={16}
      />
    ));
  };

  const getCallColor = (index) => {
    return "blue"; // Use consistent blue theme
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const rateCallMutation = useMutation({
    mutationFn: async ({ callId, rating, feedback }) => {
      return await apiRequest(`/api/decision-maker/calls/${callId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating, feedback }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/decision-maker/calls"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/decision-maker/metrics"],
      });
      toast({
        title: "Call Rated",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rate call",
        variant: "destructive",
      });
    },
  });

  // Complete call mutation
  const completeCallMutation = useMutation({
    mutationFn: async (callId) => {
      return await apiRequest(`/api/decision-maker/complete-call/${callId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/decision-maker/calls"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/decision-maker/metrics"],
      });
      toast({
        title: "Call Completed",
        description: "Call has been marked as completed successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete call",
        variant: "destructive",
      });
    },
  });

  const handleCompleteCall = (callId) => {
    completeCallMutation.mutate(callId);
  };

  const handleRateLastCall = () => {
    const lastCall = calls?.find(
      (call) => call.status === "completed" && !call.rating,
    );
    if (lastCall) {
      // Navigate to evaluation with call ID
      window.location.href = `/post-call-evaluation?callId=${lastCall._id}`;
    } else {
      // Navigate to general evaluation page
      window.location.href = "/post-call-evaluation";
    }
  };

  if (!user || metricsLoading || callsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const upcomingCalls = calls
    .filter((call) => {
      const callDate = new Date(call.endTime);
      const now = new Date();
      return call.status === "scheduled" && callDate > now;
    })
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const recentCalls = calls.filter((call) => call.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Decision Maker Dashboard
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-600">
                  Welcome back, {user?.firstName}!
                </p>
                <Badge className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 text-sm font-semibold">
                  DECISION MAKER
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800 border border-green-200">
                {metrics?.standing === "good"
                  ? "Excellent Standing"
                  : "Standing: " + metrics?.standing}
              </Badge>
              <FlagsBadge />
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    <Settings className="mr-2" size={16} />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                  <DialogHeader>
                    <DialogTitle className="flex items-center text-gray-900">
                      <Settings className="mr-2" size={20} />
                      Account Settings
                    </DialogTitle>
                  </DialogHeader>
                  <SettingsPanel
                    user={user}
                    onClose={() => setSettingsOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <Card className="border border-gray-200 shadow-lg bg-white h-32">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Monthly Call Limit
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.completedCalls !== undefined &&
                    metrics?.totalCallLimit !== undefined
                      ? `${metrics.completedCalls}/${metrics.totalCallLimit}`
                      : `${metrics?.completedCalls || 0}/3`}
                  </p>
                  <p
                    className={`text-xs font-medium ${metrics?.remainingCalls > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {metrics?.remainingCalls !== undefined
                      ? `${metrics.remainingCalls} calls remaining`
                      : "loading..."}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-blue-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg bg-white h-32">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Avg Call Rating
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.avgRating
                      ? `${metrics.avgRating.toFixed(1)}/5`
                      : "-"}
                  </p>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <img
                    src={ratingBadgeImage}
                    alt="Rating Badge"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg bg-white h-32">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Quality Score
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.qualityScore !== null &&
                    metrics?.qualityScore !== undefined
                      ? `${metrics.qualityScore}%`
                      : "-"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg bg-white h-32">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Flags Count
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {flagsCount || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration Card */}
          <Card className="border border-gray-200 shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white h-32">
            <CardContent className="p-4 h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="text-white mr-2" size={16} />
                    <span className="text-xs font-medium">
                      Calendar Integration
                    </span>
                  </div>
                  {calendarStatus?.connected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchMeetings()}
                      disabled={meetingsLoading}
                      className="text-white hover:bg-white/20 h-6 w-6 p-0"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${meetingsLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  )}
                </div>

                {calendarStatusLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          if (calendarStatus?.connected) {
                            // Disconnect calendar
                            await apiRequest("/api/current-user", {
                              method: "PUT",
                              body: JSON.stringify({
                                calendarIntegrationEnabled: false,
                              }),
                            });

                            queryClient.invalidateQueries({
                              queryKey: ["/api/calendar/status"],
                            });

                            toast({
                              title: "Calendar Disconnected",
                              description:
                                "Google Calendar has been disconnected",
                            });
                          } else {
                            // Connect to Google Calendar using the authenticated endpoint
                            const response = await apiRequest(
                              "/api/auth/google/connect",
                            );
                            window.location.href = response.authUrl;
                          }
                        } catch (error) {
                          console.error("Calendar toggle failed:", error);
                          toast({
                            title: "Error",
                            description: "Failed to update calendar connection",
                            variant: "destructive",
                          });
                        }
                      }}
                      className={`w-full transition-all duration-300 text-xs h-6 ${
                        calendarStatus?.connected
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                      style={{
                        backgroundColor: calendarStatus?.connected
                          ? "#16a34a"
                          : "#ff1f1f",
                      }}
                      size="sm"
                    >
                      <Calendar className="mr-1" size={10} />
                      {calendarStatus?.connected ? "Connected" : "Disconnected"}
                    </Button>

                    {calendarStatus?.connected && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs h-6"
                          >
                            <CalendarDays className="mr-1" size={10} />
                            View All
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center">
                              <Calendar className="mr-2" size={20} />
                              All Calendar Meetings
                            </DialogTitle>
                          </DialogHeader>
                          <CalendarMeetingsView
                            meetings={upcomingMeetings}
                            loading={meetingsLoading}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Calls with Calendar Integration */}
            <Card className="shadow-lg border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center">
                    <Calendar className="text-blue-600 mr-3" size={24} />
                    Upcoming Calls
                  </div>
                  <div className="flex items-center gap-2">
                    {calendarStatus?.connected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchMeetings()}
                        disabled={meetingsLoading}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${meetingsLoading ? "animate-spin" : ""}`}
                        />
                      </Button>
                    )}
                    {!calendarStatus?.connected && (
                      <Button
                        onClick={async () => {
                          try {
                            // Connect to Google Calendar via OAuth using authenticated endpoint
                            const response = await apiRequest(
                              "/api/auth/google/connect",
                            );
                            window.location.href = response.authUrl;
                          } catch (error) {
                            console.error("Calendar connection failed:", error);
                            toast({
                              title: "Error",
                              description: "Failed to connect calendar",
                              variant: "destructive",
                            });
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <Calendar className="mr-1" size={12} />
                        Connect Calendar
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Calendar Connection Status */}
                <div className="p-3 rounded-lg border">
                  {calendarStatusLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                      <span className="text-sm text-gray-600">
                        Checking calendar connection...
                      </span>
                    </div>
                  ) : calendarStatus?.connected ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-2" size={16} />
                      <span className="text-sm font-medium">
                        Google Calendar Connected
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center text-orange-600">
                      <AlertTriangle className="mr-2" size={16} />
                      <span className="text-sm font-medium">
                        Calendar Not Connected - Click "Connect Calendar" to
                        sync meetings
                      </span>
                    </div>
                  )}
                </div>

                {/* Platform Calls */}
                {upcomingCalls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Phone className="mr-2 text-blue-500" size={14} />
                      Platform Scheduled Calls
                    </h4>
                    {calendarStatus?.connected ? (
                      <div className="space-y-3">
                        {upcomingCalls.map((call, index) => {
                          const color = getCallColor(index);
                          return (
                            <div
                              key={call._id || call.id}
                              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border-2 ${
                                color === "blue"
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-blue-50 border-blue-200"
                              }`}
                            >
                              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                                  <User className="text-blue-600" size={24} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-gray-900">
                                      {call.salesRepName || "Sales Rep"}
                                    </h3>
                                    <Badge className="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1 text-sm font-semibold">
                                      VERIFIED
                                    </Badge>
                                  </div>
                                  <p className="font-medium text-blue-600">
                                    {call.company || "Company"}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {call.industry || "Industry"}
                                  </p>
                                  <p className="text-sm font-medium italic text-blue-600">
                                    "{call.pitch || "Scheduled call"}"
                                  </p>
                                </div>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="font-bold text-blue-600">
                                  {call.scheduledAt
                                    ? formatDate(call.scheduledAt)
                                    : "TBD"}
                                </p>
                                <p className="text-sm text-gray-500">15 min</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className={`text-sm ${
                                      (() => {
                                        const now = new Date();
                                        const callTime = new Date(call.scheduledAt);
                                        const joinWindowStart = new Date(callTime.getTime() - 2 * 60 * 1000); // 2 minutes before
                                        const joinWindowEnd = new Date(callTime.getTime() + 30 * 60 * 1000); // 30 minutes after
                                        const canJoin = now >= joinWindowStart && now <= joinWindowEnd;
                                        
                                        return canJoin 
                                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                          : "bg-gray-400 text-gray-200 cursor-not-allowed";
                                      })()
                                    }`}
                                    disabled={(() => {
                                      const now = new Date();
                                      const callTime = new Date(call.scheduledAt);
                                      const joinWindowStart = new Date(callTime.getTime() - 2 * 60 * 1000); // 2 minutes before
                                      const joinWindowEnd = new Date(callTime.getTime() + 30 * 60 * 1000); // 30 minutes after
                                      return !(now >= joinWindowStart && now <= joinWindowEnd);
                                    })()}
                                    onClick={() => {
                                      const now = new Date();
                                      const callTime = new Date(call.scheduledAt);
                                      const joinWindowStart = new Date(callTime.getTime() - 2 * 60 * 1000);
                                      const joinWindowEnd = new Date(callTime.getTime() + 30 * 60 * 1000);
                                      
                                      if (now < joinWindowStart) {
                                        const timeRemaining = formatTimeRemaining(joinWindowStart - now);
                                        toast({
                                          title: "Meeting Not Yet Available",
                                          description: `You can join 2 minutes before the scheduled time. Available in ${timeRemaining}`,
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      
                                      if (now > joinWindowEnd) {
                                        toast({
                                          title: "Meeting Window Closed",
                                          description: "The meeting window has passed. Contact support if you need assistance.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      
                                      // Join call logic - open Google Meet link if available
                                      if (call.googleMeetLink) {
                                        window.open(
                                          call.googleMeetLink,
                                          "_blank",
                                        );
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
                                    <Phone className="mr-1" size={12} />
                                    {(() => {
                                      const now = new Date();
                                      const callTime = new Date(call.scheduledAt);
                                      const joinWindowStart = new Date(callTime.getTime() - 2 * 60 * 1000);
                                      
                                      if (now < joinWindowStart) {
                                        const timeRemaining = formatTimeRemaining(joinWindowStart - now);
                                        return `Available in ${timeRemaining}`;
                                      } else {
                                        return "Join Call";
                                      }
                                    })()}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                    onClick={() =>
                                      handleCompleteCall(call._id || call.id)
                                    }
                                    disabled={completeCallMutation.isPending}
                                  >
                                    {completeCallMutation.isPending ? (
                                      <Loader2
                                        className="mr-1 animate-spin"
                                        size={12}
                                      />
                                    ) : (
                                      <CheckCircle className="mr-1" size={12} />
                                    )}
                                    Mark Complete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">
                          No upcoming calls scheduled
                        </p>
                        {!calendarStatus?.connected && (
                          <p className="text-sm text-gray-400 mt-2">
                            Connect your calendar to see Google Calendar
                            meetings
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* No calls state */}
                {upcomingCalls.length === 0 &&
                  (!calendarStatus?.connected ||
                    upcomingMeetings.length === 0) && (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        No upcoming calls scheduled
                      </p>
                      {!calendarStatus?.connected && (
                        <p className="text-sm text-gray-400 mt-2">
                          Connect your calendar to see Google Calendar meetings
                        </p>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Recent Calls */}
            <Card className="shadow-lg border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="text-green-500 mr-3" size={24} />
                  Recent Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCalls.length > 0 ? (
                  recentCalls.map((call) => (
                    <div
                      key={call._id || call.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-green-50 rounded-lg border border-green-200 mb-4"
                    >
                      <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="text-green-600" size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {call.salesRepName || "Sales Rep"}
                          </h3>
                          <p className="text-green-600 font-medium">
                            {call.company || "Company"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {call.industry || "Industry"}
                          </p>
                          <p className="text-sm text-green-600 font-medium italic">
                            "{call.feedback || "Call completed"}"
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-medium text-gray-900">
                          {call.completedAt
                            ? new Date(call.completedAt).toLocaleDateString()
                            : "Recently"}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {renderStars(call.rating || 0)}
                          </div>
                          {call.rating && (
                            <span className="ml-2 text-sm text-gray-600">
                              {call.rating}/5
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                          <Badge className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                          {!call.rating && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                              onClick={() => {
                                // Navigate to evaluation with specific call ID
                                window.location.href = `/evaluation/rep?callId=${call._id}`;
                              }}
                            >
                              <Star className="mr-1" size={12} />
                              Rate Meeting
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No completed calls yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-yellow-50"
                  onClick={() => handleRateLastCall()}
                >
                  <Star className="text-yellow-500 mr-3" size={16} />
                  <span className="text-sm font-medium">Rate Last Call</span>
                </Button>
                <Dialog
                  open={reportIssueOpen}
                  onOpenChange={setReportIssueOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-red-50"
                    >
                      <AlertTriangle className="text-red-500 mr-3" size={16} />
                      <span className="text-sm font-medium">Report Issue</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Report an Issue</DialogTitle>
                    </DialogHeader>
                    <ReportIssueForm
                      onClose={() => setReportIssueOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 hover:bg-blue-50"
                    >
                      <MessageCircle className="text-blue-500 mr-3" size={16} />
                      <span className="text-sm font-medium">View Feedback</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Your Call Feedback History</DialogTitle>
                    </DialogHeader>
                    <FeedbackHistory onClose={() => setFeedbackOpen(false)} />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Report Issue Form Component
function ReportIssueForm({ onClose }) {
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const { toast } = useToast();

  const issueTypes = [
    { value: "technical", label: "Technical Issue" },
    { value: "behavior", label: "Inappropriate Behavior" },
    { value: "quality", label: "Call Quality Problem" },
    { value: "scheduling", label: "Scheduling Issue" },
    { value: "other", label: "Other" },
  ];

  const priorityLevels = [
    { value: "low", label: "Low Priority", color: "text-green-600" },
    { value: "medium", label: "Medium Priority", color: "text-yellow-600" },
    { value: "high", label: "High Priority", color: "text-red-600" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an issue type and provide a description.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("/api/decision-maker/report-issue", {
        method: "POST",
        body: JSON.stringify({
          type: issueType,
          description: description.trim(),
          priority,
          reportedAt: new Date().toISOString(),
        }),
      });

      toast({
        title: "Issue Reported",
        description:
          "Your issue has been reported successfully. We'll investigate and get back to you.",
      });

      onClose();
      setIssueType("");
      setDescription("");
      setPriority("medium");
    } catch (error) {
      toast({
        title: "Report Failed",
        description:
          error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="issueType">Issue Type</Label>
        <select
          id="issueType"
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md mt-1"
          required
        >
          <option value="">Select an issue type</option>
          {issueTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="priority">Priority Level</Label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md mt-1"
        >
          {priorityLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please describe the issue in detail..."
          className="mt-1"
          rows={4}
          required
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          <AlertTriangle className="mr-2" size={16} />
          Submit Report
        </Button>
      </div>
    </form>
  );
}

// Feedback History Component
function FeedbackHistory({ onClose }) {
  const { data: feedbackHistory, isLoading } = useQuery({
    queryKey: ["/api/decision-maker/feedback-history"],
  });

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
        size={14}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const feedback = feedbackHistory || [];

  return (
    <div className="space-y-4">
      {feedback.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Feedback Yet
          </h3>
          <p className="text-gray-500">
            Complete calls to start receiving feedback and ratings.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {feedback.map((item, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          Call with{" "}
                          {item.salesRepName || "Sales Representative"}
                        </h4>
                        <Badge className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 text-xs font-semibold">
                          RATED
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {item.company} •{" "}
                        {new Date(item.callDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {renderStars(item.rating)}
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {item.rating}/5
                      </span>
                    </div>
                  </div>

                  {item.experienceTitle && (
                    <Badge
                      variant="secondary"
                      className={`mb-2 ${
                        item.rating >= 4
                          ? "bg-green-100 text-green-800"
                          : item.rating >= 3
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.experienceTitle}
                    </Badge>
                  )}

                  {item.comments && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{item.comments}"
                    </p>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Submitted{" "}
                      {new Date(item.evaluatedAt).toLocaleDateString()}
                    </span>
                    {item.rating <= 2 && (
                      <Badge variant="destructive" className="text-xs">
                        Follow-up Required
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Settings Panel Component
function SettingsPanel({ user, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    jobTitle: user?.jobTitle || "",
    company: user?.company || "",
    phone: user?.phone || "",
    linkedinUrl: user?.linkedinUrl || "",
    bio: user?.bio || "",
    timezone: user?.timezone || "UTC",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: user?.notificationSettings?.emailNotifications ?? true,
    smsNotifications: user?.notificationSettings?.smsNotifications ?? false,
    meetingReminders: user?.notificationSettings?.meetingReminders ?? true,
    weeklyDigest: user?.notificationSettings?.weeklyDigest ?? true,
    promotionalEmails: user?.notificationSettings?.promotionalEmails ?? false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: user?.privacySettings?.profileVisibility || "public",
    showCompanyInfo: user?.privacySettings?.showCompanyInfo ?? true,
    allowDirectContact: user?.privacySettings?.allowDirectContact ?? true,
    shareCallHistory: user?.privacySettings?.shareCallHistory ?? false,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("/api/current-user", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });

      // Invalidate user data cache to refetch updated info
      await queryClient.invalidateQueries({ queryKey: ["/api/current-user"] });

      toast({
        title: "Profile Updated",
        description: "Your personal information has been saved successfully.",
      });

      onClose();
    } catch (error) {
      console.error("Profile update failed:", error);
      toast({
        title: "Update Failed",
        description: "Failed to save your profile changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setIsLoading(true);
    try {
      await apiRequest("/api/user/notifications", {
        method: "PUT",
        body: JSON.stringify(notificationSettings),
      });

      // Invalidate user data cache
      await queryClient.invalidateQueries({ queryKey: ["/api/current-user"] });

      toast({
        title: "Notifications Updated",
        description:
          "Your notification preferences have been saved successfully.",
      });
    } catch (error) {
      console.error("Notification settings update failed:", error);
      toast({
        title: "Update Failed",
        description:
          "Failed to save your notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacyUpdate = async () => {
    setIsLoading(true);
    try {
      await apiRequest("/api/user/privacy", {
        method: "PUT",
        body: JSON.stringify(privacySettings),
      });

      // Invalidate user data cache
      await queryClient.invalidateQueries({ queryKey: ["/api/current-user"] });

      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved successfully.",
      });
    } catch (error) {
      console.error("Privacy settings update failed:", error);
      toast({
        title: "Update Failed",
        description: "Failed to save your privacy settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="mr-2" size={16} />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="mr-2" size={16} />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center">
            <Shield className="mr-2" size={16} />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Lock className="mr-2" size={16} />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="mr-2" size={18} />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          firstName: e.target.value,
                        })
                      }
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          lastName: e.target.value,
                        })
                      }
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={profileData.jobTitle}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          jobTitle: e.target.value,
                        })
                      }
                      placeholder="Enter job title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          company: e.target.value,
                        })
                      }
                      placeholder="Enter company name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={profileData.timezone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          timezone: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">GMT</option>
                      <option value="Europe/Paris">CET</option>
                      <option value="Asia/Tokyo">JST</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input
                    id="linkedinUrl"
                    value={profileData.linkedinUrl}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        linkedinUrl: e.target.value,
                      })
                    }
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    placeholder="Brief description of your professional background..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2" size={18} />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailNotifications: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via text message
                    </p>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        smsNotifications: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="meetingReminders">Meeting Reminders</Label>
                    <p className="text-sm text-gray-500">
                      Get reminded about upcoming calls
                    </p>
                  </div>
                  <Switch
                    id="meetingReminders"
                    checked={notificationSettings.meetingReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        meetingReminders: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyDigest">Weekly Digest</Label>
                    <p className="text-sm text-gray-500">
                      Weekly summary of your activity
                    </p>
                  </div>
                  <Switch
                    id="weeklyDigest"
                    checked={notificationSettings.weeklyDigest}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        weeklyDigest: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="promotionalEmails">
                      Promotional Emails
                    </Label>
                    <p className="text-sm text-gray-500">
                      Updates about new features and offers
                    </p>
                  </div>
                  <Switch
                    id="promotionalEmails"
                    checked={notificationSettings.promotionalEmails}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        promotionalEmails: checked,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNotificationUpdate} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Notification Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2" size={18} />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    Control who can see your profile information
                  </p>
                  <select
                    id="profileVisibility"
                    value={privacySettings.profileVisibility}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        profileVisibility: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="network">
                      Network Only - Connected sales reps only
                    </option>
                    <option value="private">
                      Private - Hidden from searches
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showCompanyInfo">
                      Show Company Information
                    </Label>
                    <p className="text-sm text-gray-500">
                      Display your company and job title publicly
                    </p>
                  </div>
                  <Switch
                    id="showCompanyInfo"
                    checked={privacySettings.showCompanyInfo}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({
                        ...privacySettings,
                        showCompanyInfo: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowDirectContact">
                      Allow Direct Contact
                    </Label>
                    <p className="text-sm text-gray-500">
                      Sales reps can contact you directly
                    </p>
                  </div>
                  <Switch
                    id="allowDirectContact"
                    checked={privacySettings.allowDirectContact}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({
                        ...privacySettings,
                        allowDirectContact: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="shareCallHistory">Share Call History</Label>
                    <p className="text-sm text-gray-500">
                      Allow other DMs to see your call ratings
                    </p>
                  </div>
                  <Switch
                    id="shareCallHistory"
                    checked={privacySettings.shareCallHistory}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({
                        ...privacySettings,
                        shareCallHistory: checked,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePrivacyUpdate} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Privacy Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2" size={18} />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Password Security</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Keep your account secure with a strong password
                  </p>
                  <Button variant="outline">Change Password</Button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Active Sessions</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage your active login sessions
                  </p>
                  <Button variant="outline">View Sessions</Button>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium mb-2 text-red-800">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-3">
                    Permanently delete your account and all associated data
                  </p>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Meeting Card Component
function MeetingCard({ meeting, compact = false }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday)
      return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (isTomorrow)
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const extractMeetingLink = (description = "") => {
    const zoomRegex = /https:\/\/[\w-]*\.?zoom\.us\/j\/[\d\w?=-]+/g;
    const meetRegex = /https:\/\/meet\.google\.com\/[\w-]+/g;
    const teamsRegex = /https:\/\/teams\.microsoft\.com\/[\w\/?=-]+/g;

    const zoomMatch = description.match(zoomRegex);
    const meetMatch = description.match(meetRegex);
    const teamsMatch = description.match(teamsRegex);

    return zoomMatch?.[0] || meetMatch?.[0] || teamsMatch?.[0] || null;
  };

  const meetingLink = extractMeetingLink(meeting.description);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {meeting.summary || "Meeting with Sales Rep"}
            </p>
            <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0">
              EXT
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {formatDate(meeting.start?.dateTime || meeting.start?.date)}
          </p>
        </div>
        {meetingLink && (
          <Button size="sm" variant="ghost" asChild>
            <a href={meetingLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Video className="text-blue-500" size={16} />
              <h4 className="font-medium text-gray-900 truncate">
                {meeting.summary || "Meeting with Sales Rep"}
              </h4>
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-xs font-semibold">
                EXTERNAL
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>
                  {formatDate(meeting.start?.dateTime || meeting.start?.date)}
                </span>
              </div>

              {meeting.organizer?.email && (
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>Organized by: {meeting.organizer.email}</span>
                </div>
              )}

              {meeting.attendees && meeting.attendees.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{meeting.attendees.length} attendees</span>
                </div>
              )}
            </div>

            {meeting.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                {meeting.description.replace(/https?:\/\/[^\s]+/g, "").trim()}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {meeting.status === "confirmed" && (
              <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
            )}
            {meetingLink && (
              <Button size="sm" asChild>
                <a href={meetingLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1" size={14} />
                  Join
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Calendar Meetings View Component
function CalendarMeetingsView({ meetings, loading }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterSalesRep, setFilterSalesRep] = useState("");

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesDate =
      !filterDate ||
      new Date(meeting.start?.dateTime || meeting.start?.date)
        .toDateString()
        .includes(filterDate);
    const matchesSalesRep =
      !filterSalesRep ||
      meeting.organizer?.email
        ?.toLowerCase()
        .includes(filterSalesRep.toLowerCase()) ||
      meeting.summary?.toLowerCase().includes(filterSalesRep.toLowerCase());

    return matchesDate && matchesSalesRep;
  });

  const groupedMeetings = filteredMeetings.reduce((groups, meeting) => {
    const date = new Date(meeting.start?.dateTime || meeting.start?.date);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(meeting);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="filter-date">Filter by Date</Label>
          <Input
            id="filter-date"
            type="text"
            placeholder="e.g., Jan 15 or Monday"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="filter-rep">Filter by Sales Rep</Label>
          <Input
            id="filter-rep"
            type="text"
            placeholder="Search by name or email"
            value={filterSalesRep}
            onChange={(e) => setFilterSalesRep(e.target.value)}
          />
        </div>
      </div>

      {/* Meetings List */}
      {Object.keys(groupedMeetings).length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500">No meetings found</p>
          <p className="text-sm text-gray-400 mt-2">
            {filterDate || filterSalesRep
              ? "Try adjusting your filters"
              : "No upcoming meetings scheduled"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMeetings)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([dateKey, dayMeetings]) => (
              <div key={dateKey}>
                <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b">
                  {new Date(dateKey).toLocaleDateString([], {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="space-y-3">
                  {dayMeetings
                    .sort(
                      (a, b) =>
                        new Date(a.start?.dateTime || a.start?.date) -
                        new Date(b.start?.dateTime || b.start?.date),
                    )
                    .map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} />
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
