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
import { jsPDF } from "jspdf";

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
    // The feature may use 'flat' or 'fixed' as the type, so handle both
    if (feature.pricingType === 'flat' || feature.pricingType === 'fixed') {
      return (feature.flatPrice || 0) * feature.quantity;
    } else {
      return (feature.hourlyRate || 0) * (feature.estimatedHours || 0) * feature.quantity;
    }
  };

  const calculatePagePrice = (page: SelectedPage): number => {
    return (page.pricePerPage || 0) * (page.quantity || 1);
  };
  
  const basePrice = selectedProjectType?.basePrice || 0;
  const featuresPrice = selectedFeatures.reduce((sum, feature) => sum + calculateFeaturePrice(feature), 0);
  const pagesPrice = selectedPages.reduce((sum, page) => sum + calculatePagePrice(page), 0);
  const totalPrice = basePrice + featuresPrice + pagesPrice;
  
  const handleCopyQuote = () => {
    if (!selectedProjectType) return;
    
    let text = `Project Quote: ${selectedProjectType.name}\n\n`;
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
    
    text += `\nTotal Quote: ${formatCurrency(totalPrice)}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Quote has been copied to clipboard",
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
    if (!selectedProjectType) return;
    
    try {
      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;
      
      // Add title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Web Design Quote", pageWidth / 2, y, { align: "center" });
      y += 10;
      
      // Add date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const today = new Date().toLocaleDateString();
      doc.text(`Generated on: ${today}`, pageWidth / 2, y, { align: "center" });
      y += 15;
      
      // Project type and base price
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Project: ${selectedProjectType.name}`, margin, y);
      y += 10;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Base Price: ${formatCurrency(basePrice)}`, margin, y);
      y += 15;
      
      // Pages
      if (selectedPages.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Pages:", margin, y);
        y += 7;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        selectedPages.forEach(page => {
          const price = calculatePagePrice(page);
          doc.text(`• ${page.name}${page.quantity > 1 ? ` (x${page.quantity})` : ''}: ${formatCurrency(price)}`, margin + 5, y);
          y += 6;
        });
        
        y += 5;
      }
      
      // Features
      if (selectedFeatures.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Features:", margin, y);
        y += 7;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        selectedFeatures.forEach(feature => {
          const price = calculateFeaturePrice(feature);
          doc.text(`• ${feature.name}${feature.quantity > 1 ? ` (x${feature.quantity})` : ''}: ${formatCurrency(price)}`, margin + 5, y);
          y += 6;
          
          if (feature.pricingType === 'hourly') {
            doc.text(`  ${(feature.estimatedHours as number) * feature.quantity} hours @ ${formatCurrency(feature.hourlyRate as number)}/hr`, margin + 8, y);
            y += 6;
          }
        });
        
        y += 10;
      }
      
      // Total
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Quote: ${formatCurrency(totalPrice)}`, margin, y);
      
      // Add footer
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("This is a quote only. Final pricing may vary based on project requirements.", pageWidth / 2, footerY, { align: "center" });
      
      // Save the PDF
      doc.save(`web-design-quote-${today.replace(/\//g, '-')}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Your quote has been exported as a PDF",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const hasSelections = selectedProjectType && (selectedFeatures.length > 0 || selectedPages.length > 0);
  
  return (
    <Card className={`${className} relative`}>
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-lg sm:text-xl">Quote Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="mb-4 sm:mb-6">
          {!hasSelections ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4 sm:py-8">
              No items selected yet
            </div>
          ) : (
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3 sm:pb-4 sm:mb-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-1 sm:mb-2">{selectedProjectType.name}</h3>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Base Price</span>
                  <span className="text-sm font-medium dark:text-white">{formatCurrency(basePrice)}</span>
                </div>
              </div>
              
              {selectedPages.length > 0 && (
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Pages</h4>
                  <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2">
                    {selectedPages.map(page => (
                      <div key={page.id} className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                            {page.name}{page.quantity > 1 ? ` (x${page.quantity})` : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${page.pricePerPage?.toFixed(2) || '0.00'} per page
                          </p>
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap dark:text-white">{formatCurrency(calculatePagePrice(page))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedFeatures.length > 0 && (
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Features</h4>
                  <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2">
                    {selectedFeatures.map(feature => (
                      <div key={feature.id} className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                            {feature.name}{feature.quantity > 1 ? ` (x${feature.quantity})` : ''}
                          </p>
                          {feature.pricingType === 'hourly' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(feature.estimatedHours as number) * feature.quantity} hrs @ {formatCurrency(feature.hourlyRate as number)}/hr
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap dark:text-white">{formatCurrency(calculateFeaturePrice(feature))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-gray-900 dark:text-gray-200">Total Quote</span>
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
              onClick={handleCopyQuote}
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
                  <span className="sm:inline hidden">Copy Quote</span>
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
