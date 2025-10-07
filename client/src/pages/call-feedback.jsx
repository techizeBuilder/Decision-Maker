import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  User,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

export default function CallFeedback() {
  const [, setLocation] = useLocation();
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [comments, setComments] = useState("");

  const callData = {
    name: "Alex Johnson",
    company: "SalesForce Pro",
    role: "CRM Software",
    date: "Today, 3:00 PM",
    duration: "15 min"
  };

  const experienceOptions = [
    {
      id: "professional",
      title: "Professional and valuable",
      description: "Great experience, well prepared",
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    },
    {
      id: "mediocre",
      title: "Mediocre - not very relevant",
      description: "Average experience, somewhat relevant",
      icon: AlertCircle,
      color: "yellow",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700"
    },
    {
      id: "poorly-prepared",
      title: "Poorly prepared or off-topic",
      description: "Sales experience, not well prepared",
      icon: XCircle,
      color: "orange",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700"
    },
    {
      id: "no-show",
      title: "Participant did not show up",
      description: "No show without proper notice",
      icon: XCircle,
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700"
    },
    {
      id: "rude",
      title: "Rude, disrespectful, or time-wasting",
      description: "Unprofessional behavior or conduct",
      icon: AlertTriangle,
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700"
    }
  ];

  const handleSubmit = () => {
    // Handle form submission here
    console.log("Selected experience:", selectedExperience);
    console.log("Comments:", comments);
    setLocation("/sales-dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/sales-dashboard">
            <Button variant="ghost" className="mb-4 p-0 text-gray-600 hover:text-purple-600">
              <ArrowLeft className="mr-2" size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Feedback</h1>
            <p className="text-gray-600 mt-1">Rate your call experience</p>
          </div>
        </div>

        {/* Call Info Card */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{callData.name}</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center text-gray-600">
                    <Building className="mr-1" size={14} />
                    <span className="text-sm">{callData.company}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {callData.role}
                  </Badge>
                  <div className="flex items-center text-gray-600">
                    <Clock className="mr-1" size={14} />
                    <span className="text-sm">{callData.date} • {callData.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Form */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Call Experience</h2>
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
                        className={selectedExperience === option.id ? option.textColor : "text-gray-400"} 
                        size={20} 
                      />
                      <div>
                        <h4 className={`font-semibold ${
                          selectedExperience === option.id ? option.textColor : "text-gray-900"
                        }`}>
                          {option.title}
                        </h4>
                        <p className={`text-sm ${
                          selectedExperience === option.id ? option.textColor : "text-gray-600"
                        }`}>
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
                disabled={!selectedExperience}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
              >
                <CheckCircle className="mr-2" size={16} />
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}