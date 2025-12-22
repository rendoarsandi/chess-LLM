import type { Move, MoveAnalysis } from "@/api";
import { Star, Zap, Check, CheckCheck, Info, AlertTriangle, XCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoveListProps {
  moves: Move[]
  onMoveClick: (index: number) => void
  selectedMoveIndex?: number
  isLive?: boolean
  analyses?: MoveAnalysis[]
}

export function MoveList({ moves, onMoveClick, selectedMoveIndex, isLive, analyses }: MoveListProps) {
  const renderClassificationIcon = (moveNumber: number, playerColor: 'white' | 'black') => {
    if (!analyses) return null;
    
    // Find analysis by moveNumber and playerColor
    const analysis = analyses.find(a => a.moveNumber === moveNumber && a.playerColor === playerColor);
    
    if (!analysis) return null;

    const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string, label: string }> = {
      brilliant: { icon: Zap, color: "text-cyan-400", label: "!!" },
      great: { icon: Star, color: "text-blue-400", label: "!" },
      best: { icon: CheckCheck, color: "text-green-400", label: "★" },
      excellent: { icon: Check, color: "text-green-500", label: "" },
      good: { icon: Check, color: "text-slate-400", label: "" },
      book: { icon: Info, color: "text-orange-400", label: "📖" },
      inaccuracy: { icon: Info, color: "text-yellow-400", label: "?!" },
      mistake: { icon: AlertTriangle, color: "text-orange-500", label: "?" },
      blunder: { icon: XCircle, color: "text-red-500", label: "??" },
      miss: { icon: Search, color: "text-purple-400", label: "X" },
    };

    const cfg = iconMap[analysis.classification];
    if (!cfg) return null;

    const Icon = cfg.icon;
    return (
      <div className={cn("inline-flex items-center gap-0.5 ml-1", cfg.color)} title={analysis.classification.toUpperCase()}>
        <Icon className="w-2.5 h-2.5" />
        {cfg.label && <span className="text-[7px] font-black">{cfg.label}</span>}
      </div>
    );
  };

  // Group into rows
  const pairs: { number: number, white?: { m: Move, idx: number }, black?: { m: Move, idx: number } }[] = []
  
  // We need to preserve the original index for onMoveClick
  moves.forEach((move, originalIdx) => {
    let pair = pairs.find(p => p.number === move.moveNumber)
    if (!pair) {
      pair = { number: move.moveNumber }
      pairs.push(pair)
    }
    if (move.playerColor === 'white') {
      pair.white = { m: move, idx: originalIdx }
    } else {
      pair.black = { m: move, idx: originalIdx }
    }
  })

  // Sort pairs by move number
  pairs.sort((a, b) => a.number - b.number)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg flex flex-col h-[300px]">
      <div className="p-3 border-b border-border bg-muted/50 flex justify-between items-center">
        <h3 className="font-bold text-sm uppercase tracking-wider">Move History</h3>
        {isLive && moves.length > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 animate-pulse bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            LIVE
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-sm border-separate border-spacing-y-1">
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.number}>
                <td className="w-8 text-muted-foreground font-mono text-xs pr-2 text-right">
                  {pair.number}.
                </td>
                <td className="w-1/2">
                  {pair.white && (
                    <button
                      onClick={() => onMoveClick(pair.white!.idx)}
                      className={cn(
                        "w-full flex items-center px-2 py-1 rounded font-medium transition-colors text-left",
                        selectedMoveIndex === pair.white.idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <span className="truncate">{pair.white.m.move}</span>
                      {renderClassificationIcon(pair.number, 'white')}
                    </button>
                  )}
                </td>
                <td className="w-1/2">
                  {pair.black && (
                    <button
                      onClick={() => onMoveClick(pair.black!.idx)}
                      className={cn(
                        "w-full flex items-center px-2 py-1 rounded font-medium transition-colors text-left",
                        selectedMoveIndex === pair.black.idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <span className="truncate">{pair.black.m.move}</span>
                      {renderClassificationIcon(pair.number, 'black')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {moves.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground italic py-8">
            No moves yet.
          </div>
        )}
      </div>
    </div>
  )
}
