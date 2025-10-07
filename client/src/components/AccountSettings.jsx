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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  User,
  CreditCard,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  Shield,
  HelpCircle,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  Activity,
  DollarSign,
} from "lucide-react";

export default function AccountSettings() {
  const { toast } = useToast();
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
    priority: "medium",
    category: "general",
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Fetch company settings
  const {
    data: settings = {},
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/company-settings"],
    retry: false,
  });

  const { company = {}, plan = {}, usage = {}, support = {} } = settings;

  // Access billing portal mutation
  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/billing-portal-link");
      return response;
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast({
        title: "Billing Portal Opened",
        description:
          "You've been redirected to manage your billing information",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to access billing portal",
        variant: "destructive",
      });
    },
  });

  // Submit support ticket mutation
  const supportMutation = useMutation({
    mutationFn: async (ticketData) => {
      return await apiRequest("/api/contact-support", {
        method: "POST",
        body: JSON.stringify(ticketData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Support Ticket Submitted",
        description: `Ticket ${data.ticket.id} created. Expected response: ${data.ticket.estimatedResponse}`,
      });
      setIsSupportDialogOpen(false);
      setSupportForm({
        subject: "",
        message: "",
        priority: "medium",
        category: "general",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit support ticket",
        variant: "destructive",
      });
    },
  });

  const handleAccessBilling = () => {
    billingPortalMutation.mutate();
  };

  const handleSupportSubmit = () => {
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    supportMutation.mutate(supportForm);
  };

  const getPlanStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "trial":
        return (
          <Badge variant="secondary">
            <AlertCircle className="mr-1 h-3 w-3" />
            Trial
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading account settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="text-blue-600 mr-3" size={28} />
          Account Settings & Support
        </h2>
        <p className="text-gray-600 mt-1">
          Manage your company information, billing, and get support
        </p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="text-blue-600 mr-3" size={20} />
            Company Information
          </CardTitle>
          <CardDescription>
            Your company details and verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Company Name
                </Label>
                <div className="mt-1 text-lg font-semibold">{company.name}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Verified Domain
                </Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                  <span className="text-sm text-gray-700">
                    {company.verifiedDomain}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Team Size
                </Label>
                <div className="mt-1 text-sm text-gray-700">
                  {company.totalUsers} total users ({company.salesReps} sales
                  reps, {company.decisionMakers} decision makers)
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Admin Contact
                </Label>
                <div className="mt-1 space-y-1">
                  <div className="font-medium">
                    {company.adminContact?.name}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {company.adminContact?.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    Joined {formatDate(company.adminContact?.joinedDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="text-blue-600 mr-3" size={20} />
            Subscription Plan
          </CardTitle>
          <CardDescription>
            Your current plan details and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">{plan.type}</h4>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(plan.pricing?.basePrice)} /{" "}
                    {plan.billingCycle}
                  </p>
                </div>
                {getPlanStatusBadge(plan.status)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current Period:</span>
                  <span>
                    {formatDate(plan.currentPeriodStart)} -{" "}
                    {formatDate(plan.currentPeriodEnd)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Next Renewal:</span>
                  <span className="font-medium">
                    {formatDate(plan.renewalDate)}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleAccessBilling}
                  disabled={billingPortalMutation.isPending}
                  className="w-full"
                >
                  {billingPortalMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Billing
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Plan Features */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-900">Plan Features</h5>
              <div className="space-y-2">
                {plan.features?.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <h6 className="font-medium text-gray-900 mb-2">Plan Limits</h6>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    Monthly Call Credits: {plan.limits?.monthlyCallCredits}
                  </div>
                  <div>DM Referrals: {plan.limits?.dmReferrals}</div>
                  <div>Support Level: {plan.limits?.supportLevel}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="text-blue-600 mr-3" size={20} />
              Current Month Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Calls Made</span>
                <span className="font-medium">
                  {usage.currentMonth?.calls || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">DMs Referred</span>
                <span className="font-medium">
                  {usage.currentMonth?.dmsReferred || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Credits Used</span>
                <span className="font-medium">
                  {usage.currentMonth?.creditUsage || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Credits Remaining</span>
                <span className="font-medium text-green-600">
                  {usage.currentMonth?.remainingCredits || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="text-blue-600 mr-3" size={20} />
              Recent Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usage.billingHistory?.slice(0, 3).map((bill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {bill.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(bill.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(bill.amount)}
                    </div>
                    <Badge
                      variant={bill.status === "paid" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {bill.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support & Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HelpCircle className="text-blue-600 mr-3" size={20} />
            Support & Help
          </CardTitle>
          <CardDescription>
            Get help with your account or contact our support team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Support Actions */}
            <div className="space-y-4">
              <Dialog
                open={isSupportDialogOpen}
                onOpenChange={setIsSupportDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Naeberly Support
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Contact Support</DialogTitle>
                    <DialogDescription>
                      Submit a support ticket and our team will get back to you
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={supportForm.priority}
                          onValueChange={(value) =>
                            setSupportForm((prev) => ({
                              ...prev,
                              priority: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={supportForm.category}
                          onValueChange={(value) =>
                            setSupportForm((prev) => ({
                              ...prev,
                              category: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="feature_request">
                              Feature Request
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={supportForm.subject}
                        onChange={(e) =>
                          setSupportForm((prev) => ({
                            ...prev,
                            subject: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Detailed description of your issue or question"
                        rows={4}
                        value={supportForm.message}
                        onChange={(e) =>
                          setSupportForm((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsSupportDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSupportSubmit}
                      disabled={supportMutation.isPending}
                    >
                      {supportMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Ticket"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(support.helpCenterUrl, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Help Center
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(support.statusPageUrl, "_blank")}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  System Status
                </Button>
              </div>
            </div>

            {/* Account Manager */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-900">
                Your Account Manager
              </h5>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h6 className="font-medium">
                      {support.accountManager?.name}
                    </h6>
                    <div className="text-sm text-gray-600 space-y-1 mt-1">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {support.accountManager?.email}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {support.accountManager?.phone}
                      </div>
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      Priority Support
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
