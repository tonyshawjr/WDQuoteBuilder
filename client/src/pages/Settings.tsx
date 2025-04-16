import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { UserManagement } from "@/components/admin/UserManagement";
import { ProjectTypesManager } from "@/components/admin/ProjectTypesManager";
import { FeaturesAndPagesManager } from "@/components/admin/FeaturesAndPagesManager";
import BusinessSettings from "@/components/admin/BusinessSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserCog, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  Database, 
  Building2, 
  ChevronRight,
  Menu,
  Home,
  X
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (isMobile && isAdmin && activeTab === "features-pages") {
      setActiveTab("business");
    }
  }, [isMobile, isAdmin, activeTab]);
  
  // Close the sidebar when switching tabs on mobile
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  const tabs = [
    {
      id: "profile",
      label: "My Profile",
      icon: <UserCog className="h-5 w-5" />,
      category: "user"
    },
    ...(isAdmin ? [
      {
        id: "business",
        label: "Business Settings",
        icon: <Building2 className="h-5 w-5" />,
        category: "admin"
      },
      {
        id: "users",
        label: "User Management",
        icon: <Users className="h-5 w-5" />,
        category: "admin"
      },
      {
        id: "project-types",
        label: "Project Types",
        icon: <FileText className="h-5 w-5" />,
        category: "admin"
      },
      {
        id: "features-pages",
        label: "Features & Pages",
        icon: <Database className="h-5 w-5" />,
        category: "admin"
      }
    ] : [])
  ];
  
  // Find the current tab info
  const currentTab = tabs.find(tab => tab.id === activeTab);
  
  // Split tabs by category
  const userTabs = tabs.filter(tab => tab.category === "user");
  const adminTabs = tabs.filter(tab => tab.category === "admin");
  
  return (
    <>
      <Header />
      <div className="bg-[#1F1F1F] min-h-screen">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
            {/* Mobile Menu Toggle */}
            {isMobile && (
              <div className="flex items-center justify-between px-6 py-4 bg-[#282828] border-b border-gray-700 sticky top-0 z-10">
                <div className="flex items-center">
                  <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                    <SheetTrigger asChild>
                      <button className="inline-flex items-center justify-center rounded-md h-10 w-10 text-gray-400 hover:text-white focus:outline-none">
                        <span className="sr-only">Open menu</span>
                        <Menu className="h-6 w-6" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[280px] sm:max-w-none bg-[#282828] border-r border-gray-700">
                      <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-gray-700">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Settings</h2>
                            <button 
                              onClick={() => setIsSidebarOpen(false)}
                              className="rounded-full h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-white focus:outline-none"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <div className="overflow-y-auto flex-1 py-4">
                          {renderSidebar()}
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  
                  <div className="ml-4">
                    <div className="flex items-center">
                      {currentTab?.icon && (
                        <span className="inline-flex mr-2 text-[#F9B200]">{currentTab.icon}</span>
                      )}
                      <h1 className="text-xl font-semibold text-white">{currentTab?.label}</h1>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Desktop Sidebar */}
            <div className={`hidden md:block w-64 border-r border-gray-700 bg-[#282828] flex-shrink-0`}>
              <div className="h-full p-6">
                <div className="flex items-center mb-6">
                  <SettingsIcon className="h-5 w-5 text-[#F9B200] mr-2" />
                  <h1 className="text-xl font-semibold text-white">Settings</h1>
                </div>
                {renderSidebar()}
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 bg-[#1F1F1F]">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="hidden">
                  <TabsList>
                    {tabs.map(tab => (
                      <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                <div className="py-6 px-4 md:px-8 lg:px-10">
                  {!isMobile && (
                    <div className="mb-8">
                      <div className="flex items-center">
                        {currentTab?.icon && (
                          <span className="inline-flex mr-2 bg-[#F9B200]/10 p-2 rounded-lg text-[#F9B200]">{currentTab.icon}</span>
                        )}
                        <div>
                          <h1 className="text-2xl font-bold text-white">{currentTab?.label}</h1>
                          <p className="text-gray-400 mt-1">
                            {currentTab?.id === "profile" && "Manage your personal information and security settings"}
                            {currentTab?.id === "business" && "Configure your business details used throughout the application"}
                            {currentTab?.id === "users" && "Manage user accounts and permissions"}
                            {currentTab?.id === "project-types" && "Set up different project types for price calculations"}
                            {currentTab?.id === "features-pages" && "Manage features and pages for your web projects"}
                          </p>
                        </div>
                        {isAdmin && currentTab?.category === "admin" && (
                          <Badge className="ml-3 bg-[#282828] text-[#F9B200] border-[#F9B200]/20">Admin Only</Badge>
                        )}
                      </div>
                      <Separator className="mt-6 bg-gray-700" />
                    </div>
                  )}
                  
                  <TabsContent value="profile" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <ProfileEditor />
                  </TabsContent>
                  
                  {isAdmin && (
                    <>
                      <TabsContent value="business" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <BusinessSettings />
                      </TabsContent>
                      
                      <TabsContent value="users" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <UserManagement />
                      </TabsContent>
                      
                      <TabsContent value="project-types" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <ProjectTypesManager />
                      </TabsContent>
                      
                      <TabsContent value="features-pages" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <FeaturesAndPagesManager />
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
  
  function renderSidebar() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
            Personal
          </h3>
          <nav className="space-y-1">
            {userTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-[#F9B200]/10 text-[#F9B200]' 
                    : 'text-gray-300 hover:bg-[#1F1F1F]'
                }`}
              >
                <span className="inline-flex mr-3">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {isAdmin && adminTabs.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Administration
            </h3>
            <nav className="space-y-1">
              {adminTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-[#F9B200]/10 text-[#F9B200]' 
                      : 'text-gray-300 hover:bg-[#1F1F1F]'
                  }`}
                >
                  <span className="inline-flex mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}
        
        <div className="pt-4">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-300 hover:bg-[#1F1F1F]"
          >
            <Home className="h-5 w-5 mr-3" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
}