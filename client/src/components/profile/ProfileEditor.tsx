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
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="font-bold text-lg">
                    {user.firstName || ''} {user.lastName || ''}
                  </div>
                </div>
                
                {!isEditingProfile && (
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleEditProfile}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
              
              {isEditingProfile ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleEditProfile}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email || "Not provided"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Username</div>
                      <div className="text-sm text-muted-foreground">
                        {user.username}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">First Name</div>
                      <div className="text-sm text-muted-foreground">
                        {user.firstName || "Not provided"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Last Name</div>
                      <div className="text-sm text-muted-foreground">
                        {user.lastName || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to secure your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your current password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your new password" {...field} />
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
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}