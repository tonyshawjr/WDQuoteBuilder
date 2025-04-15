import { useState, useEffect } from "react";
import { Feature } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FeatureItemProps {
  feature: Feature;
  onSelect: (feature: Feature, isSelected: boolean, quantity?: number) => void;
  isSelected: boolean;
  quantity: number;
}

export function FeatureItem({ 
  feature, 
  onSelect, 
  isSelected, 
  quantity 
}: FeatureItemProps) {
  const [quantityValue, setQuantityValue] = useState(quantity);
  
  // Update quantity when prop changes
  useEffect(() => {
    setQuantityValue(quantity);
  }, [quantity]);
  
  const handleCheckboxChange = (checked: boolean) => {
    onSelect(feature, checked, quantityValue);
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value) || 1;
    setQuantityValue(newQuantity);
    if (isSelected) {
      onSelect(feature, true, newQuantity);
    }
  };
  
  return (
    <div className="flex items-start">
      <div className="flex items-center h-5 mt-1">
        <Checkbox
          id={`feature-${feature.id}`}
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
        />
      </div>
      <div className="ml-3 text-sm">
        <Label htmlFor={`feature-${feature.id}`} className="font-medium text-gray-700">
          {feature.name}
        </Label>
        {feature.description && (
          <p className="text-gray-500">{feature.description}</p>
        )}
        {feature.supportsQuantity && (
          <div className="mt-1.5 flex items-center">
            <Label htmlFor={`quantity-${feature.id}`} className="text-xs text-gray-500 mr-2">
              Number of {feature.pricingType === 'hourly' ? 'Hours' : 'Units'}:
            </Label>
            <Input
              id={`quantity-${feature.id}`}
              type="number"
              min="1"
              value={quantityValue}
              onChange={handleQuantityChange}
              className="max-w-[80px] text-sm h-8"
            />
          </div>
        )}
      </div>
    </div>
  );
}
