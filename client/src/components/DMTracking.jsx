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
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Flag,
  UserMinus,
  UserPlus,
  Star,
  TrendingUp,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function DMTracking() {
  const { toast } = useToast();
  const [selectedDM, setSelectedDM] = useState(null);
  const [isRemovalDialogOpen, setIsRemovalDialogOpen] = useState(false);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [replacementDMId, setReplacementDMId] = useState("");
  const [flagForm, setFlagForm] = useState({
    flagType: "",
    description: "",
    severity: "medium",
  });

  // Fetch company DMs
  const {
    data: companyDMs = [],
    isLoading: loadingDMs,
    refetch: refetchDMs,
  } = useQuery({
    queryKey: ["/api/company-dms"],
    retry: false,
  });

  // Remove DM mutation
  const removeDMMutation = useMutation({
    mutationFn: async ({ dmId, reason }) => {
      return await apiRequest("/api/company-dms/remove", {
        method: "POST",
        body: JSON.stringify({ dmId, reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DM removal request submitted successfully",
      });
      setIsRemovalDialogOpen(false);
      setRemovalReason("");
      setSelectedDM(null);
      refetchDMs();
      queryClient.invalidateQueries({ queryKey: ["/api/company-dms"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request DM removal",
        variant: "destructive",
      });
    },
  });

  // Replace DM mutation
  const replaceDMMutation = useMutation({
    mutationFn: async ({ originalDMId, replacementDMId }) => {
      return await apiRequest("/api/company-dms/replace", {
        method: "POST",
        body: JSON.stringify({ originalDMId, replacementDMId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DM replaced successfully",
      });
      setIsReplaceDialogOpen(false);
      setReplacementDMId("");
      setSelectedDM(null);
      refetchDMs();
      queryClient.invalidateQueries({ queryKey: ["/api/company-dms"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to replace DM",
        variant: "destructive",
      });
    },
  });

  // Flag DM mutation
  const flagDMMutation = useMutation({
    mutationFn: async (flagData) => {
      return await apiRequest("/api/company-dms/flag", {
        method: "POST",
        body: JSON.stringify(flagData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DM flagged successfully",
      });
      setIsFlagDialogOpen(false);
      setFlagForm({ flagType: "", description: "", severity: "medium" });
      setSelectedDM(null);
      refetchDMs();
      queryClient.invalidateQueries({ queryKey: ["/api/company-dms"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to flag DM",
        variant: "destructive",
      });
    },
  });

  // Update verification status mutation
  const updateVerificationMutation = useMutation({
    mutationFn: async ({ dmId, verificationStatus }) => {
      return await apiRequest(`/api/company-dms/${dmId}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ verificationStatus }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Verification status updated successfully",
      });
      refetchDMs();
      queryClient.invalidateQueries({ queryKey: ["/api/company-dms"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update verification status",
        variant: "destructive",
      });
    },
  });

  const handleRemovalRequest = () => {
    if (!selectedDM || !removalReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for removal",
        variant: "destructive",
      });
      return;
    }
    removeDMMutation.mutate({ dmId: selectedDM.dmId, reason: removalReason });
  };

  const handleReplaceDM = () => {
    if (!selectedDM || !replacementDMId) {
      toast({
        title: "Error",
        description: "Please select a replacement DM",
        variant: "destructive",
      });
      return;
    }
    replaceDMMutation.mutate({
      originalDMId: selectedDM.dmId,
      replacementDMId,
    });
  };

  const handleFlagDM = () => {
    if (!selectedDM || !flagForm.flagType || !flagForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    flagDMMutation.mutate({
      dmId: selectedDM.dmId,
      ...flagForm,
    });
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getEngagementColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loadingDMs) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading decision makers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total DMs</p>
                <p className="text-2xl font-bold">{companyDMs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold">
                  {
                    companyDMs.filter(
                      (dm) => dm.verificationStatus === "verified",
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Flag className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Flagged</p>
                <p className="text-2xl font-bold">
                  {companyDMs.filter((dm) => dm.flagCount > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Avg Engagement
                </p>
                <p className="text-2xl font-bold">
                  {companyDMs.length > 0
                    ? Math.round(
                        companyDMs.reduce(
                          (sum, dm) => sum + dm.engagementScore,
                          0,
                        ) / companyDMs.length,
                      )
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DM Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="text-blue-600 mr-3" size={24} />
            Decision Maker Tracking
          </CardTitle>
          <CardDescription>
            Manage and monitor decision makers referred by your sales team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companyDMs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Linked Rep</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyDMs.map((dm) => (
                    <TableRow key={dm.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className="font-medium">{dm.name}</div>
                            <div className="text-sm text-gray-500">
                              {dm.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              {dm.company}
                            </div>
                          </div>
                          {dm.linkedinUrl && (
                            <a
                              href={dm.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{dm.title}</TableCell>
                      <TableCell>
                        {getVerificationBadge(dm.verificationStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {dm.flagCount > 0 ? (
                            <Badge
                              variant="destructive"
                              className="flex items-center"
                            >
                              <Flag className="mr-1 h-3 w-3" />
                              {dm.flagCount}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">
                              <Shield className="mr-1 h-3 w-3" />
                              Clean
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Star
                            className={`h-4 w-4 ${getEngagementColor(dm.engagementScore)}`}
                            fill="currentColor"
                          />
                          <span
                            className={`font-medium ${getEngagementColor(dm.engagementScore)}`}
                          >
                            {dm.engagementScore}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {dm.totalInteractions} interactions
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dm.linkedRep.name}</div>
                          <div className="text-sm text-gray-500">
                            {dm.linkedRep.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(dm.referralDate)}
                        </div>
                        {dm.lastInteraction && (
                          <div className="text-xs text-gray-500">
                            Last: {formatDate(dm.lastInteraction)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                updateVerificationMutation.mutate({
                                  dmId: dm.dmId,
                                  verificationStatus:
                                    dm.verificationStatus === "verified"
                                      ? "pending"
                                      : "verified",
                                })
                              }
                            >
                              {dm.verificationStatus === "verified" ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Unverify
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Verify
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDM(dm);
                                setIsFlagDialogOpen(true);
                              }}
                            >
                              <Flag className="mr-2 h-4 w-4" />
                              Flag Issues
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDM(dm);
                                setIsRemovalDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Request Removal
                            </DropdownMenuItem>
                            {dm.verificationStatus === "suspended" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDM(dm);
                                  setIsReplaceDialogOpen(true);
                                }}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Replace DM
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No decision makers
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Decision makers will appear here when your sales reps start
                making referrals.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removal Dialog */}
      <Dialog open={isRemovalDialogOpen} onOpenChange={setIsRemovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request DM Removal</DialogTitle>
            <DialogDescription>
              Provide a reason for requesting the removal of {selectedDM?.name}.
              This action will be reviewed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Removal *</Label>
              <Input
                id="reason"
                placeholder="e.g., Inappropriate behavior, fake profile, unresponsive..."
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRemovalDialogOpen(false);
                setRemovalReason("");
                setSelectedDM(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemovalRequest}
              disabled={removeDMMutation.isPending}
            >
              {removeDMMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Requesting...
                </>
              ) : (
                "Request Removal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Dialog */}
      <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Suspended DM</DialogTitle>
            <DialogDescription>
              Replace {selectedDM?.name} with a new decision maker. Enter the ID
              of the replacement DM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="replacementId">Replacement DM ID *</Label>
              <Input
                id="replacementId"
                placeholder="Enter decision maker ID"
                value={replacementDMId}
                onChange={(e) => setReplacementDMId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReplaceDialogOpen(false);
                setReplacementDMId("");
                setSelectedDM(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplaceDM}
              disabled={replaceDMMutation.isPending}
            >
              {replaceDMMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Replacing...
                </>
              ) : (
                "Replace DM"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Decision Maker</DialogTitle>
            <DialogDescription>
              Report quality or behavior issues with {selectedDM?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flagType">Issue Type *</Label>
              <Select
                value={flagForm.flagType}
                onValueChange={(value) =>
                  setFlagForm((prev) => ({ ...prev, flagType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate_behavior">
                    Inappropriate Behavior
                  </SelectItem>
                  <SelectItem value="unresponsive">Unresponsive</SelectItem>
                  <SelectItem value="fake_profile">Fake Profile</SelectItem>
                  <SelectItem value="low_engagement">Low Engagement</SelectItem>
                  <SelectItem value="scheduling_issues">
                    Scheduling Issues
                  </SelectItem>
                  <SelectItem value="quality_concern">
                    Quality Concern
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="Describe the issue in detail..."
                value={flagForm.description}
                onChange={(e) =>
                  setFlagForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={flagForm.severity}
                onValueChange={(value) =>
                  setFlagForm((prev) => ({ ...prev, severity: value }))
                }
              >
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
                setFlagForm({
                  flagType: "",
                  description: "",
                  severity: "medium",
                });
                setSelectedDM(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlagDM}
              disabled={flagDMMutation.isPending}
              variant="destructive"
            >
              {flagDMMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Flagging...
                </>
              ) : (
                "Submit Flag"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
