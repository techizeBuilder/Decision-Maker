import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, X } from "lucide-react";

export default function AvailabilityPreferences() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    weeklyCallSlots: "",
    timeZone: "",
    callTypes: [],
  });

  const callTypeOptions = [
    "Product Demos",
    "Industry Insights",
    "Partnership Discussions",
    "Investment Opportunities",
    "Recruitment",
    "Advisory Calls",
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCallType = (type) => {
    setFormData((prev) => ({
      ...prev,
      callTypes: prev.callTypes.includes(type)
        ? prev.callTypes.filter((t) => t !== type)
        : [...prev.callTypes, type],
    }));
  };

  const handleNext = () => {
    setLocation("/signup/nominate");
  };

  const handleBack = () => {
    setLocation("/signup/professional");
  };

  const canProceed =
    formData.weeklyCallSlots &&
    formData.timeZone &&
    formData.callTypes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 3 of 5
            </span>
            <span className="text-sm font-medium text-gray-600">
              60% Complete
            </span>
          </div>
          <Progress value={60} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Availability Preferences
              </h1>
              <p className="text-gray-600">
                Set your calling preferences and availability
              </p>
            </div>

            <div className="space-y-8">
              {/* Weekly Call Slots and Time Zone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label
                    htmlFor="weeklyCallSlots"
                    className="text-sm font-medium text-gray-700"
                  >
                    Weekly Call Slots *
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("weeklyCallSlots", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="3-5 calls per week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2">1-2 calls per week</SelectItem>
                      <SelectItem value="3-5">3-5 calls per week</SelectItem>
                      <SelectItem value="5-10">5-10 calls per week</SelectItem>
                      <SelectItem value="10+">10+ calls per week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="timeZone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Preferred Time Zone *
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("timeZone", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="EST" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PST">PST</SelectItem>
                      <SelectItem value="MST">MST</SelectItem>
                      <SelectItem value="CST">CST</SelectItem>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="GMT">GMT</SelectItem>
                      <SelectItem value="CET">CET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Types of Calls */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-4 block">
                  Types of Calls You're Open To *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {callTypeOptions.map((type) => (
                    <div
                      key={type}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.callTypes.includes(type)
                          ? "bg-purple-50 border-purple-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleCallType(type)}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${
                            formData.callTypes.includes(type)
                              ? "text-purple-700"
                              : "text-gray-900"
                          }`}
                        >
                          {type}
                        </span>
                        {formData.callTypes.includes(type) && (
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                            <X className="text-white" size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
            className="bg-purple-600 hover:bg-purple-700 px-8"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
