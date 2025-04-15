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
import { LogOut, User, Calculator, Settings, LayoutDashboard } from "lucide-react";

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();
  
  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h1 className="ml-2 text-lg font-semibold">Web Design Pricing Calculator</h1>
          </div>
          
          {user && (
            <div className="flex items-center">
              <nav className="flex space-x-4 mr-4">
                <Button 
                  variant={location === "/" || location === "/dashboard" ? "default" : "ghost"} 
                  onClick={() => setLocation("/dashboard")}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                
                <Button 
                  variant={location === "/calculator" ? "default" : "ghost"} 
                  onClick={() => setLocation("/calculator")}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculator
                </Button>
                
                {isAdmin && (
                  <Button 
                    variant={location === "/admin" ? "default" : "ghost"} 
                    onClick={() => setLocation("/admin")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
              </nav>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center">
                    <span className="text-sm text-gray-700 mr-2">{user.username}</span>
                    {isAdmin && (
                      <span className="bg-accent text-white text-xs px-2 py-1 rounded-full">Admin</span>
                    )}
                    <User className="h-5 w-5 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
