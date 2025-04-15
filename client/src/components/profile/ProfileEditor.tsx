import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Loader2, User as UserIcon, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Form validation schema
const profileFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  currentPassword: z.string().min(1, 'Current password is required for changes'),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  // If new password is provided, confirm password must match
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileEditor() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Setup form with react-hook-form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      setIsSubmitting(true);
      
      const updateData = {
        username: values.username,
        currentPassword: values.currentPassword,
        // Only include password if it's provided
        ...(values.newPassword ? { password: values.newPassword } : {})
      };
      
      return await apiRequest('/api/me/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      form.reset({
        username: form.getValues().username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating profile',
        description: error.message || 'An error occurred while updating your profile.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  });

  // Handle form submission
  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  // If no user is found, show a message
  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>You need to be logged in to view your profile</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-primary" />
          <CardTitle>Edit Profile</CardTitle>
        </div>
        <CardDescription>
          Update your account information
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter your username" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password"
                      placeholder="Enter your current password" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border-t pt-4">
              <div className="flex items-center mb-4">
                <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm font-medium">Change Password (Optional)</p>
              </div>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          placeholder="Leave blank to keep current password" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          placeholder="Confirm your new password" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}