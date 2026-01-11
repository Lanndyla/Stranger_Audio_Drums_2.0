import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, Blend } from "lucide-react";
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
  complexity: number;
  setComplexity: (complexity: number) => void;
  styleMix: number;
  setStyleMix: (mix: number) => void;
  secondaryStyle: string;
  setSecondaryStyle: (style: string) => void;
}

const STYLES = ["Djent", "Metal", "Rock", "Post-hardcore", "Pop", "Industrial", "Cyberpunk", "Jazz", "Funk"];
const TYPES = ["Groove", "Fill", "Breakdown", "Intro", "Blast Beat"];

export function Controls({ 
  bpm, setBpm, 
  style, setStyle, 
  type, setType, 
  onGenerate, 
  isGenerating,
  complexity, setComplexity,
  styleMix, setStyleMix,
  secondaryStyle, setSecondaryStyle
}: ControlsProps) {
  return (
    <div className="p-4 metal-surface border-b border-border/50">
      {/* Row 1: Main Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* BPM Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="font-mono text-[10px] text-primary/80 uppercase tracking-widest">Tempo</Label>
            <span className="font-display font-bold text-lg text-primary text-glow">{bpm}</span>
          </div>
          <Slider
            value={[bpm]}
            onValueChange={(vals) => setBpm(vals[0])}
            min={60}
            max={240}
            step={1}
            className="w-full"
            data-testid="slider-bpm"
          />
        </div>

        {/* Style Selector */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] text-secondary/80 uppercase tracking-widest">Primary Style</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="h-9 border-secondary/30 focus:ring-secondary/50" data-testid="select-style">
              <SelectValue placeholder="Select Style" />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Type Selector */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Pattern Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9" data-testid="select-type">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest opacity-0">Action</Label>
          <Button 
            onClick={onGenerate} 
            disabled={isGenerating}
            className="w-full h-9 relative overflow-hidden group bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-[0_0_20px_rgba(0,243,255,0.3)] border-0"
            data-testid="button-generate"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                GENERATE
              </>
            )}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
          </Button>
        </div>
      </div>

      {/* Row 2: Advanced Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-white/5">
        {/* Complexity Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Complexity</Label>
            <span className="font-mono text-xs text-muted-foreground">{complexity}%</span>
          </div>
          <Slider
            value={[complexity]}
            onValueChange={(vals) => setComplexity(vals[0])}
            min={10}
            max={100}
            step={5}
            className="w-full"
            data-testid="slider-complexity"
          />
        </div>

        {/* Style Mixing */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Secondary Style</Label>
          <Select value={secondaryStyle} onValueChange={setSecondaryStyle}>
            <SelectTrigger className="h-9" data-testid="select-secondary-style">
              <SelectValue placeholder="Mix with..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {STYLES.filter(s => s !== style).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Style Mix Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Blend className="w-3 h-3" /> Mix
            </Label>
            <span className="font-mono text-[10px] text-muted-foreground">
              {styleMix}%
            </span>
          </div>
          <Slider
            value={[styleMix]}
            onValueChange={(vals) => setStyleMix(vals[0])}
            min={0}
            max={100}
            step={5}
            disabled={secondaryStyle === "none"}
            className="w-full"
            data-testid="slider-style-mix"
          />
          <div className="flex justify-between w-full text-[10px] font-mono">
            <span className={styleMix > 50 ? "text-primary" : "text-muted-foreground"}>{style}</span>
            <span className={styleMix <= 50 && secondaryStyle !== "none" ? "text-secondary" : "text-muted-foreground"}>
              {secondaryStyle === "none" ? "—" : secondaryStyle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
