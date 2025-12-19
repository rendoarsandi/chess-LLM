import { Chessboard } from "react-chessboard";
import { Button } from "./ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

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
    [highlightSquares.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
    [highlightSquares.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
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
    <div 
      data-testid="chess-board-container" 
      className="w-full max-w-[500px] mx-auto shadow-2xl rounded-sm border-4 border-slate-800 bg-slate-900 relative"
    >
      {/* Top Left Game ID and Copy Controls */}
      <div className="absolute -top-12 left-0 w-full flex justify-between items-end px-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Game ID</span>
          <span className="text-sm font-mono font-bold text-primary">{gameId?.slice(0, 8) || 'No Game'}</span>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-7 text-[10px] px-2 gap-1"
            onClick={() => copyToClipboard(currentFen, 'fen')}
          >
            {copiedFen ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            FEN
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-7 text-[10px] px-2 gap-1"
            onClick={() => copyToClipboard(pgn || '', 'pgn')}
            disabled={!pgn}
          >
            {copiedPgn ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            PGN
          </Button>
        </div>
      </div>

      <Chessboard 
        key={`${currentFen}-${boardOrientation}`}
        options={{
          position: currentFen,
          boardOrientation: boardOrientation,
          squareStyles: customSquareStyles,
          animationDurationInMs: 200
        }}
      />
    </div>
  );
}
