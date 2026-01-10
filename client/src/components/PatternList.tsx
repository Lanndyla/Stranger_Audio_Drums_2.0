import { usePatterns, useDeletePattern } from "@/hooks/use-patterns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Music, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PatternListProps {
  onSelect: (id: number) => void;
  selectedId: number | null;
}

export function PatternList({ onSelect, selectedId }: PatternListProps) {
  const { data: patterns, isLoading } = usePatterns();
  const deletePattern = useDeletePattern();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!patterns?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
        <Music className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm font-mono">NO PATTERNS SAVED</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-2 p-2">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            onClick={() => onSelect(pattern.id)}
            className={`
              group relative flex flex-col p-3 rounded-sm border cursor-pointer transition-all duration-200
              ${selectedId === pattern.id 
                ? "bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(0,243,255,0.2)]" 
                : "bg-card hover:bg-card/80 border-transparent hover:border-primary/30"
              }
            `}
          >
            <div className="flex justify-between items-start">
              <h4 className={`font-mono font-bold truncate text-sm ${selectedId === pattern.id ? "text-primary text-glow" : "text-foreground"}`}>
                {pattern.name}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this pattern?")) {
                    deletePattern.mutate(pattern.id);
                  }
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex justify-between items-end mt-2">
              <div className="flex gap-2 text-[10px] text-muted-foreground font-mono uppercase">
                <span className="bg-secondary/10 text-secondary px-1 rounded">{pattern.style}</span>
                <span className="bg-white/5 px-1 rounded">{pattern.type}</span>
                <span>{pattern.bpm} BPM</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
