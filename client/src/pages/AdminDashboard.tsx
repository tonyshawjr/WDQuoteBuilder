import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { ProjectTypeTable } from "@/components/admin/ProjectTypeTable";
import { FeatureTable } from "@/components/admin/FeatureTable";
import { PageTable } from "@/components/admin/PageTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect if not logged in or not admin
    if (!loading && (!user || !isAdmin)) {
      setLocation(user ? "/calculator" : "/login");
    }
  }, [loading, user, isAdmin, setLocation]);
  
  if (loading || !user || !isAdmin) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Admin Panel</h2>
          
          <Tabs defaultValue="project-types">
            <TabsList className="mb-6">
              <TabsTrigger value="project-types">Project Types</TabsTrigger>
              <TabsTrigger value="features">Feature Library</TabsTrigger>
              <TabsTrigger value="pages">Pages</TabsTrigger>
            </TabsList>
            
            <TabsContent value="project-types">
              <ProjectTypeTable />
            </TabsContent>
            
            <TabsContent value="features">
              <FeatureTable />
            </TabsContent>
            
            <TabsContent value="pages">
              <PageTable />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
