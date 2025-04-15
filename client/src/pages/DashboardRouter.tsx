import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * This component redirects users to the appropriate dashboard based on their role
 */
export default function DashboardRouter() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, go to login page
        setLocation("/login");
      } else if (user.isAdmin) {
        // Admin user goes to admin dashboard
        setLocation("/admin-dashboard");
      } else {
        // Regular user goes to simple dashboard
        setLocation("/dashboard");
      }
    }
  }, [loading, user, setLocation]);

  // Show loading state while deciding where to redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
    </div>
  );
}