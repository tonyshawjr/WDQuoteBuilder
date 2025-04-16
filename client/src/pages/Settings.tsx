import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { UserManagement } from "@/components/admin/UserManagement";
import { ProjectTypesManager } from "@/components/admin/ProjectTypesManager";
import { FeaturesAndPagesManager } from "@/components/admin/FeaturesAndPagesManager";
import BusinessSettings from "@/components/admin/BusinessSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, FileText, Settings as SettingsIcon, Database, Building2, ChevronRight } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Settings() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const isMobile = useIsMobile();
  
  // Adjust layout for mobile view
  useEffect(() => {
    // If the user has admin privileges and the screen becomes mobile-sized,
    // we want to ensure that tabs display properly
    if (isMobile && isAdmin && activeTab === "features-pages") {
      // On very small screens, select a tab with shorter text
      setActiveTab("business");
    }
  }, [isMobile, isAdmin, activeTab]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user) {
    // Redirect happens in the AuthProvider, so this should not be visible long
    return null;
  }
  
  return (
    <>
      <Header />
      <div className="bg-gray-50 min-h-screen pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
            <p className="text-gray-600">Manage your account and application settings</p>
          </div>
          
          <Card className="overflow-hidden border-0 shadow-md">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Desktop Tabs - Side Navigation */}
                <div className="flex flex-col md:flex-row h-full">
                  <div className="md:w-64 bg-gray-50 border-r border-gray-200">
                    <ScrollArea className="h-full">
                      <div className="py-4 px-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                          User Settings
                        </h3>
                        <TabsList className="flex flex-col w-full space-y-1 bg-transparent h-auto p-0">
                          <TabsTrigger 
                            value="profile" 
                            className="justify-start px-3 py-2 h-10 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            My Profile
                            <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                          </TabsTrigger>
                          
                          {isAdmin && (
                            <>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3 px-3">
                                Admin Settings
                              </h3>
                              <TabsTrigger 
                                value="business" 
                                className="justify-start px-3 py-2 h-10 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                              >
                                <Building2 className="h-4 w-4 mr-2" />
                                Business
                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                              </TabsTrigger>
                              <TabsTrigger 
                                value="users" 
                                className="justify-start px-3 py-2 h-10 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Users
                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                              </TabsTrigger>
                              <TabsTrigger 
                                value="project-types" 
                                className="justify-start px-3 py-2 h-10 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Project Types
                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                              </TabsTrigger>
                              <TabsTrigger 
                                value="features-pages" 
                                className="justify-start px-3 py-2 h-10 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                              >
                                <Database className="h-4 w-4 mr-2" />
                                Features & Pages
                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                              </TabsTrigger>
                            </>
                          )}
                        </TabsList>
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Content Area */}
                  <div className="flex-1 bg-white p-6 overflow-auto">
                    <TabsContent value="profile" className="m-0">
                      <div className="max-w-3xl mx-auto">
                        <ProfileEditor />
                      </div>
                    </TabsContent>
                    
                    {isAdmin && (
                      <>
                        <TabsContent value="business" className="m-0">
                          <div className="max-w-3xl mx-auto">
                            <BusinessSettings />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="users" className="m-0">
                          <UserManagement />
                        </TabsContent>
                        
                        <TabsContent value="project-types" className="m-0">
                          <ProjectTypesManager />
                        </TabsContent>
                        
                        <TabsContent value="features-pages" className="m-0">
                          <FeaturesAndPagesManager />
                        </TabsContent>
                      </>
                    )}
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}