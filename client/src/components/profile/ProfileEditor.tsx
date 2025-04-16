import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Form validation schema
const userProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  firstName: z.string().optional().or(z.literal("")),
  lastName: z.string().optional().or(z.literal("")),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export function ProfileEditor() {
  const { toast } = useToast();
  const { user, isAdmin, refreshUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Profile form setup
  const profileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  // Password form setup
  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfileFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      return await apiRequest(`/api/me/profile`, {
        method: "PUT",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          currentPassword: user.password, // This is needed for the endpoint validation
          // Keep the user's admin status
          isAdmin: user.isAdmin,
        }),
      });
    },
    onSuccess: async () => {
      // First refresh the user data
      await refreshUser();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      // Update the UI
      setIsEditingProfile(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      return await apiRequest(`/api/me/profile`, {
        method: "PUT",
        body: JSON.stringify({
          username: user.username, // Keep the same username
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          currentPassword: data.currentPassword,
          password: data.newPassword,
          isAdmin: user.isAdmin,
        }),
      });
    },
    onSuccess: async () => {
      // First refresh the user data
      await refreshUser();
      
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      
      // Reset the form
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const onProfileSubmit = (values: UserProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  // Handle password form submission
  const onPasswordSubmit = (values: PasswordChangeFormValues) => {
    changePasswordMutation.mutate(values);
  };

  // Toggle profile editing
  const toggleEditProfile = () => {
    if (isEditingProfile) {
      setIsEditingProfile(false);
      profileForm.setValue("username", user?.username || "");
      profileForm.setValue("email", user?.email || "");
      profileForm.setValue("firstName", user?.firstName || "");
      profileForm.setValue("lastName", user?.lastName || "");
    } else {
      setIsEditingProfile(true);
    }
  };

  if (!user) {
    return <div>Please log in to edit your profile</div>;
  }

  return (
    <div className="space-y-10">
      {/* Profile Card */}
      <div className="bg-[#282828] rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-700">
        {/* Personal Info Section */}
        <div className="px-6 py-6 md:px-10 md:py-8">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              {isEditingProfile ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-1">Edit Your Profile</h2>
                    <p className="text-gray-400">Update your personal information</p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 font-medium">Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-1 focus:ring-primary/30 transition-all shadow-none" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 font-medium">Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                {...field} 
                                value={field.value || ''} 
                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-1 focus:ring-primary/30 transition-all shadow-none" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 font-medium">First Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-1 focus:ring-primary/30 transition-all shadow-none" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 font-medium">Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-1 focus:ring-primary/30 transition-all shadow-none" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleEditProfile}
                      className="rounded-lg px-5 py-2.5 bg-[#282828] text-gray-300 border-gray-600 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="default"
                      disabled={updateProfileMutation.isPending}
                      className="rounded-lg px-5 py-2.5 bg-[#F9B200] text-[#1F1F1F] hover:bg-[#e5a400]"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#1F1F1F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Personal Information</h2>
                      <p className="text-gray-400 mt-1">
                        Manage your personal details and account settings
                      </p>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={toggleEditProfile}
                      className="rounded-lg bg-[#282828] text-[#F9B200] border-[#F9B200]/30 hover:bg-[#F9B200]/10 h-10 px-4 py-2"
                    >
                      Edit Profile
                    </Button>
                  </div>
                  
                  <div className="flex flex-col pb-10">
                    <div className="flex-1">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">
                          {user.firstName || user.username} {user.lastName || ''}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            isAdmin 
                              ? 'bg-[#F9B200]/10 text-[#F9B200] ring-1 ring-[#F9B200]/20' 
                              : 'bg-blue-900/30 text-blue-400 ring-1 ring-blue-500/20'
                          }`}>
                            {isAdmin ? 'Administrator' : 'Sales User'}
                          </span>
                          
                          {user.email && (
                            <span className="text-gray-400 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {user.email}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mt-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-400">Username</h4>
                          <p className="text-white mt-1">{user.username}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-400">Email</h4>
                          <p className="text-white mt-1">{user.email || "Not provided"}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-400">First Name</h4>
                          <p className="text-white mt-1">{user.firstName || "Not provided"}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-400">Last Name</h4>
                          <p className="text-white mt-1">{user.lastName || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </form>
          </Form>
        </div>
      </div>
      
      {/* Password Card */}
      <div className="bg-[#282828] rounded-xl overflow-hidden shadow-md ring-1 ring-gray-800">
        <div className="px-6 py-6 md:px-10 md:py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Password & Security</h2>
            <p className="text-gray-400 mt-1">Update your password to secure your account</p>
          </div>
          
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
              <div className="space-y-8">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 font-medium">Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your current password" 
                          {...field} 
                          className="h-12 bg-[#1F1F1F] border-gray-700 focus:bg-[#282828] focus:ring-1 focus:ring-[#F9B200]/30 text-white transition-all shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 font-medium">New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your new password" 
                            {...field} 
                            className="h-12 bg-[#1F1F1F] border-gray-700 focus:bg-[#282828] focus:ring-1 focus:ring-[#F9B200]/30 text-white transition-all shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 font-medium">Confirm New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm your new password" 
                            {...field} 
                            className="h-12 bg-[#1F1F1F] border-gray-700 focus:bg-[#282828] focus:ring-1 focus:ring-[#F9B200]/30 text-white transition-all shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-400">
                  Password must be at least 6 characters long
                </div>
                <Button 
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="rounded-lg px-5 py-2.5 bg-[#F9B200] text-[#1F1F1F] hover:bg-[#e5a400]"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#1F1F1F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}