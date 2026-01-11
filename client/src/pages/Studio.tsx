import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Tone from "tone";
import { Download, Play, Save, Square, Music, Volume2, Shuffle, ListMusic, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

interface GridStep {
  step: number;
  drum: string;
  velocity: number;
}

interface ArrangementPattern {
  id: string;
  name: string;
  bpm: number;
  grid: GridStep[];
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
  
  // New advanced features state
  const [complexity, setComplexity] = useState(50);
  const [styleMix, setStyleMix] = useState(70);
  const [secondaryStyle, setSecondaryStyle] = useState("none");
  
  // Song Mode / Arrangement state
  const [arrangement, setArrangement] = useState<ArrangementPattern[]>([]);
  const [activeTab, setActiveTab] = useState("pattern");

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
    window.addEventListener("click", initAudio, { once: true });
    return () => window.removeEventListener("click", initAudio);
  }, []);

  // --- Sync State when pattern selected ---
  useEffect(() => {
    if (selectedPattern) {
      setBpm(selectedPattern.bpm);
      setStyle(selectedPattern.style);
      setType(selectedPattern.type);
      setGridData(selectedPattern.grid as GridStep[]);
      setSaveName(selectedPattern.name);
    }
  }, [selectedPattern]);

  // --- Playback Logic ---
  useEffect(() => {
    audioEngine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  }, [gridData]);

  const startPlayback = async () => {
    await Tone.start();
    
    playbackRef.current = new Tone.Sequence((time, step) => {
      Tone.Draw.schedule(() => {
        setCurrentStep(step);
      }, time);

      const hits = gridData.filter(g => g.step === step);
      hits.forEach(hit => {
        audioEngine.playDrum(hit.drum as DrumInstrument, hit.velocity, time);
      });

    }, Array.from({ length: 32 }, (_, i) => i), "16n").start(0);

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
        return prev.filter(p => !(p.step === step && p.drum === drum));
      } else {
        if (!isPlaying) audioEngine.playDrum(drum, 100);
        return [...prev, { step, drum, velocity: 100 }];
      }
    });
  };

  const handleHumanize = () => {
    setGridData(prev => prev.map(step => ({
      ...step,
      velocity: Math.max(40, Math.min(127, step.velocity + Math.floor(Math.random() * 30) - 15))
    })));
    toast({
      title: "Humanized",
      description: "Velocity variations applied for a more natural feel.",
    });
  };

  const handleGenerate = async () => {
    try {
      if (isPlaying) stopPlayback();
      
      const payload: any = {
        bpm, 
        style, 
        type,
        complexity,
      };
      
      if (secondaryStyle !== "none") {
        payload.secondaryStyle = secondaryStyle;
        payload.styleMix = styleMix;
      }
      
      const data = await generatePattern.mutateAsync(payload);

      setGridData(data.grid);
      setSaveName(data.suggestedName);
      toast({
        title: "Pattern Generated",
        description: `Created a ${secondaryStyle !== "none" ? `${style}/${secondaryStyle}` : style} ${type} at ${bpm} BPM`,
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

  const handleExportArrangement = async () => {
    if (arrangement.length === 0) {
      toast({ title: "No Arrangement", description: "Add patterns to the arrangement first.", variant: "destructive" });
      return;
    }

    try {
      const res = await apiRequest("POST", "/api/patterns/export-arrangement", {
        bpm,
        patterns: arrangement.map(p => p.grid)
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arrangement.mid`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Arrangement Exported", description: "Full song MIDI downloaded." });
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

  const addToArrangement = () => {
    if (gridData.length === 0) {
      toast({ title: "Empty Pattern", description: "Generate or create a pattern first.", variant: "destructive" });
      return;
    }
    
    const newPattern: ArrangementPattern = {
      id: Date.now().toString(),
      name: saveName || `Pattern ${arrangement.length + 1}`,
      bpm,
      grid: [...gridData]
    };
    
    setArrangement(prev => [...prev, newPattern]);
    toast({ title: "Added to Arrangement", description: `${newPattern.name} added.` });
  };

  const removeFromArrangement = (id: string) => {
    setArrangement(prev => prev.filter(p => p.id !== id));
  };

  const loadFromArrangement = (pattern: ArrangementPattern) => {
    setGridData(pattern.grid);
    setSaveName(pattern.name);
    setBpm(pattern.bpm);
    setActiveTab("pattern");
  };

  // --- Render ---

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col z-20 shadow-2xl">
        <div className="p-4 border-b border-border metal-surface">
          <div className="flex items-center gap-2 mb-1">
            <img src="/assets/Stranger_Amps_UI_0018_Logo_1768104907791.png" alt="Stranger Drums" className="h-12 w-12 rounded object-cover" />
            <h1 className="font-display font-bold text-xl tracking-tighter text-white">
              Stranger <span className="text-primary">Drums</span>
            </h1>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono ml-10">NEURAL RHYTHM ENGINE v2.0</p>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-xs font-mono text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Music className="w-3 h-3" /> Library
            </h3>
            <Button variant="outline" size="sm" className="w-full mb-2 border-dashed border-muted-foreground/30 hover:border-primary/50 text-xs" onClick={handleNewPattern} data-testid="button-new-pattern">
              + NEW EMPTY PATTERN
            </Button>
          </div>
          <PatternList onSelect={(id) => setSelectedPatternId(id)} selectedId={selectedPatternId} />
        </div>
        
        <div className="p-4 border-t border-border bg-black/20 text-[10px] text-muted-foreground font-mono text-center">
           v2.0.0 // ADVANCED MODE
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
          complexity={complexity} setComplexity={setComplexity}
          styleMix={styleMix} setStyleMix={setStyleMix}
          secondaryStyle={secondaryStyle} setSecondaryStyle={setSecondaryStyle}
        />

        {/* Tabs for Pattern / Arrangement */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 pt-4 bg-black/20">
            <TabsList className="bg-black/40">
              <TabsTrigger value="pattern" className="data-[state=active]:bg-primary/20" data-testid="tab-pattern">
                <Volume2 className="w-4 h-4 mr-2" /> Pattern Editor
              </TabsTrigger>
              <TabsTrigger value="arrangement" className="data-[state=active]:bg-secondary/20" data-testid="tab-arrangement">
                <ListMusic className="w-4 h-4 mr-2" /> Song Arrangement ({arrangement.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pattern Editor Tab */}
          <TabsContent value="pattern" className="flex-1 m-0 overflow-hidden">
            <div className="h-full p-6 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black">
              <div className="metal-surface rounded-lg p-1 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
                <div className="bg-black/60 rounded p-4 backdrop-blur-md border border-white/5 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-bold text-white/70 font-display tracking-[0.2em] flex items-center gap-2">
                        <Volume2 className="text-primary w-4 h-4" />
                        STEP SEQUENCER
                      </h2>
                      <div className="h-px w-12 bg-white/10" />
                      <span className="font-mono text-[10px] text-primary/50 tracking-widest">{saveName || "UNTITLED_PRJ"}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleHumanize}
                        className="h-8 px-4 font-mono text-xs border-muted-foreground/30"
                        data-testid="button-humanize"
                      >
                        <Shuffle className="w-3 h-3 mr-2" />
                        HUMANIZE
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={addToArrangement}
                        className="h-8 px-4 font-mono text-xs border-secondary/30 text-secondary"
                        data-testid="button-add-arrangement"
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        ADD TO SONG
                      </Button>
                      <Button 
                        variant={isPlaying ? "destructive" : "default"} 
                        size="sm"
                        className={cn(
                          "h-8 px-6 font-mono font-bold tracking-widest transition-all",
                          isPlaying && "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        )}
                        onClick={togglePlayback}
                        data-testid="button-play"
                      >
                        {isPlaying ? <Square className="fill-current mr-2 w-3 h-3" /> : <Play className="fill-current mr-2 w-3 h-3" />}
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
          </TabsContent>

          {/* Arrangement Tab */}
          <TabsContent value="arrangement" className="flex-1 m-0 overflow-hidden">
            <div className="h-full p-6 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black">
              <div className="metal-surface rounded-lg p-4 border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-white/70 font-display tracking-[0.2em] flex items-center gap-2">
                    <ListMusic className="text-secondary w-4 h-4" />
                    SONG ARRANGEMENT
                  </h2>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleExportArrangement}
                    disabled={arrangement.length === 0}
                    data-testid="button-export-arrangement"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    EXPORT FULL SONG
                  </Button>
                </div>

                {arrangement.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-mono text-sm">No patterns in arrangement</p>
                    <p className="text-xs mt-1">Create patterns and click "ADD TO SONG" to build your arrangement</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {arrangement.map((pattern, index) => (
                        <div 
                          key={pattern.id} 
                          className="flex items-center gap-4 p-3 bg-black/40 rounded border border-white/5 hover:border-secondary/30 transition-colors"
                        >
                          <span className="font-mono text-xs text-muted-foreground w-8">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-mono text-sm text-white/80">{pattern.name}</p>
                            <p className="text-[10px] text-muted-foreground">{pattern.grid.length} notes • {pattern.bpm} BPM</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => loadFromArrangement(pattern)}
                            className="text-xs"
                          >
                            EDIT
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeFromArrangement(pattern.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom Actions Bar */}
        <div className="h-16 bg-card border-t border-border flex items-center justify-between px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
             <span>STEPS: 32</span>
             <span>•</span>
             <span>COMPLEXITY: {complexity}%</span>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" size="sm" className="gap-2 border-muted-foreground/30 hover:border-primary/50" onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4" />
              EXPORT MIDI
            </Button>
            
            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2 font-bold shadow-[0_0_15px_rgba(255,0,255,0.3)]" data-testid="button-save">
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
