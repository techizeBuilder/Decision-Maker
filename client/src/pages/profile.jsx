import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Building,
  MapPin,
  Phone,
  Calendar,
  Edit3,
  Save,
  X,
  Shield,
  Award,
  Settings,
  Camera,
  Linkedin,
  Globe,
  Briefcase,
  Users,
  TrendingUp,
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch current user profile
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/current-user"],
    enabled: !!user,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["/api/sales-rep/profile-stats"],
    enabled: !!user && user.role === "sales_rep",
  });

  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        company: profile.company || "",
        jobTitle: profile.jobTitle || "",
        industry: profile.industry || "",
        companySize: profile.companySize || "",
        yearsInRole: profile.yearsInRole || "",
        location: profile.location || "",
        bio: profile.bio || "",
        linkedinUrl: profile.linkedinUrl || "",
        website: profile.website || "",
        specialties: profile.specialties || "",
        timezone: profile.timezone || "",
      });
    }
  }, [profile, isEditing]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Updating profile with data:", data);
      const token = localStorage.getItem("token");
      console.log(
        "Token from localStorage:",
        token ? "Token exists" : "No token found",
      );

      const response = await apiRequest("/api/current-user", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      return response;
    },
    onSuccess: (data) => {
      console.log("Profile update successful:", data);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/current-user"] });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        company: profile.company || "",
        jobTitle: profile.jobTitle || "",
        industry: profile.industry || "",
        companySize: profile.companySize || "",
        yearsInRole: profile.yearsInRole || "",
        location: profile.location || "",
        bio: profile.bio || "",
        linkedinUrl: profile.linkedinUrl || "",
        website: profile.website || "",
        specialties: profile.specialties || "",
        timezone: profile.timezone || "",
      });
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600">
                Error loading profile: {error.message}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600 mt-1">
                Manage your account information and preferences
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Edit3 className="mr-2" size={16} />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="mr-2" size={16} />
                    {updateProfileMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    <X className="mr-2" size={16} />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 text-blue-600" size={20} />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      {isEditing ? (
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          placeholder="Enter first name"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 font-medium">
                          {profile?.firstName || "Not provided"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      {isEditing ? (
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          placeholder="Enter last name"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 font-medium">
                          {profile?.lastName || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center mt-1">
                      <Mail className="mr-2 text-gray-400" size={16} />
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          placeholder="Enter email address"
                          className="flex-1"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {profile?.email || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center mt-1">
                      <Phone className="mr-2 text-gray-400" size={16} />
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          placeholder="Enter phone number"
                          className="flex-1"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {profile?.phone || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="flex items-center mt-1">
                      <MapPin className="mr-2 text-gray-400" size={16} />
                      {isEditing ? (
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) =>
                            handleInputChange("location", e.target.value)
                          }
                          placeholder="Enter your location"
                          className="flex-1"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {profile?.location || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          handleInputChange("bio", e.target.value)
                        }
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                    ) : (
                      <p className="mt-1 text-gray-700">
                        {profile?.bio || "No bio provided"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="mr-2 text-blue-600" size={20} />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <div className="flex items-center mt-1">
                        <Building className="mr-2 text-gray-400" size={16} />
                        {isEditing ? (
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) =>
                              handleInputChange("company", e.target.value)
                            }
                            placeholder="Enter company name"
                            className="flex-1"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">
                            {profile?.company || "Not provided"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="jobTitle">Job Title</Label>
                      {isEditing ? (
                        <Input
                          id="jobTitle"
                          value={formData.jobTitle}
                          onChange={(e) =>
                            handleInputChange("jobTitle", e.target.value)
                          }
                          placeholder="Enter job title"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 font-medium">
                          {profile?.jobTitle || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      {isEditing ? (
                        <Select
                          value={formData.industry}
                          onValueChange={(value) =>
                            handleInputChange("industry", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">
                              Technology
                            </SelectItem>
                            <SelectItem value="healthcare">
                              Healthcare
                            </SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="manufacturing">
                              Manufacturing
                            </SelectItem>
                            <SelectItem value="consulting">
                              Consulting
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1 text-gray-900 font-medium capitalize">
                          {profile?.industry || "Not provided"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="companySize">Company Size</Label>
                      {isEditing ? (
                        <Select
                          value={formData.companySize}
                          onValueChange={(value) =>
                            handleInputChange("companySize", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">
                              11-50 employees
                            </SelectItem>
                            <SelectItem value="51-200">
                              51-200 employees
                            </SelectItem>
                            <SelectItem value="201-500">
                              201-500 employees
                            </SelectItem>
                            <SelectItem value="501-1000">
                              501-1000 employees
                            </SelectItem>
                            <SelectItem value="1000+">
                              1000+ employees
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1 text-gray-900 font-medium">
                          {profile?.companySize || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="yearsInRole">Years in Current Role</Label>
                    {isEditing ? (
                      <Select
                        value={formData.yearsInRole}
                        onValueChange={(value) =>
                          handleInputChange("yearsInRole", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="less-than-1">
                            Less than 1 year
                          </SelectItem>
                          <SelectItem value="1-2">1-2 years</SelectItem>
                          <SelectItem value="3-5">3-5 years</SelectItem>
                          <SelectItem value="6-10">6-10 years</SelectItem>
                          <SelectItem value="more-than-10">
                            More than 10 years
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 text-gray-900 font-medium">
                        {profile?.yearsInRole || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="specialties">Specialties</Label>
                    {isEditing ? (
                      <Textarea
                        id="specialties"
                        value={formData.specialties}
                        onChange={(e) =>
                          handleInputChange("specialties", e.target.value)
                        }
                        placeholder="Enter your areas of expertise"
                        rows={2}
                      />
                    ) : (
                      <p className="mt-1 text-gray-700">
                        {profile?.specialties || "No specialties listed"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="mr-2 text-blue-600" size={20} />
                    Social Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                    <div className="flex items-center mt-1">
                      <Linkedin className="mr-2 text-gray-400" size={16} />
                      {isEditing ? (
                        <Input
                          id="linkedinUrl"
                          value={formData.linkedinUrl}
                          onChange={(e) =>
                            handleInputChange("linkedinUrl", e.target.value)
                          }
                          placeholder="https://linkedin.com/in/username"
                          className="flex-1"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {profile?.linkedinUrl || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <div className="flex items-center mt-1">
                      <Globe className="mr-2 text-gray-400" size={16} />
                      {isEditing ? (
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) =>
                            handleInputChange("website", e.target.value)
                          }
                          placeholder="https://yourwebsite.com"
                          className="flex-1"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {profile?.website || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 text-blue-600" size={20} />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {profile?.firstName} {profile?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{profile?.jobTitle}</p>
                    <Badge className="mt-2 bg-green-100 text-green-800 capitalize">
                      {profile?.role?.replace("_", " ")}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Member since:</span>
                      <span className="font-medium">
                        {profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Package:</span>
                      <Badge variant="outline" className="capitalize">
                        {profile?.packageType || "Standard"}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {profile?.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats (for sales reps) */}
              {user?.role === "sales_rep" && stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 text-blue-600" size={20} />
                      Performance Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.totalCalls || 0}
                        </p>
                        <p className="text-xs text-gray-600">Total Calls</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {stats.successRate || 0}%
                        </p>
                        <p className="text-xs text-gray-600">Success Rate</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Credits Used:</span>
                        <span className="font-medium">
                          {stats.creditsUsed || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">DMs Invited:</span>
                        <span className="font-medium">
                          {stats.dmsInvited || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Meetings Booked:</span>
                        <span className="font-medium">
                          {stats.meetingsBooked || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 text-blue-600" size={20} />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => (window.location.href = "/sales-dashboard")}
                  >
                    <Users className="mr-2" size={16} />
                    Back to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => (window.location.href = "/analytics")}
                  >
                    <TrendingUp className="mr-2" size={16} />
                    View Analytics
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => (window.location.href = "/calendar")}
                  >
                    <Calendar className="mr-2" size={16} />
                    Schedule Meetings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
