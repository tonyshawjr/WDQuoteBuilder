import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect if already logged in
    if (!loading && user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);
  
  if (loading) {
    return null;
  }
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h1 className="text-3xl font-bold text-gray-900">Web Design Pricing Calculator</h1>
        <p className="mt-2 text-gray-600">Log in to access the pricing calculator</p>
      </div>
      
      <LoginForm />
    </div>
  );
}
