import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Tone from "tone";
import { Download, Play, Save, Square, Music, Volume2 } from "lucide-react";

import { usePatterns, useCreatePattern, useGeneratePattern, useExportMidi, usePattern } from "@/hooks/use-patterns";
import { audioEngine, type DrumInstrument } from "@/lib/audio";
import { PatternList } from "@/components/PatternList";
import { Controls } from "@/components/Controls";
import { SequencerGrid } from "@/components/SequencerGrid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

interface GridStep {
  step: number;
  drum: string;
  velocity: number;
}

export default function Studio() {
  // --- State ---
  const [bpm, setBpm] = useState(140);
  const [style, setStyle] = useState("Djent");
  const [type, setType] = useState("Groove");
  const [gridData, setGridData] = useState<GridStep[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(null);
  const [saveName, setSaveName] = useState("");
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  // --- Hooks ---
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generatePattern = useGeneratePattern();
  const createPattern = useCreatePattern();
  const exportMidi = useExportMidi();
  const { data: selectedPattern } = usePattern(selectedPatternId);

  // --- Refs ---
  const playbackRef = useRef<Tone.Sequence | null>(null);

  // --- Audio Engine Init ---
  useEffect(() => {
    const initAudio = async () => {
      await audioEngine.init();
      console.log("Audio Engine Initialized");
    };
    // Initialize on first interaction usually, but let's try auto-init or handle it on play
    window.addEventListener("click", initAudio, { once: true });
    return () => window.removeEventListener("click", initAudio);
  }, []);

  // --- Sync State when pattern selected ---
  useEffect(() => {
    if (selectedPattern) {
      setBpm(selectedPattern.bpm);
      setStyle(selectedPattern.style);
      setType(selectedPattern.type);
      // Ensure grid is cast correctly from JSONB
      setGridData(selectedPattern.grid as GridStep[]);
      setSaveName(selectedPattern.name);
    }
  }, [selectedPattern]);

  // --- Playback Logic ---
  useEffect(() => {
    audioEngine.setBpm(bpm);
  }, [bpm]);

  // Restart sequence when grid changes if playing
  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  }, [gridData]); // Re-schedule on grid change

  const startPlayback = async () => {
    await Tone.start();
    
    // Create a sequence that runs every 16th note
    const steps = Array.from({ length: 16 }, (_, i) => i);
    
    playbackRef.current = new Tone.Sequence((time, step) => {
      // Update UI step
      Tone.Draw.schedule(() => {
        setCurrentStep(step);
      }, time);

      // Find drums to play on this step
      const hits = gridData.filter(g => g.step === step);
      hits.forEach(hit => {
        audioEngine.playDrum(hit.drum as DrumInstrument, hit.velocity, time);
      });

    }, steps, "16n").start(0);

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (playbackRef.current) {
      playbackRef.current.dispose();
      playbackRef.current = null;
    }
    Tone.Transport.stop();
    setCurrentStep(-1);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  // --- Event Handlers ---

  const handleToggleStep = (step: number, drum: DrumInstrument) => {
    setGridData(prev => {
      const exists = prev.find(p => p.step === step && p.drum === drum);
      if (exists) {
        // Remove
        return prev.filter(p => !(p.step === step && p.drum === drum));
      } else {
        // Add (default velocity 100)
        // Preview sound
        if (!isPlaying) audioEngine.playDrum(drum, 100);
        return [...prev, { step, drum, velocity: 100 }];
      }
    });
  };

  const handleGenerate = async () => {
    try {
      if (isPlaying) stopPlayback();
      
      const res = await generatePattern.mutateAsync({
        bpm, style, type
      });

      setGridData(res.grid);
      setSaveName(res.suggestedName);
      toast({
        title: "Pattern Generated",
        description: `Created a ${style} ${type} at ${bpm} BPM`,
        className: "bg-primary/10 border-primary text-primary-foreground",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate pattern. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!saveName) return;
    try {
      await createPattern.mutateAsync({
        name: saveName,
        bpm,
        style,
        type,
        grid: gridData
      });
      setIsSaveOpen(false);
      toast({
        title: "Saved Successfully",
        description: "Pattern saved to library.",
        className: "bg-secondary/10 border-secondary text-secondary-foreground",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save pattern.",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportMidi.mutateAsync({ bpm, grid: gridData });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${saveName || 'pattern'}.mid`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "MIDI Exported", description: "Download started." });
    } catch (error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handleNewPattern = () => {
    setSelectedPatternId(null);
    setGridData([]);
    setSaveName("");
    if (isPlaying) stopPlayback();
  };

  // --- Render ---

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col z-20 shadow-2xl">
        <div className="p-4 border-b border-border metal-surface">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-black font-bold font-display text-lg">
              AI
            </div>
            <h1 className="font-display font-bold text-xl tracking-tighter text-white">
              DRUMGEN<span className="text-primary">.SYS</span>
            </h1>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono ml-10">NEURAL RHYTHM ENGINE</p>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-xs font-mono text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Music className="w-3 h-3" /> Library
            </h3>
            <Button variant="outline" size="sm" className="w-full mb-2 border-dashed border-muted-foreground/30 hover:border-primary/50 text-xs" onClick={handleNewPattern}>
              + NEW EMPTY PATTERN
            </Button>
          </div>
          <PatternList onSelect={(id) => setSelectedPatternId(id)} selectedId={selectedPatternId} />
        </div>
        
        <div className="p-4 border-t border-border bg-black/20 text-[10px] text-muted-foreground font-mono text-center">
           v1.0.0 // SYSTEM ONLINE
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Controls */}
        <Controls 
          bpm={bpm} setBpm={setBpm}
          style={style} setStyle={setStyle}
          type={type} setType={setType}
          onGenerate={handleGenerate}
          isGenerating={generatePattern.isPending}
        />

        {/* Sequencer Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black">
          <div className="metal-surface rounded-lg p-1 border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
            <div className="bg-black/40 rounded p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-white/80 font-display tracking-widest flex items-center gap-2">
                    <Volume2 className="text-primary w-5 h-5" />
                    SEQUENCE GRID
                  </h2>
                  <div className="h-px w-20 bg-white/10" />
                  <span className="font-mono text-xs text-primary/60">{saveName || "UNSAVED_PATTERN"}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant={isPlaying ? "destructive" : "default"} 
                    size="lg"
                    className={`w-32 shadow-lg transition-all ${isPlaying ? 'animate-pulse' : ''}`}
                    onClick={togglePlayback}
                  >
                    {isPlaying ? <Square className="fill-current mr-2 w-4 h-4" /> : <Play className="fill-current mr-2 w-4 h-4" />}
                    {isPlaying ? "STOP" : "PLAY"}
                  </Button>
                </div>
              </div>
              
              <SequencerGrid 
                gridData={gridData} 
                currentStep={currentStep}
                onToggleStep={handleToggleStep}
                isPlaying={isPlaying}
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="h-20 bg-card border-t border-border flex items-center justify-between px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
             <span>STEPS: 16</span>
             <span>•</span>
             <span>VELOCITY: ON</span>
             <span>•</span>
             <span>QUANTIZE: 1/16</span>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="gap-2 border-muted-foreground/30 hover:border-primary/50" onClick={handleExport}>
              <Download className="w-4 h-4" />
              EXPORT MIDI
            </Button>
            
            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 font-bold shadow-[0_0_15px_rgba(255,0,255,0.3)]">
                  <Save className="w-4 h-4" />
                  SAVE PATTERN
                </Button>
              </DialogTrigger>
              <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="font-display tracking-widest text-primary">SAVE PATTERN</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="font-mono text-xs uppercase">Pattern Name</Label>
                    <Input
                      id="name"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="e.g. Djent Breakdown 01"
                      className="bg-black/50 border-white/10 font-mono focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsSaveOpen(false)}>CANCEL</Button>
                  <Button onClick={handleSave} disabled={!saveName} className="bg-primary text-black hover:bg-primary/90">
                    CONFIRM SAVE
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
}
