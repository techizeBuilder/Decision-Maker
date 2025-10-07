import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";

export default function RepFeedback() {
  const [, params] = useRoute("/feedback/rep/:callId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const callId = params?.callId;

  const [formData, setFormData] = useState({
    callTookPlace: "",
    wasPoliteEngaged: "",
    comments: ""
  });

  const submitInitialFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest(`/api/sales-rep/initial-feedback/${callId}`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      if (data.proceedToRating) {
        // Proceed to sales rep evaluation page
        setLocation(`/evaluation/sales-rep?callId=${callId}`);
      } else {
        // Show success message and redirect to dashboard
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback. Your input helps us improve the platform.",
        });
        setLocation("/sales-dashboard");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.callTookPlace || !formData.wasPoliteEngaged) {
      toast({
        title: "Missing Information",
        description: "Please answer both required questions.",
        variant: "destructive",
      });
      return;
    }

    submitInitialFeedbackMutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!callId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Invalid Feedback Link</h2>
              <p className="text-gray-600 mb-4">This feedback link is not valid or has expired.</p>
              <Button onClick={() => setLocation("/sales-dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Quick Feedback
            </CardTitle>
            <p className="text-green-100 mt-2">
              Help us maintain quality connections across the platform
            </p>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question 1: Did the call take place? */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-gray-800">
                  1. Did the call take place?
                </Label>
                <RadioGroup
                  value={formData.callTookPlace}
                  onValueChange={(value) => handleInputChange("callTookPlace", value)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="call-yes" />
                    <Label htmlFor="call-yes" className="flex items-center gap-2 cursor-pointer">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Yes, the call took place
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="call-no" />
                    <Label htmlFor="call-no" className="flex items-center gap-2 cursor-pointer">
                      <XCircle className="h-4 w-4 text-red-600" />
                      No, the call did not take place
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 2: Was the other person polite and engaged? */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-gray-800">
                  2. Was the decision maker polite and engaged?
                </Label>
                <RadioGroup
                  value={formData.wasPoliteEngaged}
                  onValueChange={(value) => handleInputChange("wasPoliteEngaged", value)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="polite-yes" />
                    <Label htmlFor="polite-yes" className="flex items-center gap-2 cursor-pointer">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Yes, they were polite and engaged
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="polite-no" />
                    <Label htmlFor="polite-no" className="flex items-center gap-2 cursor-pointer">
                      <XCircle className="h-4 w-4 text-red-600" />
                      No, they were not polite or engaged
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="polite-other" />
                    <Label htmlFor="polite-other" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare className="h-4 w-4 text-yellow-600" />
                      Other (please explain below)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Optional comments */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-gray-800">
                  Additional Comments (Optional)
                </Label>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => handleInputChange("comments", e.target.value)}
                  placeholder="Any additional feedback or details you'd like to share..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Submit button */}
              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  disabled={submitInitialFeedbackMutation.isPending}
                  className="px-8 py-2 bg-green-600 hover:bg-green-700"
                >
                  {submitInitialFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Your feedback helps maintain quality and trust across the Naeberly platform.</p>
        </div>
      </div>
    </div>
  );
}