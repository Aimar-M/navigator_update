import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    let errorData;
    try {
      // Try to parse as JSON first
      errorData = await res.json();
      errorText = errorData.message || JSON.stringify(errorData);
    } catch (e) {
      // If not JSON, get as text
      try {
        errorText = await res.text();
      } catch (e2) {
        errorText = res.statusText;
      }
    }
    
    // Create error with additional data for RSVP handling and account deletion
    const error = new Error(`${res.status}: ${errorText}`);
    if (errorData?.requiresRSVP) {
      (error as any).requiresRSVP = true;
      (error as any).rsvpStatus = errorData.rsvpStatus;
    }
    // Attach all error data for account deletion blocking trips
    if (errorData) {
      (error as any).message = errorData.message || errorText;
      (error as any).blockingTrips = errorData.blockingTrips;
      (error as any).details = errorData.details;
    }
    throw error;
  }
}


export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Set up headers with authentication token
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const baseUrl = import.meta.env.VITE_API_URL;
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = JSON.stringify(data);
  }

  const res = await fetch(fullUrl, fetchOptions);

  await throwIfResNotOk(res);

  const json = await res.json();
  return json;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Set up headers with authentication token
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: 'include', // Include cookies for session auth
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
