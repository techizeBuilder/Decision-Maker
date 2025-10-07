import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { getToken, isTokenExpired } from "@/lib/auth";

export function useAuth() {
  const token = getToken();
  const isValidToken = token && !isTokenExpired(token);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/current-user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!isValidToken,
    retry: false,
  });

  return {
    user,
    isLoading: isValidToken ? isLoading : false,
    isAuthenticated: !!user && !!isValidToken,
  };
}