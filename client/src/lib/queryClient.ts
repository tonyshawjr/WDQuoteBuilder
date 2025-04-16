import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (e) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  options: RequestInit = {},
) {
  try {
    const defaultOptions: RequestInit = {
      method: method,
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add body if provided
    if (body !== undefined) {
      defaultOptions.body = JSON.stringify(body);
    }
    
    // Merge options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    };
    
    console.log(`API request (${url})`, {
      headers: mergedOptions.headers,
      contentType: (mergedOptions.headers as any)['Content-Type'],
      bodyType: mergedOptions.body ? typeof mergedOptions.body : 'none',
      bodyPreview: mergedOptions.body && typeof mergedOptions.body === 'string' 
        ? mergedOptions.body.substring(0, 100) 
        : 'N/A'
    });
    
    const res = await fetch(url, mergedOptions);
    await throwIfResNotOk(res);
    
    // For empty responses
    if (res.status === 204) {
      return res;
    }
    
    // Try to parse as JSON first
    try {
      const clonedRes = res.clone();
      const data = await clonedRes.json();
      return data;
    } catch (e) {
      // If not JSON, return the response itself
      return res;
    }
  } catch (error) {
    console.error(`API request error (${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options?: {
  on401?: UnauthorizedBehavior;
}) => QueryFunction<T> =
  (options = {}) =>
  async ({ queryKey }) => {
    const unauthorizedBehavior = options.on401 || "returnNull";
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query error (${queryKey[0]}):`, error);
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Changed to returnNull for smoother UX
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute, for better UX but still keeping auth state fresh
      retry: 1, // Allow one retry
    },
    mutations: {
      retry: 1,
    },
  },
});
