import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Settings } from "lucide-react";

export default function Home() {
  const { user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [loading, user, setLocation]);
  
  if (loading || !user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Web Design Pricing Calculator</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create accurate estimates for web design and development services
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Calculator</CardTitle>
              <CardDescription>
                Generate quick estimates for clients
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <p className="text-center mb-6">
                Create new estimates based on project type and features
              </p>
              <Button onClick={() => setLocation("/calculator")}>
                <Calculator className="h-5 w-5 mr-2" />
                Go to Calculator
              </Button>
            </CardContent>
          </Card>
          
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>
                  Manage project types and features
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <p className="text-center mb-6">
                  Configure pricing, feature sets, and project types
                </p>
                <Button onClick={() => setLocation("/admin")}>
                  <Settings className="h-5 w-5 mr-2" />
                  Go to Admin Panel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
