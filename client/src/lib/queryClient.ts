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
    const res = await fetch(url, {
      ...options,
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
