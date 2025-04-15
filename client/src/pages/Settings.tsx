import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { UserManagement } from "@/components/admin/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, FileText, Settings as SettingsIcon, Database } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and application settings</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 sm:w-auto sm:inline-flex">
            <TabsTrigger value="profile">
              <UserCog className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
            
            {isAdmin && (
              <>
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="project-types">
                  <FileText className="h-4 w-4 mr-2" />
                  Project Types
                </TabsTrigger>
                <TabsTrigger value="features-pages">
                  <Database className="h-4 w-4 mr-2" />
                  Features & Pages
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          <TabsContent value="profile">
            <div className="max-w-3xl">
              <ProfileEditor />
            </div>
          </TabsContent>
          
          {isAdmin && (
            <>
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
              
              <TabsContent value="project-types">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Project Types Management</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    This section will allow you to manage project types. This feature will be implemented soon.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="features-pages">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Features & Pages Management</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    This section will allow you to manage features and pages. This feature will be implemented soon.
                  </p>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </>
  );
}