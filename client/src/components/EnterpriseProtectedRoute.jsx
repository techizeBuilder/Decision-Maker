import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function EnterpriseProtectedRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access this page",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }

      // Check for enterprise admin role
      if (user?.role !== "enterprise_admin") {
        toast({
          title: "Access Denied",
          description:
            "Enterprise admin privileges required to access this page",
          variant: "destructive",
        });

        // Redirect based on user role
        if (user?.role === "sales_rep") {
          setLocation("/sales-dashboard");
        } else if (user?.role === "decision_maker") {
          setLocation("/decision-dashboard");
        } else if (user?.role === "super_admin") {
          setLocation("/super-admin-dashboard");
        } else {
          setLocation("/");
        }
        return;
      }

      // Verify company domain (additional security check)
      if (!user?.companyDomain || !user?.domainVerified) {
        toast({
          title: "Domain Verification Required",
          description:
            "Your company domain must be verified for enterprise access",
          variant: "destructive",
        });
        setLocation("/");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying enterprise access...</p>
        </div>
      </div>
    );
  }

  // Only render children if all checks pass
  if (
    isAuthenticated &&
    user?.role === "enterprise_admin" &&
    user?.domainVerified
  ) {
    return children;
  }

  // Return null while redirecting
  return null;
}
