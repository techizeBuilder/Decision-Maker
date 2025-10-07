import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  User,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star
} from "lucide-react";

export default function SalesRepEvaluation() {
  const [, setLocation] = useLocation();
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get call ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const callId = urlParams.get('callId');

  // Fetch call data
  const { data: callData, isLoading: isLoadingCall } = useQuery({
    queryKey: ['/api/sales-rep/call', callId],
    enabled: !!callId,
    queryFn: async () => {
      const response = await apiRequest(`/api/sales-rep/calls`);
      const calls = response || [];
      return calls.find(call => call._id === callId);
    }
  });

  // Submit evaluation mutation
  const submitEvaluationMutation = useMutation({
    mutationFn: async (evaluationData) => {
      return await apiRequest(`/api/sales-rep/calls/${callId}/rate`, {
        method: "POST",
        body: JSON.stringify(evaluationData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-rep/calls"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-rep/metrics"],
      });
      toast({
        title: "Call Rated Successfully",
        description: "Thank you for your feedback!",
      });
      
      // Redirect back to analytics or dashboard
      setTimeout(() => {
        setLocation("/analytics");
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedRating) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    const evaluationData = {
      rating: selectedRating,
      feedback: feedback.trim(),
    };

    submitEvaluationMutation.mutate(evaluationData);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        onClick={() => setSelectedRating(i + 1)}
        className={`p-2 transition-colors duration-200 ${
          i < selectedRating ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"
        }`}
      >
        <Star className="w-8 h-8 fill-current" />
      </button>
    ));
  };

  if (isLoadingCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <XCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Call not found</h2>
            <p className="text-gray-600 mt-2">The call you're trying to evaluate could not be found.</p>
            <Link href="/analytics">
              <Button className="mt-4">Return to Analytics</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/analytics">
            <Button variant="ghost" className="mb-4 p-0 text-gray-600 hover:text-green-600">
              <ArrowLeft className="mr-2" size={16} />
              Back to Analytics
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rate Your Call</h1>
            <p className="text-gray-600 mt-1">Share your experience from this meeting</p>
          </div>
        </div>

        {/* Call Details */}
        <Card className="shadow-lg border border-gray-200 bg-white mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {callData.decisionMakerName || "Decision Maker"}
                  </h3>
                  <p className="text-green-600 font-medium">
                    {callData.company || "Company"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {callData.industry || "Industry"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-gray-500 mb-1">
                  <Clock className="mr-1" size={16} />
                  <span className="text-sm">
                    {callData.scheduledAt
                      ? new Date(callData.scheduledAt).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Completed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Form */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How was your call?</h2>
              <p className="text-gray-600">Rate your overall experience with this decision maker</p>
            </div>

            {/* Star Rating */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Overall Rating
              </h3>
              <div className="flex items-center space-x-1 mb-2">
                {renderStars()}
              </div>
              <p className="text-sm text-gray-500">
                {selectedRating === 0 && "Click to rate"}
                {selectedRating === 1 && "Poor - Very unsatisfied"}
                {selectedRating === 2 && "Fair - Somewhat unsatisfied"}
                {selectedRating === 3 && "Good - Neutral experience"}
                {selectedRating === 4 && "Very Good - Satisfied"}
                {selectedRating === 5 && "Excellent - Highly satisfied"}
              </p>
            </div>

            {/* Feedback */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Additional feedback (optional)
              </h3>
              <Textarea
                placeholder="Share your thoughts about the call, the decision maker's engagement, or any other relevant details..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!selectedRating || submitEvaluationMutation.isPending}
                className="bg-green-600 hover:bg-green-700 px-8 py-3"
              >
                {submitEvaluationMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={16} />
                    Submit Rating
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}