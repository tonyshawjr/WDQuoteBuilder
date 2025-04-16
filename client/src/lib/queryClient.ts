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
  data?: any,
  customOptions?: RequestInit,
) {
  try {
    const options: RequestInit = {
      method,
      ...customOptions,
      credentials: "include",
    };
    
    // Set up headers
    const headers = new Headers(customOptions?.headers || {});
    
    // Handle JSON data
    if (data !== undefined) {
      // If data is already a string, assume it's pre-formatted
      if (typeof data === 'string') {
        options.body = data;
        if (!headers.has('Content-Type')) {
          try {
            JSON.parse(data);
            headers.set('Content-Type', 'application/json');
          } catch (e) {
            // Not valid JSON, don't set content type
          }
        }
      } else {
        // Convert objects to JSON string
        options.body = JSON.stringify(data);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }
    
    options.headers = headers;
    
    console.log(`API request (${method} ${url})`, {
      headers: Object.fromEntries([...headers.entries()]),
      contentType: headers.get('Content-Type'),
      bodyType: options.body ? typeof options.body : 'none',
      bodyPreview: options.body && typeof options.body === 'string' 
        ? options.body.substring(0, 100) 
        : 'N/A'
    });
    
    const res = await fetch(url, options);
    await throwIfResNotOk(res);
    
    // Add json method to response for backward compatibility
    const response = res as Response & { json: () => Promise<any> };
    response.json = () => res.json();
    
    return response;
  } catch (error) {
    console.error(`API request error (${method} ${url}):`, error);
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
