import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { CalculatorPanel } from "@/components/calculator/CalculatorPanel";
import { EstimateSummary } from "@/components/calculator/EstimateSummary";
import { ClientInfoForm, ClientInfoValues } from "@/components/calculator/ClientInfoForm";
import { useQuotes } from "@/hooks/use-quotes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectType, SelectedFeature, SelectedPage } from "@shared/schema";

export default function Calculator() {
  const { user, loading } = useAuth();
  const { saveQuoteMutation } = useQuotes();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null);
  const [activeTab, setActiveTab] = useState("calculator");
  
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);
  
  // Calculate the total price for the quote
  const calculateTotalPrice = () => {
    let total = selectedProjectType ? selectedProjectType.basePrice : 0;
    
    // Add feature costs
    selectedFeatures.forEach(feature => {
      if (feature.pricingType === 'fixed') {
        total += (feature.flatPrice || 0) * feature.quantity;
      } else {
        total += (feature.hourlyRate || 0) * (feature.estimatedHours || 0) * feature.quantity;
      }
    });
    
    // Add page costs
    selectedPages.forEach(page => {
      total += page.pricePerPage * page.quantity;
    });
    
    return total;
  };
  
  const handleSaveQuote = async (clientInfo: ClientInfoValues) => {
    if (!selectedProjectType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a project type before saving the quote."
      });
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save a quote."
      });
      return;
    }
    
    const totalPrice = calculateTotalPrice();
    
    try {
      await saveQuoteMutation.mutateAsync({
        quote: {
          projectTypeId: selectedProjectType.id,
          clientName: clientInfo.clientName,
          businessName: clientInfo.businessName || "",
          email: clientInfo.email,
          phone: clientInfo.phone || "",
          notes: clientInfo.notes || "",
          internalNotes: clientInfo.internalNotes || "",
          leadStatus: clientInfo.leadStatus,
          totalPrice,
          closeDate: null,
          createdBy: user.id.toString() // Now we're sure user is not null
        },
        selectedFeatures,
        selectedPages
      });
      
      toast({
        title: "Quote Saved",
        description: "Your quote has been successfully saved."
      });
      
      // Just go back to calculator without resetting the form
      // The selections will be preserved
      setActiveTab("calculator");
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save quote. Please try again."
      });
    }
  };
  
  if (loading || !user) {
    return null;
  }
  
  const isReadyToSaveQuote = selectedProjectType !== null && 
    (selectedFeatures.length > 0 || selectedPages.length > 0);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="calculator">Build Estimate</TabsTrigger>
            <TabsTrigger value="save-quote" disabled={!isReadyToSaveQuote}>Save Quote</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator" className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Create Web Design Estimate</h2>
            
            {/* On mobile, the summary will appear on top for better UX */}
            <div className="block lg:hidden mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <EstimateSummary
                  selectedFeatures={selectedFeatures}
                  selectedProjectType={selectedProjectType}
                  selectedPages={selectedPages}
                  className="mb-4"
                />
                
                {isReadyToSaveQuote && (
                  <Button 
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("save-quote")}
                    size="sm"
                  >
                    Save Quote
                  </Button>
                )}
              </div>
            </div>
            
            {/* Main calculator layout - repositioned for better mobile experience */}
            <div className="flex flex-col lg:flex-row lg:space-x-6">
              <div className="lg:w-2/3">
                <CalculatorPanel
                  onSelectedFeaturesChange={setSelectedFeatures}
                  onSelectedProjectTypeChange={setSelectedProjectType}
                  onSelectedPagesChange={setSelectedPages}
                  initialSelectedFeatures={selectedFeatures}
                  initialSelectedPages={selectedPages}
                  initialSelectedProjectType={selectedProjectType}
                />
              </div>
              
              {/* Desktop summary is hidden on mobile */}
              <div className="hidden lg:block lg:w-1/3">
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 sticky top-24">
                  <EstimateSummary
                    selectedFeatures={selectedFeatures}
                    selectedProjectType={selectedProjectType}
                    selectedPages={selectedPages}
                  />
                  
                  {isReadyToSaveQuote && (
                    <Button 
                      className="mt-4 w-full"
                      onClick={() => setActiveTab("save-quote")}
                    >
                      Save Quote
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Floating action button for mobile to quickly save quote */}
            {isReadyToSaveQuote && (
              <div className="lg:hidden fixed bottom-6 right-6 z-10">
                <Button 
                  className="h-14 w-14 rounded-full shadow-lg"
                  onClick={() => setActiveTab("save-quote")}
                >
                  Save
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="save-quote" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold">Save Quote</h2>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("calculator")}
                size="sm"
              >
                Back to Calculator
              </Button>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:space-x-6">
              <div className="lg:w-1/2">
                <ClientInfoForm 
                  onSubmit={handleSaveQuote} 
                  isSubmitting={saveQuoteMutation.isPending}
                />
              </div>
              
              <div className="lg:w-1/2 mt-6 lg:mt-0">
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <h2 className="text-xl font-bold mb-4">Quote Summary</h2>
                  <EstimateSummary
                    selectedFeatures={selectedFeatures}
                    selectedProjectType={selectedProjectType}
                    selectedPages={selectedPages}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
