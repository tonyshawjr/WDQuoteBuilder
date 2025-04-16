import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  
  // Fetch the current user on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await apiRequest("GET", "/api/me");
        setUser(userData);
        queryClient.setQueryData(['/api/me'], userData);
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [queryClient]);
  
  const login = async (username: string, password: string): Promise<User> => {
    try {
      console.log("Attempting login with:", username);
      const userData = await apiRequest("POST", "/api/login", { username, password });
      
      console.log("Login data:", userData);
      setUser(userData);
      queryClient.setQueryData(['/api/me'], userData);
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };
  
  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await apiRequest("GET", "/api/me");
      setUser(userData);
      queryClient.setQueryData(['/api/me'], userData);
    } catch (error) {
      console.error("Refresh user error:", error);
      // Just silently fail without changing user state on refresh error
      setUser(null);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiRequest("POST", "/api/logout");
      setUser(null);
      queryClient.setQueryData(['/api/me'], null);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      queryClient.setQueryData(['/api/me'], null);
    }
  };
  
  const isAdmin = user?.isAdmin ?? false;
  
  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAdmin
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
