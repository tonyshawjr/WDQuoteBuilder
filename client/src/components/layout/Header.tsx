import { useAuth } from "@/components/auth/AuthProvider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LogOut, 
  User, 
  Calculator, 
  Settings, 
  LayoutDashboard, 
  Menu, 
  X, 
  ChevronRight 
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const handleLogout = async () => {
    await logout();
    // Force the page reload to fully clear any cached data and state
    window.location.href = "/login";
    setIsOpen(false);
  };

  const navigateTo = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };
  
  // Get appropriate dashboard route based on user role
  const getDashboardRoute = () => {
    return "/dashboard-router";  // Our smart router will handle the redirection
  };
  
  // Close the mobile menu when changing from mobile to desktop view
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and title - always visible */}
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h1 className="ml-2 text-lg font-semibold hidden sm:block">Web Design Pricing Calculator</h1>
            <h1 className="ml-2 text-lg font-semibold sm:hidden">WD Calculator</h1>
          </div>
          
          {user && (
            <>
              {/* Desktop navigation */}
              <div className="hidden md:flex items-center">
                <nav className="flex space-x-4 mr-4">
                  <Button 
                    variant={location === "/" || location.includes("/dashboard") ? "default" : "ghost"} 
                    onClick={() => navigateTo(getDashboardRoute())}
                    size="sm"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  
                  <Button 
                    variant={location === "/calculator" ? "default" : "ghost"} 
                    onClick={() => navigateTo("/calculator")}
                    size="sm"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculator
                  </Button>
                  
                  {isAdmin && (
                    <Button 
                      variant={location === "/admin" || location === "/admin-dashboard" ? "default" : "ghost"} 
                      onClick={() => navigateTo("/admin-dashboard")}
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  )}
                </nav>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center" size="sm">
                      <span className="text-sm text-gray-700 mr-2">{user.username}</span>
                      {isAdmin && (
                        <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">Admin</span>
                      )}
                      <User className="h-5 w-5 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-500 cursor-pointer" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Mobile navigation */}
              <div className="flex items-center md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[75vw] sm:w-[350px]">
                    <div className="flex flex-col h-full pb-10">
                      <div className="flex items-center mb-6 mt-2">
                        <User className="h-6 w-6 mr-2 text-primary" />
                        <span className="font-medium">{user.username}</span>
                        {isAdmin && (
                          <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full ml-2">
                            Admin
                          </span>
                        )}
                      </div>
                      
                      <nav className="flex flex-col space-y-2 flex-grow">
                        <Button 
                          variant={location === "/" || location.includes("/dashboard") ? "default" : "ghost"} 
                          onClick={() => navigateTo(getDashboardRoute())}
                          className="justify-start"
                        >
                          <LayoutDashboard className="h-5 w-5 mr-2" />
                          Dashboard
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                        
                        <Button 
                          variant={location === "/calculator" ? "default" : "ghost"} 
                          onClick={() => navigateTo("/calculator")}
                          className="justify-start"
                        >
                          <Calculator className="h-5 w-5 mr-2" />
                          Calculator
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                        
                        {isAdmin && (
                          <Button 
                            variant={location === "/admin" || location === "/admin-dashboard" ? "default" : "ghost"} 
                            onClick={() => navigateTo("/admin-dashboard")}
                            className="justify-start"
                          >
                            <Settings className="h-5 w-5 mr-2" />
                            Admin Dashboard
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </Button>
                        )}
                      </nav>
                      
                      <Button 
                        variant="destructive" 
                        onClick={handleLogout}
                        className="mt-auto"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
