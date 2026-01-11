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
  const steps = 32;

  const gridMap = useMemo(() => {
    const map = new Map<string, number>();
    gridData.forEach(item => {
      map.set(`${item.drum}-${item.step}`, item.velocity);
    });
    return map;
  }, [gridData]);

  return (
    <div className="w-full overflow-x-auto bg-[#1a1a1a] rounded-sm border border-white/5 shadow-inner scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <div 
        className="grid gap-0" 
        style={{ 
          display: 'grid',
          gridTemplateColumns: `100px repeat(${steps}, 24px)`,
          boxSizing: 'border-box'
        }}
      >
        {/* Header Row for Step Numbers */}
        <div className="h-6 bg-black/40 border-b border-white/5 flex items-center justify-end pr-3 font-mono text-[9px] text-muted-foreground uppercase tracking-wider sticky left-0 z-20">
          Track
        </div>
        {Array.from({ length: steps }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-6 border-b border-white/5 flex items-center justify-center text-[9px] font-mono transition-colors",
              i === currentStep ? "bg-primary/20 text-primary" : "bg-black/20 text-muted-foreground/40",
              i % 4 === 0 && "border-l border-white/10",
              "w-full min-w-[24px]"
            )}
          >
            {i + 1}
          </div>
        ))}

        {/* Instrument Rows */}
        {DRUM_ROWS.map((row) => (
          <div key={row.id} className="contents">
            <div 
              className="h-6 flex items-center justify-end pr-3 text-[10px] font-mono font-bold text-muted-foreground/80 tracking-tight uppercase bg-black/40 border-b border-white/5 sticky left-0 z-10 whitespace-nowrap"
            >
              {row.label.split(' ')[0]}
            </div>
            {Array.from({ length: steps }).map((_, stepIndex) => {
              const velocity = gridMap.get(`${row.id}-${stepIndex}`);
              const isActive = velocity !== undefined;
              const isCurrent = currentStep === stepIndex;
              const isDownbeat = stepIndex % 4 === 0;

              return (
                <button
                  key={`${row.id}-${stepIndex}`}
                  onClick={() => onToggleStep(stepIndex, row.id as DrumInstrument)}
                  className={cn(
                    "h-6 border-b border-r border-white/5 transition-all duration-75 relative focus:outline-none w-full min-w-[24px]",
                    isDownbeat && "border-l border-white/10",
                    isActive ? "bg-primary shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]" : "bg-[#222] hover:bg-[#2a2a2a]",
                    isCurrent && "after:absolute after:inset-0 after:bg-white/10 after:pointer-events-none"
                  )}
                  data-testid={`step-${row.id}-${stepIndex}`}
                >
                  {isActive && (
                    <div 
                      className="absolute inset-[2px] bg-black/20 rounded-[1px]" 
                      style={{ opacity: velocity / 127 }}
                    />
                  )}
                  {isCurrent && (
                    <div className="absolute inset-0 bg-primary/20 pointer-events-none animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
