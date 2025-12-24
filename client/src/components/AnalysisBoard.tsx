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
  gameStatus,
  winnerId,
  whitePlayerId
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-[1200px] mx-auto">
      <div className="w-full md:w-auto h-8 md:h-auto md:min-h-[400px]">
        <AdvantageBar 
          evaluation={evaluation}
          variations={variations}
          fen={fen}
          orientation="vertical"
          boardOrientation={orientation}
          gameStatus={gameStatus}
          winnerId={winnerId}
          whitePlayerId={whitePlayerId}
        />
      </div>
      <div className="flex-1 relative group">
        <ErrorBoundary fallback={<div className="aspect-square w-full bg-muted flex items-center justify-center border border-destructive/20 rounded-lg text-[10px] font-black uppercase text-destructive tracking-widest p-4 text-center">Chessboard Error - Reload Recommended</div>}>
          <ChessboardContainer 
            fen={fen} 
            boardOrientation={orientation} 
            highlightSquares={lastMoveSquares} 
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};
