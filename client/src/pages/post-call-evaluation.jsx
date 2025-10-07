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
  AlertTriangle,
} from "lucide-react";

export default function PostCallEvaluation() {
  const [, setLocation] = useLocation();
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [comments, setComments] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get call ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const callId = urlParams.get("callId");

  // Fetch call data
  const { data: callData, isLoading: isLoadingCall } = useQuery({
    queryKey: ["/api/decision-maker/call", callId],
    enabled: !!callId,
    queryFn: async () => {
      const response = await apiRequest(`/api/decision-maker/call/${callId}`);
      return response;
    },
  });

  // Redirect if no call ID
  useEffect(() => {
    if (!callId) {
      toast({
        title: "Call not found",
        description: "No call ID provided. Redirecting to dashboard.",
        variant: "destructive",
      });
      setLocation("/decision-dashboard");
    }
  }, [callId, setLocation, toast]);

  const experienceOptions = [
    {
      id: "professional",
      title: "Professional and valuable",
      description: "Great experience, well prepared",
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      rating: 5,
    },
    {
      id: "mediocre",
      title: "Mediocre - not very relevant",
      description: "Average experience, somewhat relevant",
      icon: AlertCircle,
      color: "yellow",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      rating: 3,
    },
    {
      id: "poorly-prepared",
      title: "Poorly prepared or off-topic",
      description: "Sales experience, not well prepared",
      icon: XCircle,
      color: "orange",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700",
      rating: 2,
    },
    {
      id: "no-show",
      title: "Participant did not show up",
      description: "No show without proper notice",
      icon: XCircle,
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      rating: 1,
    },
    {
      id: "rude",
      title: "Rude, disrespectful, or time-wasting",
      description: "Unprofessional behavior or conduct",
      icon: AlertTriangle,
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      rating: 1,
    },
  ];

  // Submit evaluation mutation
  const submitEvaluationMutation = useMutation({
    mutationFn: async (evaluationData) => {
      return await apiRequest("/api/decision-maker/evaluate-call", {
        method: "POST",
        body: JSON.stringify(evaluationData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Evaluation submitted",
        description:
          "Thank you for your feedback! Your evaluation has been saved.",
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["/api/decision-maker/calls"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/decision-maker/metrics"],
      });

      // Navigate back to dashboard
      setTimeout(() => {
        setLocation("/decision-dashboard");
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description:
          error.message || "Failed to submit evaluation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedExperience) {
      toast({
        title: "Please select your experience",
        description: "You must select a call experience before submitting.",
        variant: "destructive",
      });
      return;
    }

    const selectedOption = experienceOptions.find(
      (opt) => opt.id === selectedExperience,
    );

    const evaluationData = {
      callId: callId,
      experience: selectedExperience,
      experienceTitle: selectedOption?.title,
      rating: selectedOption?.rating || 3,
      comments: comments.trim(),
      evaluatedAt: new Date().toISOString(),
    };

    submitEvaluationMutation.mutate(evaluationData);
  };

  if (isLoadingCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <XCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">
              Call not found
            </h2>
            <p className="text-gray-600 mt-2">
              The call you're trying to evaluate could not be found.
            </p>
            <Link href="/decision-dashboard">
              <Button className="mt-4">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/decision-dashboard">
            <Button
              variant="ghost"
              className="mb-4 p-0 text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Post-Call Evaluation
            </h1>
            <p className="text-gray-600 mt-1">
              Rate your call experience and next steps
            </p>
          </div>
        </div>

        {/* Call Info Card */}
        <Card className="mb-8 shadow-lg border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {callData.salesRepName || "Sales Representative"}
                </h3>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center text-gray-600">
                    <Building className="mr-1" size={14} />
                    <span className="text-sm">
                      {callData.company || "Company"}
                    </span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                    Sales Rep
                  </Badge>
                  <div className="flex items-center text-gray-600">
                    <Clock className="mr-1" size={14} />
                    <span className="text-sm">
                      {callData.scheduledAt
                        ? new Date(callData.scheduledAt).toLocaleDateString()
                        : "Date TBD"}{" "}
                      • 15 min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Form */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Call Experience
              </h2>
              <p className="text-gray-600">How was your call experience?</p>
            </div>

            {/* Experience Options */}
            <div className="space-y-4 mb-8">
              {experienceOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedExperience === option.id
                        ? `${option.bgColor} ${option.borderColor}`
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedExperience(option.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent
                        className={
                          selectedExperience === option.id
                            ? option.textColor
                            : "text-gray-400"
                        }
                        size={20}
                      />
                      <div>
                        <h4
                          className={`font-semibold ${
                            selectedExperience === option.id
                              ? option.textColor
                              : "text-gray-900"
                          }`}
                        >
                          {option.title}
                        </h4>
                        <p
                          className={`text-sm ${
                            selectedExperience === option.id
                              ? option.textColor
                              : "text-gray-600"
                          }`}
                        >
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Additional Comments */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Additional comments (optional)
              </h3>
              <Textarea
                placeholder="Share any additional thoughts about the call experience..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={
                  !selectedExperience || submitEvaluationMutation.isPending
                }
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
              >
                {submitEvaluationMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={16} />
                    Submit Evaluation
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
