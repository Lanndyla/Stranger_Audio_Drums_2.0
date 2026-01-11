import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ControlsProps {
  bpm: number;
  setBpm: (bpm: number) => void;
  style: string;
  setStyle: (style: string) => void;
  type: string;
  setType: (type: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const STYLES = ["Djent", "Metal", "Rock", "Post-hardcore", "Pop", "Industrial", "Cyberpunk"];
const TYPES = ["Groove", "Fill", "Breakdown", "Intro", "Blast Beat"];

export function Controls({ 
  bpm, setBpm, 
  style, setStyle, 
  type, setType, 
  onGenerate, 
  isGenerating 
}: ControlsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 metal-surface border-b border-border/50 items-end">
      
      {/* BPM Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="font-mono text-xs text-primary/80 uppercase tracking-widest">Tempo</Label>
          <span className="font-display font-bold text-xl text-primary text-glow w-16 text-right">{bpm}</span>
        </div>
        <Slider
          value={[bpm]}
          onValueChange={(vals) => setBpm(vals[0])}
          min={60}
          max={240}
          step={1}
          className="w-full"
        />
      </div>

      {/* Style Selector */}
      <div className="space-y-2">
        <Label className="font-mono text-xs text-secondary/80 uppercase tracking-widest">Genre Style</Label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="border-secondary/30 focus:ring-secondary/50">
            <SelectValue placeholder="Select Style" />
          </SelectTrigger>
          <SelectContent>
            {STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Type Selector */}
      <div className="space-y-2">
        <Label className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Pattern Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Generate Button */}
      <Button 
        onClick={onGenerate} 
        disabled={isGenerating}
        className="w-full relative overflow-hidden group bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-[0_0_20px_rgba(0,243,255,0.3)] border-0"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            SYNTHESIZING...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            GENERATE PATTERN
          </>
        )}
        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
      </Button>
    </div>
  );
}
