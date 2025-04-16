import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Quote, QuoteFeature, QuotePage, Feature, Page } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Calendar, 
  Mail, 
  Phone, 
  Trash2,
  ArrowLeft,
  Save,
  ClipboardEdit,
  Check,
  X,
  FileEdit,
  User,
  AlertCircle
} from "lucide-react";

// Extended types to include feature/page details
interface QuoteFeatureExtended extends QuoteFeature {
  featureName: string;
  pricingType?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  flatPrice?: number;
  adminPricePerUnit?: number;
  supportsQuantity?: boolean;
}

interface QuotePageExtended extends QuotePage {
  pageName: string;
  pricePerPage: number;
  adminPricePerPage?: number;
  supportsQuantity?: boolean;
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
  const [assignedUser, setAssignedUser] = useState<string>("");
  
  // State for editing quote features and pages
  const [editableFeatures, setEditableFeatures] = useState<QuoteFeatureExtended[]>([]);
  const [editablePages, setEditablePages] = useState<QuotePageExtended[]>([]);
  const [basePrice, setBasePrice] = useState(0);
  const [projectTypeName, setProjectTypeName] = useState("");
  
  // Dialog state for adding features and pages
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  
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
  
  // Fetch all features for reference
  const { data: allFeatures } = useQuery<Feature[]>({
    queryKey: ['/api/features'],
    queryFn: getQueryFn<Feature[]>({ on401: 'throw' })
  });

  // Fetch quote features
  const { data: quoteFeatures, isLoading: featuresLoading } = useQuery<QuoteFeatureExtended[]>({
    queryKey: [`/api/quotes/${quoteId}/features`],
    enabled: !!quoteId && !!allFeatures,
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}/features`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching quote features: ${response.status}`);
      }
      
      // Get features data with names from feature ID
      const quoteFeatureData: QuoteFeature[] = await response.json();
      
      // Create extended features with proper naming/data from admin settings
      return quoteFeatureData.map(qf => {
        // Find the matching feature from admin settings
        const feature = allFeatures?.find(f => f.id === qf.featureId);
        
        if (!feature) {
          return {
            ...qf,
            featureName: `Feature #${qf.featureId}`,
            pricingType: 'fixed',
          };
        }
        
        return {
          ...qf,
          featureName: feature.name,
          pricingType: feature.pricingType,
          hourlyRate: feature.hourlyRate,
          estimatedHours: feature.estimatedHours,
          flatPrice: feature.flatPrice,
          supportsQuantity: feature.supportsQuantity,
          // Store admin pricing for later use
          adminPricePerUnit: feature.pricingType === 'hourly' && feature.hourlyRate && feature.estimatedHours 
            ? feature.hourlyRate * feature.estimatedHours 
            : feature.flatPrice || 0
        };
      }) as QuoteFeatureExtended[];
    }
  });
  
  // Fetch all pages for reference
  // Fetch all pages for reference
  const { data: allPages } = useQuery<Page[]>({
    queryKey: ['/api/pages'],
    queryFn: getQueryFn<Page[]>({ on401: 'throw' })
  });
  
  // Fetch all users for displaying names
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn<any[]>({ on401: 'throw' }),
    enabled: !!user
  });

  // Fetch quote pages
  const { data: quotePages, isLoading: pagesLoading } = useQuery<QuotePageExtended[]>({
    queryKey: [`/api/quotes/${quoteId}/pages`],
    enabled: !!quoteId && !!allPages,
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}/pages`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching quote pages: ${response.status}`);
      }
      
      // Get pages data from API
      const quotePagesData: QuotePage[] = await response.json();
      
      // Create extended pages with proper naming/data from admin settings
      return quotePagesData.map(qp => {
        // Find the matching page from admin settings
        const page = allPages?.find(p => p.id === qp.pageId);
        
        if (!page) {
          return {
            ...qp,
            pageName: `Page #${qp.pageId}`,
            pricePerPage: qp.price / qp.quantity
          };
        }
        
        return {
          ...qp,
          pageName: page.name,
          // Use admin-defined pricing instead of calculated
          pricePerPage: page.pricePerPage,
          // Store admin pricing for later use
          adminPricePerPage: page.pricePerPage,
          // Pass along the supportsQuantity setting
          supportsQuantity: page.supportsQuantity
        };
      }) as QuotePageExtended[];
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
  
  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async (data: { notes?: string, internalNotes?: string, totalPrice?: number, createdBy?: string }) => {
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
        title: "Quote updated",
        description: "Quote details have been updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive",
        title: "Error updating quote",
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
      case "Won": return "bg-green-500 text-white";
      case "Lost": return "bg-red-500 text-white";
      case "In Progress": return "bg-blue-500 text-white";
      case "On Hold": return "bg-gray-500 text-white";
      case "Proposal Sent": return "bg-purple-500 text-white";
      default: return "bg-yellow-400 text-gray-900";
    }
  };
  
  // Handle status change
  const handleStatusChange = (status: string) => {
    setLeadStatus(status);
    updateStatusMutation.mutate(status);
  };
  
  // Handle quote update (notes, prices, quantities)
  const handleSaveQuote = () => {
    // Calculate new total price
    const newTotalPrice = calculateTotalPrice();
    
    // Update the quote with all changes
    updateQuoteMutation.mutate({
      notes: clientNotes,
      internalNotes: internalNotes,
      totalPrice: newTotalPrice,
      createdBy: assignedUser
    }, {
      onSuccess: (updatedQuote) => {
        // Update the quote data locally to avoid needing a refresh
        if (quote) {
          // Create a new version of the quote with updated price for immediate display
          const updatedQuoteObject = {
            ...quote,
            totalPrice: newTotalPrice,
            notes: clientNotes,
            internalNotes: internalNotes,
            createdBy: assignedUser,
            updatedAt: new Date().toISOString()
          };
          
          // Update the query cache directly to trigger UI updates
          queryClient.setQueryData([`/api/quotes/${quoteId}`], updatedQuoteObject);
          
          // Also update any modified features/pages in the query cache
          // Replace the displayed quote features with the edited ones 
          queryClient.setQueryData([`/api/quotes/${quoteId}/features`], [...editableFeatures]);
          
          // Replace the displayed quote pages with the edited ones
          queryClient.setQueryData([`/api/quotes/${quoteId}/pages`], [...editablePages]);
        }
      }
    });
    
    // Ensure all feature and page changes are synchronized with the backend
    syncFeatureChanges();
    syncPageChanges();
  };
  
  // Initialize form values when data is loaded
  useEffect(() => {
    if (quote) {
      setLeadStatus(quote.leadStatus || "In Progress");
      setClientNotes(quote.notes || "");
      setInternalNotes(quote.internalNotes || "");
      setAssignedUser(quote.createdBy || "");
    }
  }, [quote]);
  
  // Fetch the project type to get base price when quote is loaded
  useEffect(() => {
    if (quote) {
      // Fetch the project type to get the correct base price
      const fetchProjectType = async () => {
        try {
          const response = await fetch(`/api/project-types/${quote.projectTypeId}`);
          if (response.ok) {
            const projectType = await response.json();
            // Use the admin-defined base price from the project type
            setBasePrice(projectType.basePrice || 0);
            // Store the project type name
            setProjectTypeName(projectType.name || "Project");
          } else {
            // Fallback to calculated base price if we can't get the project type
            setBasePrice(quote.totalPrice ? quote.totalPrice * 0.3 : 0);
            setProjectTypeName("Project");
          }
        } catch (error) {
          console.error("Error fetching project type:", error);
          setBasePrice(quote.totalPrice ? quote.totalPrice * 0.3 : 0);
          setProjectTypeName("Project");
        }
      };
      
      fetchProjectType();
    }
  }, [quote]);
  
  // Initialize editable features and pages when the data is loaded or edit mode is activated
  useEffect(() => {
    if (isEditing && quoteFeatures && quotePages) {
      setEditableFeatures([...quoteFeatures]);
      setEditablePages([...quotePages]);
    }
  }, [isEditing, quoteFeatures, quotePages]);
  
  // Calculate total price based on current items
  const calculateTotalPrice = () => {
    const featuresTotal = editableFeatures.reduce(
      (sum, feature) => sum + feature.price,
      0
    );
    const pagesTotal = editablePages.reduce(
      (sum, page) => sum + page.price,
      0
    );
    return basePrice + featuresTotal + pagesTotal;
  };
  
  // Update feature quantity
  const updateFeatureQuantity = (featureId: number, quantity: number) => {
    setEditableFeatures(prev => 
      prev.map(feature => {
        if (feature.id === featureId) {
          // Always use admin-defined pricing when available
          let pricePerUnit;
          
          if (feature.adminPricePerUnit !== undefined) {
            // Use admin pricing from the feature settings
            pricePerUnit = feature.adminPricePerUnit;
          } else {
            // Fallback to calculated price per unit if admin price not available
            pricePerUnit = feature.price / feature.quantity;
          }
          
          return { 
            ...feature, 
            quantity, 
            // Recalculate price based on quantity and admin price settings
            price: quantity * pricePerUnit
          };
        }
        return feature;
      })
    );
    
    // Update the backend with the new quantity and price
    syncFeatureChanges();
  };
  
  // Update feature price directly
  const updateFeaturePrice = (featureId: number, price: number) => {
    setEditableFeatures(prev => 
      prev.map(feature => 
        feature.id === featureId ? { ...feature, price } : feature
      )
    );
    
    // Update the backend with the new price
    syncFeatureChanges();
  };
  
  // Sync feature changes to the backend
  const syncFeatureChanges = () => {
    editableFeatures.forEach(feature => {
      // Use a debounced or throttled version in a real app
      fetch(`/api/quotes/${quoteId}/features/${feature.featureId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: feature.quantity,
          price: feature.price
        }),
        credentials: 'include'
      }).catch(err => {
        console.error("Error updating feature:", err);
      });
    });
  };
  
  // Sync page changes to the backend
  const syncPageChanges = () => {
    editablePages.forEach(page => {
      // Use a debounced or throttled version in a real app
      fetch(`/api/quotes/${quoteId}/pages/${page.pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: page.quantity,
          price: page.price
        }),
        credentials: 'include'
      }).catch(err => {
        console.error("Error updating page:", err);
      });
    });
  };
  
  // Update page quantity
  const updatePageQuantity = (pageId: number, quantity: number) => {
    setEditablePages(prev => 
      prev.map(page => {
        if (page.id === pageId) {
          // Check if this page supports quantity changes
          if (page.supportsQuantity === false) {
            // Don't change quantity for pages that don't support it
            return page;
          }
        
          // Always use admin-defined pricing when available
          let pricePerPage;
          
          if (page.adminPricePerPage !== undefined) {
            // Use admin pricing from the page settings
            pricePerPage = page.adminPricePerPage;
          } else {
            // Fallback to calculated price per page if admin price not available
            pricePerPage = page.pricePerPage;
          }
          
          return { 
            ...page, 
            quantity, 
            // Recalculate price based on quantity and admin price settings
            price: quantity * pricePerPage
          };
        }
        return page;
      })
    );
    
    // Update the backend with the new quantity and price
    syncPageChanges();
  };
  
  // Update page price directly
  const updatePagePrice = (pageId: number, price: number) => {
    setEditablePages(prev => 
      prev.map(page => 
        page.id === pageId ? { ...page, price } : page
      )
    );
    
    // Update the backend with the new price
    syncPageChanges();
  };
  
  // Remove a feature from the quote
  const removeFeature = (featureId: number) => {
    setEditableFeatures(prev => {
      const filteredFeatures = prev.filter(feature => feature.id !== featureId);
      
      // If we're removing the last feature, we'll ensure the section stays visible
      if (prev.length === 1) {
        setTimeout(() => {
          setFeatureDialogOpen(true); // Open the dialog to add a new feature
        }, 100);
        
        toast({
          title: "All features removed",
          description: "You've removed all features. Add a new one to continue.",
        });
      }
      
      return filteredFeatures;
    });
  };
  
  // Remove a page from the quote
  const removePage = (pageId: number) => {
    setEditablePages(prev => prev.filter(page => page.id !== pageId));
  };
  
  // Add a feature to the quote
  const addFeatureToQuote = async (featureId: number) => {
    if (!quote) return;
    
    try {
      // Find the feature in the allFeatures list
      const feature = allFeatures?.find(f => f.id === featureId);
      if (!feature) {
        toast({
          title: "Error",
          description: "Feature not found",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate initial price based on feature pricing type
      let initialPrice = 0;
      if (feature.pricingType === 'hourly' && feature.hourlyRate && feature.estimatedHours) {
        initialPrice = feature.hourlyRate * feature.estimatedHours;
      } else if (feature.flatPrice) {
        initialPrice = feature.flatPrice;
      }
      
      // Create new feature entry for the quote
      const response = await fetch(`/api/quotes/${quoteId}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          featureId: feature.id,
          quantity: feature.supportsQuantity ? 1 : 1, // Default to 1
          price: initialPrice
        }),
        credentials: 'include'
      });
      
      // Check for errors in the response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add feature: ${errorText}`);
      }
      
      let newQuoteFeature;
      try {
        // Try to parse the response as JSON
        newQuoteFeature = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response format from the server');
      }
      
      if (!newQuoteFeature || !newQuoteFeature.id) {
        throw new Error('Invalid feature data returned from server');
      }
      
      // Add the feature to the local state
      const extendedFeature: QuoteFeatureExtended = {
        ...newQuoteFeature,
        featureName: feature.name,
        pricingType: feature.pricingType,
        hourlyRate: feature.hourlyRate,
        estimatedHours: feature.estimatedHours,
        flatPrice: feature.flatPrice,
        supportsQuantity: feature.supportsQuantity,
        adminPricePerUnit: feature.pricingType === 'hourly' && feature.hourlyRate && feature.estimatedHours 
          ? feature.hourlyRate * feature.estimatedHours 
          : feature.flatPrice || 0
      };
      
      setEditableFeatures(prev => [...prev, extendedFeature]);
      
      // Close the dialog
      setFeatureDialogOpen(false);
      
      toast({
        title: "Feature added",
        description: `${feature.name} has been added to the quote`
      });
      
      // Update the total price
      handleSaveQuote();
      
    } catch (error) {
      console.error("Error adding feature:", error);
      toast({
        title: "Error adding feature",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };
  
  // Add a page to the quote
  const addPageToQuote = async (pageId: number) => {
    if (!quote) return;
    
    try {
      // Find the page in the allPages list
      const page = allPages?.find(p => p.id === pageId);
      if (!page) {
        toast({
          title: "Error",
          description: "Page not found",
          variant: "destructive"
        });
        return;
      }
      
      // Create new page entry for the quote
      const response = await fetch(`/api/quotes/${quoteId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pageId: page.id,
          quantity: page.defaultQuantity || 1,
          price: page.pricePerPage * (page.defaultQuantity || 1)
        }),
        credentials: 'include'
      });
      
      // Check for errors in the response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add page: ${errorText}`);
      }
      
      let newQuotePage;
      try {
        // Try to parse the response as JSON
        newQuotePage = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response format from the server');
      }
      
      if (!newQuotePage || !newQuotePage.id) {
        throw new Error('Invalid page data returned from server');
      }
      
      // Add the page to the local state
      const extendedPage: QuotePageExtended = {
        ...newQuotePage,
        pageName: page.name,
        pricePerPage: page.pricePerPage,
        adminPricePerPage: page.pricePerPage,
        supportsQuantity: page.supportsQuantity
      };
      
      setEditablePages(prev => [...prev, extendedPage]);
      
      // Close the dialog
      setPageDialogOpen(false);
      
      toast({
        title: "Page added",
        description: `${page.name} has been added to the quote`
      });
      
      // Update the total price
      handleSaveQuote();
      
    } catch (error) {
      console.error("Error adding page:", error);
      toast({
        title: "Error adding page",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };
  
  // Update base price
  const updateBasePrice = (price: number) => {
    setBasePrice(price);
  };
  
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
    <div className="min-h-screen bg-[#1F1F1F]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back and action buttons - responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center mb-6 gap-4">
          <Button 
            variant="ghost" 
            className="mr-2 self-start"
            onClick={() => setLocation("/dashboard")}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-2 sm:space-x-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={updateQuoteMutation.isPending}
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
                  <X className="h-4 w-4 mr-2" />
                  <span className="sm:inline">Cancel</span>
                </Button>
                <Button 
                  onClick={handleSaveQuote}
                  disabled={updateQuoteMutation.isPending}
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateQuoteMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="sm:inline">Delete</span>
                </Button>
                <Button 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
                  <ClipboardEdit className="h-4 w-4 mr-2" />
                  <span className="sm:inline">Edit</span>
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
            <div className="bg-[#282828] rounded-lg shadow-sm overflow-hidden border border-gray-800">
              <div className="p-6 border-b border-gray-800">
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
                    <Select 
                      value={leadStatus || ""}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">Assigned to:</span>
                    {isEditing ? (
                      <Select 
                        value={assignedUser}
                        onValueChange={setAssignedUser}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select User" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.username}>
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium">
                        {quote.createdBy || "Unassigned"}
                      </span>
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
                          {isEditing && (
                            <CardDescription>
                              Edit quantities and prices below
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium mb-2">{projectTypeName}</h3>
                              <div className="bg-[#1F1F1F] border border-gray-800 p-3 rounded-md">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Base Price</span>
                                  {isEditing ? (
                                    <div className="w-32">
                                      <Input 
                                        type="number"
                                        className="text-right h-8"
                                        value={basePrice}
                                        onChange={(e) => {
                                          const newPrice = parseFloat(e.target.value) || 0;
                                          updateBasePrice(newPrice);
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-sm font-medium">
                                      {formatCurrency(basePrice)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Features Section - Always show when editing */}
                            {(isEditing || (editableFeatures.length > 0 || (quoteFeatures && quoteFeatures.length > 0))) && (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-sm font-medium">Selected Features</h3>
                                  {isEditing && (
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setFeatureDialogOpen(true)}
                                    >
                                      Add Feature
                                    </Button>
                                  )}
                                </div>
                                {((isEditing ? editableFeatures : (quoteFeatures || [])) || []).length === 0 && isEditing && (
                                  <div className="bg-[#1F1F1F] border border-gray-800 p-4 rounded-md text-center">
                                    <p className="text-gray-400 mb-2">No features added yet</p>
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setFeatureDialogOpen(true)}
                                    >
                                      Add your first feature
                                    </Button>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  {((isEditing ? editableFeatures : (quoteFeatures || [])) || []).map((item, index) => (
                                    <div 
                                      key={item.id} 
                                      className="bg-[#1F1F1F] border border-gray-800 p-3 rounded-md"
                                    >
                                      <div className="flex justify-between mb-1 items-center">
                                        <div className="flex-grow">
                                          <span className="text-sm font-medium">
                                            {item.featureName}
                                          </span>
                                          {isEditing ? (
                                            <div className="flex mt-2 space-x-2">
                                              {item.supportsQuantity && (
                                                <div className="w-24">
                                                  <div className="text-xs text-gray-500 mb-1">Quantity</div>
                                                  <Input 
                                                    type="number"
                                                    className="h-8"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                      const newQuantity = parseInt(e.target.value) || 1;
                                                      updateFeatureQuantity(item.id, newQuantity);
                                                    }}
                                                  />
                                                </div>
                                              )}
                                              <div className="w-32">
                                                <div className="text-xs text-gray-500 mb-1">Price</div>
                                                <Input 
                                                  type="number"
                                                  className="h-8"
                                                  value={item.price}
                                                  onChange={(e) => {
                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                    updateFeaturePrice(item.id, newPrice);
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          ) : (
                                            item.quantity > 1 && <span className="text-sm ml-1">({item.quantity}x)</span>
                                          )}
                                        </div>
                                        {isEditing ? (
                                          <Button 
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-red-500 hover:text-red-700"
                                            onClick={() => {
                                              removeFeature(item.id);
                                              toast({
                                                title: "Feature removed",
                                                description: "Feature has been removed from the quote",
                                              });
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        ) : (
                                          <span className="text-sm font-medium">
                                            {formatCurrency(item.price)}
                                          </span>
                                        )}
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
                            
                            {/* Pages Section - Always show when editing */}
                            {(isEditing || (editablePages.length > 0 || (quotePages && quotePages.length > 0))) && (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-sm font-medium">Selected Pages</h3>
                                  {isEditing && (
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPageDialogOpen(true)}
                                    >
                                      Add Page
                                    </Button>
                                  )}
                                </div>
                                {((isEditing ? editablePages : (quotePages || [])) || []).length === 0 && isEditing && (
                                  <div className="bg-[#1F1F1F] border border-gray-800 p-4 rounded-md text-center">
                                    <p className="text-gray-400 mb-2">No pages added yet</p>
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPageDialogOpen(true)}
                                    >
                                      Add your first page
                                    </Button>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  {((isEditing ? editablePages : (quotePages || [])) || []).map(item => (
                                    <div 
                                      key={item.id} 
                                      className="bg-[#1F1F1F] border border-gray-800 p-3 rounded-md"
                                    >
                                      <div className="flex justify-between mb-1 items-center">
                                        <div className="flex-grow">
                                          <span className="text-sm font-medium">
                                            {item.pageName}
                                          </span>
                                          {isEditing ? (
                                            <div className="flex mt-2 space-x-2">
                                              {item.supportsQuantity !== false ? (
                                                <div className="w-24">
                                                  <div className="text-xs text-gray-500 mb-1">Quantity</div>
                                                  <Input 
                                                    type="number"
                                                    className="h-8"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                      const newQuantity = parseInt(e.target.value) || 1;
                                                      updatePageQuantity(item.id, newQuantity);
                                                    }}
                                                  />
                                                </div>
                                              ) : null}
                                              <div className="w-32">
                                                <div className="text-xs text-gray-500 mb-1">Price</div>
                                                <Input 
                                                  type="number"
                                                  className="h-8"
                                                  value={item.price}
                                                  onChange={(e) => {
                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                    updatePagePrice(item.id, newPrice);
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          ) : (
                                            item.quantity > 1 && <span className="text-sm ml-1">({item.quantity}x)</span>
                                          )}
                                        </div>
                                        {isEditing ? (
                                          <Button 
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-red-500 hover:text-red-700"
                                            onClick={() => {
                                              removePage(item.id);
                                              toast({
                                                title: "Page removed",
                                                description: "Page has been removed from the quote",
                                              });
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        ) : (
                                          <span className="text-sm font-medium">
                                            {formatCurrency(item.price)}
                                          </span>
                                        )}
                                      </div>
                                      {!isEditing && (
                                        <p className="text-xs text-gray-500">
                                          ${item.pricePerPage.toFixed(2)} per page
                                        </p>
                                      )}
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
                            <div className="bg-[#1F1F1F] border border-gray-800 p-4 rounded-md min-h-[100px]">
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
                            <div className="bg-[#1F1F1F] border border-gray-800 p-4 rounded-md min-h-[100px]">
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
                            <div className="font-medium">
                              {formatDate(quote.createdAt)} at {new Date(quote.createdAt).toLocaleTimeString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Quote created by {quote.createdBy || 'Unknown'}
                            </div>
                          </div>
                          
                          {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
                            <div className="relative pl-6 border-l-2 border-gray-200 pb-4">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                              <div className="font-medium">
                                {formatDate(quote.updatedAt)} at {new Date(quote.updatedAt).toLocaleTimeString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                Quote last updated by {quote.updatedBy || 'Unknown'}
                              </div>
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
      
      {/* Feature selection dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Feature</DialogTitle>
            <DialogDescription>
              Select a feature to add to this quote
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {(allFeatures || []).length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto pr-2">
                {/* Filter out features that are already in the quote */}
                {(allFeatures || [])
                  .filter(feature => 
                    !editableFeatures.some(ef => ef.featureId === feature.id)
                  )
                  .filter(feature => 
                    quote?.projectTypeId === feature.projectTypeId
                  )
                  .map(feature => (
                    <div 
                      key={feature.id}
                      className="flex items-center justify-between p-3 my-1 border rounded-md hover:bg-[#282828] cursor-pointer"
                      onClick={() => addFeatureToQuote(feature.id)}
                    >
                      <div>
                        <h4 className="font-medium">{feature.name}</h4>
                        <p className="text-sm text-gray-500">{feature.description}</p>
                      </div>
                      <div className="text-sm font-medium">
                        {feature.pricingType === 'hourly' && feature.hourlyRate && feature.estimatedHours 
                          ? `${feature.estimatedHours} hours @ $${feature.hourlyRate}/hr`
                          : formatCurrency(feature.flatPrice || 0)
                        }
                      </div>
                    </div>
                  ))}
                  
                {/* Show a notice if all features are already added */}
                {(allFeatures || [])
                  .filter(feature => quote?.projectTypeId === feature.projectTypeId)
                  .filter(feature => 
                    !editableFeatures.some(ef => ef.featureId === feature.id)
                  ).length === 0 && (
                    <p className="text-center py-8 text-gray-500">
                      All available features for this project type have already been added
                    </p>
                  )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No features found</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Page selection dialog */}
      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Page</DialogTitle>
            <DialogDescription>
              Select a page to add to this quote
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {(allPages || []).length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto pr-2">
                {/* Filter out pages that are already in the quote */}
                {(allPages || [])
                  .filter(page => 
                    !editablePages.some(ep => ep.pageId === page.id)
                  )
                  .filter(page => 
                    page.projectTypeId === null || 
                    page.projectTypeId === quote?.projectTypeId
                  )
                  .filter(page => page.isActive) // Only show active pages
                  .map(page => (
                    <div 
                      key={page.id}
                      className="flex items-center justify-between p-3 my-1 border rounded-md hover:bg-[#282828] cursor-pointer"
                      onClick={() => addPageToQuote(page.id)}
                    >
                      <div>
                        <h4 className="font-medium">{page.name}</h4>
                        <p className="text-sm text-gray-500">{page.description}</p>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(page.pricePerPage)}
                      </div>
                    </div>
                  ))}
                  
                {/* Show a notice if all pages are already added */}
                {(allPages || [])
                  .filter(page => 
                    page.projectTypeId === null || 
                    page.projectTypeId === quote?.projectTypeId
                  )
                  .filter(page => page.isActive)
                  .filter(page => 
                    !editablePages.some(ep => ep.pageId === page.id)
                  ).length === 0 && (
                    <p className="text-center py-8 text-gray-500">
                      All available pages for this project type have already been added
                    </p>
                  )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No pages found</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}