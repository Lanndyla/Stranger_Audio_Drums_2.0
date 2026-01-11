import { DRUM_ROWS, type DrumInstrument } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";

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
  trackVelocities: Record<string, number>;
  onTrackVelocityChange: (drum: string, velocity: number) => void;
  stepCount: number;
  timeSignature: string;
}

const DRUM_COLORS: Record<string, string> = {
  crash: "bg-pink-500",
  ride: "bg-violet-500",
  hihat_open: "bg-blue-400",
  hihat_closed: "bg-teal-500",
  tom_1: "bg-purple-600",
  tom_2: "bg-indigo-500",
  snare: "bg-red-500",
  kick: "bg-fuchsia-600",
};

export function SequencerGrid({ gridData, currentStep, onToggleStep, isPlaying, trackVelocities, onTrackVelocityChange, stepCount, timeSignature }: SequencerGridProps) {
  const steps = stepCount;
  
  // Calculate beat grouping based on time signature
  const [beatsPerBar, noteValue] = timeSignature.split('/').map(Number);
  // For compound meters (6/8, 9/8, 12/8), group in 3s (dotted quarter = 6 16th notes)
  // For simple meters, group by beat (4 16ths for quarter note, 2 for eighth)
  const isCompoundMeter = noteValue === 8 && (beatsPerBar === 6 || beatsPerBar === 9 || beatsPerBar === 12);
  const stepsPerBeat = isCompoundMeter ? 6 : (noteValue === 8 ? 2 : 4);

  const gridMap = useMemo(() => {
    const map = new Map<string, number>();
    gridData.forEach(item => {
      map.set(`${item.drum}-${item.step}`, item.velocity);
    });
    return map;
  }, [gridData]);

  return (
    <div className="w-full bg-[#1a1a1a] rounded-sm border border-white/5 shadow-inner">
      <div 
        className="grid gap-0 w-full" 
        style={{ 
          display: 'grid',
          gridTemplateColumns: `80px repeat(${steps}, 1fr)`,
          boxSizing: 'border-box'
        }}
      >
        {/* Header Row for Step Numbers */}
        <div className="h-10 bg-black/40 border-b border-white/5 flex items-center justify-end pr-3 font-mono text-[10px] text-muted-foreground uppercase tracking-wider sticky left-0 z-20">
          Track
        </div>
        {Array.from({ length: steps }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-10 border-b border-white/5 flex items-center justify-center text-[10px] font-mono transition-colors",
              i === currentStep ? "bg-primary/20 text-primary" : "bg-black/20 text-muted-foreground/40",
              i % stepsPerBeat === 0 && "border-l border-white/10"
            )}
          >
            {i + 1}
          </div>
        ))}

        {/* Instrument Rows */}
        {DRUM_ROWS.map((row) => (
          <div key={row.id} className="contents">
            <div 
              className="h-10 flex items-center gap-1 px-1 text-[9px] font-mono font-bold text-muted-foreground/80 tracking-tight uppercase bg-black/40 border-b border-white/5 sticky left-0 z-10 whitespace-nowrap"
            >
              <span className="w-8 text-right truncate">{row.label.split(' ')[0]}</span>
              <Slider
                value={[trackVelocities[row.id] ?? 100]}
                onValueChange={(v) => onTrackVelocityChange(row.id, v[0])}
                min={0}
                max={127}
                step={1}
                className="w-8 h-4"
                data-testid={`slider-velocity-${row.id}`}
              />
            </div>
            {Array.from({ length: steps }).map((_, stepIndex) => {
              const velocity = gridMap.get(`${row.id}-${stepIndex}`);
              const isActive = velocity !== undefined;
              const isCurrent = currentStep === stepIndex;
              const isDownbeat = stepIndex % stepsPerBeat === 0;

              const drumColor = DRUM_COLORS[row.id] || "bg-primary";

              return (
                <button
                  key={`${row.id}-${stepIndex}`}
                  onClick={() => onToggleStep(stepIndex, row.id as DrumInstrument)}
                  className={cn(
                    "h-10 border-b border-r border-white/5 transition-all duration-75 relative focus:outline-none",
                    isDownbeat && "border-l border-white/10",
                    isActive ? `${drumColor} shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]` : "bg-[#222] hover:bg-[#2a2a2a]",
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
                    <div className="absolute inset-0 bg-white/20 pointer-events-none animate-pulse" />
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
