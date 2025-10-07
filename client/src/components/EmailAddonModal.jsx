import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function EmailAddonModal({ isOpen, onClose, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded - now confirm with backend
        try {
          console.log(
            "Confirming payment with backend, PaymentIntent ID:",
            paymentIntent.id,
          );
          
          // First test authentication
          const authResponse = await fetch("/api/test-auth", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
          });
          console.log("Auth test response status:", authResponse.status);
          if (authResponse.ok) {
            const authData = await authResponse.json();
            console.log("Auth test data:", authData);
          } else {
            console.log("Auth test failed");
          }

          const confirmResponse = await fetch("/api/confirm-email-addon-purchase", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
            }),
          });
          
          console.log("Confirm response status:", confirmResponse.status);
          console.log("Confirm response headers:", confirmResponse.headers);
          
          if (!confirmResponse.ok) {
            const errorText = await confirmResponse.text();
            console.log("Error response text:", errorText);
            throw new Error(`HTTP error! status: ${confirmResponse.status}, response: ${errorText}`);
          }
          
          const confirmData = await confirmResponse.json();
          console.log("Confirmation response:", confirmData);

          toast({
            title: "Payment Successful",
            description:
              "Email addon activated! You can now see DM emails after booking calls.",
          });
          onSuccess();
          onClose();
        } catch (confirmError) {
          console.error("Confirmation error:", confirmError);
          toast({
            title: "Payment Processed",
            description:
              "Payment successful but confirmation failed. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-600" />
            Email Access Addon - $5
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-2">
                  What you'll get:
                </h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Access to DM email addresses after booking calls</li>
                  <li>• Direct contact information for follow-ups</li>
                  <li>• One-time payment, permanent access</li>
                  <li>• Immediate activation</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay $5"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
