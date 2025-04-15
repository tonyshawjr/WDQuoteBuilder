import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Page, ProjectType } from "@shared/schema";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { PageForm } from "./PageForm";
import { Pencil, Trash2 } from "lucide-react";

export function PageTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pageToEdit, setPageToEdit] = useState<Page | undefined>(undefined);
  const [pageToDelete, setPageToDelete] = useState<Page | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all pages
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["/api/pages"],
  });

  // Fetch project types for display
  const { data: projectTypes = [] } = useQuery({
    queryKey: ["/api/project-types"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/pages/${id}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({
        title: "Success",
        description: "Page deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete page",
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditClick = (page: Page) => {
    setPageToEdit(page);
    setIsFormOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (page: Page) => {
    setPageToDelete(page);
    setIsDeleteDialogOpen(true);
  };

  // Find project type name by ID
  const getProjectTypeName = (projectTypeId: number | null) => {
    if (!projectTypeId) return "All Project Types";
    const projectType = projectTypes.find((pt: ProjectType) => pt.id === projectTypeId);
    return projectType ? projectType.name : "Unknown";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Pages</h2>
        <Button onClick={() => {
          setPageToEdit(undefined);
          setIsFormOpen(true);
        }}>
          Add New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-4">No pages found. Add your first page to get started.</div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price Per Page</TableHead>
                <TableHead>Project Type</TableHead>
                <TableHead>Default Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page: Page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.name}</TableCell>
                  <TableCell>{page.description || '-'}</TableCell>
                  <TableCell>${page.pricePerPage.toFixed(2)}</TableCell>
                  <TableCell>{getProjectTypeName(page.projectTypeId)}</TableCell>
                  <TableCell>{page.defaultQuantity}</TableCell>
                  <TableCell>
                    <Badge variant={page.isActive ? "default" : "secondary"}>
                      {page.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(page)}
                      className="mr-1"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(page)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit/Add Form Dialog */}
      {isFormOpen && (
        <PageForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          page={pageToEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the page
              <strong> {pageToDelete?.name}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pageToDelete) {
                  deleteMutation.mutate(pageToDelete.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}