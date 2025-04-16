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
        const res = await apiRequest("POST", "/api/business-name", { 
          businessName: newBusinessName 
        });
        const data = await res.json();
        console.log("Response from business name update:", data);
        return data;
      } catch (error) {
        console.error("Error updating business name:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/business-name"] });
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
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>Update your business information</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                id="businessName"
                placeholder="Enter your business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            )}
            <p className="text-sm text-muted-foreground">
              This name will appear in the header and on all quotes.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isLoading || updateMutation.isPending || businessName === data?.businessName}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}