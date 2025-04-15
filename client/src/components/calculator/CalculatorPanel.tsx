import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectType, Feature, SelectedFeature } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FeatureItem } from "./FeatureItem";
import { Skeleton } from "@/components/ui/skeleton";

interface CalculatorPanelProps {
  onSelectedFeaturesChange: (features: SelectedFeature[]) => void;
  onSelectedProjectTypeChange: (projectType: ProjectType | null) => void;
}

export function CalculatorPanel({ 
  onSelectedFeaturesChange, 
  onSelectedProjectTypeChange 
}: CalculatorPanelProps) {
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  
  // Fetch project types
  const { data: projectTypes, isLoading: projectTypesLoading } = useQuery<ProjectType[]>({
    queryKey: ['/api/project-types'],
  });
  
  // Fetch features for selected project type
  const { data: features, isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ['/api/project-types', selectedProjectTypeId, 'features'],
    enabled: !!selectedProjectTypeId,
  });
  
  // Group features by category
  const featuresByCategory = features?.reduce<Record<string, Feature[]>>((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {}) || {};
  
  // Update parent component when selected features change
  useEffect(() => {
    onSelectedFeaturesChange(selectedFeatures);
  }, [selectedFeatures, onSelectedFeaturesChange]);
  
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create Estimate</CardTitle>
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
              <SelectTrigger id="project-type" className="w-full">
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
        
        <div id="features-container">
          {featuresLoading && selectedProjectTypeId ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !selectedProjectTypeId ? (
            <div className="text-center text-gray-500 py-8">
              Please select a project type to view available features
            </div>
          ) : Object.keys(featuresByCategory).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No features available for this project type
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">{category}</h4>
                  <div className="space-y-3">
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
      </CardContent>
    </Card>
  );
}
