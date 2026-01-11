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
  const steps = 16;

  const gridMap = useMemo(() => {
    const map = new Map<string, number>();
    gridData.forEach(item => {
      map.set(`${item.drum}-${item.step}`, item.velocity);
    });
    return map;
  }, [gridData]);

  return (
    <div className="w-full overflow-x-auto p-4 custom-scrollbar">
      <div className="min-w-[1000px] flex flex-col gap-3">
        {DRUM_ROWS.map((row) => (
          <div key={row.id} className="flex items-center gap-4">
            {/* Label */}
            <div className="w-24 text-right pr-4 text-[10px] font-display font-bold text-primary/70 tracking-tighter uppercase whitespace-nowrap">
              {row.label}
            </div>

            {/* Row of Cubes */}
            <div className="flex-1 grid grid-cols-16 gap-2">
              {Array.from({ length: steps }).map((_, stepIndex) => {
                const velocity = gridMap.get(`${row.id}-${stepIndex}`);
                const isActive = velocity !== undefined;
                const isCurrent = currentStep === stepIndex;
                const isDownbeat = stepIndex % 4 === 0;

                return (
                  <div key={stepIndex} className="relative aspect-square">
                    <button
                      onClick={() => onToggleStep(stepIndex, row.id)}
                      className={cn(
                        "w-full h-full rounded-sm transition-all duration-150 preserve-3d",
                        "border border-white/5 bg-card/30 hover:bg-card/50",
                        isActive && "bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(0,243,255,0.2)]",
                        isCurrent && "ring-2 ring-white/20 ring-inset",
                        isCurrent && isActive && isPlaying && "bg-primary border-primary shadow-[0_0_20px_rgba(0,243,255,0.6)] scale-110 z-10"
                      )}
                      style={{
                        transform: isActive ? 'translateZ(10px)' : 'translateZ(0px)',
                      }}
                    >
                      {/* Depth Effect (Pseudo-cube) */}
                      {isActive && (
                        <>
                          <div className="absolute inset-0 bg-primary/10 rounded-sm transform translate-z-[-4px]" />
                          <div 
                            className="absolute bottom-1 left-1 right-1 bg-primary/40 rounded-full transition-all duration-300"
                            style={{ height: `${(velocity / 127) * 20}%`, opacity: 0.6 }}
                          />
                        </>
                      )}

                      {/* Accent for downbeats */}
                      {isDownbeat && !isActive && (
                        <div className="absolute inset-0 border-l border-white/10 pointer-events-none" />
                      )}
                    </button>
                    
                    {/* Step Highlight Line */}
                    {isCurrent && (
                      <div className="absolute -top-1 -bottom-1 left-0 right-0 border-x border-primary/30 pointer-events-none animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Step Numbers Footer */}
        <div className="flex items-center gap-4 mt-2">
          <div className="w-24" />
          <div className="flex-1 grid grid-cols-16 gap-2">
            {Array.from({ length: steps }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "text-[8px] font-mono text-center transition-colors",
                  i === currentStep ? "text-primary font-bold" : "text-muted-foreground/30"
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
