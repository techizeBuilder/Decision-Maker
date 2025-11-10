import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { salesRepInvitesSchema, DECISION_MAKER_ALLOWED_TITLES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function InviteDecisionMakers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [decisionMakers, setDecisionMakers] = useState([
    { firstName: "", lastName: "", jobTitle: "", customJobTitle: "", email: "" },
  ]);
  
  // Email validation states for each decision maker
  const [emailValidationStates, setEmailValidationStates] = useState([
    { isValidating: false, isValid: false, error: "" }
  ]);

  // Email validation function
  const validateEmail = useCallback(async (email, index, userEmail) => {
    if (!email || email.length < 3) {
      setEmailValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { isValidating: false, isValid: false, error: "" };
        return newStates;
      });
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { isValidating: false, isValid: false, error: "Invalid email format" };
        return newStates;
      });
      return;
    }

    // Domain matching validation - Decision makers must use same domain as sales rep
    if (userEmail) {
      const salesRepDomain = userEmail.split('@')[1];
      const dmDomain = email.split('@')[1];
      
      if (dmDomain !== salesRepDomain) {
        setEmailValidationStates(prev => {
          const newStates = [...prev];
          newStates[index] = { 
            isValidating: false, 
            isValid: false, 
            error: `Email must use the same domain as your email (@${salesRepDomain})` 
          };
          return newStates;
        });
        return;
      }
    }

    // Mark as valid if all checks pass
    setEmailValidationStates(prev => {
      const newStates = [...prev];
      newStates[index] = { isValidating: false, isValid: true, error: "" };
      return newStates;
    });
  }, []);

  // Debounced email validation
  const debouncedEmailValidation = useCallback((email, index) => {
    setEmailValidationStates(prev => {
      const newStates = [...prev];
      newStates[index] = { isValidating: true, isValid: false, error: "" };
      return newStates;
    });

    const timeoutId = setTimeout(() => {
      validateEmail(email, index, packageLimits?.userEmail);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [validateEmail]);

  // Fetch user's package limits
  const {
    data: packageLimits,
    isLoading: limitsLoading,
    error: limitsError,
  } = useQuery({
    queryKey: ["/api/user-package-limits"],
    queryFn: async () => {
      // Get userId from sessionStorage for VPS compatibility
      const userId = sessionStorage.getItem("signupUserId");
      console.log("🚀 PACKAGE LIMITS - Using userId from sessionStorage:", userId);
      
      const url = userId 
        ? `/api/user-package-limits?userId=${encodeURIComponent(userId)}`
        : `/api/user-package-limits`;
      
      console.log("🚀 PACKAGE LIMITS - Request URL:", url);
      
      return apiRequest(url);
    },
    retry: 1,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  const form = useForm({
    resolver: zodResolver(salesRepInvitesSchema),
    defaultValues: {
      decisionMakers: [{ firstName: "", lastName: "", jobTitle: "", customJobTitle: "", email: "" }],
    },
  });

  const saveInvitesMutation = useMutation({
    mutationFn: async (data) => {
      console.log("🚀 INVITES START - Submitting invites data:", data);
      
      // Get userId from sessionStorage for VPS compatibility
      const userId = sessionStorage.getItem("signupUserId");
      console.log("🚀 INVITES - Using userId from sessionStorage:", userId);
      
      const requestData = {
        ...data,
        userId: userId // Include userId in request for VPS compatibility
      };
      
      const response = await apiRequest("/api/sales-rep/invites", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("Invites saved successfully:", data);
      toast({
        title: "Registration Complete!",
        description:
          data.message ||
          "Registration completed successfully! Invitations sent.",
      });
      // Redirect to dashboard or thank you page
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    },
    onError: (error) => {
      console.error("Invites save error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
      });

      // Handle session expired error specifically
      if (error.message && error.message.includes("Session expired")) {
        toast({
          title: "Session Expired",
          description:
            "Your session has expired. Please refresh the page to continue.",
          variant: "destructive",
        });
        // Show refresh suggestion
        setTimeout(() => {
          if (
            confirm(
              "Your registration is almost complete! Click OK to refresh the page and continue.",
            )
          ) {
            window.location.reload();
          }
        }, 2000);
      } else if (error.message && error.message.includes("Unexpected token")) {
        // Handle JSON parsing errors
        toast({
          title: "Connection Error",
          description:
            "There was a network issue. Please refresh the page and try again.",
          variant: "destructive",
        });
        setTimeout(() => {
          if (
            confirm("Please refresh the page to continue your registration.")
          ) {
            window.location.reload();
          }
        }, 2000);
      } else {
        toast({
          title: "Save Failed",
          description:
            error.message || "Failed to save invitations. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data) => {
    // Filter out empty entries
    const validDecisionMakers = data.decisionMakers.filter(
      (dm) => dm.firstName || dm.lastName || dm.jobTitle || dm.email,
    );

    // Check if any emails have validation errors
    const hasEmailErrors = validDecisionMakers.some((dm, index) => {
      if (!dm.email) return false;
      return emailValidationStates[index]?.error || !emailValidationStates[index]?.isValid;
    });

    if (hasEmailErrors) {
      toast({
        title: "Email Validation Error",
        description: "Please fix all email validation errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Validate email domains if user email is available
    if (packageLimits?.userEmail) {
      const salesRepDomain = packageLimits.userEmail.split('@')[1];
      const invalidDomains = validDecisionMakers.filter(dm => {
        if (!dm.email) return false;
        const dmDomain = dm.email.split('@')[1];
        return dmDomain !== salesRepDomain;
      });

      if (invalidDomains.length > 0) {
        toast({
          title: "Email Domain Mismatch",
          description: `Decision maker emails must use the same domain as your email (@${salesRepDomain}).`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate against plan limits
    const maxInvitations = packageLimits?.maxInvitations || 3;
    if (validDecisionMakers.length > maxInvitations) {
      toast({
        title: "Invitation Limit Exceeded",
        description: `Your ${packageLimits?.planName || "Free"} plan allows up to ${maxInvitations} invitations only.`,
        variant: "destructive",
      });
      return;
    }

    saveInvitesMutation.mutate({ decisionMakers: validDecisionMakers });
  };

  const addDecisionMaker = () => {
    // Use dynamic limit from user's package
    const maxInvitations = packageLimits?.maxInvitations || 3;
    if (decisionMakers.length < maxInvitations) {
      const newDecisionMakers = [...decisionMakers, { firstName: "", lastName: "", jobTitle: "", customJobTitle: "", email: "" }];
      setDecisionMakers(newDecisionMakers);
      form.setValue("decisionMakers", newDecisionMakers);
      
      // Add new email validation state
      setEmailValidationStates(prev => [
        ...prev,
        { isValidating: false, isValid: false, error: "" }
      ]);
    }
  };

  const removeDecisionMaker = (index) => {
    if (decisionMakers.length > 1) {
      const newDecisionMakers = decisionMakers.filter((_, i) => i !== index);
      setDecisionMakers(newDecisionMakers);
      form.setValue("decisionMakers", newDecisionMakers);
      
      // Remove corresponding email validation state
      setEmailValidationStates(prev => prev.filter((_, i) => i !== index));
    }
  };

  const skipStep = () => {
    // Submit empty invites to complete registration
    saveInvitesMutation.mutate({ decisionMakers: [] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-20 sm:pt-24 lg:pt-20">
        {/* Progress Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              Step 4 of 4
            </span>
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              100% Complete
            </span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {limitsLoading ? (
              <div className="text-center mb-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">
                  Loading your plan information...
                </p>
              </div>
            ) : limitsError ? (
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Invite Decision Makers
                </h1>
                <p className="text-gray-600">
                  Add up to 3 decision makers you'd like to connect with
                  (optional)
                </p>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    {decisionMakers.length} of 3 decision makers added
                  </span>
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Default Limits
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Invite Decision Makers
                </h1>
                <p className="text-gray-600">
                  Add up to {packageLimits?.maxInvitations || 3} decision makers
                  you'd like to connect with (optional)
                </p>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    {decisionMakers.length} of{" "}
                    {packageLimits?.maxInvitations || 3} decision makers added
                  </span>
                  {packageLimits?.planName && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {packageLimits.planName} Plan
                    </span>
                  )}
                </div>
                {packageLimits?.maxCallCredits && (
                  <div className="mt-1">
                    <span className="text-xs text-gray-400">
                      Monthly Credits: {packageLimits.maxCallCredits}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {decisionMakers.map((_, index) => (
                  <div key={index} className="space-y-4 border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`decisionMakers.${index}.firstName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                First Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="John"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const newDecisionMakers = [...decisionMakers];
                                    newDecisionMakers[index].firstName =
                                      e.target.value;
                                    setDecisionMakers(newDecisionMakers);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`decisionMakers.${index}.lastName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Last Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Doe"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const newDecisionMakers = [...decisionMakers];
                                    newDecisionMakers[index].lastName =
                                      e.target.value;
                                    setDecisionMakers(newDecisionMakers);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`decisionMakers.${index}.jobTitle`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Job Title
                              </FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const newDecisionMakers = [...decisionMakers];
                                    newDecisionMakers[index].jobTitle = value;
                                    // Clear custom job title if not "Other"
                                    if (value !== "Other") {
                                      newDecisionMakers[index].customJobTitle = "";
                                    }
                                    setDecisionMakers(newDecisionMakers);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select job title" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DECISION_MAKER_ALLOWED_TITLES.map((title) => (
                                      <SelectItem key={title} value={title}>
                                        {title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`decisionMakers.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Email {packageLimits?.userEmail && (
                                  <span className="text-xs text-gray-500">
                                    (must be @{packageLimits.userEmail.split('@')[1]})
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="email"
                                    placeholder={`john.doe@${packageLimits?.userEmail?.split('@')[1] || 'company.com'}`}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      const newDecisionMakers = [...decisionMakers];
                                      newDecisionMakers[index].email = e.target.value;
                                      setDecisionMakers(newDecisionMakers);
                                      
                                      // Trigger real-time email validation
                                      debouncedEmailValidation(e.target.value, index);
                                    }}
                                    className={`pr-8 ${
                                      emailValidationStates[index]?.error 
                                        ? 'border-red-500 focus:border-red-500' 
                                        : 
                                        // emailValidationStates[index]?.isValid 
                                        // ? 'border-green-500 focus:border-green-500' 
                                        // : 
                                        ''
                                    }`}
                                  />
                                  {/* Validation status icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    {emailValidationStates[index]?.isValidating && (
                                      <Clock className="h-4 w-4 text-gray-400 animate-pulse" />
                                    )}
                                    {/* {!emailValidationStates[index]?.isValidating && emailValidationStates[index]?.isValid && (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    )} */}
                                    {!emailValidationStates[index]?.isValidating && emailValidationStates[index]?.error && (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              </FormControl>
                              {emailValidationStates[index]?.error && (
                                <p className="text-sm text-red-600 mt-1">
                                  {emailValidationStates[index].error}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Custom Job Title Field - only show if "Other" is selected */}
                    {decisionMakers[index]?.jobTitle === "Other" && (
                      <div>
                        <FormField
                          control={form.control}
                          name={`decisionMakers.${index}.customJobTitle`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Custom Job Title
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Innovation Evangelist"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const newDecisionMakers = [...decisionMakers];
                                    newDecisionMakers[index].customJobTitle =
                                      e.target.value;
                                    setDecisionMakers(newDecisionMakers);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-amber-600 mt-1">
                                A super admin must approve this custom title before the account is fully active.
                              </p>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {decisionMakers.length > 1 && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDecisionMaker(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addDecisionMaker}
                  disabled={
                    decisionMakers.length >=
                    (packageLimits?.maxInvitations || 3)
                  }
                  className="w-full flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {decisionMakers.length >= (packageLimits?.maxInvitations || 3)
                    ? `Maximum ${packageLimits?.maxInvitations || 3} Decision Makers Reached`
                    : "Add Another Decision Maker"}
                </Button>

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLocation("/signup/sales-rep/professional-info")
                    }
                    className="flex items-center gap-2 order-3 sm:order-1 w-full sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>

                  <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={skipStep}
                      className="text-gray-600 w-full sm:w-auto"
                    >
                      Skip for now
                    </Button>

                    <Button
                      type="submit"
                      disabled={saveInvitesMutation.isPending}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-purple-700 w-full sm:w-auto h-11"
                    >
                      {saveInvitesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Complete Registration
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
