import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, Plus, Trash2, Loader2, Crown, UserPlus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DECISION_MAKER_ALLOWED_TITLES } from '@shared/schema';

export default function InviteDecisionMakers() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inviteEmails, setInviteEmails] = useState([{ firstName: "", lastName: "", email: "", jobTitle: "", customJobTitle: "" }]);

  // Email validation states for each decision maker
  const [emailValidationStates, setEmailValidationStates] = useState([
    { isValidating: false, isValid: false, error: "" }
  ]);

  // Email validation function
  const validateEmail = useCallback(async (email, index, userEmail) => {
    if (!email || email.length < 3) {
      setEmailValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { isValidating: false, isValid: false, error: "" };
        return newStates;
      });
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { isValidating: false, isValid: false, error: "Invalid email format" };
        return newStates;
      });
      return;
    }

    // Domain matching validation - Decision makers must use same domain as sales rep
    if (userEmail) {
      const salesRepDomain = userEmail.split('@')[1];
      const dmDomain = email.split('@')[1];
      
      if (dmDomain !== salesRepDomain) {
        setEmailValidationStates(prev => {
          const newStates = [...prev];
          newStates[index] = { 
            isValidating: false, 
            isValid: false, 
            error: `Email must use the same domain as your email (@${salesRepDomain})` 
          };
          return newStates;
        });
        return;
      }
    }

    // Mark as valid if all checks pass
    setEmailValidationStates(prev => {
      const newStates = [...prev];
      newStates[index] = { isValidating: false, isValid: true, error: "" };
      return newStates;
    });
  }, []);

  // Debounced email validation
  const debouncedEmailValidation = useCallback((email, index) => {
    setEmailValidationStates(prev => {
      const newStates = [...prev];
      newStates[index] = { isValidating: true, isValid: false, error: "" };
      return newStates;
    });

    const timeoutId = setTimeout(() => {
      validateEmail(email, index, user?.email);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [validateEmail, user?.email]);

  // Helper function to validate invites
  const isInviteValid = (invite, index) => {
    const hasBasicFields = invite.firstName.trim() && invite.lastName.trim() && invite.email.trim() && invite.jobTitle.trim();
    const hasCustomJobTitle = invite.jobTitle !== "Other" || invite.customJobTitle.trim();
    const hasValidEmail = emailValidationStates[index]?.isValid && !emailValidationStates[index]?.error;
    return hasBasicFields && hasCustomJobTitle && hasValidEmail;
  };

  // Fetch remaining invitations
  const { data: remainingInvitations, isLoading: remainingInvitationsLoading } = useQuery({
    queryKey: ['remaining-invitations'],
    queryFn: async () => {
      const response = await apiRequest('/api/sales-rep/invitations/remaining');
      return response;
    },
  });

  // Add invitation mutation
  const addInvitationsMutation = useMutation({
    mutationFn: async (invitations) => {
      const response = await apiRequest('/api/sales-rep/invitations/add', {
        method: 'POST',
        body: JSON.stringify({ invitations }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Invitations Sent Successfully!",
        description: `${data.count} invitation${data.count !== 1 ? 's' : ''} have been sent to decision makers.`,
        variant: "default",
      });
      setLocation('/sales-dashboard');
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Invitations",
        description: error.message || "An error occurred while sending invitations.",
        variant: "destructive",
      });
    },
  });

  const handleAddInviteEmail = () => {
    setInviteEmails([...inviteEmails, { firstName: "", lastName: "", email: "", jobTitle: "", customJobTitle: "" }]);
    setEmailValidationStates([...emailValidationStates, { isValidating: false, isValid: false, error: "" }]);
  };

  const handleRemoveInviteEmail = (index) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index));
      setEmailValidationStates(emailValidationStates.filter((_, i) => i !== index));
    }
  };

  const handleInviteEmailChange = (index, field, value) => {
    const updated = [...inviteEmails];
    updated[index][field] = value;
    setInviteEmails(updated);
    
    // Trigger email validation when email field changes
    if (field === 'email' && value) {
      debouncedEmailValidation(value, index);
    } else if (field === 'email' && !value) {
      // Clear validation state when email is empty
      setEmailValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { isValidating: false, isValid: false, error: "" };
        return newStates;
      });
    }
  };

  const handleSendInvitations = () => {
    const validInvites = inviteEmails.filter((invite, index) => isInviteValid(invite, index));

    if (validInvites.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields (first name, last name, email, and job title) and ensure all emails are valid for at least one decision maker.",
        variant: "destructive",
      });
      return;
    }

    // Check if any emails are still being validated
    const hasValidatingEmails = emailValidationStates.some(state => state.isValidating);
    if (hasValidatingEmails) {
      toast({
        title: "Please Wait",
        description: "Email validation is in progress. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    // Transform the data for the backend API
    const transformedInvites = validInvites.map(invite => ({
      name: `${invite.firstName} ${invite.lastName}`.trim(),
      email: invite.email,
      jobTitle: invite.jobTitle === "Other" ? invite.customJobTitle : invite.jobTitle
    }));
    
    addInvitationsMutation.mutate(transformedInvites);
  };

  const getPackageDisplayName = (packageType, maxInvitations) => {
    if (packageType === 'enterprise') return 'Enterprise';
    if (packageType === 'pro') return 'Pro';
    if (packageType === 'basic') return 'Basic';
    return maxInvitations ? `${maxInvitations} DM Plan` : 'Free';
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/sales-dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-green-600" />
                Invite Decision Makers
              </h1>
              <p className="text-gray-600 mt-1">
                Expand your network by inviting decision makers to join your platform
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                {getPackageDisplayName(user?.packageType, remainingInvitations?.total)}
              </Badge>
              {remainingInvitations && (
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  {remainingInvitations.remaining} invitations left
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Plan Status Card */}
        {remainingInvitations && (
          <Card className="mb-6 border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Your Invitation Status</h3>
                  <p className="text-gray-600 text-sm">
                    You have <strong>{remainingInvitations.remaining}</strong> invitations remaining 
                    on your <strong>{remainingInvitations.planName}</strong> plan
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {remainingInvitations.remaining}/{remainingInvitations.total}
                  </div>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
              </div>
              
              {remainingInvitations.remaining === 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      No invitations remaining. Upgrade your plan to invite more decision makers.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invitation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Decision Maker Details
            </CardTitle>
            <p className="text-sm text-gray-600">
              Please provide complete information for each decision maker you want to invite.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {inviteEmails.map((invite, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    Decision Maker #{index + 1}
                  </h4>
                  {inviteEmails.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveInviteEmail(index)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">First Name *</label>
                    <Input
                      placeholder="e.g., John"
                      value={invite.firstName}
                      onChange={(e) => handleInviteEmailChange(index, 'firstName', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Last Name *</label>
                    <Input
                      placeholder="e.g., Smith"
                      value={invite.lastName}
                      onChange={(e) => handleInviteEmailChange(index, 'lastName', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Job Title *</label>
                    <Select
                      value={invite.jobTitle}
                      onValueChange={(value) => handleInviteEmailChange(index, 'jobTitle', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select job title" />
                      </SelectTrigger>
                      <SelectContent>
                        {DECISION_MAKER_ALLOWED_TITLES.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {invite.jobTitle === "Other" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Custom Job Title *</label>
                      <Input
                        placeholder="e.g., Innovation Evangelist"
                        value={invite.customJobTitle}
                        onChange={(e) => handleInviteEmailChange(index, 'customJobTitle', e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        A super admin must approve this custom title before the account is fully active.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address *</label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="e.g., john@company.com"
                        value={invite.email}
                        onChange={(e) => handleInviteEmailChange(index, 'email', e.target.value)}
                        className={`w-full pr-10 ${
                          emailValidationStates[index]?.error 
                            ? 'border-red-500 focus:border-red-500' 
                            : emailValidationStates[index]?.isValid 
                              ? 'border-green-500 focus:border-green-500'
                              : ''
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {emailValidationStates[index]?.isValidating && (
                          <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
                        )}
                        {!emailValidationStates[index]?.isValidating && emailValidationStates[index]?.isValid && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {!emailValidationStates[index]?.isValidating && emailValidationStates[index]?.error && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {emailValidationStates[index]?.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {emailValidationStates[index].error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add More Button */}
            {inviteEmails.length < 10 && remainingInvitations && inviteEmails.length < remainingInvitations.remaining && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleAddInviteEmail}
                  className="w-full max-w-md border-dashed border-2 border-gray-300 hover:border-green-400 hover:bg-green-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Decision Maker
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setLocation('/sales-dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitations}
                disabled={addInvitationsMutation.isPending || remainingInvitations?.remaining === 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {addInvitationsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Invitations...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Send {inviteEmails.filter((invite, index) => isInviteValid(invite, index)).length} Invitation{inviteEmails.filter((invite, index) => isInviteValid(invite, index)).length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Success</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Provide accurate job titles to help decision makers understand their role</li>
            <li>• Use professional email addresses for better delivery rates</li>
            <li>• Double-check email addresses to avoid bounced invitations</li>
            <li>• Invited decision makers will receive a personalized invitation email</li>
          </ul>
        </div>
      </div>
    </div>
  );
}