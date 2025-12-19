import { Chessboard } from "react-chessboard";

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function ChessboardContainer({ 
  fen, 
  boardOrientation = "white",
  highlightSquares
}: { 
  fen?: string, 
  boardOrientation?: "white" | "black",
  highlightSquares?: { from: string, to: string }
}) {
  const currentFen = fen || DEFAULT_FEN;
  
  const customSquareStyles = highlightSquares ? {
    [highlightSquares.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
    [highlightSquares.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
  } : {};

  return (
    <div 
      data-testid="chess-board-container" 
      className="w-full max-w-[500px] mx-auto shadow-2xl rounded-sm border-4 border-slate-800 bg-slate-900"
    >
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
