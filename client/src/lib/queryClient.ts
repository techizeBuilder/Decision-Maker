import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getToken, removeToken, isTokenExpired } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        // Try to parse as JSON first to get structured error
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || text;
        } catch {
          // If not JSON, use the text as is
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use status text
      errorMessage = res.statusText;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    throw error;
  }
}

export async function apiRequest(
  url: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<any> {
  const { method = "GET", body, headers = {} } = options;
  const token = getToken();
  
  console.log('apiRequest - URL:', url, 'Method:', method);
  console.log('apiRequest - Token exists:', !!token);
  console.log('apiRequest - Token expired:', token ? isTokenExpired(token) : 'N/A');
  
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add authorization header if token exists and is valid
  if (token && !isTokenExpired(token)) {
    requestHeaders.Authorization = `Bearer ${token}`;
    console.log('apiRequest - Authorization header added');
  } else {
    console.log('apiRequest - No valid token available');
  }
  
  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body,
  });

  console.log('apiRequest - Response status:', res.status);

  // Check if this is a feedback endpoint that shouldn't require authentication
  const isFeedbackEndpoint = url.includes('/initial-feedback/');
  
  if ((res.status === 401 || res.status === 403) && !isFeedbackEndpoint) {
    // For explicit API calls (mutations), throw error instead of redirecting
    await throwIfResNotOk(res);
  }

  await throwIfResNotOk(res);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response:', text);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token && !isTokenExpired(token)) {
      headers.Authorization = `Bearer ${token}`;
    } else if (token && isTokenExpired(token)) {
      // Remove expired token immediately
      removeToken();
    }
    
    const res = await fetch(queryKey[0] as string, { headers });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      removeToken();
      return null;
    }

    if (res.status === 401 || res.status === 403) {
      // Token is invalid or expired, remove it
      removeToken();
      throw new Error(`${res.status}: Unauthorized`);
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
