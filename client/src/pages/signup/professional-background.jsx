import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function ProfessionalBackground() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    jobTitle: "",
    company: "",
    industry: "",
    companySize: "",
    yearsInRole: "",
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setLocation("/signup/availability");
  };

  const handleBack = () => {
    setLocation("/signup/personal");
  };

  const canProceed =
    formData.jobTitle &&
    formData.company &&
    formData.industry &&
    formData.companySize &&
    formData.yearsInRole;

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Manufacturing",
    "Retail",
    "Education",
    "Government",
    "Non-profit",
    "Other",
  ];

  const companySizes = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "501-1000 employees",
    "1000+ employees",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 2 of 5
            </span>
            <span className="text-sm font-medium text-gray-600">
              40% Complete
            </span>
          </div>
          <Progress value={40} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Professional Background
              </h1>
              <p className="text-gray-600">
                Tell us about your role and company
              </p>
            </div>

            <div className="space-y-6">
              {/* Job Title */}
              <div>
                <Label
                  htmlFor="jobTitle"
                  className="text-sm font-medium text-gray-700"
                >
                  Job Title *
                </Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Chief Revenue Officer, VP of Sales"
                  value={formData.jobTitle}
                  onChange={(e) =>
                    handleInputChange("jobTitle", e.target.value)
                  }
                  className="mt-1"
                />
              </div>

              {/* Company */}
              <div>
                <Label
                  htmlFor="company"
                  className="text-sm font-medium text-gray-700"
                >
                  Company *
                </Label>
                <Input
                  id="company"
                  placeholder="Enter your company name"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Industry and Company Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="industry"
                    className="text-sm font-medium text-gray-700"
                  >
                    Industry *
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("industry", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem
                          key={industry}
                          value={industry.toLowerCase()}
                        >
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="companySize"
                    className="text-sm font-medium text-gray-700"
                  >
                    Company Size *
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("companySize", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Years in Current Role */}
              <div>
                <Label
                  htmlFor="yearsInRole"
                  className="text-sm font-medium text-gray-700"
                >
                  Years in Current Role
                </Label>
                <Input
                  id="yearsInRole"
                  placeholder="e.g., 3"
                  value={formData.yearsInRole}
                  onChange={(e) =>
                    handleInputChange("yearsInRole", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
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
