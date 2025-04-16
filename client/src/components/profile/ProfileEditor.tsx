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
  const { user, isAdmin } = useAuth();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  
  // Profile form setup
  const profileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      username: user?.username || "",
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
      
      return await apiRequest(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          username: data.username,
          // Keep the user's admin status
          isAdmin: user.isAdmin,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setIsEditingUsername(false);
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
      
      return await apiRequest(`/api/users/${user.id}/change-password`, {
        method: "POST",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
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

  // Toggle username editing
  const toggleEditUsername = () => {
    if (isEditingUsername) {
      setIsEditingUsername(false);
      profileForm.setValue("username", user?.username || "");
    } else {
      setIsEditingUsername(true);
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
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Username</div>
                  {isEditingUsername ? (
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="font-medium">{user.username}</div>
                  )}
                </div>
                
                {isEditingUsername ? (
                  <div className="flex space-x-2">
                    <Button 
                      type="submit"
                      size="sm"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span className="sr-only">Save</span>
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleEditUsername}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleEditUsername}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </form>
          </Form>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="font-medium">Role</div>
                <div className="text-sm text-muted-foreground">
                  {isAdmin ? "Administrator" : "Regular User"}
                </div>
              </div>
            </div>
          </div>
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