import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Quote, QuoteFeature, QuotePage, Feature, Page } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Calendar, 
  Mail, 
  Phone, 
  Trash2,
  ArrowLeft,
  Save,
  ClipboardEdit,
  Check,
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

export default function QuoteDetailsPage() {
  const { id: quoteIdParam } = useParams<{ id: string }>();
  const quoteId = parseInt(quoteIdParam || '0');
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  
  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);
  
  // Fetch quote details
  const { data: quote, isLoading: quoteLoading } = useQuery<Quote>({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: !!quoteId,
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
    enabled: !!quoteId,
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
    enabled: !!quoteId,
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
  
  // Update quote notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (data: { notes?: string, internalNotes?: string }) => {
      return await apiRequest(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      setIsEditing(false);
      toast({ 
        title: "Notes updated",
        description: "Quote notes have been updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error updating notes",
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
      setLocation("/dashboard");
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
  
  // Handle notes save
  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      notes: clientNotes,
      internalNotes: internalNotes
    });
  };
  
  // Initialize form values when data is loaded
  useEffect(() => {
    if (quote) {
      setLeadStatus(quote.leadStatus || "In Progress");
      setClientNotes(quote.notes || "");
      setInternalNotes(quote.internalNotes || "");
    }
  }, [quote]);
  
  // Cancel editing
  const handleCancelEdit = () => {
    if (quote) {
      setClientNotes(quote.notes || "");
      setInternalNotes(quote.internalNotes || "");
    }
    setIsEditing(false);
  };
  
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  const isLoading = quoteLoading || featuresLoading || pagesLoading;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="ml-auto flex space-x-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={updateNotesMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveNotes}
                  disabled={updateNotesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateNotesMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Quote
                </Button>
                <Button 
                  onClick={() => setIsEditing(true)}
                >
                  <ClipboardEdit className="h-4 w-4 mr-2" />
                  Edit Quote
                </Button>
              </>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading quote details...</p>
          </div>
        ) : !quote ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-2xl font-bold mb-2">Quote Not Found</h2>
            <p className="text-gray-500 mb-6">The quote you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => setLocation("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{quote.clientName}</h1>
                    <p className="text-gray-500">{quote.businessName || "Individual Client"}</p>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="text-xl font-bold">{formatCurrency(quote.totalPrice || 0)}</div>
                    <div className="text-sm text-gray-500">Created {formatDate(quote.createdAt)}</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Status:</span>
                    {isEditing ? (
                      <Select 
                        value={leadStatus || ""}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger className="w-[180px]">
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
                    ) : (
                      <Badge className={getStatusColor(quote.leadStatus)}>
                        {quote.leadStatus || "In Progress"}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{quote.email}</span>
                  </div>
                  
                  {quote.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{quote.phone}</span>
                    </div>
                  )}
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Quote Details</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="pt-6">
                    <div className="space-y-6">
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
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="notes" className="pt-6">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Client Notes</CardTitle>
                          <CardDescription>
                            Notes visible to the client in proposals and emails
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isEditing ? (
                            <Textarea
                              placeholder="Add notes for the client..."
                              value={clientNotes}
                              onChange={(e) => setClientNotes(e.target.value)}
                              className="min-h-[150px]"
                            />
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-md min-h-[100px]">
                              {quote.notes || (
                                <span className="text-gray-400 italic">No client notes added yet</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Internal Notes</CardTitle>
                          <CardDescription>
                            Private notes only visible to your team
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isEditing ? (
                            <Textarea
                              placeholder="Add internal notes visible only to your team..."
                              value={internalNotes}
                              onChange={(e) => setInternalNotes(e.target.value)}
                              className="min-h-[150px]"
                            />
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-md min-h-[100px]">
                              {quote.internalNotes || (
                                <span className="text-gray-400 italic">No internal notes added yet</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="pt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Quote History</CardTitle>
                        <CardDescription>
                          Timeline of changes and interactions
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="relative pl-6 border-l-2 border-gray-200 pb-4">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500"></div>
                            <div className="font-medium">{formatDate(quote.createdAt)}</div>
                            <div className="text-sm text-gray-500">Quote created</div>
                          </div>
                          
                          {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
                            <div className="relative pl-6 border-l-2 border-gray-200 pb-4">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                              <div className="font-medium">{formatDate(quote.updatedAt)}</div>
                              <div className="text-sm text-gray-500">Quote last updated</div>
                            </div>
                          )}
                          
                          {quote.leadStatus && quote.leadStatus !== "In Progress" && (
                            <div className="relative pl-6 border-l-2 border-gray-200">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500"></div>
                              <div className="font-medium">Status updated</div>
                              <div className="text-sm text-gray-500">
                                Status changed to <Badge className={getStatusColor(quote.leadStatus)}>{quote.leadStatus}</Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
      
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
    </div>
  );
}