import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState("loading");
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentId = urlParams.get("payment_intent");
      const paymentIntentClientSecret = urlParams.get(
        "payment_intent_client_secret",
      );

      if (!paymentIntentId) {
        setVerificationStatus("error");
        return;
      }

      try {
        const response = await apiRequest("/api/verify-payment", {
          method: "POST",
          body: JSON.stringify({ paymentIntentId }),
        });

        if (response.succeeded) {
          setPaymentInfo(response);
          setVerificationStatus("success");
        } else {
          setVerificationStatus("failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setVerificationStatus("error");
      }
    };

    verifyPayment();
  }, []);

  const handleContinueToDashboard = () => {
    // Determine which dashboard to redirect to based on user type
    // This could be retrieved from localStorage or session storage
    const userRole = localStorage.getItem("userRole");

    if (userRole === "decision-maker") {
      setLocation("/decision-dashboard");
    } else if (userRole === "sales-rep") {
      setLocation("/sales-dashboard");
    } else {
      // Default redirect
      setLocation("/");
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case "loading":
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Verifying Payment...
                </h2>
                <p className="text-gray-600">
                  Please wait while we confirm your payment.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case "success":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-gray-900">
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Your subscription has been activated successfully.
                </p>

                {paymentInfo && (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-semibold">
                        ${paymentInfo.amount}{" "}
                        {paymentInfo.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Payment ID:</span>
                      <span className="font-mono text-xs text-gray-500">
                        {paymentInfo.paymentIntentId || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleContinueToDashboard}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "failed":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-gray-900">
                Payment Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Your payment was not successful. Please try again.
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => setLocation("/")}
                    className="w-full"
                    variant="outline"
                  >
                    Return to Home
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "error":
      default:
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-gray-900">
                Verification Error
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  We couldn't verify your payment status. Please contact support
                  if you were charged.
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => setLocation("/")}
                    className="w-full"
                    variant="outline"
                  >
                    Return to Home
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Check Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}
