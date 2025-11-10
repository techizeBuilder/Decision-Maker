import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Linkedin,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Clock,
} from "lucide-react";
import { salesRepPersonalInfoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function SalesRepPersonalInfo() {
  const [, setLocation] = useLocation();
  const [linkedinVerified, setLinkedinVerified] = useState(false);
  const [linkedinNameMatches, setLinkedinNameMatches] = useState(false);
  const [linkedinVerifying, setLinkedinVerifying] = useState(false);
  const [linkedinError, setLinkedinError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(salesRepPersonalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      companyDomain: "",
      linkedinUrl: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Debounced LinkedIn verification function
  const debounceDelay = 1000; // 1 second delay
  
  const verifyLinkedInUrl = useCallback(async (url) => {
    if (!url || !url.includes('linkedin.com/in/')) {
      setLinkedinVerified(false);
      setLinkedinError("");
      return;
    }

    setLinkedinVerifying(true);
    setLinkedinError("");
    
    try {
      // Get current form values for name matching
      const currentValues = form.getValues();
      
      const response = await apiRequest("/api/verify-linkedin", {
        method: "POST",
        body: JSON.stringify({ 
          linkedinUrl: url,
          firstName: currentValues.firstName,
          lastName: currentValues.lastName
        }),
      });
      
      if (response.verified) {
        setLinkedinVerified(true);
        setLinkedinNameMatches(response.nameMatches || false);
        setLinkedinError("");
        
        if (response.nameMatches) {
          toast({
            title: "LinkedIn Verified & Name Matches!",
            description: "Your LinkedIn profile has been verified and your name matches. You're automatically verified!",
          });
        }
      } else {
        setLinkedinVerified(false);
        setLinkedinNameMatches(false);
        setLinkedinError(response.message || "Invalid LinkedIn URL");
      }
    } catch (error) {
      setLinkedinVerified(false);
      setLinkedinNameMatches(false);
      setLinkedinError(error.message || "Unable to verify LinkedIn profile");
    } finally {
      setLinkedinVerifying(false);
    }
  }, [toast, form]);

  // Debounced verification effect
  useEffect(() => {
    const linkedinUrl = form.watch("linkedinUrl");
    
    const timeoutId = setTimeout(() => {
      if (linkedinUrl && linkedinUrl.trim()) {
        verifyLinkedInUrl(linkedinUrl.trim());
      } else {
        setLinkedinVerified(false);
        setLinkedinError("");
        setLinkedinVerifying(false);
      }
    }, debounceDelay);

    return () => clearTimeout(timeoutId);
  }, [form.watch("linkedinUrl"), verifyLinkedInUrl]);

  const savePersonalInfoMutation = useMutation({
    mutationFn: async (data) => {
      console.log(
        "Submitting form data:",
        data,
        "LinkedIn verified:",
        linkedinVerified,
      );
      const response = await apiRequest("/api/sales-rep/personal-info", {
        method: "POST",
        body: JSON.stringify({ ...data, linkedinVerified }),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("Sales rep personal info saved successfully:", data);
      toast({
        title: "Information Saved",
        description: "Your personal information has been saved successfully.",
      });
      
      // Store verification status and userId in session for conditional routing
      sessionStorage.setItem("needsEmailVerification", data.needsEmailVerification?.toString() || "false");
      sessionStorage.setItem("verificationStatus", data.verificationStatus || "unverified");
      sessionStorage.setItem("signupUserId", data.userId || ""); // Store userId for VPS compatibility
      sessionStorage.setItem("userEmail", data.email || form.getValues().email); // Store email for verification page
      
      if (data.needsEmailVerification) {
        // Route to email verification step
        setLocation("/signup/sales-rep/verify-email");
      } else {
        // Skip email verification and go to package selection
        setLocation("/signup/sales-rep/package");
      }
    },
    onError: (error) => {
      console.error("Form submission error:", error);
      toast({
        title: "Save Failed",
        description:
          error.message || "Failed to save information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    console.log("Form submission attempt:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("LinkedIn verified:", linkedinVerified);
    console.log("LinkedIn name matches:", linkedinNameMatches);
    console.log("Form valid:", form.formState.isValid);

    if (!linkedinVerified) {
      toast({
        title: "LinkedIn Verification Required",
        description: "Please verify your LinkedIn profile before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    // Include verification details in submission
    const submissionData = {
      ...data,
      linkedinNameMatches,
      linkedinVerified
    };
    
    savePersonalInfoMutation.mutate(submissionData);
  };

  const isFormValid =
    Object.keys(form.formState.errors).length === 0 && linkedinVerified;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-20 sm:pt-24 lg:pt-20">
        {/* Progress Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              Step 1 of 4
            </span>
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              25% Complete
            </span>
          </div>
          <Progress value={25} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Personal Information
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Let's start with your basic details and LinkedIn verification
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          First Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your first name"
                            {...field}
                            className="mt-1 h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Last Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your last name"
                            {...field}
                            className="mt-1 h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Email Address *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                          className="mt-1 h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company Domain */}
                <FormField
                  control={form.control}
                  name="companyDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Company Domain *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your company domain (e.g., company.com)"
                          {...field}
                          className="mt-1 h-11"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        This must match your email domain for verification
                      </p>
                    </FormItem>
                  )}
                />

                {/* LinkedIn Verification */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <Linkedin className="text-white" size={16} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        LinkedIn Auto-Verification
                      </h3>
                      <p className="text-sm text-gray-600">
                        We automatically verify LinkedIn profiles as you type to maintain
                        platform quality
                      </p>
                    </div>
                    {!linkedinVerifying && linkedinVerified && linkedinNameMatches && (
                      <CheckCircle className="text-green-600" size={20} />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-sm font-medium text-gray-700">
                          LinkedIn Profile URL *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="https://linkedin.com/in/yourprofile"
                              {...field}
                              className="mt-1 pr-10"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {linkedinVerifying && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              )}
                              {!linkedinVerifying && linkedinVerified && linkedinNameMatches && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {!linkedinVerifying && linkedinError && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {linkedinError && (
                          <p className="text-sm text-red-600 mt-1">{linkedinError}</p>
                        )}
                        {/* {linkedinVerifying && (
                          <p className="text-sm text-blue-600 mt-1 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Verifying LinkedIn profile...
                          </p>
                        )}
                        {!linkedinVerifying && linkedinVerified && (
                          <p className="text-sm text-green-600 mt-1 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            LinkedIn profile verified automatically
                          </p>
                        )} */}
                        {!linkedinVerifying && linkedinVerified && linkedinNameMatches && (
                          <p className="text-sm text-green-600 mt-1 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            LinkedIn profile verified automatically
                          </p>
                        )}
                        {/* {!linkedinVerifying && linkedinVerified && !linkedinNameMatches && (
                          <p className="text-sm text-blue-600 mt-1 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Work Email verification required
                          </p>
                        )} */}
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Password *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a secure password"
                              {...field}
                              className="mt-1 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Confirm Password *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              {...field}
                              className="mt-1 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Errors */}
                {Object.keys(form.formState.errors).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertCircle size={16} />
                      <span className="font-medium">
                        Please fix the following errors:
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-between items-center mt-6 sm:mt-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-gray-600 order-2 sm:order-1 w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={savePersonalInfoMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 px-8 order-1 sm:order-2 w-full sm:w-auto h-11"
          >
            {savePersonalInfoMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
