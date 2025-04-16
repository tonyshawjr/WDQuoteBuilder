import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertFeatureSchema, insertPageSchema, Feature, Page, ProjectType } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash, Plus, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// Form validation schemas
const featureFormSchema = insertFeatureSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  projectTypeId: z.coerce.number().optional().nullable(), // Make projectTypeId optional
  category: z.string().min(2, "Category must be at least 2 characters"),
  pricingType: z.string().min(2, "Pricing type is required"),
  description: z.string().optional(),
  flatPrice: z.coerce.number().optional().nullable(),
  hourlyRate: z.coerce.number().optional().nullable(),
  estimatedHours: z.coerce.number().optional().nullable(),
  supportsQuantity: z.boolean().optional().default(false),
  forAllProjectTypes: z.boolean().optional().default(false),
});

const pageFormSchema = insertPageSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  pricePerPage: z.coerce.number({ required_error: "Price per page is required" }),
  projectTypeId: z.coerce.number().optional().nullable(),
  description: z.string().optional(),
  defaultQuantity: z.coerce.number().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

type FeatureFormValues = z.infer<typeof featureFormSchema>;
type PageFormValues = z.infer<typeof pageFormSchema>;

export function FeaturesAndPagesManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("features");
  const [openFeatureDialog, setOpenFeatureDialog] = useState(false);
  const [openPageDialog, setOpenPageDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<number[]>([]);
  const [forAllProjectTypes, setForAllProjectTypes] = useState(false);
  
  // Feature form setup
  const featureForm = useForm<FeatureFormValues>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      name: "",
      category: "",
      pricingType: "flat",
      description: "",
      flatPrice: 0,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    },
  });

  // Page form setup
  const pageForm = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      name: "",
      pricePerPage: 0,
      projectTypeId: null,
      description: "",
      defaultQuantity: 1,
      isActive: true,
    },
  });

  // Fetch project types, features, and pages
  const { data: projectTypes = [] } = useQuery({
    queryKey: ["/api/project-types"],
  });

  const { data: features = [], isLoading: isLoadingFeatures } = useQuery({
    queryKey: ["/api/features"],
  });

  const { data: pages = [], isLoading: isLoadingPages } = useQuery({
    queryKey: ["/api/pages"],
  });

  // Feature mutations
  const createFeatureMutation = useMutation({
    mutationFn: async (data: FeatureFormValues) => {
      return await apiRequest("/api/features", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Feature created",
        description: "Feature has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      setOpenFeatureDialog(false);
      featureForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFeatureMutation = useMutation({
    mutationFn: async ({ id, ...data }: FeatureFormValues & { id: number }) => {
      const cleanedData = { ...data };
      // Remove id from the request body
      return await apiRequest(`/api/features/${id}`, {
        method: "PUT",
        body: JSON.stringify(cleanedData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Feature updated",
        description: "Feature has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      setOpenFeatureDialog(false);
      featureForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/features/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Feature deleted",
        description: "Feature has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Page mutations
  const createPageMutation = useMutation({
    mutationFn: async (data: PageFormValues) => {
      return await apiRequest("/api/pages", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Page created",
        description: "Page has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setOpenPageDialog(false);
      pageForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create page",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, ...data }: PageFormValues & { id: number }) => {
      const cleanedData = { ...data };
      // Remove id from the request body
      return await apiRequest(`/api/pages/${id}`, {
        method: "PUT", 
        body: JSON.stringify(cleanedData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Page updated",
        description: "Page has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setOpenPageDialog(false);
      pageForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update page",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/pages/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Page deleted",
        description: "Page has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete page",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onFeatureSubmit = (values: FeatureFormValues) => {
    // Add selected project types and forAllProjectTypes to the form values
    const featureData = {
      ...values,
      selectedProjectTypes: forAllProjectTypes ? [] : selectedProjectTypes,
      forAllProjectTypes: forAllProjectTypes
    };
    
    if (dialogMode === "create") {
      createFeatureMutation.mutate(featureData);
    } else if (dialogMode === "edit" && currentFeature) {
      updateFeatureMutation.mutate({ ...featureData, id: currentFeature.id });
    }
  };

  const onPageSubmit = (values: PageFormValues) => {
    if (dialogMode === "create") {
      createPageMutation.mutate(values);
    } else if (dialogMode === "edit" && currentPage) {
      updatePageMutation.mutate({ ...values, id: currentPage.id });
    }
  };

  // Feature dialog handlers
  const handleCreateFeatureClick = () => {
    featureForm.reset({
      name: "",
      projectTypeId: null,
      category: "",
      pricingType: "flat",
      description: "",
      flatPrice: 0,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
      forAllProjectTypes: false
    });
    setSelectedProjectTypes([]);
    setForAllProjectTypes(false);
    setDialogMode("create");
    setCurrentFeature(null);
    setOpenFeatureDialog(true);
  };

  const handleEditFeatureClick = (feature: Feature) => {
    featureForm.reset({
      name: feature.name,
      projectTypeId: feature.projectTypeId,
      category: feature.category,
      pricingType: feature.pricingType,
      description: feature.description || "",
      flatPrice: feature.flatPrice,
      hourlyRate: feature.hourlyRate,
      estimatedHours: feature.estimatedHours,
      supportsQuantity: feature.supportsQuantity || false,
      forAllProjectTypes: feature.forAllProjectTypes || false
    });
    // TODO: In the future, we'll need to fetch the selected project types for this feature
    setSelectedProjectTypes(feature.projectTypeId ? [feature.projectTypeId] : []);
    setForAllProjectTypes(feature.forAllProjectTypes || false);
    setDialogMode("edit");
    setCurrentFeature(feature);
    setOpenFeatureDialog(true);
  };

  const handleDeleteFeatureClick = (id: number) => {
    if (window.confirm("Are you sure you want to delete this feature? This action cannot be undone.")) {
      deleteFeatureMutation.mutate(id);
    }
  };

  // Page dialog handlers
  const handleCreatePageClick = () => {
    pageForm.reset({
      name: "",
      pricePerPage: 0,
      projectTypeId: null,
      description: "",
      defaultQuantity: 1,
      isActive: true,
    });
    setDialogMode("create");
    setCurrentPage(null);
    setOpenPageDialog(true);
  };

  const handleEditPageClick = (page: Page) => {
    pageForm.reset({
      name: page.name,
      pricePerPage: page.pricePerPage,
      projectTypeId: page.projectTypeId,
      description: page.description || "",
      defaultQuantity: page.defaultQuantity,
      isActive: page.isActive || true,
    });
    setDialogMode("edit");
    setCurrentPage(page);
    setOpenPageDialog(true);
  };

  const handleDeletePageClick = (id: number) => {
    if (window.confirm("Are you sure you want to delete this page? This action cannot be undone.")) {
      deletePageMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="pt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Features</h2>
            <Button onClick={handleCreateFeatureClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </div>

          {isLoadingFeatures ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : features.length === 0 ? (
            <div className="bg-muted/50 p-8 rounded-lg text-center">
              <p className="text-muted-foreground mb-4">No features found</p>
              <Button onClick={handleCreateFeatureClick}>Create your first feature</Button>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature: Feature) => {
                    const projectType = projectTypes.find((pt: ProjectType) => pt.id === feature.projectTypeId);
                    const priceDisplay = feature.pricingType === "flat" 
                      ? `$${feature.flatPrice}` 
                      : `$${feature.hourlyRate}/hr (Est. ${feature.estimatedHours} hrs)`;

                    return (
                      <TableRow key={feature.id}>
                        <TableCell>{feature.name}</TableCell>
                        <TableCell>{feature.category}</TableCell>
                        <TableCell>{projectType ? projectType.name : "N/A"}</TableCell>
                        <TableCell>{priceDisplay}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditFeatureClick(feature)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteFeatureClick(feature.id)}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="pt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Pages</h2>
            <Button onClick={handleCreatePageClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Page
            </Button>
          </div>

          {isLoadingPages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pages.length === 0 ? (
            <div className="bg-muted/50 p-8 rounded-lg text-center">
              <p className="text-muted-foreground mb-4">No pages found</p>
              <Button onClick={handleCreatePageClick}>Create your first page</Button>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price Per Page</TableHead>
                    <TableHead>Default Quantity</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page: Page) => {
                    const projectType = projectTypes.find((pt: ProjectType) => pt.id === page.projectTypeId);
                    
                    return (
                      <TableRow key={page.id}>
                        <TableCell>{page.name}</TableCell>
                        <TableCell>${page.pricePerPage}</TableCell>
                        <TableCell>{page.defaultQuantity || 1}</TableCell>
                        <TableCell>{projectType ? projectType.name : "All"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            page.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {page.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditPageClick(page)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeletePageClick(page.id)}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Feature Dialog */}
      <Dialog open={openFeatureDialog} onOpenChange={setOpenFeatureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create Feature" : "Edit Feature"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Add a new feature for use in quotes"
                : "Update the feature details"}
            </DialogDescription>
          </DialogHeader>

          <Form {...featureForm}>
            <form onSubmit={featureForm.handleSubmit(onFeatureSubmit)} className="space-y-4">
              <FormField
                control={featureForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="SEO Optimization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={featureForm.control}
                name="projectTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={featureForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={featureForm.control}
                name="pricingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pricing type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Rate</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {featureForm.watch("pricingType") === "flat" ? (
                <FormField
                  control={featureForm.control}
                  name="flatPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={featureForm.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={featureForm.control}
                    name="estimatedHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Hours</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={featureForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Description (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={featureForm.control}
                name="supportsQuantity"
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
                        Supports Quantity
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Can this feature be added multiple times to a quote?
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenFeatureDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createFeatureMutation.isPending || updateFeatureMutation.isPending}
                >
                  {(createFeatureMutation.isPending || updateFeatureMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {dialogMode === "create" ? "Create" : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Page Dialog */}
      <Dialog open={openPageDialog} onOpenChange={setOpenPageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create Page" : "Edit Page"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Add a new page type for use in quotes"
                : "Update the page type details"}
            </DialogDescription>
          </DialogHeader>

          <Form {...pageForm}>
            <form onSubmit={pageForm.handleSubmit(onPageSubmit)} className="space-y-4">
              <FormField
                control={pageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Home Page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pageForm.control}
                name="pricePerPage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Page ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="250" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pageForm.control}
                name="projectTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type (Optional)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Project Types</SelectItem>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pageForm.control}
                name="defaultQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" min="1" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Description (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pageForm.control}
                name="isActive"
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
                        Active
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Is this page available for selection in quotes?
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenPageDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPageMutation.isPending || updatePageMutation.isPending}
                >
                  {(createPageMutation.isPending || updatePageMutation.isPending) && (
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