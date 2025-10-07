import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { salesRepProfessionalSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function SalesRepProfessionalBackground() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(salesRepProfessionalSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      industry: "",
      companySize: "",
      yearsInRole: "",
    },
  });

  const saveProfessionalMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Submitting professional data:", data);
      const response = await apiRequest(
        "/api/sales-rep/professional-info",
        "POST",
        data,
      );
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Professional information saved successfully!",
      });
      setLocation("/signup/sales-rep/invite-decision-makers");
    },
    onError: (error) => {
      console.error("Professional info save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save professional information",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    saveProfessionalMutation.mutate(data);
  };

  const handleBack = () => {
    setLocation("/signup/sales-rep/package");
  };

  const industries = [
    "Technology",
    "Manufacturing",
    "Healthcare",
    "Finance",
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
      <div className="max-w-2xl mx-auto mt-16 px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 3 of 4
            </span>
            <span className="text-sm font-medium text-gray-600">
              75% Complete
            </span>
          </div>
          <Progress value={75} className="h-2" />
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

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Job Title */}
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Job Title *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Senior Sales Manager"
                          {...field}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company */}
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Company *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Salesforce, HubSpot, Microsoft"
                          {...field}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Industry */}
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Industry *
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {industries.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company Size */}
                  <FormField
                    control={form.control}
                    name="companySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Company Size *
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
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
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Years in Current Role */}
                <FormField
                  control={form.control}
                  name="yearsInRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Years in Current Role
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 1-2 years"
                          {...field}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-600"
                  >
                    <ArrowLeft className="mr-2" size={16} />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveProfessionalMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 px-8"
                  >
                    {saveProfessionalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
