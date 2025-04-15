import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { Loader2 } from "lucide-react";

export default function UserProfile() {
  const { user, loading } = useAuth();
  
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
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your account settings</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <ProfileEditor />
          </div>
          
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Username</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.isAdmin ? 'Administrator' : 'Sales Representative'}</dd>
                </div>
              </dl>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you're having trouble with your account or need assistance, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}