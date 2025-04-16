import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { UserManagement } from "@/components/admin/UserManagement";
import { ProjectTypesManager } from "@/components/admin/ProjectTypesManager";
import { FeaturesAndPagesManager } from "@/components/admin/FeaturesAndPagesManager";
import BusinessSettings from "@/components/admin/BusinessSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, FileText, Settings as SettingsIcon, Database, Building2 } from "lucide-react";
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6 sm:w-auto sm:inline-flex">
            <TabsTrigger value="profile">
              <UserCog className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
            
            {isAdmin && (
              <>
                <TabsTrigger value="business">
                  <Building2 className="h-4 w-4 mr-2" />
                  Business
                </TabsTrigger>
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
              <TabsContent value="business">
                <div className="max-w-3xl">
                  <BusinessSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
              
              <TabsContent value="project-types">
                <ProjectTypesManager />
              </TabsContent>
              
              <TabsContent value="features-pages">
                <FeaturesAndPagesManager />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </>
  );
}