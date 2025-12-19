import { Chessboard } from "react-chessboard";

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function ChessboardContainer({ fen, boardOrientation = "white" }: { 
  fen?: string, 
  boardOrientation?: "white" | "black" 
}) {
  return (
    <div 
      data-testid="chess-board-container" 
      className="w-full max-w-[600px] aspect-square shadow-2xl rounded-sm overflow-hidden border-8 border-slate-800"
    >
      <Chessboard 
        options={{
          position: fen || DEFAULT_FEN,
          boardOrientation: boardOrientation
        }}
      />
    </div>
  );
}