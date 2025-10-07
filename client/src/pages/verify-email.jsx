import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("verifying"); // "verifying", "success", "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
          setStatus("error");
          setMessage("No verification token found in the URL.");
          return;
        }

        // Call verification API
        const response = await apiRequest(`/api/verify-email?token=${token}`, {
          method: "GET",
        });

        setStatus("success");
        setMessage(response.message || "Email verified successfully!");
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Failed to verify email. The link may be expired or invalid.");
      }
    };

    verifyEmail();
  }, []);

  const handleContinueToLogin = () => {
    setLocation("/login");
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 text-center">
          {status === "verifying" && (
            <>
              <div className="mb-6">
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Your Email
                </h1>
                <p className="text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-6">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Email Verified Successfully!
                </h1>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <p className="text-sm text-gray-500">
                  You can now log in to your Naeberly account and start networking.
                </p>
              </div>
              <Button 
                onClick={handleContinueToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue to Login
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-6">
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verification Failed
                </h1>
                <p className="text-red-600 mb-4">
                  {message}
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <Mail className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    If you're having trouble with email verification:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Check if the link has expired (valid for 24 hours)</li>
                    <li>• Make sure you used the most recent verification email</li>
                    <li>• Contact support if the issue persists</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleBackToHome}
                  className="flex-1"
                >
                  Back to Home
                </Button>
                <Button 
                  onClick={handleContinueToLogin}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Try Login
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}