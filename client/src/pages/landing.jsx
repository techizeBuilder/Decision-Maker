import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserCheck,
  Calendar,
  TrendingUp,
  Shield,
  Mail,
  Users,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Auto-redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case "sales_rep":
          setLocation("/sales-dashboard");
          break;
        case "decision_maker":
          setLocation("/decision-dashboard");
          break;
        case "enterprise_admin":
          setLocation("/enterprise-admin");
          break;
        case "admin":
          setLocation("/admin");
          break;
        case "super_admin":
          setLocation("/super-admin/dashboard");
          break;
        default:
          // Stay on landing page for unknown roles
          break;
      }
    }
  }, [isAuthenticated, user, setLocation]);

  // Fetch subscription plans from public endpoint
  const {
    data: subscriptionPlans,
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({
    queryKey: ["/api/subscription-plans"],
    retry: false,
  });

  const features = [
    {
      icon: UserCheck,
      title: "Verified Decision-Makers",
      description:
        "Access a growing database of verified executives and decision-makers",
      color: "blue",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description:
        "Automated 15-minute intro calls with integrated calendar booking",
      color: "blue",
    },
    {
      icon: TrendingUp,
      title: "AI-Powered Insights",
      description:
        "Custom call preparation and performance analysis for better outcomes",
      color: "green",
    },
    {
      icon: Shield,
      title: "Quality Assurance",
      description:
        "Traffic light validation system ensures top-quality experiences",
      color: "indigo",
    },
    {
      icon: Mail,
      title: "Email Access",
      description:
        "Premium access to decision-maker email addresses with approval",
      color: "yellow",
    },
    {
      icon: Users,
      title: "Pro Teams",
      description:
        "Enterprise solutions for entire sales teams with advanced guides",
      color: "lightblue",
    },
  ];

  // Helper function to format plan data for display
  const formatPlanForDisplay = (plan) => {
    // Extract numeric value from price string (e.g., "$0" -> 0, "$29" -> 29)
    const numericPrice =
      typeof plan.price === "string"
        ? parseFloat(plan.price.replace(/[^0-9.]/g, ""))
        : plan.price;

    const price = numericPrice === 0 ? "Free" : `$${numericPrice}`;
    const period =
      plan.billingInterval && numericPrice > 0
        ? `/${plan.billingInterval === "monthly" ? "month" : plan.billingInterval}`
        : numericPrice > 0
          ? "/month"
          : "";

    // Build comprehensive features list matching signup pages
    const baseFeatures =
      plan.features && plan.features.length > 0 ? plan.features : [];

    // Add structured features based on plan capabilities
    const structuredFeatures = [
      `${plan.maxInvitations || 0} decision maker connections`,
      `${plan.maxCallCredits || 0} call credits per month`,
      plan.prioritySupport
        ? "Priority support & assistance"
        : "Standard email support",
      "LinkedIn profile verification",
      "Calendar integration & scheduling",
      "Quality assurance system",
    ];

    // Add premium features based on plan tier
    // if (numericPrice > 0) {
    //   structuredFeatures.push("Advanced analytics dashboard");
    //   structuredFeatures.push("Email notifications");
    //   structuredFeatures.push("Call recording access");
    // }

    // if (numericPrice >= 39) {
    //   structuredFeatures.push("CRM integrations");
    //   structuredFeatures.push("Executive networking events");
    //   structuredFeatures.push("Performance insights");
    //   structuredFeatures.push("Custom availability settings");
    // }

    // if (numericPrice >= 59) {
    //   structuredFeatures.push("Team management tools");
    //   structuredFeatures.push("White-label options");
    //   structuredFeatures.push("Dedicated account manager");
    //   structuredFeatures.push("Enterprise security features");
    // }

    // Combine custom features with structured features
    const allFeatures = [...baseFeatures, ...structuredFeatures];

    return {
      id: plan.id,
      name: plan.name,
      price: price,
      period: period,
      bestSeller: plan.bestSeller || false,
      features: allFeatures,
      description:
        plan.description || `Perfect for ${plan.name.toLowerCase()} users`,
      maxCallCredits: plan.maxCallCredits,
      maxInvitations: plan.maxInvitations,
      prioritySupport: plan.prioritySupport,
      buttonText:
        numericPrice === 0
          ? "Get Started"
          : plan.name.toLowerCase().includes("team")
            ? "Contact Sales"
            : "Get Started",
      buttonVariant: plan.bestSeller ? "default" : "outline",
    };
  };

  const getIconColor = (color) => {
    const colors = {
      blue: "text-blue-600",
      lightblue: "text-blue-500",
      green: "text-green-600",
      indigo: "text-indigo-600",
      yellow: "text-yellow-600",
    };
    return colors[color] || "text-blue-600";
  };

  const getBgColor = (color) => {
    const colors = {
      blue: "bg-blue-100",
      lightblue: "bg-blue-50",
      green: "bg-green-100",
      indigo: "bg-indigo-100",
      yellow: "bg-yellow-100",
    };
    return colors[color] || "bg-blue-100";
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-blue-600">Warm Intros</span>
            <br />
            to Decision-Makers
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect sales reps with verified executives through a
            community-driven platform. Contribute decision-makers, earn credits,
            book quality intro calls.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup/sales-rep/personal-info">
              <Button
                size="lg"
                className="bg-blue-600 text-white px-8 py-4 text-lg font-semibold hover:bg-blue-700 transform hover:scale-105 transition-all shadow-lg"
              >
                I'm a Sales Rep <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link href="/signup/decision-maker/personal-info">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-blue-600 text-blue-600 px-8 py-4 text-lg font-semibold hover:bg-blue-50"
              >
                I'm a Decision Maker ✓
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How Naeberly Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How Naeborly Works
            </h2>
            <p className="text-xl text-gray-600">
              A contribution-based community where quality connections drive
              mutual success
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-xl transition-all border border-gray-100"
                >
                  <CardContent className="p-8">
                    <div
                      className={`w-12 h-12 ${getBgColor(feature.color)} rounded-xl flex items-center justify-center mb-6`}
                    >
                      <IconComponent
                        className={`${getIconColor(feature.color)} text-xl`}
                        size={24}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600">
              Flexible options for individuals and teams
            </p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">
                Loading pricing plans...
              </span>
            </div>
          ) : plansError ? (
            <div className="text-center py-16">
              <p className="text-gray-500">
                Unable to load pricing plans. Please try again later.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {subscriptionPlans?.map((planData, index) => {
                const plan = formatPlanForDisplay(planData);
                return (
                  <Card
                    key={plan.id || index}
                    className={`relative ${plan.bestSeller ? "border-2 border-blue-600 shadow-xl" : "border border-gray-200 shadow-lg"}`}
                  >
                    {plan.bestSeller && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                          Best Seller
                        </span>
                      </div>
                    )}
                    <CardContent className="p-8">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <div className="text-4xl font-bold text-blue-600 mb-1">
                          {plan.price}
                        </div>
                        {plan.period && (
                          <div className="text-gray-500">{plan.period}</div>
                        )}
                        {plan.description &&
                          plan.description !== plan.features[0] && (
                            <p className="text-sm text-gray-600 mt-3 italic">
                              {plan.description}
                            </p>
                          )}
                      </div>

                      {/* Features List */}
                      <div className="mb-8">
                        <ul className="space-y-3">
                          {plan.features.map((feature, featureIndex) => (
                            <li
                              key={featureIndex}
                              className="flex items-start text-gray-600"
                            >
                              <Check
                                className="text-green-600 mr-3 mt-0.5 flex-shrink-0"
                                size={16}
                              />
                              <span className="text-sm leading-relaxed">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* Additional Plan Details */}
                        {(plan.maxCallCredits !== undefined ||
                          plan.maxInvitations !== undefined ||
                          plan.prioritySupport) && (
                          <div className="mt-6 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                              {plan.maxCallCredits !== undefined && (
                                <div className="flex justify-between">
                                  <span>Call Credits:</span>
                                  <span className="font-medium">
                                    {plan.maxCallCredits === -1
                                      ? "Unlimited"
                                      : plan.maxCallCredits}
                                  </span>
                                </div>
                              )}
                              {plan.maxInvitations !== undefined && (
                                <div className="flex justify-between">
                                  <span>Invitations:</span>
                                  <span className="font-medium">
                                    {plan.maxInvitations === -1
                                      ? "Unlimited"
                                      : plan.maxInvitations}
                                  </span>
                                </div>
                              )}
                              {plan.prioritySupport && (
                                <div className="flex justify-between">
                                  <span>Support:</span>
                                  <span className="font-medium text-blue-600">
                                    Priority
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant={plan.buttonVariant}
                        className={`w-full py-3 font-semibold transition-all ${
                          plan.bestSeller
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                            : plan.name.toLowerCase().includes("team")
                              ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {plan.buttonText}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Connecting?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join the community of sales professionals and decision-makers
            building meaningful business relationships
          </p>
          <Link href="/sales-dashboard">
            <Button
              size="lg"
              className="bg-white text-blue-600 px-8 py-4 text-lg font-bold hover:bg-gray-100 transform hover:scale-105 transition-all shadow-lg"
            >
              Get Started as Sales Rep
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer with Admin Access */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-8">
            <p className="text-gray-400">
              © 2024 Naeborly. All rights reserved.
            </p>
            <Link href="/super-admin/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Access
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
