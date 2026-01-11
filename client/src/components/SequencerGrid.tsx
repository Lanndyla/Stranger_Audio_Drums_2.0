import { DRUM_ROWS, type DrumInstrument } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface GridStep {
  step: number;
  drum: string;
  velocity: number;
}

interface SequencerGridProps {
  gridData: GridStep[];
  currentStep: number;
  onToggleStep: (step: number, drum: DrumInstrument) => void;
  isPlaying: boolean;
}

export function SequencerGrid({ gridData, currentStep, onToggleStep, isPlaying }: SequencerGridProps) {
  const steps = 16; // Standard 16-step grid

  // Transform flat grid data into a lookup map for rendering efficiency
  const gridMap = useMemo(() => {
    const map = new Map<string, number>();
    gridData.forEach(item => {
      map.set(`${item.drum}-${item.step}`, item.velocity);
    });
    return map;
  }, [gridData]);

  return (
    <div className="w-full overflow-x-auto p-1">
      <div className="min-w-[800px] flex flex-col gap-2">
        
        {/* Step Indicators Header */}
        <div className="grid grid-cols-[100px_1fr] gap-4">
          <div /> {/* Spacer for labels */}
          <div className="grid grid-cols-16 gap-1 h-4">
            {Array.from({ length: steps }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-end justify-center text-[10px] font-mono transition-colors duration-75",
                  i === currentStep ? "text-primary font-bold" : "text-muted-foreground/30",
                  (i % 4 === 0) && "text-muted-foreground/60" // Highlight downbeats
                )}
              >
                <div className={cn(
                  "w-full h-1 rounded-full",
                  i === currentStep ? "bg-primary shadow-[0_0_10px_rgba(0,243,255,0.8)]" : "bg-muted"
                )} />
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-1">
          {DRUM_ROWS.map((row) => (
            <div key={row.id} className="grid grid-cols-[100px_1fr] gap-4">
              {/* Label */}
              <div className="flex items-center justify-end pr-4 text-xs font-mono font-bold text-muted-foreground tracking-widest uppercase bg-card/50 rounded-l-sm border-r-2 border-primary/20">
                {row.label}
              </div>
              
              {/* Grid Steps */}
              <div className="grid grid-cols-16 gap-1">
                {Array.from({ length: steps }).map((_, stepIndex) => {
                  const velocity = gridMap.get(`${row.id}-${stepIndex}`);
                  const isActive = velocity !== undefined;
                  const isCurrent = currentStep === stepIndex;
                  const isDownbeat = stepIndex % 4 === 0;

                  return (
                    <button
                      key={stepIndex}
                      onClick={() => onToggleStep(stepIndex, row.id)}
                      className={cn(
                        "relative aspect-square w-full rounded-sm border transition-all duration-100 focus:outline-none focus:ring-1 focus:ring-primary/50 group overflow-hidden",
                        // Base styles
                        "bg-card hover:bg-card/80",
                        // Border styles for beats
                        isDownbeat ? "border-l-white/10" : "border-transparent",
                        // Active State
                        isActive 
                          ? "bg-primary/20 border-primary/50 shadow-[inset_0_0_10px_rgba(0,243,255,0.2)]" 
                          : "hover:border-white/10",
                        // Playing Head style
                        isCurrent && "bg-white/5",
                        // Flash on trigger
                        (isCurrent && isActive && isPlaying) && "bg-primary shadow-[0_0_15px_rgba(0,243,255,0.8)] border-primary z-10 scale-105"
                      )}
                    >
                      {/* Velocity Bar (Visual depth) */}
                      {isActive && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-primary/80 transition-all"
                          style={{ height: `${(velocity / 127) * 100}%` }}
                        />
                      )}
                      
                      {/* Step Number Hint on Hover */}
                      <span className="absolute top-0.5 left-1 text-[8px] text-white/20 opacity-0 group-hover:opacity-100 font-mono">
                        {stepIndex + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
