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
import { Checkbox } from "@/components/ui/checkbox";
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
  Users,
  UserPlus,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Mail,
  Shield,
  Loader2,
} from "lucide-react";

export default function TeamManagement() {
  const { toast } = useToast();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    jobTitle: "",
    department: "",
    permissions: [],
  });

  // Fetch company users (sales reps)
  const {
    data: teamMembers = [],
    isLoading: loadingMembers,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["/api/company-users"],
    retry: false,
  });

  // Fetch decision makers for permissions assignment
  const { data: decisionMakers = [], isLoading: loadingDMs } = useQuery({
    queryKey: ["/api/enterprise-admin/decision-makers"],
    retry: false,
  });

  // Invite new sales rep mutation
  const inviteMutation = useMutation({
    mutationFn: async (userData) => {
      return await apiRequest("/api/company-users/invite", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales rep invited successfully",
      });
      setIsInviteDialogOpen(false);
      setInviteForm({
        email: "",
        firstName: "",
        lastName: "",
        jobTitle: "",
        department: "",
        permissions: [],
      });
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/company-users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite sales rep",
        variant: "destructive",
      });
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }) => {
      return await apiRequest(`/api/company-users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/company-users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }) => {
      return await apiRequest(`/api/company-users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/company-users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  // Remove user mutation
  const removeMutation = useMutation({
    mutationFn: async (userId) => {
      return await apiRequest(`/api/company-users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User removed successfully",
      });
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/company-users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  const handleStatusToggle = (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    updateStatusMutation.mutate({ userId, status: newStatus });
  };

  const handlePermissionsUpdate = (userId, permissions) => {
    updatePermissionsMutation.mutate({ userId, permissions });
  };

  const handleRemoveUser = (userId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this user? This action cannot be undone.",
      )
    ) {
      removeMutation.mutate(userId);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Suspended
          </Badge>
        );
      case "invited":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Invited
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingMembers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading team members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="text-blue-600 mr-3" size={24} />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage your internal sales representatives and their permissions
              </CardDescription>
            </div>
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Sales Rep
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleInviteSubmit}>
                  <DialogHeader>
                    <DialogTitle>Invite New Sales Representative</DialogTitle>
                    <DialogDescription>
                      Add a new sales rep to your team. They must use a
                      techize.com email address.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={inviteForm.firstName}
                          onChange={(e) =>
                            setInviteForm((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={inviteForm.lastName}
                          onChange={(e) =>
                            setInviteForm((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) =>
                          setInviteForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="john.doe@techize.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        value={inviteForm.jobTitle}
                        onChange={(e) =>
                          setInviteForm((prev) => ({
                            ...prev,
                            jobTitle: e.target.value,
                          }))
                        }
                        placeholder="Sales Representative"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={inviteForm.department}
                        onChange={(e) =>
                          setInviteForm((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        placeholder="Sales"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {inviteMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Inviting...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invite
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.jobTitle || "N/A"}</TableCell>
                      <TableCell>{formatDate(member.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {member.permissions?.length || 0} DMs
                          </span>
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
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusToggle(member.id, member.status)
                              }
                              disabled={updateStatusMutation.isPending}
                            >
                              {member.status === "active" ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSelectedUserId(member.id)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Manage Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveUser(member.id)}
                              disabled={removeMutation.isPending}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
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
                No team members
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by inviting your first sales representative.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Sales Rep
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Management Dialog */}
      {selectedUserId && (
        <Dialog
          open={!!selectedUserId}
          onOpenChange={() => setSelectedUserId(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Permissions</DialogTitle>
              <DialogDescription>
                Select which decision makers this sales rep can access
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {loadingDMs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin h-6 w-6" />
                  <span className="ml-2">Loading decision makers...</span>
                </div>
              ) : decisionMakers.length > 0 ? (
                <div className="space-y-3">
                  {decisionMakers.map((dm) => {
                    const member = teamMembers.find(
                      (m) => m.id === selectedUserId,
                    );
                    const hasPermission =
                      member?.permissions?.includes(dm.id) || false;

                    return (
                      <div key={dm.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`dm-${dm.id}`}
                          checked={hasPermission}
                          onCheckedChange={(checked) => {
                            const currentPermissions =
                              member?.permissions || [];
                            const newPermissions = checked
                              ? [...currentPermissions, dm.id]
                              : currentPermissions.filter((p) => p !== dm.id);
                            handlePermissionsUpdate(
                              selectedUserId,
                              newPermissions,
                            );
                          }}
                        />
                        <Label htmlFor={`dm-${dm.id}`} className="flex-1">
                          <div>
                            <div className="font-medium">
                              {dm.firstName} {dm.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {dm.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              {dm.jobTitle}
                            </div>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No decision makers found in your domain
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUserId(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
