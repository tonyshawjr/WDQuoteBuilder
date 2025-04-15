import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { CalculatorPanel } from "@/components/calculator/CalculatorPanel";
import { EstimateSummary } from "@/components/calculator/EstimateSummary";
import { ProjectType, SelectedFeature, SelectedPage } from "@shared/schema";

export default function Calculator() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null);
  
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);
  
  if (loading || !user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="md:flex md:space-x-6">
          <div className="md:w-2/3">
            <CalculatorPanel
              onSelectedFeaturesChange={setSelectedFeatures}
              onSelectedProjectTypeChange={setSelectedProjectType}
              onSelectedPagesChange={setSelectedPages}
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
      </div>
    </div>
  );
}
