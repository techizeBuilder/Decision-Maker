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
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { decisionMakerProfessionalSchema, DECISION_MAKER_ALLOWED_TITLES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function DecisionMakerProfessionalInfo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(decisionMakerProfessionalSchema),
    defaultValues: {
      jobTitle: "",
      customJobTitle: "",
      company: "",
      industry: "",
      companySize: "",
      yearsInRole: "",
    },
  });

  const saveProfessionalInfoMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Submitting decision maker professional data:", data);
      const response = await apiRequest(
        "/api/decision-maker/professional-info",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response;
    },
    onSuccess: (data) => {
      console.log("Decision maker professional info saved successfully:", data);
      toast({
        title: "Professional Information Saved",
        description:
          "Your professional background has been saved successfully.",
      });
      setLocation("/signup/decision-maker/availability");
    },
    onError: (error) => {
      console.error("Decision maker professional info save error:", error);
      toast({
        title: "Save Failed",
        description:
          error.message ||
          "Failed to save professional information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    saveProfessionalInfoMutation.mutate(data);
  };

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "Real Estate",
    "Marketing & Advertising",
    "Consulting",
    "Energy",
    "Telecommunications",
    "Transportation",
    "Other",
  ];

  const companySizes = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-1000 employees",
    "1001-5000 employees",
    "5000+ employees",
  ];

  const yearsOptions = [
    "Less than 1 year",
    "1-2 years",
    "3-5 years",
    "6-10 years",
    "More than 10 years",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-2xl mx-auto mt-16 px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step 2 of 4
            </span>
            <span className="text-sm font-medium text-gray-600">
              50% Complete
            </span>
          </div>
          <Progress value={50} className="h-2" />
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Professional Background
              </h1>
              <p className="text-gray-600">
                Tell us about your professional experience and current role
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Job Title (Dropdown + optional custom) */}
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Job Title *
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          // Clear custom job title when selecting anything other than "Other"
                          if (val !== "Other") {
                            form.setValue("customJobTitle", "");
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select your job title" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DECISION_MAKER_ALLOWED_TITLES.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("jobTitle") === "Other" && (
                  <FormField
                    control={form.control}
                    name="customJobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Enter Custom Job Title (Requires Approval)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Innovation Evangelist"
                            {...field}
                            className="mt-1"
                          />
                        </FormControl>
                        <p className="text-xs text-amber-600 mt-1">
                          A super admin must approve this custom title before your account is fully active.
                        </p>
                          {form.watch("jobTitle") === "Other" && <FormMessage />}
                      </FormItem>
                    )}
                  />
                )}

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
                          placeholder="Enter your company name"
                          {...field}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Industry */}
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Industry *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companySizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Years in Role */}
                <FormField
                  control={form.control}
                  name="yearsInRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Years in Current Role
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select years of experience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {yearsOptions.map((years) => (
                            <SelectItem key={years} value={years}>
                              {years}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLocation("/signup/decision-maker/personal-info")
                    }
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>

                  <Button
                    type="submit"
                    disabled={saveProfessionalInfoMutation.isPending}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    {saveProfessionalInfoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
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
