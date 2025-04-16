import { useState, useEffect } from "react";
import { Page } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PageItemProps {
  page: Page;
  onSelect: (page: Page, isSelected: boolean, quantity?: number) => void;
  isSelected: boolean;
  quantity: number;
}

export function PageItem({ 
  page, 
  onSelect, 
  isSelected, 
  quantity 
}: PageItemProps) {
  const [localQuantity, setLocalQuantity] = useState(quantity);
  
  // Keep localQuantity in sync with the prop
  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value);
    if (newQuantity > 0) {
      setLocalQuantity(newQuantity);
      if (isSelected) {
        onSelect(page, true, newQuantity);
      }
    }
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    onSelect(page, checked, localQuantity);
  };
  
  const totalPrice = (page.pricePerPage || 0) * localQuantity;
  
  return (
    <div className={`flex items-start justify-between p-4 ${isSelected ? 'bg-[#282828]' : 'hover:bg-gray-50 dark:hover:bg-[#282828]/50'}`}>
      <div className="flex items-start space-x-3">
        <Checkbox 
          id={`page-${page.id}`}
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          className="mt-1 text-yellow-500 border-yellow-500 data-[state=checked]:border-yellow-500 data-[state=checked]:bg-yellow-500"
        />
        <div>
          <Label 
            htmlFor={`page-${page.id}`} 
            className={`text-sm font-medium cursor-pointer ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {page.name}
          </Label>
          {page.description && (
            <p className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
              {page.description}
            </p>
          )}
          <p className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
            ${page.pricePerPage?.toFixed(2) || '0.00'} per page
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 min-w-[160px]">
        <div className="w-full max-w-[80px]">
          <Input 
            type="number"
            min="1"
            value={localQuantity}
            onChange={handleQuantityChange}
            disabled={!isSelected}
            className="h-8 text-sm bg-gray-950 border-gray-700"
          />
        </div>
        <span className={`text-sm font-medium whitespace-nowrap ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          ${totalPrice.toFixed(2)}
        </span>
      </div>
    </div>
  );
}