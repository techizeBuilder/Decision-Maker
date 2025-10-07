import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Download,
  Star,
  Users,
  Phone,
  Target,
  Award,
  Calendar,
  BarChart3,
  FileText,
  Loader2,
  Trophy,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function PerformanceAnalytics() {
  const { toast } = useToast();
  const [exportType, setExportType] = useState("overview");
  const [isExporting, setIsExporting] = useState(false);

  // Fetch comprehensive analytics data
  const { data: analytics = {}, isLoading } = useQuery({
    queryKey: ["/api/company-analytics"],
    retry: false,
  });

  const {
    overview = {},
    topPerformers = {},
    trends = {},
    distributions = {},
    repPerformance = [],
  } = analytics;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/company-analytics/export?type=${exportType}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `analytics_${exportType}_${new Date().toISOString().split("T")[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Analytics data exported as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Chart color schemes
  const colors = {
    primary: "#3b82f6",
    secondary: "#06b6d4",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    muted: "#6b7280",
  };

  const pieColors = [
    colors.primary,
    colors.secondary,
    colors.success,
    colors.warning,
    colors.danger,
  ];

  // Prepare chart data
  const callOutcomeData = distributions.callOutcomes
    ? [
        {
          name: "Completed",
          value: distributions.callOutcomes.completed,
          fill: colors.success,
        },
        {
          name: "Missed",
          value: distributions.callOutcomes.missed,
          fill: colors.danger,
        },
        {
          name: "Cancelled",
          value: distributions.callOutcomes.cancelled,
          fill: colors.warning,
        },
        {
          name: "Scheduled",
          value: distributions.callOutcomes.scheduled,
          fill: colors.secondary,
        },
      ]
    : [];

  const dmVerificationData = distributions.dmVerification
    ? [
        {
          name: "Verified",
          value: distributions.dmVerification.verified,
          fill: colors.success,
        },
        {
          name: "Pending",
          value: distributions.dmVerification.pending,
          fill: colors.warning,
        },
        {
          name: "Rejected",
          value: distributions.dmVerification.rejected,
          fill: colors.danger,
        },
        {
          name: "Suspended",
          value: distributions.dmVerification.suspended,
          fill: colors.muted,
        },
      ]
    : [];

  const getPerformanceColor = (value, type) => {
    if (type === "feedback") {
      if (value >= 4.5) return "text-green-600";
      if (value >= 3.5) return "text-yellow-600";
      return "text-red-600";
    }
    if (type === "engagement") {
      if (value >= 80) return "text-green-600";
      if (value >= 60) return "text-yellow-600";
      return "text-red-600";
    }
    if (type === "noshow") {
      if (value <= 10) return "text-green-600";
      if (value <= 25) return "text-yellow-600";
      return "text-red-600";
    }
    return "text-gray-600";
  };

  const getPerformanceIcon = (value, type) => {
    if (type === "feedback") {
      if (value >= 4.5)
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      if (value >= 3.5)
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    if (type === "engagement") {
      if (value >= 80) return <TrendingUp className="h-5 w-5 text-green-600" />;
      if (value >= 60)
        return <TrendingUp className="h-5 w-5 text-yellow-600" />;
      return <TrendingUp className="h-5 w-5 text-red-600" />;
    }
    if (type === "noshow") {
      if (value <= 10)
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      if (value <= 25)
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">
          Loading performance analytics...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="text-blue-600 mr-3" size={28} />
            Performance Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into team performance and engagement metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={exportType} onValueChange={setExportType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview Analytics</SelectItem>
              <SelectItem value="rep_performance">Rep Performance</SelectItem>
              <SelectItem value="call_logs">Call Logs</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center"
          >
            {isExporting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Rep Feedback
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p
                    className={`text-2xl font-bold ${getPerformanceColor(overview.avgRepFeedbackScore, "feedback")}`}
                  >
                    {overview.avgRepFeedbackScore || 0}/5.0
                  </p>
                  {getPerformanceIcon(overview.avgRepFeedbackScore, "feedback")}
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg DM Engagement
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p
                    className={`text-2xl font-bold ${getPerformanceColor(overview.avgDMEngagementScore, "engagement")}`}
                  >
                    {overview.avgDMEngagementScore || 0}
                  </p>
                  {getPerformanceIcon(
                    overview.avgDMEngagementScore,
                    "engagement",
                  )}
                </div>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  No-Show Rate
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p
                    className={`text-2xl font-bold ${getPerformanceColor(overview.noShowRate, "noshow")}`}
                  >
                    {overview.noShowRate || 0}%
                  </p>
                  {getPerformanceIcon(overview.noShowRate, "noshow")}
                </div>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {overview.completionRate || 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      {trends.monthly && trends.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="text-blue-600 mr-3" size={20} />
              Performance Trends (6 Months)
            </CardTitle>
            <CardDescription>
              Monthly call volume, completion rates, and feedback scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Call Volume Trend */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Call Volume & Success Rate
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trends.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="totalCalls"
                      fill={colors.primary}
                      name="Total Calls"
                    />
                    <Bar
                      dataKey="completedCalls"
                      fill={colors.success}
                      name="Completed"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Feedback Trend */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Average Feedback Score
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trends.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgFeedback"
                      stroke={colors.warning}
                      strokeWidth={3}
                      name="Avg Feedback"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Outcomes Distribution */}
        {callOutcomeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="text-blue-600 mr-3" size={20} />
                Call Outcomes Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={callOutcomeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {callOutcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* DM Verification Status */}
        {dmVerificationData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="text-blue-600 mr-3" size={20} />
                DM Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dmVerificationData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dmVerificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top by Calls */}
        {topPerformers.byCalls && topPerformers.byCalls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Trophy className="text-yellow-500 mr-2" size={20} />
                Top by Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.byCalls.slice(0, 5).map((rep, index) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={index === 0 ? "default" : "secondary"}
                        className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{rep.name}</p>
                        <p className="text-xs text-gray-500">{rep.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {rep.completedCalls}
                      </p>
                      <p className="text-xs text-gray-500">calls</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top by Feedback */}
        {topPerformers.byFeedback && topPerformers.byFeedback.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Star className="text-yellow-500 mr-2" size={20} />
                Top by Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.byFeedback.slice(0, 5).map((rep, index) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={index === 0 ? "default" : "secondary"}
                        className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{rep.name}</p>
                        <p className="text-xs text-gray-500">{rep.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">
                        {rep.avgFeedback.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">rating</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top by DM Invites */}
        {topPerformers.byDMInvites && topPerformers.byDMInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Users className="text-green-500 mr-2" size={20} />
                Top by DM Invites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.byDMInvites.slice(0, 5).map((rep, index) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={index === 0 ? "default" : "secondary"}
                        className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{rep.name}</p>
                        <p className="text-xs text-gray-500">{rep.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {rep.dmInvites}
                      </p>
                      <p className="text-xs text-gray-500">invites</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Individual Rep Performance */}
      {repPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="text-blue-600 mr-3" size={20} />
              Individual Rep Performance
            </CardTitle>
            <CardDescription>
              Comprehensive performance metrics for each sales representative
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={repPerformance}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completedCalls"
                  fill={colors.primary}
                  name="Completed Calls"
                />
                <Bar
                  dataKey="dmInvites"
                  fill={colors.secondary}
                  name="DM Invites"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="text-blue-600 mr-3" size={20} />
            Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {overview.totalCalls || 0}
              </p>
              <p className="text-sm text-gray-600">Total Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {overview.totalDMs || 0}
              </p>
              <p className="text-sm text-gray-600">Decision Makers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {overview.totalReps || 0}
              </p>
              <p className="text-sm text-gray-600">Sales Reps</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {overview.completionRate || 0}%
              </p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
