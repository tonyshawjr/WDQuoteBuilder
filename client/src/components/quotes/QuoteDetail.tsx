import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Quote, QuoteFeature, QuotePage, Feature, Page } from "@shared/schema";
import { 
  Calendar, 
  Mail, 
  Phone, 
  Trash2,
  X
} from "lucide-react";

// Extended types to include feature/page details
interface QuoteFeatureExtended extends QuoteFeature {
  featureName: string;
  pricingType?: string;
  hourlyRate?: number;
  estimatedHours?: number;
}

interface QuotePageExtended extends QuotePage {
  pageName: string;
  pricePerPage: number;
}

interface QuoteDetailProps {
  quoteId: number;
  open: boolean;
  onClose: () => void;
}

export function QuoteDetail({ quoteId, open, onClose }: QuoteDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState<string | null>(null);
  
  // Fetch quote details
  const { data: quote, isLoading: quoteLoading } = useQuery<Quote>({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: open && !!quoteId,
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching quote: ${response.status}`);
      }
      return await response.json();
    }
  });
  
  // Fetch quote features
  const { data: quoteFeatures, isLoading: featuresLoading } = useQuery<QuoteFeatureExtended[]>({
    queryKey: [`/api/quotes/${quoteId}/features`],
    enabled: open && !!quoteId,
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}/features`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching quote features: ${response.status}`);
      }
      
      // Get features data with names from feature ID
      const quoteFeatureData: QuoteFeature[] = await response.json();
      
      // Create extended features with proper naming/data
      // This is a workaround until we update the schema to include more details in the API response
      return quoteFeatureData.map(qf => ({
        ...qf,
        featureName: `Feature #${qf.featureId}`, // Ideally fetched from features table
        pricingType: 'fixed', // Default to fixed pricing
      })) as QuoteFeatureExtended[];
    }
  });
  
  // Fetch quote pages
  const { data: quotePages, isLoading: pagesLoading } = useQuery<QuotePageExtended[]>({
    queryKey: [`/api/quotes/${quoteId}/pages`],
    enabled: open && !!quoteId,
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}/pages`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching quote pages: ${response.status}`);
      }
      
      // Get pages data from API
      const quotePagesData: QuotePage[] = await response.json();
      
      // Create extended pages with proper naming/data
      // This is a workaround until we update the schema to include more details in the API response
      return quotePagesData.map(qp => ({
        ...qp,
        pageName: `Page #${qp.pageId}`, // Ideally fetched from pages table
        pricePerPage: qp.price / qp.quantity, // Calculate price per page
      })) as QuotePageExtended[];
    }
  });
  
  // Update quote status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leadStatus: status })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      toast({ 
        title: "Status updated",
        description: "Quote status has been updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error updating status",
        description: error.message
      });
    }
  });
  
  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/quotes/${quoteId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setDeleteDialogOpen(false);
      onClose();
      toast({ 
        title: "Quote deleted",
        description: "Quote has been deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error deleting quote",
        description: error.message
      });
    }
  });
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge color
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Won": return "bg-green-100 text-green-800";
      case "Lost": return "bg-red-100 text-red-800";
      case "Proposal Sent": return "bg-blue-100 text-blue-800";
      case "On Hold": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Handle status change
  const handleStatusChange = (status: string) => {
    setLeadStatus(status);
    updateStatusMutation.mutate(status);
  };
  
  const isLoading = quoteLoading || featuresLoading || pagesLoading;
  
  // Initialize leadStatus when quote data is loaded
  if (quote && leadStatus === null) {
    setLeadStatus(quote.leadStatus || "In Progress");
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading quote details...</div>
          ) : quote ? (
            <div className="space-y-6">
              {/* Client information */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Client Information</CardTitle>
                      <CardDescription>{quote.businessName || "Individual Client"}</CardDescription>
                    </div>
                    <Select 
                      value={leadStatus || ""}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Contact</h3>
                      <p className="text-sm font-semibold">{quote.clientName}</p>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>{quote.email}</span>
                        </div>
                        {quote.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-2" />
                            <span>{quote.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-1">Quote Information</h3>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <Badge className={getStatusColor(quote.leadStatus)}>
                            {quote.leadStatus || "In Progress"}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Created: {formatDate(quote.createdAt)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="mr-2">Total:</span>
                          <span className="font-semibold">
                            {formatCurrency(quote.totalPrice || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {(quote.notes || quote.internalNotes) && (
                    <div className="mt-4">
                      {quote.notes && (
                        <div className="mb-3">
                          <h3 className="text-sm font-medium mb-1">Client Notes</h3>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                            {quote.notes}
                          </p>
                        </div>
                      )}
                      
                      {quote.internalNotes && (
                        <div>
                          <h3 className="text-sm font-medium mb-1">Internal Notes</h3>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                            {quote.internalNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Quote breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Quote Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Base Project</h3>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex justify-between">
                          <span className="text-sm">Base Price</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(quote.totalPrice ? quote.totalPrice * 0.3 : 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {quoteFeatures && quoteFeatures.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Selected Features</h3>
                        <div className="space-y-2">
                          {quoteFeatures.map(item => (
                            <div 
                              key={item.id} 
                              className="bg-gray-50 p-3 rounded-md"
                            >
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">
                                  {item.featureName}
                                  {item.quantity > 1 ? ` (x${item.quantity})` : ''}
                                </span>
                                <span className="text-sm font-medium">
                                  {formatCurrency(item.price)}
                                </span>
                              </div>
                              {item.pricingType === 'hourly' && item.hourlyRate && item.estimatedHours && (
                                <p className="text-xs text-gray-500">
                                  {item.estimatedHours} hours @ {formatCurrency(item.hourlyRate)}/hr
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {quotePages && quotePages.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Selected Pages</h3>
                        <div className="space-y-2">
                          {quotePages.map(item => (
                            <div 
                              key={item.id} 
                              className="bg-gray-50 p-3 rounded-md"
                            >
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">
                                  {item.pageName}
                                  {item.quantity > 1 ? ` (x${item.quantity})` : ''}
                                </span>
                                <span className="text-sm font-medium">
                                  {formatCurrency(item.price)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                ${item.pricePerPage.toFixed(2)} per page
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-medium">Total</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(quote.totalPrice || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <DialogFooter className="flex justify-between sm:justify-between">
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Quote
                </Button>
                <Button onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Quote not found</div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quote 
              and all related information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteQuoteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteQuoteMutation.mutate();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}