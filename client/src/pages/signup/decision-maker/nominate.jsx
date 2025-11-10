import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Users,
  Loader2,
} from "lucide-react";
import { decisionMakerNominationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function DecisionMakerNominate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [salesReps, setSalesReps] = useState([
    { name: "", email: "", company: "", referralReason: "" },
  ]);

  const form = useForm({
    resolver: zodResolver(decisionMakerNominationSchema),
    defaultValues: {
      nominatedSalesReps: [
        { name: "", email: "", company: "", referralReason: "" },
      ],
    },
  });

  const saveNominationMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Submitting decision maker nomination data:", data);
      
      // Get userId from sessionStorage for VPS compatibility
      const userId = sessionStorage.getItem("signupUserId");
      console.log("🚀 DM NOMINATE - Using userId from sessionStorage:", userId);
      
      const requestData = {
        ...data,
        userId: userId
      };
      
      console.log("🚀 DM NOMINATE - Request payload:", requestData);
      
      const response = await apiRequest("/api/decision-maker/nominate", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("Decision maker nominations saved successfully:", data);
      toast({
        title: "Registration Complete!",
        description: data.message || "Registration completed successfully!",
      });
      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    },
    onError: (error) => {
      console.error("Decision maker nomination save error:", error);
      toast({
        title: "Save Failed",
        description:
          error.message || "Failed to save nominations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    // Filter out empty entries
    const validNominations = data.nominatedSalesReps.filter(
      (rep) => rep.name || rep.email,
    );
    saveNominationMutation.mutate({ nominatedSalesReps: validNominations });
  };

  const addSalesRep = () => {
    const newSalesReps = [
      ...salesReps,
      { name: "", email: "", company: "", referralReason: "" },
    ];
    setSalesReps(newSalesReps);
    form.setValue("nominatedSalesReps", newSalesReps);
  };

  const removeSalesRep = (index) => {
    if (salesReps.length > 1) {
      const newSalesReps = salesReps.filter((_, i) => i !== index);
      setSalesReps(newSalesReps);
      form.setValue("nominatedSalesReps", newSalesReps);
    }
  };

  const skipStep = () => {
    // Submit empty nominations to complete registration
    saveNominationMutation.mutate({ nominatedSalesReps: [] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-20 sm:pt-24 lg:pt-20">
        {/* Progress Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              Step 4 of 4
            </span>
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              100% Complete
            </span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Nominate Sales Representatives
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Complete your registration! You've been allocated 3 calls per month.
                Optionally nominate quality sales reps to help build our community.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-start space-x-3">
                <Users className="text-purple-600 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-medium text-purple-900 mb-2">
                    Earn Credits by Nominating
                  </h3>
                  <p className="text-sm text-purple-700 mb-3">
                    For each sales rep you nominate who successfully joins and
                    completes calls, you earn credits that can be used for
                    premium features or extended call durations.
                  </p>
                  <ul className="text-xs text-purple-600 space-y-1">
                    <li>• Successful nomination = 5 credits</li>
                    <li>• Completed intro call = 2 additional credits</li>
                    <li>• Quality ratings boost your standing</li>
                  </ul>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* {salesReps.map((_, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium text-gray-900">
                          Sales Rep #{index + 1}
                        </h4>
                        {salesReps.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSalesRep(index)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name={`nominatedSalesReps.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Full Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Sales rep's full name"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const newSalesReps = [...salesReps];
                                    newSalesReps[index].name = e.target.value;
                                    setSalesReps(newSalesReps);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`nominatedSalesReps.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Email Address
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="email@company.com"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const newSalesReps = [...salesReps];
                                    newSalesReps[index].email = e.target.value;
                                    setSalesReps(newSalesReps);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`nominatedSalesReps.${index}.company`}
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Company
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Their company name"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const newSalesReps = [...salesReps];
                                  newSalesReps[index].company = e.target.value;
                                  setSalesReps(newSalesReps);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`nominatedSalesReps.${index}.referralReason`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Why do you recommend them?
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell us why this sales rep would be a good addition to our platform..."
                                rows={3}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const newSalesReps = [...salesReps];
                                  newSalesReps[index].referralReason =
                                    e.target.value;
                                  setSalesReps(newSalesReps);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))} */}

                {/* <Button
                  type="button"
                  variant="outline"
                  onClick={addSalesRep}
                  className="w-full flex items-center gap-2 border-dashed"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Sales Rep
                </Button> */}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLocation("/signup/decision-maker/availability")
                    }
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>

                  <div className="flex gap-2">
                    {/* <Button
                      type="button"
                      variant="ghost"
                      onClick={skipStep}
                      className="text-gray-600"
                    >
                      Skip for now
                    </Button> */}

                    <Button
                      type="submit"
                      disabled={saveNominationMutation.isPending}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-purple-700"
                    >
                      {saveNominationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
