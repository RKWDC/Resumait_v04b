"use client";

import { Check, Loader2, X, Circle, Activity, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

/**
 * @fileOverview Visual progress indicator for the high-fidelity scoring pipeline.
 */

export type ScoringStep = {
  number: number;
  label: string;
  status: 'idle' | 'running' | 'complete' | 'error';
};

interface ScoringProgressProps {
  steps: ScoringStep[];
  currentStep: number;
  isVisible: boolean;
}

export function ScoringProgress({ steps, currentStep, isVisible }: ScoringProgressProps) {
  if (!isVisible) return null;

  return (
    <div className="p-8 bg-muted/30 rounded-2xl border-2 border-dashed border-primary/10 space-y-6 animate-in fade-in zoom-in duration-500 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4 border-primary/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
          <Activity className="h-4 w-4 animate-pulse" />
          ATS Diagnostic Pipeline
        </h3>
        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/10">Active Simulation</Badge>
      </div>
      
      <div className="space-y-4">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isComplete = step.status === 'complete' || currentStep > step.number;
          const isRunning = step.status === 'running' || (isActive && step.status !== 'error');
          const isError = step.status === 'error';

          return (
            <div 
              key={step.number} 
              className={cn(
                "flex items-center gap-4 transition-all duration-500 p-3 rounded-xl",
                isActive ? "bg-background shadow-md translate-x-1 border border-primary/10" : "opacity-40"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-sm transition-colors duration-500",
                isComplete ? "bg-green-600 text-white" : 
                isError ? "bg-destructive text-white" :
                isActive ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted text-muted-foreground"
              )}>
                {isComplete ? <Check className="h-4 w-4" /> : 
                 isError ? <X className="h-4 w-4" /> : 
                 step.number}
              </div>
              
              <div className="flex-1">
                <p className={cn(
                  "text-xs font-black uppercase tracking-widest",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {isActive && (
                  <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress-indeterminate rounded-full" />
                  </div>
                )}
              </div>

              {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-primary/5 flex items-center justify-center gap-2">
        <Gauge className="h-3 w-3 text-muted-foreground/40" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Real-time Diagnostic Analysis</span>
      </div>
    </div>
  );
}
