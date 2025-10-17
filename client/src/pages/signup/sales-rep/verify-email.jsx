import { useState } from "react";
import { useLocation } from "wouter";
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
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const emailVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function SalesRepVerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const form = useForm({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: {
      email: "",
    },
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async (data) => {
      // Get userId from sessionStorage for VPS compatibility
      const userId = sessionStorage.getItem("signupUserId");
      console.log("🔧 Sales Rep Email verification - Using userId from sessionStorage:", userId);
      
      const requestData = {
        ...data,
        userId: userId // Include userId in request for VPS compatibility
      };
      
      const response = await apiRequest("/api/sales-rep/send-email-verification", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("Verification email sent successfully:", data);
      setEmailSent(true);
      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error) => {
      console.error("Email verification send error:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (code) => {
      // Get userId from sessionStorage for VPS compatibility
      const userId = sessionStorage.getItem("signupUserId");
      console.log("🔧 Sales Rep Email verification code - Using userId from sessionStorage:", userId);
      
      const response = await apiRequest("/api/sales-rep/verify-email-code", {
        method: "POST",
        body: JSON.stringify({ 
          code,
          email: form.getValues().email,
          userId: userId // Include userId in request for VPS compatibility
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("Email verification successful:", data);
      toast({
        title: "Email Verified!",
        description: "Your email has been verified successfully.",
      });
      
      // Update verification status in session
      sessionStorage.setItem("verificationStatus", "verified");
      sessionStorage.setItem("needsEmailVerification", "false");
      
      // Continue to package selection
      setLocation("/signup/sales-rep/package");
    },
    onError: (error) => {
      console.error("Email verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    sendVerificationMutation.mutate(data);
  };

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the verification code.",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(verificationCode);
  };

  const handleSkip = () => {
    // Continue without email verification - user will be added to manual verification list
    sessionStorage.setItem("verificationStatus", "unverified");
    sessionStorage.setItem("needsEmailVerification", "false");
    setLocation("/signup/sales-rep/package");
  };

  const handleBack = () => {
    setLocation("/signup/sales-rep/personal-info");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-2xl mx-auto mt-16 px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 1.5 of 4
            </span>
            <span className="text-sm font-medium text-gray-600">
              30% Complete
            </span>
          </div>
          <Progress value={30} className="h-2" />
        </div>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Personal Info
        </Button>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <Mail className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Email Verification
              </h1>
              <p className="text-gray-600">
                Since your LinkedIn profile name doesn't match your entered name, 
                please verify your work email to complete verification.
              </p>
            </div>

            {!emailSent ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Work Email Address *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your work email"
                            {...field}
                            className="mt-1"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500 mt-1">
                          This must be your company email address for verification
                        </p>
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col space-y-4">
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={sendVerificationMutation.isPending}
                    >
                      {sendVerificationMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending Verification Email...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Verification Email
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkip}
                      className="w-full"
                    >
                      Skip for Now
                    </Button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Why email verification?</p>
                        <p>
                          Since your LinkedIn profile name doesn't exactly match your entered name, 
                          verifying your work email helps us confirm your identity and maintain 
                          platform security.
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Verification Email Sent!
                  </h2>
                  <p className="text-gray-600 mb-4">
                    We've sent a verification code to <strong>{form.getValues().email}</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Enter Verification Code
                    </label>
                    <Input
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="text-center text-lg tracking-wider"
                      maxLength={6}
                    />
                  </div>

                  <Button
                    onClick={handleVerifyCode}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={verifyCodeMutation.isPending}
                  >
                    {verifyCodeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify Email
                      </>
                    )}
                  </Button>

                  <div className="flex justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setEmailSent(false)}
                    >
                      Change Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSkip}
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-800">
                    <p>
                      <strong>Didn't receive the email?</strong> Check your spam folder or 
                      click "Change Email" to try a different email address.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}