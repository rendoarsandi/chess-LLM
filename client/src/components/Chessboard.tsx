import { Chessboard } from "react-chessboard";
import { Button } from "./ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function ChessboardContainer({ 
  fen, 
  boardOrientation = "white",
  highlightSquares,
  gameId,
  pgn
}: { 
  fen?: string, 
  boardOrientation?: "white" | "black",
  highlightSquares?: { from: string, to: string },
  gameId?: string,
  pgn?: string
}) {
  const currentFen = fen || DEFAULT_FEN;
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  
  const customSquareStyles = highlightSquares ? {
    [highlightSquares.from]: { backgroundColor: 'var(--color-last-move)' },
    [highlightSquares.to]: { backgroundColor: 'var(--color-last-move)' }
  } : {};

  const copyToClipboard = (text: string, type: 'fen' | 'pgn') => {
    navigator.clipboard.writeText(text);
    if (type === 'fen') {
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    } else {
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[min(90vw,500px)] lg:max-w-[min(40vw,600px)] mx-auto gap-3">
      {/* Top Left Game ID and Copy Controls - Moved inside the flow */}
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Session ID</span>
          <span className="text-[10px] font-mono font-bold text-primary truncate max-w-[100px]">{gameId?.slice(0, 8) || 'NO_LIVE_GAME'}</span>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[9px] px-2 gap-1 font-black hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => copyToClipboard(currentFen, 'fen')}
          >
            {copiedFen ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            FEN
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[9px] px-2 gap-1 font-black hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => copyToClipboard(pgn || '', 'pgn')}
            disabled={!pgn}
          >
            {copiedPgn ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            PGN
          </Button>
        </div>
      </div>

      <div 
        data-testid="chess-board-container" 
        className={cn(
          "w-full aspect-square shadow-2xl rounded-sm border-4 border-sidebar-border bg-sidebar relative overflow-hidden",
          "ring-1 ring-primary/10"
        )}
      >
        <Chessboard 
          key={`${currentFen}-${boardOrientation}`}
          options={{
            position: currentFen,
            boardOrientation: boardOrientation,
            squareStyles: customSquareStyles,
            animationDurationInMs: 200,
            darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
            lightSquareStyle: { backgroundColor: 'var(--board-light)' }
          }}
        />
      </div>
    </div>
  );
}
