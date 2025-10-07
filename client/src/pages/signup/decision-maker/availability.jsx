import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Calendar } from "lucide-react";

const availabilitySchema = z.object({
  preferredTimeZone: z.string().min(1, "Please select a time zone"),
});

const timeZones = [
  { value: "UTC-8", label: "Pacific Time (UTC-8)" },
  { value: "UTC-7", label: "Mountain Time (UTC-7)" },
  { value: "UTC-6", label: "Central Time (UTC-6)" },
  { value: "UTC-5", label: "Eastern Time (UTC-5)" },
  { value: "UTC+0", label: "GMT (UTC+0)" },
  { value: "UTC+1", label: "Central European Time (UTC+1)" },
  { value: "UTC+5:30", label: "India Standard Time (UTC+5:30)" },
  { value: "UTC+8", label: "China Standard Time (UTC+8)" },
];

// Removed unused arrays since we now use defaults

export default function DecisionMakerAvailability() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      preferredTimeZone: "",
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: (data) => apiRequest("/api/decision-maker/availability", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: (data) => {
      toast({
        title: "Availability Preferences Saved",
        description: "Your availability has been saved successfully.",
      });
      setLocation("/signup/decision-maker/nominate");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save availability preferences",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    // Add default values for all availability preferences
    const fullData = {
      ...data,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      preferredTimes: ["9:00 AM - 11:00 AM", "11:00 AM - 1:00 PM", "1:00 PM - 3:00 PM", "3:00 PM - 5:00 PM", "5:00 PM - 7:00 PM", "7:00 PM - 9:00 PM"],
      maxCallsPerWeek: "3",
      availabilityType: "flexible",
      timezone: data.preferredTimeZone // Also send timezone field for compatibility
    };
    console.log("Submitting availability data:", fullData);
    saveAvailabilityMutation.mutate(fullData);
  };

  // Removed handlers for days and times since they're now set as defaults

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
                Availability Preferences
              </h1>
              <p className="text-gray-600">
                Please select your preferred timezone. You'll be available for calls all days and times with a maximum of 3 calls per month.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Time Zone */}
                <FormField
                  control={form.control}
                  name="preferredTimeZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Preferred Time Zone *</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your time zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeZones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Availability Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900 mb-1">
                        Default Availability Settings
                      </h3>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Available all days of the week</p>
                        <p>• Available all business hours (9:00 AM - 9:00 PM)</p>
                        <p>• Maximum 3 calls per month</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/signup/decision-maker/professional-info")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveAvailabilityMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saveAvailabilityMutation.isPending ? "Saving..." : "Continue"}
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