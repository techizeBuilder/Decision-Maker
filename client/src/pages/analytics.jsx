import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  Calendar,
  Award,
  Target,
  Clock,
  ArrowLeft,
  BarChart3,
  PieChart,
  Activity,
  Star,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");

  // Fetch analytics data
  const { data: metrics } = useQuery({
    queryKey: ["/api/sales-rep/metrics"],
  });

  const { data: calls } = useQuery({
    queryKey: ["/api/sales-rep/calls"],
  });

  const { data: credits } = useQuery({
    queryKey: ["/api/sales-rep/credits"],
  });

  const { data: invitations } = useQuery({
    queryKey: ["/api/sales-rep/invitations"],
  });

  // Calculate analytics
  const totalCalls = calls?.length || 0;
  const completedCalls =
    calls?.filter((call) => call.status === "completed").length || 0;
  const upcomingCalls =
    calls?.filter((call) => call.status === "scheduled").length || 0;
  const cancelledCalls =
    calls?.filter((call) => call.status === "cancelled").length || 0;

  const totalInvitations = invitations?.length || 0;
  const acceptedInvitations =
    invitations?.filter((inv) => inv.status === "accepted").length || 0;
  const pendingInvitations =
    invitations?.filter((inv) => inv.status === "pending").length || 0;

  const completionRate =
    totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
  const acceptanceRate =
    totalInvitations > 0
      ? Math.round((acceptedInvitations / totalInvitations) * 100)
      : 0;

  const totalCredits =
    credits?.credits?.reduce((sum, credit) => sum + (credit.amount || 0), 0) ||
    0;

  // Calculate trends (mock data for demo)
  const callTrend = +12;
  const creditTrend = +25;
  const invitationTrend = +8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 pt-16">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.history.back()}
                  className="flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Sales Analytics
                  </h1>
                  <p className="text-gray-600">
                    Performance insights and metrics
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Total Calls
                    </p>
                    <p className="text-3xl font-bold">{totalCalls}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        {callTrend > 0 ? "+" : ""}
                        {callTrend}% from last period
                      </span>
                    </div>
                  </div>
                  <Phone className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">
                      Completion Rate
                    </p>
                    <p className="text-3xl font-bold">{completionRate}%</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm">+5% from last period</span>
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">
                      Credits Earned
                    </p>
                    <p className="text-3xl font-bold">{totalCredits}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        {creditTrend > 0 ? "+" : ""}
                        {creditTrend}% from last period
                      </span>
                    </div>
                  </div>
                  <Award className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">
                      Acceptance Rate
                    </p>
                    <p className="text-3xl font-bold">{acceptanceRate}%</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        {invitationTrend > 0 ? "+" : ""}
                        {invitationTrend}% from last period
                      </span>
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Call Performance */}
            <div className="lg:col-span-2 space-y-6">
              {/* Call Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Call Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <p className="font-medium text-green-900">
                            Completed Calls
                          </p>
                          <p className="text-sm text-green-600">
                            {completedCalls} calls completed successfully
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {completedCalls}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-blue-900">
                            Upcoming Calls
                          </p>
                          <p className="text-sm text-blue-600">
                            {upcomingCalls} calls scheduled
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {upcomingCalls}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                        <div>
                          <p className="font-medium text-red-900">
                            Cancelled Calls
                          </p>
                          <p className="text-sm text-red-600">
                            {cancelledCalls} calls cancelled
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        {cancelledCalls}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Call History */}
              <Card className="shadow-lg border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="text-green-500 mr-3" size={24} />
                    Recent Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calls && calls.length > 0 ? (
                    calls
                      .filter((call) => call.status === "completed")
                      .slice(0, 5)
                      .map((call) => (
                        <div
                          key={call._id || call.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-green-50 rounded-lg border border-green-200 mb-4"
                        >
                          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <Users className="text-green-600" size={24} />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {call.decisionMakerName || "Decision Maker"}
                              </h3>
                              <p className="text-green-600 font-medium">
                                {call.company || "Company"}
                              </p>
                              <p className="text-sm text-gray-600">
                                {call.industry || "Industry"}
                              </p>
                              <p className="text-sm text-green-600 font-medium italic">
                                "{call.salesRepFeedback || "Call completed"}"
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-medium text-gray-900">
                              {call.completedAt
                                ? new Date(
                                    call.completedAt,
                                  ).toLocaleDateString()
                                : call.scheduledAt
                                  ? new Date(
                                      call.scheduledAt,
                                    ).toLocaleDateString()
                                  : "Recently"}
                            </p>
                            <div className="flex items-center mt-1">
                              <div className="flex">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`${i < (call.salesRepRating || 0) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                    size={16}
                                  />
                                ))}
                              </div>
                              {call.salesRepRating && (
                                <span className="ml-2 text-sm text-gray-600">
                                  {call.salesRepRating}/5
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <Badge className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                              {!call.salesRepRating && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                                  onClick={() => {
                                    // Navigate to evaluation with specific call ID
                                    window.location.href = `/evaluation/sales-rep?callId=${call._id}`;
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

            {/* Sidebar Analytics */}
            <div className="space-y-6">
              {/* Invitation Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-orange-600" />
                    Invitations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {acceptanceRate}%
                      </div>
                      <p className="text-sm text-gray-600">Acceptance Rate</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Total Sent
                        </span>
                        <Badge className="bg-gray-100 text-gray-800">
                          {totalInvitations}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Accepted</span>
                        <Badge className="bg-green-100 text-green-800">
                          {acceptedInvitations}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Pending</span>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {pendingInvitations}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credit System */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-purple-600" />
                    Credits Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {totalCredits}
                      </div>
                      <p className="text-sm text-gray-600">
                        Total Credits Earned
                      </p>
                    </div>

                    <div className="space-y-2">
                      {credits?.credits?.slice(0, 3).map((credit, index) => (
                        <div
                          key={credit._id || index}
                          className="flex justify-between items-center p-2 bg-purple-50 rounded"
                        >
                          <span className="text-sm font-medium text-purple-900">
                            {credit.reason || "Credit Earned"}
                          </span>
                          <Badge className="bg-purple-100 text-purple-800">
                            +{credit.amount}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-600" />
                    Performance Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-600 mb-2">
                      {Math.round((completionRate + acceptanceRate) / 2)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Overall Score</p>

                    <div className="space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Call Completion
                        </span>
                        <span className="text-sm font-medium">
                          {completionRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Invitation Success
                        </span>
                        <span className="text-sm font-medium">
                          {acceptanceRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => (window.location.href = "/sales-dashboard")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
