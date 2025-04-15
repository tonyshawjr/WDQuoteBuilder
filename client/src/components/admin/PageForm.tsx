import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertPageSchema, type Page, type ProjectType } from "@shared/schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PageFormProps {
  isOpen: boolean;
  onClose: () => void;
  page?: Page;
}

// Create a form schema with Zod
const formSchema = insertPageSchema.extend({
  pricePerPage: z.coerce.number().min(1, "Price must be at least $1"),
  defaultQuantity: z.coerce.number().min(1, "Default quantity must be at least 1"),
  projectTypeId: z.coerce.number().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export function PageForm({ isOpen, onClose, page }: PageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Form definition
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: page?.name || "",
      description: page?.description || "",
      pricePerPage: page?.pricePerPage || 0,
      projectTypeId: page?.projectTypeId || null,
      defaultQuantity: page?.defaultQuantity || 1,
      isActive: page?.isActive || true,
    },
  });

  // Get project types for the select dropdown
  const { data: projectTypes = [] } = useQuery({
    queryKey: ["/api/project-types"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/pages", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({
        title: "Success",
        description: "Page added successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add page",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest(`/api/pages/${page?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({
        title: "Success",
        description: "Page updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update page",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Form submission handler
  const onSubmit = (data: FormData) => {
    setIsSaving(true);
    if (page) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{page ? "Edit Page" : "Add New Page"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Home Page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this page type"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerPage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Page ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      placeholder="Enter price"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "0" ? null : parseInt(value))
                    }
                    value={field.value?.toString() || "0"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">No specific project type</SelectItem>
                      {projectTypes.map((projectType: ProjectType) => (
                        <SelectItem
                          key={projectType.id}
                          value={projectType.id.toString()}
                        >
                          {projectType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optionally limit this page to a specific project type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      placeholder="Default quantity"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The default number of this page type to include in estimates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      When active, this page will be available in the calculator
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : page ? "Update Page" : "Add Page"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}