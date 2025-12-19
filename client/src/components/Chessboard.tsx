import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export function ChessboardContainer({ fen }: { fen?: string }) {
  const game = new Chess(fen);

  return (
    <div 
      data-testid="chess-board-container" 
      className="w-full max-w-[600px] aspect-square shadow-2xl rounded-sm overflow-hidden border-8 border-slate-800"
    >
      <Chessboard 
        position={fen || game.fen()} 
        boardOrientation="white"
      />
    </div>
  );
}
