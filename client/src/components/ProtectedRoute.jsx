import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    console.log('ProtectedRoute effect:', { isLoading, isAuthenticated, user: user?.role, requiredRole });
    
    // Add a small delay to prevent premature redirects during token loading
    const checkAuth = setTimeout(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          console.log('Not authenticated, redirecting to login');
          toast({
            title: "Authentication Required",
            description: "Please sign in to access this page",
            variant: "destructive",
          });
          setLocation('/login');
          return;
        }

        if (requiredRole && user?.role !== requiredRole) {
          console.log('Role mismatch:', { userRole: user?.role, requiredRole });
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page",
            variant: "destructive",
          });
          
          // Redirect to appropriate dashboard based on user role
          if (user?.role === 'sales_rep') {
            setLocation('/sales-dashboard');
          } else if (user?.role === 'decision_maker') {
            setLocation('/decision-dashboard');
          } else {
            setLocation('/');
          }
          return;
        }
      }
    }, 100);

    return () => clearTimeout(checkAuth);
  }, [isAuthenticated, isLoading, user, requiredRole, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  return children;
}