import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Settings,
  RotateCcw,
  Loader2,
  Star,
  Flag,
} from "lucide-react";

export default function CreditsOverview() {
  const { toast } = useToast();
  const [isLimitsDialogOpen, setIsLimitsDialogOpen] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    maxCallsPerMonth: "",
    maxDMsPerMonth: "",
  });

  // Fetch credits summary
  const {
    data: creditsData,
    isLoading: loadingCredits,
    refetch: refetchCredits,
  } = useQuery({
    queryKey: ["/api/company-credits/summary"],
    retry: false,
  });

  // Update credit limits mutation
  const updateLimitsMutation = useMutation({
    mutationFn: async (limits) => {
      return await apiRequest("/api/company-credits/rep-limit", {
        method: "PATCH",
        body: JSON.stringify(limits),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit limits updated successfully",
      });
      setIsLimitsDialogOpen(false);
      refetchCredits();
      queryClient.invalidateQueries({
        queryKey: ["/api/company-credits/summary"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update credit limits",
        variant: "destructive",
      });
    },
  });

  // Reset credits mutation
  const resetCreditsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/company-credits/reset", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credits reset successfully",
      });
      refetchCredits();
      queryClient.invalidateQueries({
        queryKey: ["/api/company-credits/summary"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset credits",
        variant: "destructive",
      });
    },
  });

  const handleUpdateLimits = (e) => {
    e.preventDefault();
    const limits = {
      maxCallsPerMonth: limitsForm.maxCallsPerMonth
        ? parseInt(limitsForm.maxCallsPerMonth)
        : null,
      maxDMsPerMonth: limitsForm.maxDMsPerMonth
        ? parseInt(limitsForm.maxDMsPerMonth)
        : null,
    };
    updateLimitsMutation.mutate(limits);
  };

  const handleResetCredits = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all credits and usage statistics? This action cannot be undone.",
      )
    ) {
      resetCreditsMutation.mutate();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUsageStatus = (used, limit) => {
    if (!limit) return "unlimited";
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return "critical";
    if (percentage >= 75) return "warning";
    return "normal";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "critical":
        return "text-red-600 bg-red-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "unlimited":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-green-600 bg-green-100";
    }
  };

  if (loadingCredits) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading credits data...</span>
      </div>
    );
  }

  const credits = creditsData || {};
  const {
    planType = "enterprise",
    monthlyCredits = 1000,
    usedCredits = 0,
    remainingCredits = 1000,
    utilizationRate = 0,
    currentPeriodStart,
    currentPeriodEnd,
    perRepLimits = {},
    totalCallsBooked = 0,
    totalDMsUnlocked = 0,
    activeReps = 0,
    repUsage = [],
  } = credits;

  return (
    <div className="space-y-6">
      {/* Credits Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Monthly Credits
                </p>
                <p className="text-2xl font-bold">
                  {monthlyCredits.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Used Credits
                </p>
                <p className="text-2xl font-bold">
                  {usedCredits.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {utilizationRate.toFixed(1)}% utilized
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className="text-2xl font-bold">
                  {remainingCredits.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Reps</p>
                <p className="text-2xl font-bold">{activeReps}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credit Usage Overview</CardTitle>
              <CardDescription>
                Current billing period:{" "}
                {currentPeriodStart && formatDate(currentPeriodStart)} -{" "}
                {currentPeriodEnd && formatDate(currentPeriodEnd)}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Dialog
                open={isLimitsDialogOpen}
                onOpenChange={setIsLimitsDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Set Limits
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleUpdateLimits}>
                    <DialogHeader>
                      <DialogTitle>Set Per-Rep Credit Limits</DialogTitle>
                      <DialogDescription>
                        Set monthly limits for each sales representative. Leave
                        empty for unlimited access.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxCalls">Max Calls Per Month</Label>
                        <Input
                          id="maxCalls"
                          type="number"
                          placeholder="Unlimited"
                          value={limitsForm.maxCallsPerMonth}
                          onChange={(e) =>
                            setLimitsForm((prev) => ({
                              ...prev,
                              maxCallsPerMonth: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxDMs">
                          Max Decision Makers Per Month
                        </Label>
                        <Input
                          id="maxDMs"
                          type="number"
                          placeholder="Unlimited"
                          value={limitsForm.maxDMsPerMonth}
                          onChange={(e) =>
                            setLimitsForm((prev) => ({
                              ...prev,
                              maxDMsPerMonth: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsLimitsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateLimitsMutation.isPending}
                      >
                        {updateLimitsMutation.isPending ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Updating...
                          </>
                        ) : (
                          "Update Limits"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetCredits}
                disabled={resetCreditsMutation.isPending}
              >
                {resetCreditsMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset Period
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Credit Utilization</span>
              <span>{utilizationRate.toFixed(1)}%</span>
            </div>
            <Progress value={utilizationRate} className="h-2" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalCallsBooked}</p>
                <p className="text-sm text-gray-600">Total Calls Booked</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalDMsUnlocked}</p>
                <p className="text-sm text-gray-600">
                  Decision Makers Unlocked
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{usedCredits}</p>
                <p className="text-sm text-gray-600">Credits Consumed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Rep Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="text-blue-600 mr-3" size={24} />
            Per-Rep Usage Breakdown
          </CardTitle>
          <CardDescription>
            Detailed usage statistics for each sales representative
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repUsage.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>Calls Booked</TableHead>
                    <TableHead>DMs Unlocked</TableHead>
                    <TableHead>Credits Used</TableHead>
                    <TableHead>Avg Rating</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repUsage.map((rep) => {
                    const callsStatus = getUsageStatus(
                      rep.callsBooked,
                      perRepLimits.maxCallsPerMonth,
                    );
                    const dmsStatus = getUsageStatus(
                      rep.dmsUnlocked,
                      perRepLimits.maxDMsPerMonth,
                    );

                    return (
                      <TableRow key={rep.repId}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{rep.repName}</div>
                            <div className="text-sm text-gray-500">
                              {rep.repEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{rep.callsBooked}</span>
                            {perRepLimits.maxCallsPerMonth && (
                              <Badge
                                variant="outline"
                                className={getStatusColor(callsStatus)}
                              >
                                /{perRepLimits.maxCallsPerMonth}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{rep.dmsUnlocked}</span>
                            {perRepLimits.maxDMsPerMonth && (
                              <Badge
                                variant="outline"
                                className={getStatusColor(dmsStatus)}
                              >
                                /{perRepLimits.maxDMsPerMonth}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{rep.creditsUsed}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Star
                              className="h-4 w-4 text-yellow-500"
                              fill="currentColor"
                            />
                            <span>{rep.averageRating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            <span>{rep.feedbacksReceived}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Flag className="h-4 w-4 text-red-500" />
                            <span>{rep.flagsReceived}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {callsStatus === "critical" ||
                          dmsStatus === "critical" ? (
                            <Badge variant="destructive">Limit Reached</Badge>
                          ) : callsStatus === "warning" ||
                            dmsStatus === "warning" ? (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 bg-yellow-100"
                            >
                              Near Limit
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-green-600 bg-green-100"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No usage data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Usage statistics will appear here once your sales reps start
                booking calls.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
