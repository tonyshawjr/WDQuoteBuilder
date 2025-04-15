import { useState } from "react";
import { ProjectType, SelectedFeature, SelectedPage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clipboard, 
  FileDown, 
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EstimateSummaryProps {
  selectedFeatures: SelectedFeature[];
  selectedPages: SelectedPage[];
  selectedProjectType: ProjectType | null;
  className?: string;
}

export function EstimateSummary({ 
  selectedFeatures,
  selectedPages,
  selectedProjectType,
  className = "" 
}: EstimateSummaryProps) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const calculateFeaturePrice = (feature: SelectedFeature): number => {
    if (feature.pricingType === 'fixed') {
      return (feature.flatPrice as number) * feature.quantity;
    } else {
      return (feature.hourlyRate as number) * (feature.estimatedHours as number) * feature.quantity;
    }
  };

  const calculatePagePrice = (page: SelectedPage): number => {
    return (page.pricePerPage || 0) * (page.quantity || 1);
  };
  
  const basePrice = selectedProjectType?.basePrice || 0;
  const featuresPrice = selectedFeatures.reduce((sum, feature) => sum + calculateFeaturePrice(feature), 0);
  const pagesPrice = selectedPages.reduce((sum, page) => sum + calculatePagePrice(page), 0);
  const totalPrice = basePrice + featuresPrice + pagesPrice;
  
  const handleCopyEstimate = () => {
    if (!selectedProjectType) return;
    
    let text = `Project Estimate: ${selectedProjectType.name}\n\n`;
    text += `Base Price: ${formatCurrency(basePrice)}\n\n`;
    
    if (selectedPages.length > 0) {
      text += "Selected Pages:\n";
      selectedPages.forEach(page => {
        const price = calculatePagePrice(page);
        text += `- ${page.name}${page.quantity > 1 ? ` (x${page.quantity})` : ''}: ${formatCurrency(price)}\n`;
      });
      text += "\n";
    }
    
    if (selectedFeatures.length > 0) {
      text += "Selected Features:\n";
      selectedFeatures.forEach(feature => {
        const price = calculateFeaturePrice(feature);
        text += `- ${feature.name}${feature.quantity > 1 ? ` (x${feature.quantity})` : ''}: ${formatCurrency(price)}\n`;
        if (feature.pricingType === 'hourly') {
          text += `  ${(feature.estimatedHours as number) * feature.quantity} hours @ ${formatCurrency(feature.hourlyRate as number)}/hr\n`;
        }
      });
    }
    
    text += `\nTotal Estimate: ${formatCurrency(totalPrice)}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Estimate has been copied to clipboard",
      });
      
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    });
  };
  
  const handleExportPDF = () => {
    toast({
      title: "Feature not available",
      description: "PDF export is not implemented in this demo",
    });
  };
  
  const hasSelections = selectedProjectType && (selectedFeatures.length > 0 || selectedPages.length > 0);
  
  return (
    <Card className={`${className} relative`}>
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-lg sm:text-xl">Estimate Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="mb-4 sm:mb-6">
          {!hasSelections ? (
            <div className="text-center text-gray-500 py-4 sm:py-8">
              No items selected yet
            </div>
          ) : (
            <div>
              <div className="border-b border-gray-200 pb-3 mb-3 sm:pb-4 sm:mb-4">
                <h3 className="font-medium text-gray-700 mb-1 sm:mb-2">{selectedProjectType.name}</h3>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Base Price</span>
                  <span className="text-sm font-medium">{formatCurrency(basePrice)}</span>
                </div>
              </div>
              
              {selectedPages.length > 0 && (
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <h4 className="text-sm font-medium text-gray-600">Pages</h4>
                  <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2">
                    {selectedPages.map(page => (
                      <div key={page.id} className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {page.name}{page.quantity > 1 ? ` (x${page.quantity})` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${page.pricePerPage?.toFixed(2) || '0.00'} per page
                          </p>
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(calculatePagePrice(page))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedFeatures.length > 0 && (
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <h4 className="text-sm font-medium text-gray-600">Features</h4>
                  <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2">
                    {selectedFeatures.map(feature => (
                      <div key={feature.id} className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {feature.name}{feature.quantity > 1 ? ` (x${feature.quantity})` : ''}
                          </p>
                          {feature.pricingType === 'hourly' && (
                            <p className="text-xs text-gray-500">
                              {(feature.estimatedHours as number) * feature.quantity} hrs @ {formatCurrency(feature.hourlyRate as number)}/hr
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(calculateFeaturePrice(feature))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-3 sm:pt-4">
                <div className="flex justify-between items-center font-medium">
                  <span>Total Estimate</span>
                  <span className="text-lg text-primary font-bold">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2 sm:space-y-3">
          <div className="flex space-x-2">
            <Button 
              className="flex-1" 
              onClick={handleCopyEstimate}
              disabled={!hasSelections || isCopied}
              size="sm"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span className="sm:inline hidden">Copied!</span>
                  <span className="inline sm:hidden">Copied</span>
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4 mr-2" />
                  <span className="sm:inline hidden">Copy Estimate</span>
                  <span className="inline sm:hidden">Copy</span>
                </>
              )}
            </Button>
            
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={handleExportPDF}
              disabled={!hasSelections}
              size="sm"
            >
              <FileDown className="h-4 w-4 mr-2" />
              <span className="sm:inline hidden">Export PDF</span>
              <span className="inline sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
