import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ProjectType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ProjectTypeForm } from "./ProjectTypeForm";
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
import { Pencil, Trash2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectTypeTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | undefined>(undefined);
  
  // Fetch project types
  const { data: projectTypes, isLoading: projectTypesLoading } = useQuery<ProjectType[]>({
    queryKey: ['/api/project-types'],
  });
  
  // Delete project type mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/project-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-types'] });
      toast({
        title: "Success",
        description: "Project type deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete project type: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleAddClick = () => {
    setSelectedProjectType(undefined);
    setFormOpen(true);
  };
  
  const handleEditClick = (projectType: ProjectType) => {
    setSelectedProjectType(projectType);
    setFormOpen(true);
  };
  
  const handleDeleteClick = (projectType: ProjectType) => {
    setSelectedProjectType(projectType);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedProjectType) {
      deleteMutation.mutate(selectedProjectType.id);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Project Types</h3>
        <div>
          <Button onClick={handleAddClick} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Project Type
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projectTypesLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-4">
                  <Skeleton className="h-10 w-full" />
                </td>
              </tr>
            ) : projectTypes && projectTypes.length > 0 ? (
              projectTypes.map((projectType) => (
                <tr key={projectType.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{projectType.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(projectType.basePrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(projectType)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(projectType)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No project types found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <ProjectTypeForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        projectType={selectedProjectType}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project type
              {selectedProjectType ? ` "${selectedProjectType.name}"` : ""}. 
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
