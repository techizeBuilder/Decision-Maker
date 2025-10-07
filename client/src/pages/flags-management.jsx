import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Flag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FlagsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlag, setNewFlag] = useState({
    dmId: "",
    reason: "",
    description: "",
    priority: "medium",
    flagType: "behavior",
  });

  // Fetch flags based on user role
  const { data: flags = [], isLoading: flagsLoading } = useQuery({
    queryKey: ["/api/flags", user?.role],
    enabled: !!user?.id,
  });

  // Fetch available decision makers for flagging
  const { data: availableDMs = [] } = useQuery({
    queryKey: ["/api/calendar/available-dms"],
    enabled: !!user?.id && user?.role === "sales_rep",
  });

  // Create flag mutation
  const createFlagMutation = useMutation({
    mutationFn: async (flagData) => {
      return await apiRequest("POST", "/api/flags", {
        method: "POST",
        body: JSON.stringify(flagData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/flags-count"] });
      setShowCreateDialog(false);
      setNewFlag({
        dmId: "",
        reason: "",
        description: "",
        priority: "medium",
        flagType: "behavior",
      });
      toast({
        title: "Flag Created",
        description: "The flag has been successfully submitted for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create flag",
        variant: "destructive",
      });
    },
  });

  // Update flag status mutation
  const updateFlagMutation = useMutation({
    mutationFn: async ({ flagId, status, resolution }) => {
      return await apiRequest("PUT", `/api/flags/${flagId}`, {
        method: "PUT",
        body: JSON.stringify({ status, resolution }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/flags-count"] });
      setSelectedFlag(null);
      toast({
        title: "Flag Updated",
        description: "The flag status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update flag",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      flag.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || flag.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (flagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Flag className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Flags Management
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor and manage system flags
              </p>
            </div>
            
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                placeholder="Search flags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Flags List */}
        <div className="grid gap-4">
          {filteredFlags.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No flags found
                </h3>
                <p className="text-gray-600">
                  {flags.length === 0
                    ? "No flags have been created yet."
                    : "No flags match your current filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFlags.map((flag) => (
              <Card key={flag.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={getStatusColor(flag.status)}>
                          {flag.status === "open" && (
                            <AlertTriangle className="mr-1" size={12} />
                          )}
                          {flag.status === "pending" && (
                            <Clock className="mr-1" size={12} />
                          )}
                          {flag.status === "resolved" && (
                            <CheckCircle className="mr-1" size={12} />
                          )}
                          {flag.status
                            ? flag.status.charAt(0).toUpperCase() +
                              flag.status.slice(1)
                            : "Unknown"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getPriorityColor(
                            flag.priority || "medium",
                          )}
                        >
                          {flag.priority
                            ? flag.priority.charAt(0).toUpperCase() +
                              flag.priority.slice(1)
                            : "Medium"}{" "}
                          Priority
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(flag.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {flag.reason
                          ? flag.reason
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())
                          : "No reason provided"}
                      </h3>
                      <p className="text-gray-600 mb-3">{flag.description}</p>
                      <div className="text-sm text-gray-500">
                        <p>
                          Flagged by: {flag.flaggedByRole?.replace("_", " ")} •
                          Target: Decision Maker
                        </p>
                        {flag.resolvedAt && (
                          <p>
                            Resolved:{" "}
                            {new Date(flag.resolvedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFlag(flag)}
                      >
                        <Eye className="mr-1" size={14} />
                        View
                      </Button>
                      {(user?.role === "enterprise_admin" ||
                        user?.role === "super_admin") &&
                        flag.status !== "resolved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateFlagMutation.mutate({
                                flagId: flag.id,
                                status: "resolved",
                                resolution: "Resolved by admin",
                              })
                            }
                          >
                            <CheckCircle className="mr-1" size={14} />
                            Resolve
                          </Button>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Flag Details Dialog */}
        {selectedFlag && (
          <Dialog
            open={!!selectedFlag}
            onOpenChange={() => setSelectedFlag(null)}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Flag Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge
                    className={getStatusColor(selectedFlag.status || "open")}
                  >
                    {selectedFlag.status
                      ? selectedFlag.status.charAt(0).toUpperCase() +
                        selectedFlag.status.slice(1)
                      : "Unknown"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getPriorityColor(
                      selectedFlag.priority || "medium",
                    )}
                  >
                    {selectedFlag.priority
                      ? selectedFlag.priority.charAt(0).toUpperCase() +
                        selectedFlag.priority.slice(1)
                      : "Medium"}{" "}
                    Priority
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Reason
                  </Label>
                  <p className="text-gray-900">
                    {selectedFlag.reason
                      ? selectedFlag.reason
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      : "No reason provided"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <p className="text-gray-900">{selectedFlag.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Reported
                  </Label>
                  <p className="text-gray-900">
                    {new Date(selectedFlag.reportedAt).toLocaleString()}
                  </p>
                </div>
                {selectedFlag.resolution && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Resolution
                    </Label>
                    <p className="text-gray-900">{selectedFlag.resolution}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedFlag(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
