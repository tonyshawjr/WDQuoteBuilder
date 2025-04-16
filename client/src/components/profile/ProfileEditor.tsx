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
    <div className="space-y-8">
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Profile Details</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Update your personal information
              </CardDescription>
            </div>
            {!isEditingProfile && (
              <Button 
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleEditProfile}
                className="shadow-sm"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              {isEditingProfile ? (
                <>
                  <div className="grid gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                            <FormControl>
                              <Input {...field} className="shadow-sm" />
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
                            <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} value={field.value || ''} className="shadow-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">First Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} className="shadow-sm" />
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
                            <FormLabel className="text-gray-700 font-medium">Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} className="shadow-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleEditProfile}
                      className="shadow-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="shadow-sm"
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center">
                    <div className="flex items-center justify-center bg-primary/10 rounded-full w-16 h-16 mb-4 sm:mb-0 sm:mr-6">
                      <span className="text-primary font-semibold text-xl">
                        {user.firstName ? user.firstName.charAt(0).toUpperCase() : ''}
                        {user.lastName ? user.lastName.charAt(0).toUpperCase() : ''}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {user.firstName || ''} {user.lastName || ''}
                      </h3>
                      <p className="text-gray-500">{user.email || "No email provided"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 border-t border-gray-100 pt-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Username</h4>
                      <p className="text-gray-900">{user.username}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                      <p className="text-gray-900">{user.email || "Not provided"}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">First Name</h4>
                      <p className="text-gray-900">{user.firstName || "Not provided"}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Last Name</h4>
                      <p className="text-gray-900">{user.lastName || "Not provided"}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
                      <p className="text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {isAdmin ? 'Administrator' : 'Sales User'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b px-6 py-4">
          <CardTitle className="text-xl">Change Password</CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Update your password to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
              <div className="space-y-5">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your current password" 
                          {...field} 
                          className="shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your new password" 
                            {...field} 
                            className="shadow-sm"
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
                        <FormLabel className="text-gray-700 font-medium">Confirm New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm your new password" 
                            {...field} 
                            className="shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <Button 
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="shadow-sm"
                >
                  {changePasswordMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Change Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}