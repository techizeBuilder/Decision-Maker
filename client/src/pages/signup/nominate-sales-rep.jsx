import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users } from "lucide-react";

export default function NominateSalesRep() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    salesRepEmail: "",
    relationship: ""
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setLocation("/signup/package");
  };

  const handleBack = () => {
    setLocation("/signup/availability");
  };

  const relationshipOptions = [
    "Current business partner",
    "Former colleague",
    "Industry contact",
    "Vendor/supplier",
    "Customer/client",
    "Other"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">Step 4 of 5</span>
            <span className="text-sm font-medium text-gray-600">80% Complete</span>
          </div>
          <Progress value={80} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Nominate a Sales Rep</h1>
              <p className="text-gray-600">Optional: Nominate a sales rep to gain platform access</p>
            </div>

            <div className="space-y-6">
              {/* How Rep Nomination Works */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <Users className="text-white" size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">How Rep Nomination Works</h3>
                    <ul className="space-y-1 text-sm text-blue-700">
                      <li>• Nominate a sales rep you know to get platform access</li>
                      <li>• They'll receive an invitation to join Naeborly</li>
                      <li>• You both benefit from the connection</li>
                      <li>• This step is completely optional</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sales Rep Email */}
              <div>
                <Label htmlFor="salesRepEmail" className="text-sm font-medium text-gray-700">
                  Sales Rep Email
                </Label>
                <Input
                  id="salesRepEmail"
                  type="email"
                  placeholder="mjp@gmail.com"
                  value={formData.salesRepEmail}
                  onChange={(e) => handleInputChange("salesRepEmail", e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Relationship */}
              <div>
                <Label htmlFor="relationship" className="text-sm font-medium text-gray-700">
                  Your Relationship
                </Label>
                <Select onValueChange={(value) => handleInputChange("relationship", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Current business partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((option) => (
                      <SelectItem key={option} value={option.toLowerCase().replace(/\s+/g, '-')}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="ghost" onClick={handleBack} className="text-gray-600">
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="bg-blue-600 hover:bg-purple-700 px-8"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}