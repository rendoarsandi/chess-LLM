import React from 'react';
import { ChessboardContainer } from './Chessboard';
import { AdvantageBar } from './AdvantageBar';
import type { EngineEvaluation } from '../lib/stockfish/StockfishWorker';
import { ErrorBoundary } from './ErrorBoundary';

interface AnalysisBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  evaluation: EngineEvaluation | null;
  variations: EngineEvaluation[];
  lastMoveSquares?: { from: string; to: string };
  gameId?: string;
  pgn?: string;
  gameStatus?: 'ongoing' | 'completed' | 'draw' | 'paused';
  winnerId?: string | null;
  whitePlayerId?: string;
}

export const AnalysisBoard: React.FC<AnalysisBoardProps> = ({
  fen,
  orientation,
  evaluation,
  variations,
  lastMoveSquares,
  gameId,
  pgn,
  gameStatus,
  winnerId,
  whitePlayerId
}) => {
  return (
    <div className="flex gap-4 w-full h-full max-h-[600px]">
      <div className="h-full py-2">
        <AdvantageBar 
          evaluation={evaluation}
          variations={variations}
          orientation="vertical"
          boardOrientation={orientation}
          gameStatus={gameStatus}
          winnerId={winnerId}
          whitePlayerId={whitePlayerId}
        />
      </div>
      <div className="flex-1 aspect-square relative group">
        <ErrorBoundary fallback={<div className="aspect-square w-full bg-muted flex items-center justify-center">Chessboard Error</div>}>
          <ChessboardContainer 
            fen={fen} 
            boardOrientation={orientation} 
            highlightSquares={lastMoveSquares} 
            gameId={gameId} 
            pgn={pgn} 
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};
