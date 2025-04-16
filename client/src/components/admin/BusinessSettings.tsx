import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { HexColorPicker } from "react-colorful";

export default function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [lightModeColor, setLightModeColor] = useState("#1E40AF"); // Default blue
  const [darkModeColor, setDarkModeColor] = useState("#F9B200"); // Default yellow
  const [showLightModePicker, setShowLightModePicker] = useState(false);
  const [showDarkModePicker, setShowDarkModePicker] = useState(false);
  
  // Get the current system settings
  const { data: settingsData, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ["/api/system-settings"],
    async queryFn() {
      const res = await fetch("/api/system-settings");
      if (!res.ok) throw new Error("Failed to fetch system settings");
      const data = await res.json();
      return data;
    }
  });
  
  // Get the current business name (for backward compatibility)
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/business-name"],
    async queryFn() {
      const res = await fetch("/api/business-name");
      if (!res.ok) throw new Error("Failed to fetch business name");
      const data = await res.json();
      return data;
    }
  });
  
  // Set the initial business name and colors when data is loaded
  React.useEffect(() => {
    if (data?.businessName) {
      setBusinessName(data.businessName);
    }
    
    if (settingsData) {
      if (settingsData.lightModeColor) {
        setLightModeColor(settingsData.lightModeColor);
      }
      if (settingsData.darkModeColor) {
        setDarkModeColor(settingsData.darkModeColor);
      }
    }
  }, [data, settingsData]);
  
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
  
  // Update brand colors mutation
  const updateColorsMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Sending brand colors update:", { lightModeColor, darkModeColor });
        const response = await fetch("/api/brand-colors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ lightModeColor, darkModeColor }),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update brand colors");
        }
        
        const data = await response.json();
        console.log("Response from brand colors update:", data);
        return data;
      } catch (error) {
        console.error("Error updating brand colors:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Directly update the query data instead of invalidating
      queryClient.setQueryData(["/api/system-settings"], { 
        ...settingsData,
        lightModeColor,
        darkModeColor
      });
      toast({
        title: "Brand colors updated",
        description: "Your brand colors have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update brand colors",
        variant: "destructive",
      });
    }
  });
  
  const handleBusinessNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(businessName);
  };
  
  const handleColorsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateColorsMutation.mutate();
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
    <div className="bg-[#282828] rounded-xl overflow-hidden shadow-md ring-1 ring-gray-800">
      <div className="px-6 py-6 md:px-10 md:py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Business Information</h2>
          <p className="text-gray-400 mt-1">
            Configure your business details displayed throughout the application
          </p>
        </div>
        
        {/* Business Name Form */}
        <form onSubmit={handleBusinessNameSubmit} className="mb-12">
          <div className="max-w-2xl">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <Label htmlFor="businessName" className="text-gray-300 font-medium text-base block mb-2">
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Enter your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="h-12 bg-[#1F1F1F] border-gray-700 focus:bg-[#282828] focus:ring-1 focus:ring-[#F9B200]/30 text-white transition-all shadow-none rounded-lg"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    This name will appear on quotes, invoices, and in the application header.
                  </p>
                </div>
                
                <div className="flex items-start bg-[#1F1F1F] rounded-lg p-4 mb-6 border border-gray-700">
                  <div className="flex-shrink-0 bg-[#282828] rounded-full p-1 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#F9B200]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F9B200]">
                      Branding is important
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Your business name appears in the application header and on all quotes generated by your team. It helps maintain consistent branding across all client communications.
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-700">
                  <Button 
                    type="submit" 
                    disabled={isLoading || updateMutation.isPending || businessName === data?.businessName}
                    className="rounded-lg shadow-sm px-6 py-3 h-auto"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Changes...
                      </>
                    ) : (
                      "Update Business Name"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Brand Colors Form */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Brand Colors</h2>
          
          <form onSubmit={handleColorsSubmit} className="max-w-2xl">
            {settingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Light Mode Color */}
                  <div className="mb-6">
                    <Label htmlFor="lightModeColor" className="text-gray-300 font-medium text-base block mb-2">
                      Light Mode Accent Color
                    </Label>
                    <div className="flex space-x-3 items-center">
                      <div 
                        className="h-12 w-12 rounded-lg cursor-pointer border border-gray-600 flex items-center justify-center relative"
                        onClick={() => setShowLightModePicker(!showLightModePicker)}
                        style={{ backgroundColor: lightModeColor }}
                      >
                        {lightModeColor && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="sr-only">Selected color</span>
                          </div>
                        )}
                      </div>
                      <Input
                        id="lightModeColor"
                        placeholder="#RRGGBB"
                        value={lightModeColor}
                        onChange={(e) => setLightModeColor(e.target.value)}
                        required
                        className="h-12 bg-[#1F1F1F] border-gray-700 focus:bg-[#282828] focus:ring-1 focus:ring-[#F9B200]/30 text-white transition-all shadow-none rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Used for buttons and UI elements in light mode.
                    </p>
                    {showLightModePicker && (
                      <div className="mt-3 relative z-10">
                        <div className="absolute top-1 left-1">
                          <HexColorPicker 
                            color={lightModeColor} 
                            onChange={setLightModeColor} 
                          />
                        </div>
                        <div className="fixed inset-0" onClick={() => setShowLightModePicker(false)}></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Dark Mode Color */}
                  <div className="mb-6">
                    <Label htmlFor="darkModeColor" className="text-gray-300 font-medium text-base block mb-2">
                      Dark Mode Accent Color
                    </Label>
                    <div className="flex space-x-3 items-center">
                      <div 
                        className="h-12 w-12 rounded-lg cursor-pointer border border-gray-600 flex items-center justify-center relative"
                        onClick={() => setShowDarkModePicker(!showDarkModePicker)}
                        style={{ backgroundColor: darkModeColor }}
                      >
                        {darkModeColor && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="sr-only">Selected color</span>
                          </div>
                        )}
                      </div>
                      <Input
                        id="darkModeColor"
                        placeholder="#RRGGBB"
                        value={darkModeColor}
                        onChange={(e) => setDarkModeColor(e.target.value)}
                        required
                        className="h-12 bg-[#1F1F1F] border-gray-700 focus:bg-[#282828] focus:ring-1 focus:ring-[#F9B200]/30 text-white transition-all shadow-none rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Used for buttons and UI elements in dark mode.
                    </p>
                    {showDarkModePicker && (
                      <div className="mt-3 relative z-10">
                        <div className="absolute top-1 left-1">
                          <HexColorPicker 
                            color={darkModeColor} 
                            onChange={setDarkModeColor} 
                          />
                        </div>
                        <div className="fixed inset-0" onClick={() => setShowDarkModePicker(false)}></div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start bg-[#1F1F1F] rounded-lg p-4 mb-6 border border-gray-700">
                  <div className="flex-shrink-0 bg-[#282828] rounded-full p-1 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#F9B200]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F9B200]">
                      Customize your branding
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      These colors will be used throughout the application for buttons, links, and other UI elements. Choose colors that match your brand identity.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    type="submit" 
                    disabled={settingsLoading || updateColorsMutation.isPending}
                    className="rounded-lg shadow-sm px-6 py-3 h-auto"
                  >
                    {updateColorsMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Colors...
                      </>
                    ) : (
                      "Update Brand Colors"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}