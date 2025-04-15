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
          closeDate: null
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="save-quote" disabled={!isReadyToSaveQuote}>Save Quote</TabsTrigger>
            </TabsList>
            
            {activeTab === "calculator" && isReadyToSaveQuote && (
              <Button onClick={() => setActiveTab("save-quote")}>
                Continue to Save Quote
              </Button>
            )}
          </div>
          
          <TabsContent value="calculator">
            <div className="md:flex md:space-x-6">
              <div className="md:w-2/3">
                <CalculatorPanel
                  onSelectedFeaturesChange={setSelectedFeatures}
                  onSelectedProjectTypeChange={setSelectedProjectType}
                  onSelectedPagesChange={setSelectedPages}
                  initialSelectedFeatures={selectedFeatures}
                  initialSelectedPages={selectedPages}
                  initialSelectedProjectType={selectedProjectType}
                />
              </div>
              
              <div className="md:w-1/3 mt-6 md:mt-0">
                <EstimateSummary
                  selectedFeatures={selectedFeatures}
                  selectedProjectType={selectedProjectType}
                  selectedPages={selectedPages}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="save-quote">
            <div className="md:flex md:space-x-6">
              <div className="md:w-1/2">
                <ClientInfoForm 
                  onSubmit={handleSaveQuote} 
                  isSubmitting={saveQuoteMutation.isPending}
                />
              </div>
              
              <div className="md:w-1/2 mt-6 md:mt-0">
                <h2 className="text-2xl font-bold mb-4">Quote Summary</h2>
                <EstimateSummary
                  selectedFeatures={selectedFeatures}
                  selectedProjectType={selectedProjectType}
                  selectedPages={selectedPages}
                />
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={() => setActiveTab("calculator")}
                >
                  Back to Calculator
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
