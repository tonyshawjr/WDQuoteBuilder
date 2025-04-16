import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  
  // Get the current business name
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/business-name"],
    async queryFn() {
      const res = await fetch("/api/business-name");
      if (!res.ok) throw new Error("Failed to fetch business name");
      const data = await res.json();
      return data;
    }
  });
  
  // Set the initial business name when data is loaded
  React.useEffect(() => {
    if (data?.businessName) {
      setBusinessName(data.businessName);
    }
  }, [data]);
  
  // Update business name mutation
  const updateMutation = useMutation({
    mutationFn: async (newBusinessName: string) => {
      try {
        console.log("Sending businessName update:", newBusinessName);
        // Use direct fetch instead of apiRequest to ensure proper handling
        const response = await fetch("/api/business-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ businessName: newBusinessName }),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update business name");
        }
        
        const data = await response.json();
        console.log("Response from business name update:", data);
        return data;
      } catch (error) {
        console.error("Error updating business name:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Directly update the query data instead of invalidating
      queryClient.setQueryData(["/api/business-name"], { businessName: businessName });
      toast({
        title: "Business name updated",
        description: "Your business name has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update business name",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(businessName);
  };
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Settings</CardTitle>
          <CardDescription>An error occurred while loading business settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error instanceof Error ? error.message : "Failed to load business settings"}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="bg-gray-50 border-b px-6 py-4">
        <CardTitle className="text-xl">Business Settings</CardTitle>
        <CardDescription className="text-gray-600 mt-1">
          Update your business information
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="px-6 py-5 space-y-6">
          <div>
            <Label htmlFor="businessName" className="text-gray-700 font-medium mb-2 block">
              Business Name
            </Label>
            {isLoading ? (
              <Skeleton className="h-11 w-full" />
            ) : (
              <div className="space-y-4">
                <Input
                  id="businessName"
                  placeholder="Enter your business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="shadow-sm h-11"
                />
                <div className="bg-blue-50 border border-blue-100 rounded-md p-4 flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-700 font-medium mb-1">Important</p>
                    <p className="text-sm text-blue-600">
                      This name will appear in the application header and on all quotes generated by your team.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading || updateMutation.isPending || businessName === data?.businessName}
            className="shadow-sm"
            size="lg"
          >
            {updateMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}