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
  
  const totalPrice = page.pricePerPage * localQuantity;
  
  return (
    <Card className={cn(
      "border hover:border-primary/50 transition-colors",
      isSelected && "border-primary/50 bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id={`page-${page.id}`}
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
            />
            <div>
              <Label 
                htmlFor={`page-${page.id}`} 
                className="text-sm font-medium cursor-pointer"
              >
                {page.name}
              </Label>
              <p className="text-xs text-gray-500 mt-1">{page.description}</p>
              <p className="text-xs font-medium mt-1">${page.pricePerPage.toFixed(2)} per page</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 min-w-[100px]">
            <div className="w-full max-w-[80px]">
              <Input 
                type="number"
                min="1"
                value={localQuantity}
                onChange={handleQuantityChange}
                disabled={!isSelected}
                className="h-8 text-sm"
              />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}