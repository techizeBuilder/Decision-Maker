import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  Loader2,
  Star,
  CreditCard,
  Zap,
  Users,
  Calendar,
  Shield,
} from "lucide-react";
import { salesRepPackageSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import StripeCheckout from "@/components/StripeCheckout";

export default function SalesRepChoosePackage() {
  const [, setLocation] = useLocation();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(salesRepPackageSchema),
    defaultValues: {
      packageType: "",
    },
  });

  const selectedValue = form.watch("packageType");

  const savePackageMutation = useMutation({
    mutationFn: async (data) => {
      console.log("🚀 PACKAGE SUBMISSION START - Submitting package data:", data);
      
      // Get userId from sessionStorage for VPS compatibility
      const userId = sessionStorage.getItem("signupUserId");
      console.log("� PACKAGE SUBMISSION - Using userId from sessionStorage:", userId);
      console.log("🚀 PACKAGE SUBMISSION - SessionStorage contents:", {
        signupUserId: sessionStorage.getItem("signupUserId"),
        userEmail: sessionStorage.getItem("userEmail"),
        verificationStatus: sessionStorage.getItem("verificationStatus")
      });
      
      const requestData = {
        ...data,
        userId: userId // Include userId in request for VPS compatibility
      };
      
      console.log("🚀 PACKAGE SUBMISSION - Final request data:", requestData);
      
      const response = await apiRequest("/api/sales-rep/package", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("Package selection saved successfully:", data);
      toast({
        title: "Account Created Successfully!",
        description:
          "Welcome to Naeborly! Your sales rep account is now ready.",
      });
      setLocation("/signup/sales-rep/professional-info");
    },
    onError: (error) => {
      console.error("Package save error:", error);
      toast({
        title: "Save Failed",
        description:
          error.message || "Failed to complete signup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    const selectedPkg = packages.find((pkg) => pkg.id === data.packageType);

    if (selectedPkg?.requiresPayment) {
      setSelectedPackage(selectedPkg);
      setUserInfo({
        packageType: data.packageType,
        email: "user@example.com", // This would come from previous signup steps
        firstName: "User",
        lastName: "Name",
      });
      setShowPayment(true);
    } else {
      // Free package - proceed directly
      savePackageMutation.mutate({
        packageType: data.packageType, // Use MongoDB ID for backend
      });
    }
  };

  const handlePaymentSuccess = () => {
    // Complete the signup after payment
    savePackageMutation.mutate({
      packageType: selectedPackage.id, // Use MongoDB ID for backend
    });
  };

  const handlePaymentError = (error) => {
    toast({
      title: "Payment Failed",
      description:
        error?.message || "Payment could not be processed. Please try again.",
      variant: "destructive",
    });
    setShowPayment(false);
  };

  // Fetch subscription plans from API
  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/subscription-plans");
      return response;
    },
  });

  // Helper functions for enhanced UI
  function getPackageIcon(planName) {
    switch (planName?.toLowerCase()) {
      case "free":
        return Star;
      case "basic":
        return Zap;
      case "premium":
        return Shield;
      case "pro-team":
        return Users;
      default:
        return CreditCard;
    }
  }

  function getPackageGradient(planName) {
    switch (planName?.toLowerCase()) {
      case "free":
        return "from-gray-50 to-gray-100";
      case "basic":
        return "from-blue-50 to-indigo-100";
      case "premium":
        return "from-purple-50 to-pink-100";
      case "pro-team":
        return "from-green-50 to-emerald-100";
      default:
        return "from-gray-50 to-gray-100";
    }
  }

  // Helper function to map plan names to schema enum values
  function getEnumValue(planName) {
    switch (planName?.toLowerCase()) {
      case "free":
        return "free";
      case "basic":
        return "basic";
      case "premium":
        return "premium";
      case "enterprise":
        return "pro-team";
      case "pro-team":
        return "pro-team";
      default:
        return "free";
    }
  }

  // Transform API data to match component structure
  const packages =
    subscriptionPlans?.map((plan) => {
      // Build comprehensive features list from plan data
      const baseFeatures =
        plan.features && plan.features.length > 0 ? plan.features : [];

      // Add structured features based on plan capabilities
      const structuredFeatures = [
        `${plan.maxInvitations || 0} decision maker invitations`,
        `${plan.maxCallCredits || 0} call credits per month`,
        plan.prioritySupport ? "Priority support" : "Standard support",
        "LinkedIn profile verification",
        "Calendar integration",
        "Basic analytics dashboard",
      ];

      // Add premium features based on plan tier
      if (plan.price > 0) {
        structuredFeatures.push("Advanced scheduling tools");
        structuredFeatures.push("Email notifications");
      }

      if (plan.price >= 39) {
        structuredFeatures.push("Call recording & transcription");
        structuredFeatures.push("CRM integrations");
        structuredFeatures.push("Advanced analytics");
      }

      if (plan.price >= 59) {
        structuredFeatures.push("Team management");
        structuredFeatures.push("White-label options");
        structuredFeatures.push("Dedicated account manager");
      }

      // Combine custom features with structured features
      const allFeatures = [...baseFeatures, ...structuredFeatures];

      const enumValue = getEnumValue(plan.name);

      return {
        id: plan.id, // Use unique MongoDB ID for selection
        enumValue: enumValue, // Keep enum value for backend
        name: plan.name,
        price: plan.price?.toString() || "0",
        displayPrice:
          plan.price === 0 || plan.price === "0" ? "Free" : `$${plan.price}`,
        period:
          plan.billingInterval === "monthly"
            ? "month"
            : plan.billingPeriod || "month",
        description:
          plan.description ||
          `Perfect for ${plan.name.toLowerCase()} sales professionals`,
        popular: plan.bestSeller || plan.featured || false,
        features: allFeatures,
        requiresPayment: plan.price > 0,
        stripePriceId: plan.stripePriceId,
        icon: getPackageIcon(plan.name),
        gradient: getPackageGradient(plan.name),
      };
    }) || [];

  // Set default to first available package when plans load
  React.useEffect(() => {
    if (packages && packages.length > 0 && !selectedValue) {
      const freePackage =
        packages.find((pkg) => pkg.enumValue === "free") || packages[0];
      form.setValue("packageType", freePackage.id);
    }
  }, [packages, selectedValue, form]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-4xl mx-auto mt-16 px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 2 of 4
            </span>
            <span className="text-sm font-medium text-gray-600">
              50% Complete
            </span>
          </div>
          <Progress value={50} className="h-2" />
        </div>

        {/* Main Content */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Package
          </h1>
          <p className="text-gray-600">
            Select the plan that best fits your sales goals
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="packageType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-8"
                    >
                      {plansLoading ? (
                        <div className="col-span-full flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                      ) : (
                        packages.map((pkg) => (
                          <div key={pkg.id} className="relative">
                            <RadioGroupItem
                              value={pkg.id}
                              id={pkg.id}
                              className="peer sr-only"
                            />
                            <label
                              htmlFor={pkg.id}
                              className="flex flex-col cursor-pointer"
                            >
                              <Card
                                className={`peer-checked:ring-4 peer-checked:ring-purple-500 peer-checked:border-purple-500 peer-checked:shadow-2xl peer-checked:scale-105 hover:shadow-xl hover:scale-102 transition-all duration-300 h-full overflow-hidden ${selectedValue === pkg.id ? "ring-4 ring-purple-500 border-purple-500 shadow-2xl scale-105" : ""}`}
                              >
                                {/* Background Gradient */}
                                <div
                                  className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} opacity-10`}
                                />

                                <CardContent className="relative p-6 flex flex-col h-full">
                                  {pkg.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg flex items-center gap-1">
                                        <Star className="h-3 w-3" />
                                        Most Popular
                                      </Badge>
                                    </div>
                                  )}

                                  {/* Package Icon */}
                                  <div className="flex justify-center mb-4">
                                    <div
                                      className={`p-3 rounded-full bg-gradient-to-br ${pkg.gradient} shadow-lg`}
                                    >
                                      {pkg.icon && (
                                        <pkg.icon className="h-8 w-8 text-gray-700" />
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                      {pkg.name}
                                    </h3>
                                    <div className="mb-3">
                                      <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        {pkg.displayPrice}
                                      </span>
                                      {pkg.period !== "forever" && (
                                        <span className="text-gray-600 ml-1">
                                          /{pkg.period}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                      {pkg.description}
                                    </p>
                                  </div>

                                  <div className="flex-1">
                                    <ul className="space-y-3">
                                      {pkg.features.map((feature, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start gap-3"
                                        >
                                          <div className="flex-shrink-0 mt-0.5">
                                            <Check className="h-4 w-4 text-green-500 bg-green-50 rounded-full p-0.5" />
                                          </div>
                                          <span className="text-sm text-gray-700 leading-relaxed">
                                            {feature}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div
                                    className={`mt-6 ${selectedValue === pkg.id ? "block" : "hidden"}`}
                                  >
                                    <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                                      <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-semibold text-purple-700">
                                          ✓ Selected Plan
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </label>
                          </div>
                        ))
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/signup/sales-rep/personal-info")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <Button
                type="submit"
                disabled={savePackageMutation.isPending}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-8"
              >
                {savePackageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Complete Signup</>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Payment Modal */}
        {showPayment && selectedPackage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-md w-full">
              <StripeCheckout
                packageInfo={selectedPackage}
                userInfo={userInfo}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                isRecurring={true}
              />
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowPayment(false)}
                  className="text-gray-600"
                >
                  Cancel Payment
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
