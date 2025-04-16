import React from 'react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepsProps {
  steps: Step[];
  activeStep: string;
  className?: string;
}

export function Steps({ steps, activeStep, className }: StepsProps) {
  const activeIndex = steps.findIndex(step => step.id === activeStep);
  
  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      <div className="overflow-x-auto">
        <div className="inline-flex items-center justify-start min-w-full">
          {steps.map((step, index) => {
            // Determine the status of this step
            const isActive = step.id === activeStep;
            const isCompleted = index < activeIndex;
            
            return (
              <div key={step.id} className="flex items-center">
                {/* Step Indicator */}
                <div className="flex flex-col items-center">
                  <div 
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors", 
                      isActive && "bg-primary text-primary-foreground border-primary",
                      isCompleted && "bg-primary text-primary-foreground border-primary",
                      !isActive && !isCompleted && "border-muted-foreground text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span 
                    className={cn(
                      "mt-2 text-xs font-medium",
                      isActive && "text-primary",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                
                {/* Connector Line - don't show for the last item */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "w-12 h-1 mx-1",
                      index < activeIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}