import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Feature, ProjectType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { FeatureForm } from "./FeatureForm";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function FeatureTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | undefined>(undefined);
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  
  // Fetch features
  const { data: features, isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ['/api/features'],
  });
  
  // Fetch project types for filtering
  const { data: projectTypes, isLoading: projectTypesLoading } = useQuery<ProjectType[]>({
    queryKey: ['/api/project-types'],
  });
  
  // Delete feature mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/features/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      toast({
        title: "Success",
        description: "Feature deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete feature: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleAddClick = () => {
    setSelectedFeature(undefined);
    setFormOpen(true);
  };
  
  const handleEditClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setFormOpen(true);
  };
  
  const handleDeleteClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedFeature) {
      deleteMutation.mutate(selectedFeature.id);
    }
  };
  
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Filter features based on selected project type
  const filteredFeatures = features?.filter(feature => 
    projectTypeFilter === "all" || feature.projectTypeId.toString() === projectTypeFilter
  );
  
  // Get project type name by ID
  const getProjectTypeName = (id: number) => {
    return projectTypes?.find(pt => pt.id === id)?.name || "Unknown";
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Feature Library</h3>
        <div className="flex items-center space-x-2">
          {projectTypesLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <Select
              value={projectTypeFilter}
              onValueChange={setProjectTypeFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Project Types</SelectItem>
                {projectTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button onClick={handleAddClick} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Feature
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {featuresLoading || projectTypesLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4">
                  <Skeleton className="h-10 w-full" />
                </td>
              </tr>
            ) : filteredFeatures && filteredFeatures.length > 0 ? (
              filteredFeatures.map((feature) => (
                <tr key={feature.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{feature.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getProjectTypeName(feature.projectTypeId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{feature.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{feature.pricingType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {feature.pricingType === 'hourly' 
                      ? `${feature.estimatedHours} hrs @ ${formatCurrency(feature.hourlyRate)}`
                      : formatCurrency(feature.flatPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(feature)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(feature)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No features found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <FeatureForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        feature={selectedFeature}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the feature
              {selectedFeature ? ` "${selectedFeature.name}"` : ""}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
