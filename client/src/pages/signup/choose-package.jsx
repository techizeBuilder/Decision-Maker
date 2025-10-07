import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, User, Users, Crown } from "lucide-react";

export default function ChoosePackage() {
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState("individual");

  const handleBack = () => {
    setLocation("/signup/nominate");
  };

  const handleComplete = () => {
    // Complete registration and redirect to dashboard
    setLocation("/decision-dashboard");
  };

  const packages = [
    {
      id: "individual",
      name: "Individual DM",
      description: "Perfect for individual decision makers",
      icon: User,
      features: [
        "Personal call calendar",
        "Direct rep connections",
        "Individual analytics",
      ],
      color: "blue",
      selected: selectedPackage === "individual",
    },
    {
      id: "pro-team",
      name: "Pro Team Access",
      description: "For DMs who want to grant their entire sales team access",
      icon: Users,
      badge: "Popular",
      features: [
        "Everything in Individual",
        "Up to 10 team members",
        "8 calls per rep per month",
        "Team analytics dashboard",
        "Priority support",
      ],
      color: "blue",
      selected: selectedPackage === "pro-team",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 5 of 5
            </span>
            <span className="text-sm font-medium text-gray-600">
              100% Complete
            </span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Main Content */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Package
          </h1>
          <p className="text-gray-600">
            Select the option that best fits your needs
          </p>
        </div>

        {/* Package Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-8">
          {packages.map((pkg) => {
            const IconComponent = pkg.icon;
            return (
              <Card
                key={pkg.id}
                className={`relative cursor-pointer transition-all ${
                  pkg.selected
                    ? `border-2 border-blue-600 shadow-xl`
                    : "border border-gray-200 shadow-lg hover:shadow-xl"
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">
                      <Crown className="mr-1" size={12} />
                      {pkg.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-blue-100">
                      <IconComponent className="text-blue-600" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {pkg.name}
                    </h3>
                    <p className="text-gray-600">{pkg.description}</p>
                  </div>

                  <div className="space-y-3">
                    {pkg.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-gray-600"
                      >
                        <CheckCircle
                          className="text-green-600 mr-3 flex-shrink-0"
                          size={16}
                        />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {pkg.selected && (
                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        <CheckCircle className="mr-2" size={16} />
                        Selected
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-gray-600"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            <CheckCircle className="mr-2" size={16} />
            Complete Registration
          </Button>
        </div>
      </div>
    </div>
  );
}
