import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TestSignup() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const { toast } = useToast();

  const testStep1 = async () => {
    try {
      const response = await apiRequest('POST', '/api/sales-rep/personal-info', {
        firstName: "Test",
        lastName: "User",
        email: `test${Date.now()}@example.com`,
        password: "TestPass123!",
        confirmPassword: "TestPass123!",
        linkedinUrl: "https://linkedin.com/in/testuser",
        linkedinVerified: true
      });
      const data = await response.json();
      setUserId(data.userId);
      setStep(2);
      toast({ title: "Step 1 Complete", description: "Personal info saved" });
    } catch (error) {
      toast({ title: "Step 1 Failed", description: error.message, variant: "destructive" });
    }
  };

  const testStep2 = async () => {
    try {
      const response = await apiRequest('/api/sales-rep/professional-info', {
        method: 'POST',
        body: JSON.stringify({
          jobTitle: "Sales Representative",
          company: "Test Company",
          industry: "Technology",
          companySize: "51-200 employees",
          yearsInRole: "1-2 years"
        })
      });
      setStep(3);
      toast({ title: "Step 2 Complete", description: "Professional info saved" });
    } catch (error) {
      toast({ title: "Step 2 Failed", description: error.message, variant: "destructive" });
    }
  };

  const testStep3 = async () => {
    try {
      const response = await apiRequest('/api/sales-rep/invites', {
        method: 'POST',
        body: JSON.stringify({
          decisionMakers: [
            { firstName: "Test", lastName: "Decision Maker", jobTitle: "CTO", email: "dm@test.com" }
          ]
        })
      });
      setStep(4);
      toast({ title: "Step 3 Complete", description: "Invites saved" });
    } catch (error) {
      toast({ title: "Step 3 Failed", description: error.message, variant: "destructive" });
    }
  };

  const testStep4 = async () => {
    try {
      const response = await apiRequest('/api/sales-rep/package', {
        method: 'POST',
        body: JSON.stringify({
          packageType: "premium"
        })
      });
      setStep(5);
      toast({ title: "Step 4 Complete", description: "Signup completed!" });
    } catch (error) {
      toast({ title: "Step 4 Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-6">Test 4-Step Signup Flow</h1>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step > 1 ? 'bg-green-500' : step === 1 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  1
                </span>
                <span>Personal Information</span>
                {step === 1 && (
                  <Button onClick={testStep1} className="ml-auto">
                    Test Step 1
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step > 2 ? 'bg-green-500' : step === 2 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  2
                </span>
                <span>Professional Background</span>
                {step === 2 && (
                  <Button onClick={testStep2} className="ml-auto">
                    Test Step 2
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step > 3 ? 'bg-green-500' : step === 3 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  3
                </span>
                <span>Invite Decision Makers</span>
                {step === 3 && (
                  <Button onClick={testStep3} className="ml-auto">
                    Test Step 3
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step > 4 ? 'bg-green-500' : step === 4 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  4
                </span>
                <span>Choose Package</span>
                {step === 4 && (
                  <Button onClick={testStep4} className="ml-auto">
                    Test Step 4
                  </Button>
                )}
              </div>

              {step === 5 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-green-800 font-semibold">✅ All Steps Complete!</h3>
                  <p className="text-green-700">User ID: {userId}</p>
                  <p className="text-green-700">The 4-step signup flow is working correctly.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}