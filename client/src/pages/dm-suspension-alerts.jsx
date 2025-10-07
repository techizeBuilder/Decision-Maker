import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  ArrowLeft,
  Shield,
  CheckCircle
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function DMSuspensionAlerts() {
  // Fetch suspicious activity for current DM
  const { data: suspiciousActivity, isLoading } = useQuery({
    queryKey: ['/api/decision-maker/suspicious-activity'],
    retry: false
  });

  const getSuspensionBadge = (suspension) => {
    if (!suspension.isActive) {
      return <Badge variant="secondary">Lifted</Badge>;
    }
    
    const endDate = new Date(suspension.endDate);
    const now = new Date();
    
    if (endDate < now) {
      return <Badge variant="outline">Expired</Badge>;
    }
    
    const variant = suspension.type === "90-day" ? "destructive" : "secondary";
    return <Badge variant={variant}>Active - {suspension.type}</Badge>;
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/decision-dashboard">
            <Button variant="ghost" className="mb-4 p-0 text-gray-600 hover:text-blue-600">
              <ArrowLeft className="mr-2" size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Rep Security Alerts</h1>
            <p className="text-gray-600 mt-1">Monitor suspended sales reps in your network</p>
          </div>
        </div>

        {!suspiciousActivity?.hasSuspiciousActivity ? (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <Shield className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">All Clear</h2>
              <p className="text-gray-600">
                No suspended sales reps have interacted with your company. Your network is secure.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Alert */}
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="space-y-2">
                  <div className="font-semibold">
                    Security Alert: {suspiciousActivity.suspendedRepsCount} Suspended Sales Rep{suspiciousActivity.suspendedRepsCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm">
                    We've detected sales representatives who have been suspended due to poor behavior, 
                    rule violations, or red flag feedback from other decision makers.
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Suspended Reps List */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={20} />
                  Suspended Sales Representatives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suspiciousActivity.suspendedReps.map((rep) => (
                    <div key={rep.repId} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <User className="text-orange-600" size={16} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {rep.repName}
                              </h3>
                              <p className="text-sm text-gray-600">{rep.repEmail}</p>
                            </div>
                            {getSuspensionBadge(rep.suspension)}
                          </div>
                          
                          <div className="ml-13 space-y-1">
                            <p className="text-sm text-orange-700 font-medium">
                              Reason: {rep.suspension.suspensionReason}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>
                                  Suspended: {format(new Date(rep.suspension.startDate), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>
                                  Until: {format(new Date(rep.suspension.endDate), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              {rep.suspension.isActive && new Date(rep.suspension.endDate) > new Date() && (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  <span>{getDaysRemaining(rep.suspension.endDate)} days remaining</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            View History
                          </Button>
                          <Button size="sm" variant="destructive">
                            Block Rep
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Security Recommendations */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="text-blue-500" size={20} />
                  Security Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-1" size={16} />
                    <div>
                      <h4 className="font-medium text-gray-900">Be Cautious with Future Interactions</h4>
                      <p className="text-sm text-gray-600">
                        These sales reps have been flagged for poor behavior. Exercise extra caution if they attempt to schedule future meetings.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-1" size={16} />
                    <div>
                      <h4 className="font-medium text-gray-900">Report Any Issues</h4>
                      <p className="text-sm text-gray-600">
                        If suspended reps contact you directly or behave inappropriately, report it immediately to platform administrators.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-1" size={16} />
                    <div>
                      <h4 className="font-medium text-gray-900">Review Your Feedback</h4>
                      <p className="text-sm text-gray-600">
                        Your honest feedback helps maintain platform quality and protects other decision makers.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}