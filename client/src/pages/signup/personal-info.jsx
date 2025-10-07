import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Linkedin, CheckCircle } from "lucide-react";

export default function PersonalInfo() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    linkedinUrl: "",
    password: "",
    confirmPassword: "",
  });
  const [linkedinVerified, setLinkedinVerified] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLinkedinVerify = async () => {
    if (!formData.linkedinUrl) {
      return;
    }

    try {
      const response = await fetch("/api/verify-linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkedinUrl: formData.linkedinUrl }),
      });

      const result = await response.json();

      if (result.verified) {
        setLinkedinVerified(true);
      }
    } catch (error) {
      console.error("LinkedIn verification failed:", error);
    }
  };

  const handleNext = () => {
    // Validate form and proceed to next step
    setLocation("/signup/professional");
  };

  const canProceed =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    linkedinVerified &&
    formData.password &&
    formData.confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 1 of 5
            </span>
            <span className="text-sm font-medium text-gray-600">
              20% Complete
            </span>
          </div>
          <Progress value={20} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Personal Information
              </h1>
              <p className="text-gray-600">
                Let's start with your basic details and LinkedIn verification
              </p>
            </div>

            <div className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="firstName"
                    className="text-sm font-medium text-gray-700"
                  >
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="lastName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* LinkedIn Verification */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <Linkedin className="text-white" size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      LinkedIn Verification Required
                    </h3>
                    <p className="text-sm text-gray-600">
                      We verify all decision makers through LinkedIn to ensure
                      authentic connections
                    </p>
                  </div>
                  {linkedinVerified && (
                    <CheckCircle className="text-green-600" size={20} />
                  )}
                </div>

                <div className="mb-4">
                  <Label
                    htmlFor="linkedinUrl"
                    className="text-sm font-medium text-gray-700"
                  >
                    LinkedIn Profile URL *
                  </Label>
                  <Input
                    id="linkedinUrl"
                    placeholder="https://linkedin.com/in/your-profile"
                    value={formData.linkedinUrl}
                    onChange={(e) =>
                      handleInputChange("linkedinUrl", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                {linkedinVerified ? (
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <CheckCircle className="mr-2" size={16} />
                    LinkedIn Verified
                  </div>
                ) : (
                  <Button
                    onClick={handleLinkedinVerify}
                    disabled={!formData.linkedinUrl}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Linkedin className="mr-2" size={16} />
                    Verify LinkedIn Profile
                  </Button>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700"
                  >
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-gray-600"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="bg-blue-600 hover:bg-purple-700 px-8"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
