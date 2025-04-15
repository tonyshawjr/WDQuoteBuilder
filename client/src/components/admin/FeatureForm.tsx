import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertFeatureSchema, Feature, ProjectType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FeatureFormProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: Feature;
}

const formSchema = insertFeatureSchema.extend({
  projectTypeId: z.number(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  pricingType: z.enum(["fixed", "hourly"]),
  flatPrice: z.number().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  supportsQuantity: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export function FeatureForm({ isOpen, onClose, feature }: FeatureFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!feature;
  const [pricingType, setPricingType] = useState<"fixed" | "hourly">(
    feature?.pricingType as "fixed" | "hourly" || "fixed"
  );
  
  // Fetch project types
  const { data: projectTypes, isLoading: projectTypesLoading } = useQuery<ProjectType[]>({
    queryKey: ['/api/project-types'],
  });
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectTypeId: feature?.projectTypeId || 0,
      name: feature?.name || "",
      description: feature?.description || "",
      category: feature?.category || "",
      pricingType: feature?.pricingType as "fixed" | "hourly" || "fixed",
      flatPrice: feature?.flatPrice || null,
      hourlyRate: feature?.hourlyRate || null,
      estimatedHours: feature?.estimatedHours || null,
      supportsQuantity: feature?.supportsQuantity || false,
    },
  });
  
  const currentPricingType = watch("pricingType");
  
  useEffect(() => {
    setPricingType(currentPricingType);
  }, [currentPricingType]);
  
  // Create feature mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/features", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: "Success",
        description: "Feature created successfully",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create feature: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Update feature mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("PUT", `/api/features/${feature?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: "Success",
        description: "Feature updated successfully",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update feature: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: FormData) => {
    // Clean up data based on pricing type
    if (data.pricingType === "fixed") {
      data.hourlyRate = null;
      data.estimatedHours = null;
    } else {
      data.flatPrice = null;
    }
    
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  const handlePricingTypeChange = (value: "fixed" | "hourly") => {
    setPricingType(value);
    setValue("pricingType", value);
  };
  
  const handleClose = () => {
    reset();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Feature" : "Add Feature"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectTypeId">Project Type</Label>
              {projectTypesLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading project types...</span>
                </div>
              ) : (
                <Select
                  defaultValue={feature?.projectTypeId?.toString()}
                  onValueChange={(value) => setValue("projectTypeId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.projectTypeId && (
                <p className="text-sm text-red-500">{errors.projectTypeId.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Feature Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Custom Design"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register("category")}
                placeholder="e.g. Design"
              />
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe this feature"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <RadioGroup
                defaultValue={pricingType}
                onValueChange={(value) => handlePricingTypeChange(value as "fixed" | "hourly")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">Fixed Price</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hourly" id="hourly" />
                  <Label htmlFor="hourly">Hourly Rate</Label>
                </div>
              </RadioGroup>
            </div>
            
            {pricingType === "fixed" ? (
              <div className="space-y-2">
                <Label htmlFor="flatPrice">Price ($)</Label>
                <Input
                  id="flatPrice"
                  type="number"
                  step="0.01"
                  {...register("flatPrice", { valueAsNumber: true })}
                  placeholder="e.g. 500"
                />
                {errors.flatPrice && (
                  <p className="text-sm text-red-500">{errors.flatPrice.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    {...register("hourlyRate", { valueAsNumber: true })}
                    placeholder="e.g. 150"
                  />
                  {errors.hourlyRate && (
                    <p className="text-sm text-red-500">{errors.hourlyRate.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    step="0.5"
                    {...register("estimatedHours", { valueAsNumber: true })}
                    placeholder="e.g. 10"
                  />
                  {errors.estimatedHours && (
                    <p className="text-sm text-red-500">{errors.estimatedHours.message}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="supportsQuantity"
                {...register("supportsQuantity")}
                defaultChecked={feature?.supportsQuantity}
              />
              <Label htmlFor="supportsQuantity">Supports Quantity</Label>
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
