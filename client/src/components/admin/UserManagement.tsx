import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, User } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash, Plus, Loader2, Shield, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/auth/AuthProvider";

// Form validation schema
const userFormSchema = insertUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  isAdmin: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      isAdmin: false,
    },
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      console.log("Creating user with data:", data);
      
      // Format data properly to ensure all fields are sent
      const userData = {
        username: data.username.trim(),
        password: data.password,
        email: data.email || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        isAdmin: !!data.isAdmin // Force boolean
      };
      
      console.log("Formatted user data:", userData);
      
      // Set headers explicitly to ensure proper content-type
      return await apiRequest("/api/users", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "User has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      console.error("User creation error:", error);
      toast({
        title: "Failed to create user",
        description: error.message || "There was an error creating the user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues & { id: number }) => {
      console.log("Updating user with data:", data);
      
      // Only include password in the update if it's not empty
      const updateData: Record<string, any> = {
        username: data.username.trim(),
        email: data.email || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        isAdmin: !!data.isAdmin // Force boolean
      };
      
      if (data.password) {
        updateData.password = data.password;
      }
      
      console.log("Formatted update user data:", updateData);
      
      // Set headers explicitly to ensure proper content-type  
      return await apiRequest(`/api/users/${data.id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      console.error("User update error:", error);
      toast({
        title: "Failed to update user",
        description: error.message || "There was an error updating the user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deleting user with ID:", id);
      
      return await apiRequest(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      console.error("User delete error:", error);
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: UserFormValues) => {
    if (dialogMode === "create") {
      createUserMutation.mutate(values);
    } else if (dialogMode === "edit" && selectedUser) {
      updateUserMutation.mutate({ ...values, id: selectedUser.id });
    }
  };

  // Open dialog for creating a new user
  const handleCreateClick = () => {
    form.reset({ 
      username: "", 
      password: "", 
      email: "",
      firstName: "",
      lastName: "",
      isAdmin: false 
    });
    setDialogMode("create");
    setSelectedUser(null);
    setOpenDialog(true);
  };

  // Open dialog for editing an existing user
  const handleEditClick = (user: User) => {
    form.reset({ 
      username: user.username, 
      password: "", // Don't show the current password for security reasons
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      isAdmin: user.isAdmin || false 
    });
    setDialogMode("edit");
    setSelectedUser(user);
    setOpenDialog(true);
  };

  // Handle user deletion with confirmation
  const handleDeleteClick = (user: User) => {
    // Prevent deleting yourself
    if (user.id === currentUser?.id) {
      toast({
        title: "Cannot delete own account",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete user ${user.username}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">User Management</h2>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-muted/50 p-8 rounded-lg text-center">
          <p className="text-muted-foreground mb-4">No users found</p>
          <Button onClick={handleCreateClick}>Create your first user</Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => (
                <TableRow key={user.id} className={user.id === currentUser?.id ? "bg-muted/30" : ""}>
                  <TableCell>
                    {user.username}
                    {user.id === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {user.isAdmin ? (
                        <>
                          <ShieldCheck className="h-4 w-4 text-primary mr-1" />
                          <span>Admin</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 text-muted-foreground mr-1" />
                          <span>User</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditClick(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create User" : "Edit User"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Add a new user to the system"
                : "Update the user details"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johnsmith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {dialogMode === "create" ? "Password" : "New Password"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={dialogMode === "edit" ? "Leave blank to keep current" : "Password"} 
                        {...field} 
                      />
                    </FormControl>
                    {dialogMode === "edit" && (
                      <p className="text-xs text-muted-foreground">
                        Leave blank to keep the current password
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.smith@example.com" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Administrator
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Grant admin privileges to this user
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {dialogMode === "create" ? "Create" : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}