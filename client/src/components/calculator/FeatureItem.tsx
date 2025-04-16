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
    <div className={`flex items-start justify-between p-4 ${isSelected ? 'bg-[#282828]' : 'hover:bg-gray-50 dark:hover:bg-[#282828]/50'}`}>
      <div className="flex items-start space-x-3">
        <div className="flex items-center h-5 mt-1">
          <Checkbox
            id={`feature-${feature.id}`}
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="text-yellow-500 border-yellow-500 data-[state=checked]:border-yellow-500 data-[state=checked]:bg-yellow-500"
          />
        </div>
        <div className="text-sm">
          <Label htmlFor={`feature-${feature.id}`} className={`font-medium ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {feature.name}
          </Label>
          {feature.description && (
            <p className={`${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'} text-xs`}>
              {feature.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {feature.supportsQuantity && (
          <div className="flex items-center">
            <Input
              id={`quantity-${feature.id}`}
              type="number"
              min="1"
              value={quantityValue}
              onChange={handleQuantityChange}
              className="max-w-[80px] text-sm h-8 bg-gray-950 border-gray-700"
            />
          </div>
        )}
        <span className={`text-sm font-medium whitespace-nowrap ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {feature.pricingType === 'flat' 
            ? `$${feature.flatPrice?.toFixed(2) || '0.00'}`
            : `$${((feature.hourlyRate || 0) * (feature.estimatedHours || 0) * quantityValue).toFixed(2)}`
          }
        </span>
      </div>
    </div>
  );
}
