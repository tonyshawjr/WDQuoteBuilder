import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProjectTypeSchema, ProjectType } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Form validation schema
const projectTypeFormSchema = insertProjectTypeSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  basePrice: z.number().min(0, "Base price must be a positive number")
});

type ProjectTypeFormValues = z.infer<typeof projectTypeFormSchema>;

export function ProjectTypesManager() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [currentProjectType, setCurrentProjectType] = useState<ProjectType | null>(null);
  
  // Form setup
  const form = useForm<ProjectTypeFormValues>({
    resolver: zodResolver(projectTypeFormSchema),
    defaultValues: {
      name: "",
      basePrice: 0
    },
  });

  // Fetch project types
  const { data: projectTypes = [], isLoading: isLoadingProjectTypes } = useQuery({
    queryKey: ["/api/project-types"],
  });

  // Create project type mutation
  const createProjectTypeMutation = useMutation({
    mutationFn: async (data: ProjectTypeFormValues) => {
      return await apiRequest("/api/project-types", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Project type created",
        description: "Project type has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create project type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update project type mutation
  const updateProjectTypeMutation = useMutation({
    mutationFn: async (data: ProjectTypeFormValues & { id: number }) => {
      return await apiRequest(`/api/project-types/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Project type updated",
        description: "Project type has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update project type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete project type mutation
  const deleteProjectTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/project-types/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Project type deleted",
        description: "Project type has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete project type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: ProjectTypeFormValues) => {
    if (dialogMode === "create") {
      createProjectTypeMutation.mutate(values);
    } else if (dialogMode === "edit" && currentProjectType) {
      updateProjectTypeMutation.mutate({ ...values, id: currentProjectType.id });
    }
  };

  // Open dialog for creating a new project type
  const handleCreateClick = () => {
    form.reset({ 
      name: "",
      basePrice: 0 
    });
    setDialogMode("create");
    setCurrentProjectType(null);
    setOpenDialog(true);
  };

  // Open dialog for editing an existing project type
  const handleEditClick = (projectType: ProjectType) => {
    form.reset({ 
      name: projectType.name,
      basePrice: projectType.basePrice
    });
    setDialogMode("edit");
    setCurrentProjectType(projectType);
    setOpenDialog(true);
  };

  // Handle project type deletion with confirmation
  const handleDeleteClick = (id: number) => {
    if (window.confirm("Are you sure you want to delete this project type? This action cannot be undone.")) {
      deleteProjectTypeMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Project Types</h2>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Project Type
        </Button>
      </div>

      {isLoadingProjectTypes ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : projectTypes.length === 0 ? (
        <div className="bg-muted/50 p-8 rounded-lg text-center">
          <p className="text-muted-foreground mb-4">No project types found</p>
          <Button onClick={handleCreateClick}>Create your first project type</Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectTypes.map((projectType: ProjectType) => (
                <TableRow key={projectType.id}>
                  <TableCell>{projectType.name}</TableCell>
                  <TableCell>${projectType.basePrice}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditClick(projectType)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick(projectType.id)}
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
              {dialogMode === "create" ? "Create Project Type" : "Edit Project Type"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Add a new project type for use in quotes"
                : "Update the project type details"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Website Redesign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="500" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
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
                  disabled={createProjectTypeMutation.isPending || updateProjectTypeMutation.isPending}
                >
                  {(createProjectTypeMutation.isPending || updateProjectTypeMutation.isPending) && (
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