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

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  try {
    // Ensure proper content-type header for JSON data
    const headers = new Headers(options?.headers || {});
    if (options?.body && !headers.has('Content-Type') && typeof options.body === 'string') {
      try {
        // Check if body is valid JSON
        JSON.parse(options.body);
        headers.set('Content-Type', 'application/json');
      } catch (e) {
        // Not JSON, don't set content-type
        console.log('Request body is not valid JSON, not setting content-type header');
      }
    }
    
    console.log(`API request (${options?.method || 'GET'} ${url})`, {
      headers: Object.fromEntries([...headers.entries()]),
      contentType: headers.get('Content-Type'),
      bodyType: options?.body ? typeof options.body : 'none',
      bodyPreview: options?.body && typeof options.body === 'string' 
        ? options.body.substring(0, 100) 
        : 'N/A'
    });
    
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    console.error(`API request error (${options?.method || 'GET'} ${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
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
