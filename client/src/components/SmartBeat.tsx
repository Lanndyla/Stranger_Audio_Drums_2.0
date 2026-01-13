import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Zap, Music, CheckCircle } from "lucide-react";
import { analyzeAudio, type AudioAnalysis } from "@/lib/audioAnalysis";
import { apiRequest } from "@/lib/queryClient";

interface SmartBeatProps {
  onPatternGenerated: (grid: { step: number; drum: string; velocity: number }[], bpm: number) => void;
  currentStyle: string;
}

type AnalysisStep = "idle" | "uploading" | "analyzing" | "generating" | "complete" | "error";

export function SmartBeat({ onPatternGenerated, currentStyle }: SmartBeatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const resetState = () => {
    setStep("idle");
    setProgress(0);
    setError(null);
    setAnalysis(null);
    setFileName(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetState, 300);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file (MP3, WAV, etc.)");
      setStep("error");
      return;
    }

    setFileName(file.name);
    setStep("uploading");
    setProgress(10);

    try {
      setStep("analyzing");
      setProgress(30);

      const analysisResult = await analyzeAudio(file);
      setAnalysis(analysisResult);
      setProgress(60);

      setStep("generating");
      setProgress(80);

      const savedApiKey = localStorage.getItem('stranger_drums_api_key');
      const payload: any = {
        bpm: Math.round(analysisResult.bpm),
        style: currentStyle,
        rhythmPattern: analysisResult.rhythmPattern,
        onsetCount: analysisResult.onsets.length,
        duration: analysisResult.duration,
        intensity: analysisResult.intensity.slice(0, 32),
        confidence: analysisResult.confidence,
        beatGrid: analysisResult.beatGrid,
        accentSteps: analysisResult.accentSteps,
        downbeatSteps: analysisResult.downbeatSteps
      };
      
      if (savedApiKey) {
        payload.apiKey = savedApiKey;
      }

      const response = await apiRequest("POST", "/api/patterns/smart-beat", payload);
      const data = await response.json();

      setProgress(100);
      setStep("complete");

      setTimeout(() => {
        onPatternGenerated(data.grid, Math.round(analysisResult.bpm));
        handleClose();
      }, 1000);

    } catch (err) {
      console.error("Smart Beat error:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze audio");
      setStep("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [currentStyle]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const getStepMessage = () => {
    switch (step) {
      case "uploading": return "Loading audio file...";
      case "analyzing": return "Analyzing tempo & rhythm...";
      case "generating": return "AI is building your drum pattern...";
      case "complete": return "Pattern ready!";
      case "error": return error || "An error occurred";
      default: return "";
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold shadow-[0_0_20px_rgba(255,165,0,0.4)] border-0"
        data-testid="button-smart-beat"
        data-tutorial="smart-beat"
      >
        <Zap className="w-4 h-4" />
        SMART BEAT
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
        <DialogContent className="sm:max-w-lg border-orange-500/30 bg-gradient-to-b from-card to-black/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              SMART BEAT
            </DialogTitle>
          </DialogHeader>

          {step === "idle" ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('smart-beat-file-input')?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer
                ${isDragging 
                  ? "border-orange-400 bg-orange-500/10 scale-[1.02]" 
                  : "border-white/20 hover:border-orange-400/50 bg-black/40"
                }
              `}
            >
              <input
                id="smart-beat-file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-smart-beat-file"
              />
              
              <div className="pointer-events-none">
                <div className={`
                  w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-all
                  ${isDragging 
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 scale-110" 
                    : "bg-gradient-to-r from-yellow-500/20 to-orange-500/20"
                  }
                `}>
                  {isDragging ? (
                    <Music className="w-10 h-10 text-black" />
                  ) : (
                    <Upload className="w-10 h-10 text-orange-400" />
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">
                  {isDragging ? "Drop it!" : "Drop your audio file here"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Guitar, bass, or any audio track
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports MP3, WAV, OGG, and more
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 px-4">
              <div className="text-center mb-6">
                {step === "complete" ? (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                ) : step === "error" ? (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-2xl">!</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                  </div>
                )}

                {fileName && step !== "error" && (
                  <p className="text-sm text-white/60 mb-2 font-mono truncate max-w-xs mx-auto">
                    {fileName}
                  </p>
                )}

                <p className={`text-sm font-medium ${step === "error" ? "text-red-400" : step === "complete" ? "text-green-400" : "text-white"}`}>
                  {getStepMessage()}
                </p>

                {analysis && step !== "error" && (
                  <p className="text-xs text-orange-400 mt-2 font-mono">
                    Detected: {Math.round(analysis.bpm)} BPM • {analysis.rhythmPattern} rhythm
                  </p>
                )}
              </div>

              {step !== "error" && (
                <Progress value={progress} className="h-2 bg-white/10" />
              )}

              {step === "error" && (
                <Button 
                  variant="outline" 
                  onClick={resetState} 
                  className="w-full mt-4 border-orange-500/30"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}

          <div className="text-xs text-center text-muted-foreground border-t border-white/5 pt-4">
            AI analyzes your audio to detect tempo and rhythm, then generates matching drums
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
