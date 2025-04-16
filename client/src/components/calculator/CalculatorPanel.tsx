import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectType, Feature, SelectedFeature, Page, SelectedPage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FeatureItem } from "./FeatureItem";
import { PageItem } from "./PageItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CalculatorPanelProps {
  onSelectedFeaturesChange: (features: SelectedFeature[]) => void;
  onSelectedProjectTypeChange: (projectType: ProjectType | null) => void;
  onSelectedPagesChange: (pages: SelectedPage[]) => void;
  initialSelectedFeatures?: SelectedFeature[];
  initialSelectedPages?: SelectedPage[];
  initialSelectedProjectType?: ProjectType | null;
}

export function CalculatorPanel({ 
  onSelectedFeaturesChange,
  onSelectedProjectTypeChange,
  onSelectedPagesChange,
  initialSelectedFeatures = [],
  initialSelectedPages = [],
  initialSelectedProjectType = null
}: CalculatorPanelProps) {
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState<string | null>(
    initialSelectedProjectType ? initialSelectedProjectType.id.toString() : null
  );
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>(initialSelectedFeatures);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>(initialSelectedPages);
  const [activeTab, setActiveTab] = useState<string>("features");
  
  // Fetch project types
  const { data: projectTypes, isLoading: projectTypesLoading } = useQuery<ProjectType[]>({
    queryKey: ['/api/project-types'],
  });
  
  // Fetch features for selected project type
  const { data: features, isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: [`/api/project-types/${selectedProjectTypeId}/features`],
    enabled: !!selectedProjectTypeId,
    queryFn: async () => {
      console.log(`Fetching features for project type ${selectedProjectTypeId}`);
      const response = await fetch(`/api/project-types/${selectedProjectTypeId}/features`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching features: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched features:', data);
      return data;
    }
  });
  
  // Fetch pages for selected project type
  const { data: pages, isLoading: pagesLoading } = useQuery<Page[]>({
    queryKey: [`/api/project-types/${selectedProjectTypeId}/pages`],
    enabled: !!selectedProjectTypeId,
    queryFn: async () => {
      console.log(`Fetching pages for project type ${selectedProjectTypeId}`);
      const response = await fetch(`/api/project-types/${selectedProjectTypeId}/pages`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching pages: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched pages:', data);
      return data;
    }
  });

  // Alternatively, fetch all active pages if project-specific pages aren't available
  const { data: allPages, isLoading: allPagesLoading } = useQuery<Page[]>({
    queryKey: ['/api/pages/active'],
    enabled: !pages || pages.length === 0,
    queryFn: async () => {
      console.log('Fetching all active pages');
      const response = await fetch('/api/pages/active', {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching active pages: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched active pages:', data);
      return data;
    }
  });

  // Combine pages from project-specific or all active pages
  const availablePages = pages && pages.length > 0 ? pages : allPages || [];
  const isPagesLoading = (pagesLoading && !!selectedProjectTypeId) || (allPagesLoading && (!pages || pages.length === 0));
  
  // Group features by category
  const featuresByCategory = features?.reduce<Record<string, Feature[]>>((acc, feature) => {
    const category = feature.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {}) || {};
  
  // Update parent component when selected features change
  useEffect(() => {
    onSelectedFeaturesChange(selectedFeatures);
  }, [selectedFeatures, onSelectedFeaturesChange]);
  
  // Update parent component when selected pages change
  useEffect(() => {
    onSelectedPagesChange(selectedPages);
  }, [selectedPages, onSelectedPagesChange]);
  
  // Update parent component when selected project type changes
  useEffect(() => {
    if (selectedProjectTypeId && projectTypes) {
      const projectType = projectTypes.find(pt => pt.id.toString() === selectedProjectTypeId) || null;
      onSelectedProjectTypeChange(projectType);
    } else {
      onSelectedProjectTypeChange(null);
    }
  }, [selectedProjectTypeId, projectTypes, onSelectedProjectTypeChange]);
  
  const handleProjectTypeChange = (value: string) => {
    setSelectedProjectTypeId(value);
    setSelectedFeatures([]);
    setSelectedPages([]);
  };
  
  const handleFeatureSelect = (feature: Feature, isSelected: boolean, quantity: number = 1) => {
    if (isSelected) {
      // Add feature to selected features
      setSelectedFeatures(prev => {
        const isAlreadySelected = prev.some(f => f.id === feature.id);
        if (isAlreadySelected) {
          return prev.map(f => 
            f.id === feature.id ? { ...f, quantity } : f
          );
        } else {
          return [...prev, { ...feature, quantity }];
        }
      });
    } else {
      // Remove feature from selected features
      setSelectedFeatures(prev => prev.filter(f => f.id !== feature.id));
    }
  };

  const handlePageSelect = (page: Page, isSelected: boolean, quantity: number = page.defaultQuantity || 1) => {
    if (isSelected) {
      // Add page to selected pages
      setSelectedPages(prev => {
        const isAlreadySelected = prev.some(p => p.id === page.id);
        if (isAlreadySelected) {
          return prev.map(p => 
            p.id === page.id ? { ...p, quantity } : p
          );
        } else {
          return [...prev, { ...page, quantity }];
        }
      });
    } else {
      // Remove page from selected pages
      setSelectedPages(prev => prev.filter(p => p.id !== page.id));
    }
  };
  
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Create Quote</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="project-type" className="block text-sm font-medium mb-2">
            Project Type
          </Label>
          
          {projectTypesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select onValueChange={handleProjectTypeChange} value={selectedProjectTypeId || undefined}>
              <SelectTrigger id="project-type" className="w-full border-yellow-500 focus:ring-yellow-500 bg-background text-foreground">
                <SelectValue placeholder="Select a project type" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes?.map(projectType => (
                  <SelectItem key={projectType.id} value={projectType.id.toString()}>
                    {projectType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {selectedProjectTypeId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 bg-muted dark:bg-[#1F1F1F]">
              <TabsTrigger 
                value="features" 
                className="data-[state=active]:bg-[#282828] dark:data-[state=active]:text-white"
              >
                Features
              </TabsTrigger>
              <TabsTrigger 
                value="pages" 
                className="data-[state=active]:bg-[#282828] dark:data-[state=active]:text-white"
              >
                Pages
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="features" className="mt-4">
              <div id="features-container">
                {featuresLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : Object.keys(featuresByCategory).length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No features available for this project type
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                      <div key={category} className="bg-white dark:bg-[#1F1F1F] rounded-lg">
                        <div>
                          {categoryFeatures.map(feature => (
                            <FeatureItem
                              key={feature.id}
                              feature={feature}
                              onSelect={handleFeatureSelect}
                              isSelected={selectedFeatures.some(f => f.id === feature.id)}
                              quantity={selectedFeatures.find(f => f.id === feature.id)?.quantity || 1}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="pages" className="mt-4">
              <div id="pages-container">
                {isPagesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : availablePages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No pages available for this project type
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#1F1F1F] rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 p-4 border-b border-gray-100 dark:border-gray-800">
                      Available Pages
                    </h4>
                    <div>
                      {availablePages.map(page => (
                        <PageItem
                          key={page.id}
                          page={page}
                          onSelect={handlePageSelect}
                          isSelected={selectedPages.some(p => p.id === page.id)}
                          quantity={selectedPages.find(p => p.id === page.id)?.quantity || page.defaultQuantity || 1}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        {!selectedProjectTypeId && (
          <div className="text-center text-gray-500 py-8">
            Please select a project type to view available features and pages
          </div>
        )}
      </CardContent>
    </Card>
  );
}
