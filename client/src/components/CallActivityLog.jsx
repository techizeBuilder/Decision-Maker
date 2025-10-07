import { useState, useMemo } from "react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  PhoneOff,
  Calendar,
  Clock,
  Star,
  Flag,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  PlayCircle,
  Loader2,
  ArrowUpDown,
  TrendingUp,
  Users,
} from "lucide-react";

export default function CallActivityLog() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRep, setSelectedRep] = useState("all_reps");
  const [selectedDM, setSelectedDM] = useState("all_dms");
  const [selectedOutcome, setSelectedOutcome] = useState("all_outcomes");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCall, setSelectedCall] = useState(null);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagSeverity, setFlagSeverity] = useState("medium");
  const [sortField, setSortField] = useState("scheduledAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Build query params for filtering
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedRep && selectedRep !== "all_reps")
      params.append("rep", selectedRep);
    if (selectedDM && selectedDM !== "all_dms") params.append("dm", selectedDM);
    if (selectedOutcome && selectedOutcome !== "all_outcomes")
      params.append("outcome", selectedOutcome);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (searchTerm) params.append("search", searchTerm);
    return params.toString();
  }, [
    selectedRep,
    selectedDM,
    selectedOutcome,
    startDate,
    endDate,
    searchTerm,
  ]);

  // Fetch call logs with filters
  const {
    data: callLogs = [],
    isLoading: loadingCalls,
    refetch: refetchCalls,
  } = useQuery({
    queryKey: ["/api/company-calls", queryParams],
    queryFn: () => apiRequest(`/api/company-calls?${queryParams}`),
    retry: false,
  });

  // Fetch call analytics
  const { data: analytics = {}, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["/api/company-calls/analytics"],
    retry: false,
  });

  // Flag call mutation
  const flagCallMutation = useMutation({
    mutationFn: async ({ callId, reason, severity }) => {
      return await apiRequest(`/api/company-calls/${callId}/flag`, {
        method: "POST",
        body: JSON.stringify({ reason, severity }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Call flagged for review successfully",
      });
      setIsFlagDialogOpen(false);
      setFlagReason("");
      setSelectedCall(null);
      refetchCalls();
      queryClient.invalidateQueries({ queryKey: ["/api/company-calls"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to flag call",
        variant: "destructive",
      });
    },
  });

  // Sort call logs
  const sortedCalls = useMemo(() => {
    if (!callLogs.length) return [];

    return [...callLogs].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "scheduledAt" || sortField === "completedAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortField === "feedback.rating") {
        aValue = a.feedback?.rating || 0;
        bValue = b.feedback?.rating || 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [callLogs, sortField, sortDirection]);

  // Get unique values for filters
  const uniqueReps = useMemo(() => {
    const reps = new Set();
    callLogs.forEach((call) => {
      if (call.repDetails?.name) reps.add(call.repDetails.name);
    });
    return Array.from(reps).sort();
  }, [callLogs]);

  const uniqueDMs = useMemo(() => {
    const dms = new Set();
    callLogs.forEach((call) => {
      if (call.dmDetails?.name) dms.add(call.dmDetails.name);
    });
    return Array.from(dms).sort();
  }, [callLogs]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleFlagCall = () => {
    if (!selectedCall || !flagReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for flagging",
        variant: "destructive",
      });
      return;
    }
    flagCallMutation.mutate({
      callId: selectedCall.id,
      reason: flagReason,
      severity: flagSeverity,
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRep("all_reps");
    setSelectedDM("all_dms");
    setSelectedOutcome("all_outcomes");
    setStartDate("");
    setEndDate("");
  };

  const getOutcomeBadge = (status, flagged) => {
    if (flagged) {
      return (
        <Badge variant="destructive">
          <Flag className="mr-1 h-3 w-3" />
          Flagged
        </Badge>
      );
    }

    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Missed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline">
            <Calendar className="mr-1 h-3 w-3" />
            Scheduled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRatingStars = (rating) => {
    if (!rating) return <span className="text-gray-400">No rating</span>;

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      </div>
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loadingCalls || loadingAnalytics) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading call activity...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold">
                  {analytics.totalCalls || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">
                  {analytics.completedCalls || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Missed</p>
                <p className="text-2xl font-bold">
                  {analytics.missedCalls || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {analytics.averageRating
                    ? analytics.averageRating.toFixed(1)
                    : "0.0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="text-blue-600 mr-3" size={20} />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search calls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sales Rep</Label>
              <Select value={selectedRep} onValueChange={setSelectedRep}>
                <SelectTrigger>
                  <SelectValue placeholder="All reps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_reps">All reps</SelectItem>
                  {uniqueReps.map((rep) => (
                    <SelectItem key={rep} value={rep}>
                      {rep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Decision Maker</Label>
              <Select value={selectedDM} onValueChange={setSelectedDM}>
                <SelectTrigger>
                  <SelectValue placeholder="All DMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_dms">All DMs</SelectItem>
                  {uniqueDMs.map((dm) => (
                    <SelectItem key={dm} value={dm}>
                      {dm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select
                value={selectedOutcome}
                onValueChange={setSelectedOutcome}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_outcomes">All outcomes</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <div className="text-sm text-gray-600">
              Showing {sortedCalls.length} of {analytics.totalCalls || 0} calls
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="text-blue-600 mr-3" size={24} />
            Call Activity Log
          </CardTitle>
          <CardDescription>
            Monitor all call activities with detailed outcomes and feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedCalls.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("repToDM")}
                    >
                      <div className="flex items-center">
                        Rep ↔ DM
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("scheduledAt")}
                    >
                      <div className="flex items-center">
                        Date/Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("feedback.rating")}
                    >
                      <div className="flex items-center">
                        Rating
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Feedback Summary</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCalls.map((call) => {
                    const dateTime = formatDateTime(call.scheduledAt);
                    return (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="font-medium">{call.repToDM}</div>
                            <div className="text-xs text-gray-500">
                              <div>{call.repDetails.email}</div>
                              <div>{call.dmDetails.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{dateTime.date}</div>
                            <div className="text-sm text-gray-500">
                              {dateTime.time}
                            </div>
                            {call.completedAt && (
                              <div className="text-xs text-green-600">
                                Completed:{" "}
                                {formatDateTime(call.completedAt).time}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getOutcomeBadge(call.status, call.flagged)}
                          {call.flagged && call.flagReason && (
                            <div className="text-xs text-red-600 mt-1">
                              {call.flagReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getRatingStars(call.feedback?.rating)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div
                              className="text-sm truncate"
                              title={call.feedback?.summary}
                            >
                              {call.feedback?.summary || "No feedback provided"}
                            </div>
                            {call.feedback?.nextSteps && (
                              <div className="text-xs text-blue-600 mt-1">
                                Next: {call.feedback.nextSteps}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDuration(call.duration)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!call.flagged && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedCall(call);
                                    setIsFlagDialogOpen(true);
                                  }}
                                >
                                  <Flag className="mr-2 h-4 w-4" />
                                  Flag for Review
                                </DropdownMenuItem>
                              )}
                              {call.meetingUrl && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(call.meetingUrl, "_blank")
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Join Meeting
                                </DropdownMenuItem>
                              )}
                              {call.recordingUrl && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(call.recordingUrl, "_blank")
                                  }
                                >
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  View Recording
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Phone className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No call activity
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Call activity will appear here when your team starts scheduling
                meetings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag Call Dialog */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Call for Review</DialogTitle>
            <DialogDescription>
              Report issues with this call between {selectedCall?.repToDM}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flagReason">Reason for Flag *</Label>
              <Input
                id="flagReason"
                placeholder="e.g., Inappropriate behavior, technical issues, quality concerns..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flagSeverity">Severity</Label>
              <Select value={flagSeverity} onValueChange={setFlagSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFlagDialogOpen(false);
                setFlagReason("");
                setSelectedCall(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlagCall}
              disabled={flagCallMutation.isPending}
              variant="destructive"
            >
              {flagCallMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Flagging...
                </>
              ) : (
                "Flag Call"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
