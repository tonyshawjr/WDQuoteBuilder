import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

export interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: { id: string; label: string }[];
  activeStep: string;
}

export function Steps({ steps, activeStep, className, ...props }: StepsProps) {
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <div className={cn("flex w-full justify-between", className)} {...props}>
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const isCompleted = index < activeStepIndex;
        
        return (
          <div
            key={step.id}
            className={cn(
              "flex flex-col items-center space-y-2",
              isActive ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative flex items-center justify-center">
              {/* Line before the first step */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute right-full w-full border-t",
                    isCompleted ? "border-primary" : "border-muted"
                  )}
                  style={{ width: "100%" }}
                />
              )}
              
              {/* Step Circle */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium",
                  isActive
                    ? "border-primary bg-background text-primary"
                    : isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckIcon className="h-4 w-4" /> : index + 1}
              </div>
              
              {/* Line after the step */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-full w-full border-t",
                    index < activeStepIndex ? "border-primary" : "border-muted"
                  )}
                  style={{ width: "100%" }}
                />
              )}
            </div>
            <span className="text-sm font-medium">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}