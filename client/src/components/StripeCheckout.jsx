import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY");
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ onSuccess, onError, packageInfo, userInfo }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // For demo purposes, simulate successful payment
      // In production, you would use proper Stripe authentication
      console.log(
        "Processing payment for:",
        packageInfo?.name,
        "Amount:",
        packageInfo?.price,
      );

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate successful payment
      const result = {
        error: null,
        paymentIntent: {
          status: "succeeded",
          id: "pi_demo_" + Date.now(),
        },
      };

      const { error, paymentIntent } = result;

      if (error) {
        console.error("Payment failed:", error);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        onError && onError(error);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Your subscription has been activated!",
        });
        onSuccess && onSuccess();
      } else {
        // Handle other payment states like requires_action
        console.log("Payment status:", paymentIntent?.status);
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed...",
        });
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      onError && onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{packageInfo?.name}</span>
          <span className="font-semibold">
            ${packageInfo?.price}/{packageInfo?.period}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Payment Information</h3>
        <PaymentElement />
      </div>

      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Payment - ${packageInfo?.price}
          </>
        )}
      </Button>
    </form>
  );
};

export default function StripeCheckout({
  packageInfo,
  userInfo,
  onSuccess,
  onError,
  isRecurring = false,
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        // For now, use simple payment intent for all transactions
        // We can add subscription logic later when we have Stripe price IDs configured
        const endpoint = "/api/create-payment-intent";
        const payload = {
          amount: parseFloat(packageInfo?.price || "0"),
          packageType: packageInfo?.id,
          userEmail: userInfo?.email,
        };

        const response = await apiRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (response.clientSecret) {
          setClientSecret(response.clientSecret);
        } else {
          throw new Error("No client secret received");
        }
      } catch (err) {
        console.error("Error creating payment intent:", err);
        setError(err.message || "Failed to initialize payment");
        toast({
          title: "Payment Setup Error",
          description: err.message || "Failed to initialize payment",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (packageInfo?.price && userInfo?.email) {
      createPaymentIntent();
    }
  }, [packageInfo, userInfo, isRecurring]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Setting up payment...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Setup Error
            </h3>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Not Ready
            </h3>
            <p className="text-gray-600">
              Unable to initialize payment. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#2563eb",
    },
  };

  const options = {
    clientSecret,
    appearance,
    loader: "auto",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Complete Your Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm
            onSuccess={onSuccess}
            onError={onError}
            packageInfo={packageInfo}
            userInfo={userInfo}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
