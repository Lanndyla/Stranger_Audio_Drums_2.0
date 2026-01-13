import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: "[data-tutorial='sequencer-grid']",
    title: "The Sequencer Grid",
    content: "This is your drum pattern canvas. Each row is a different drum (kick, snare, hi-hats, etc.) and each column is a 16th note step. Click any cell to add or remove a hit!",
    position: "top"
  },
  {
    target: "[data-tutorial='play-button']",
    title: "Play Your Pattern",
    content: "Hit this button to hear your pattern. The grid will highlight the current step as it plays. Press again to stop.",
    position: "bottom"
  },
  {
    target: "[data-tutorial='bpm-control']",
    title: "Tempo Control",
    content: "Adjust the BPM (beats per minute) here. Drag the slider or type a value. Metal usually sits around 100-160 BPM.",
    position: "bottom"
  },
  {
    target: "[data-tutorial='style-selector']",
    title: "Choose Your Style",
    content: "Select a genre for AI pattern generation. Each style has unique characteristics - Djent has polyrhythmic kicks, Jazz has ghost notes, Blast Beat is relentless!",
    position: "bottom"
  },
  {
    target: "[data-tutorial='generate-button']",
    title: "AI Pattern Generation",
    content: "Click here to let AI create a pattern based on your selected style, type, and complexity. It generates authentic velocity variations for realistic feel!",
    position: "bottom"
  },
  {
    target: "[data-tutorial='smart-beat']",
    title: "Smart Beat",
    content: "Drop an audio file here and AI will analyze it, then generate drums that lock with your track's rhythm. Perfect for writing to existing music!",
    position: "bottom"
  },
  {
    target: "[data-tutorial='track-velocities']",
    title: "Track Velocities",
    content: "Adjust each drum's volume with these sliders. Mix your kit balance here!",
    position: "top"
  },
  {
    target: "[data-tutorial='save-button']",
    title: "Save Your Pattern",
    content: "Save your creation to the library. Give it a name and it'll be stored for later. You can also export to MIDI for use in your DAW!",
    position: "top"
  }
];

interface TutorialProps {
  onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  const step = TUTORIAL_STEPS[currentStep];

  useEffect(() => {
    const updatePosition = () => {
      const target = document.querySelector(step.target);
      if (!target) {
        setTooltipStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = 12;
      const tooltipWidth = 240;
      const tooltipHeight = 140;

      let top = 0;
      let left = 0;
      let arrowTop = "auto";
      let arrowLeft = "auto";
      let arrowBottom = "auto";
      let arrowRight = "auto";

      switch (step.position) {
        case "top":
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowBottom = "-8px";
          arrowLeft = "50%";
          break;
        case "bottom":
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowTop = "-8px";
          arrowLeft = "50%";
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          arrowRight = "-8px";
          arrowTop = "50%";
          break;
        case "right":
          top = rect.top - tooltipHeight / 2;
          left = rect.right + padding;
          arrowLeft = "-8px";
          arrowTop = "30%";
          break;
      }

      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 32));

      setTooltipStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        zIndex: 9999
      });

      setArrowStyle({
        position: "absolute",
        top: arrowTop,
        left: arrowLeft,
        bottom: arrowBottom,
        right: arrowRight,
        transform: arrowLeft === "50%" || arrowRight === "50%" ? "translateX(-50%)" : arrowTop === "50%" ? "translateY(-50%)" : undefined,
        width: 0,
        height: 0,
        borderLeft: step.position === "right" ? "8px solid transparent" : step.position === "left" ? "8px solid #0ff" : "8px solid transparent",
        borderRight: step.position === "left" ? "8px solid transparent" : step.position === "right" ? "8px solid #0ff" : "8px solid transparent",
        borderTop: step.position === "bottom" ? "8px solid transparent" : step.position === "top" ? "8px solid #0ff" : "8px solid transparent",
        borderBottom: step.position === "top" ? "8px solid transparent" : step.position === "bottom" ? "8px solid #0ff" : "8px solid transparent"
      });

      target.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem("stranger_drums_tutorial_complete", "true");
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("stranger_drums_tutorial_complete", "true");
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/70 z-[9998]" 
        onClick={handleSkip}
        data-testid="tutorial-overlay"
      />
      
      <div 
        style={tooltipStyle}
        className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.3)] p-3"
        data-testid="tutorial-tooltip"
      >
        <div style={arrowStyle} />
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-semibold text-xs">
              {currentStep + 1}/{TUTORIAL_STEPS.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-gray-400 hover:text-white"
            onClick={handleSkip}
            data-testid="tutorial-close"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
        <p className="text-gray-300 text-xs leading-relaxed mb-2">{step.content}</p>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-400 hover:text-white text-xs h-7 px-2"
            data-testid="tutorial-skip"
          >
            Skip
          </Button>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 h-7 w-7 p-0"
              data-testid="tutorial-prev"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-7 px-3 text-xs"
              data-testid="tutorial-next"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? "Done" : "Next"}
            </Button>
          </div>
        </div>

        <div className="flex justify-center gap-1 mt-2">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                idx === currentStep ? "bg-cyan-400" : idx < currentStep ? "bg-cyan-400/50" : "bg-gray-600"
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function TutorialButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 gap-2"
      data-testid="button-start-tutorial"
    >
      <Lightbulb className="w-4 h-4" />
      Tutorial
    </Button>
  );
}
