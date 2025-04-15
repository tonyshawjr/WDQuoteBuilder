import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectTypeSchema, ProjectType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ProjectTypeFormProps {
  isOpen: boolean;
  onClose: () => void;
  projectType?: ProjectType;
}

const formSchema = insertProjectTypeSchema.extend({
  basePrice: z.number().min(0, "Base price must be at least 0"),
});

type FormData = z.infer<typeof formSchema>;

export function ProjectTypeForm({ isOpen, onClose, projectType }: ProjectTypeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!projectType;
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: projectType?.name || "",
      basePrice: projectType?.basePrice || 0,
    },
  });
  
  // Create project type mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/project-types", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-types'] });
      toast({
        title: "Success",
        description: "Project type created successfully",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create project type: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Update project type mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("PUT", `/api/project-types/${projectType?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-types'] });
      toast({
        title: "Success",
        description: "Project type updated successfully",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update project type: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  const handleClose = () => {
    reset();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project Type" : "Add Project Type"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Type Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. WordPress Website"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                type="number"
                {...register("basePrice", { valueAsNumber: true })}
                placeholder="e.g. 2500"
              />
              {errors.basePrice && (
                <p className="text-sm text-red-500">{errors.basePrice.message}</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
