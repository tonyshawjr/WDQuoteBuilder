import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";

export default function Reports() {
  const [, setLocation] = useLocation();
  
  // Get user data from the existing API endpoint
  const { 
    data: user, 
    isLoading 
  } = useQuery({
    queryKey: ['/api/me'],
    retry: false
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Check admin access based on the user object
  // Cast the user object to include isAdmin property
  const userData = user as { isAdmin?: boolean };
  if (!userData.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Reports</h1>
        
        <Tabs defaultValue="feature-usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="feature-usage">Feature Usage Analysis</TabsTrigger>
            <TabsTrigger value="quote-metrics">Quote Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="feature-usage">
            <div className="space-y-6">
              <div className="p-8 bg-[#282828] rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Feature Usage Analysis - Coming Soon</h2>
                <p className="text-gray-400">This report will show the most frequently selected features across all quotes, helping you identify which features are most valuable to your clients.</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="quote-metrics">
            <div className="space-y-6">
              <div className="p-8 bg-[#282828] rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Quote Metrics - Coming Soon</h2>
                <p className="text-gray-400">This report will display metrics about your quotes, including average quote size, quote status distribution, and revenue performance.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}