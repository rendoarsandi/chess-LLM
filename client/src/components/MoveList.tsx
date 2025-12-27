import { useEffect, useRef } from "react";
import type { Move } from "@/api";
import { cn } from "@/lib/utils";
import { uciToSan, pvToSan } from "@/lib/chess-utils";
import type { EngineEvaluation } from "@/lib/stockfish/StockfishWorker";

interface MoveListProps {
  moves: Move[]
  onMoveClick: (index: number | null) => void
  selectedMoveIndex: number | null
  isLive?: boolean
  variations?: EngineEvaluation[]
  isEngineThinking?: boolean
}

export function MoveList({ moves, onMoveClick, selectedMoveIndex, isLive, variations, isEngineThinking }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when moves change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves into pairs for the table
  const pairs: { number: number, white?: { m: Move, idx: number, displayMove: string }, black?: { m: Move, idx: number, displayMove: string } }[] = []
  moves.forEach((move, originalIdx) => {
    let pair = pairs.find(p => p.number === move.moveNumber)
    if (!pair) {
      pair = { number: move.moveNumber }
      pairs.push(pair)
    }
    const beforeFen = originalIdx === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moves[originalIdx - 1].fen;
    const isUci = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move.move);
    const displayMove = isUci ? uciToSan(beforeFen, move.move) : move.move;
    if (move.playerColor === 'white') pair.white = { m: move, idx: originalIdx, displayMove }
    else pair.black = { m: move, idx: originalIdx, displayMove }
  })
  pairs.sort((a, b) => a.number - b.number)

  const currentMoveFen = selectedMoveIndex !== null && moves[selectedMoveIndex] 
    ? moves[selectedMoveIndex].fen 
    : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xl flex flex-col h-[500px]">
      {/* Engine Analysis (NOW ON TOP) */}
      <div className="p-3 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Engine Lines
            {isEngineThinking && (
              <span className="flex gap-0.5">
                <span className="w-0.5 h-0.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-0.5 h-0.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-0.5 h-0.5 bg-primary rounded-full animate-bounce"></span>
              </span>
            )}
          </span>
          {variations && variations[0] && (
            <span className="text-[8px] font-mono text-muted-foreground/60">DEPTH {variations[0].depth}</span>
          )}
        </div>
        
        <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
          {variations && variations.length > 0 ? (
            variations.map((v) => {
              const score = v.isMate ? `M${v.mateIn}` : (v.score / 100 > 0 ? `+${(v.score / 100).toFixed(2)}` : (v.score / 100).toFixed(2));
              const isWhiteAdvantage = v.isMate ? (v.mateIn ?? 0) > 0 : v.score > 0;
              return (
                <div key={v.multipv} className="flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded leading-none min-w-[2.8rem] text-center shrink-0",
                      v.isMate ? "bg-primary text-primary-foreground" : isWhiteAdvantage ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {score}
                    </span>
                    <div className="text-[10px] font-mono leading-tight text-foreground/80 break-words">
                      {pvToSan(currentMoveFen, v.pv || "", 15)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-30 italic">Awaiting Analysis...</p>
            </div>
          )}
        </div>
      </div>

      {/* Move History Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/40 flex justify-between items-center shrink-0">
        <h3 className="font-black text-[10px] uppercase tracking-widest italic">Move History</h3>
        {isLive && moves.length > 0 && (
          <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">LIVE</span>
        )}
      </div>

      {/* Move History Table (NOW BELOW) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <table className="w-full text-xs border-separate border-spacing-y-0.5">
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.number}>
                <td className="w-8 text-muted-foreground font-mono text-[10px] pr-2 text-right opacity-40 italic">
                  {pair.number}.
                </td>
                <td className="w-1/2">
                  {pair.white && (
                    <button
                      onClick={() => onMoveClick(pair.white!.idx)}
                      className={cn(
                        "w-full flex items-center px-2 py-1.5 rounded font-bold transition-all text-left",
                        selectedMoveIndex === pair.white.idx ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/50 text-foreground/80'
                      )}
                    >
                      <span className="truncate">{pair.white.displayMove}</span>
                    </button>
                  )}
                </td>
                <td className="w-1/2">
                  {pair.black && (
                    <button
                      onClick={() => onMoveClick(pair.black!.idx)}
                      className={cn(
                        "w-full flex items-center px-2 py-1.5 rounded font-bold transition-all text-left",
                        selectedMoveIndex === pair.black.idx ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/50 text-foreground/80'
                      )}
                    >
                      <span className="truncate">{pair.black.displayMove}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {moves.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground italic py-12 opacity-30">
            <p className="text-[10px] font-black uppercase tracking-widest">No moves recorded</p>
          </div>
        )}
      </div>
    </div>
  )
}
