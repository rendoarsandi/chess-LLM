import React from 'react';
import type { EngineEvaluation } from '../lib/stockfish/StockfishWorker';
import { cn } from '../lib/utils';
import { pvToSan } from '../lib/chess-utils';

interface AdvantageBarProps {
  evaluation: EngineEvaluation | null;
  variations?: EngineEvaluation[];
  fen?: string;
  orientation?: 'vertical' | 'horizontal';
  gameStatus?: 'ongoing' | 'completed' | 'draw' | 'paused';
  winnerId?: string | null;
  whitePlayerId?: string;
  boardOrientation?: 'white' | 'black';
}

export const AdvantageBar: React.FC<AdvantageBarProps> = ({ 
  evaluation, 
  variations, 
  fen,
  orientation = 'vertical',
  gameStatus,
  winnerId,
  whitePlayerId,
  boardOrientation = 'white'
}) => {
  // Normalize score to percentage (0 to 100)
  // +5.0 or more is 100% white, -5.0 or less is 0% white (100% black)
  const getPercentage = () => {
    // Terminal States override engine evaluation
    if (gameStatus === 'completed') {
      return winnerId === whitePlayerId ? 100 : 0;
    }
    if (gameStatus === 'draw') {
      return 50;
    }

    if (!evaluation) {
      return 50;
    }
    
    if (evaluation.isMate) {
      const mateIn = evaluation.mateIn || 0;
      if (mateIn === 0) {
        // If mateIn is 0, the current side to move is checkmated
        return evaluation.sideToMove === 'w' ? 0 : 100;
      }
      // mateIn > 0 means White is mating (100% white), < 0 means Black is mating (0% white)
      return mateIn > 0 ? 100 : 0;
    }

    const score = evaluation.score / 100; // convert to pawns
    if (isNaN(score)) return 50;

    // Clamp score between -5 and 5 for the visual bar
    const clampedScore = Math.max(-5, Math.min(5, score));
    // Map -5..5 to 0..100 (White advantage is positive)
    const rawPct = ((clampedScore + 5) / 10) * 100;
    
    // Scale 0..100 to 5..95 so it never looks "full" unless it's a mate
    const calculated = 5 + (rawPct * 0.9);
    return isNaN(calculated) ? 50 : calculated;
  };

  const percentage = getPercentage();
  const isHorizontal = orientation === 'horizontal';

  const formatScore = () => {
    if (gameStatus === 'completed') {
      return winnerId === whitePlayerId ? '1-0' : '0-1';
    }
    if (gameStatus === 'draw') {
      return '½-½';
    }

    if (!evaluation) return '';
    if (evaluation.isMate) {
      const m = evaluation.mateIn || 0;
      return `M${Math.abs(m)}`;
    }
    
    const score = evaluation.score / 100;
    const sign = score > 0 ? '+' : '';
    // If score is 0, no sign
    if (score === 0) return '0.00';
    return `${sign}${score.toFixed(2)}`;
  };

  return (
    <div className={cn(
      "flex items-center relative group/bar",
      isHorizontal ? "flex-row w-full h-6" : "flex-col h-full"
    )}>
      <div className={cn(
        "relative bg-neutral-900 overflow-hidden rounded-sm border transition-all duration-300",
        isHorizontal ? "w-full h-full" : "w-6 md:w-8 h-full",
        !evaluation ? "border-neutral-800" : "border-neutral-700 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
      )}>
        {/* White portion */}
        <div 
          className={cn(
            "absolute bg-white transition-all duration-400 ease-in-out shadow-[0_-1px_5px_rgba(255,255,255,0.2)]",
            isHorizontal 
              ? (boardOrientation === 'white' ? "right-0 h-full" : "left-0 h-full") 
              : (boardOrientation === 'white' ? "bottom-0 w-full" : "top-0 w-full")
          )}
          style={isHorizontal ? { width: `${percentage}%` } : { height: `${percentage}%` }}
        />
        
        {/* Score overlay */}
        <div className={cn(
          "absolute text-[9px] md:text-[10px] font-black text-center z-10 select-none pointer-events-none transition-all duration-500",
          isHorizontal 
            ? "top-1/2 -translate-y-1/2 w-full flex justify-between px-2 items-center" 
            : (boardOrientation === 'white' 
                ? (percentage > 50 ? "bottom-1.5 w-full" : "top-1.5 w-full")
                : (percentage > 50 ? "top-1.5 w-full" : "bottom-1.5 w-full")
              )
        )}>
          {isHorizontal ? (
            <>
              <span className={percentage <= 50 ? "text-white" : "text-transparent"}>{percentage <= 50 ? formatScore() : ''}</span>
              <span className={percentage > 50 ? "text-black" : "text-transparent"}>{percentage > 50 ? formatScore() : ''}</span>
            </>
          ) : (
            <span className={percentage > 50 ? "text-black" : "text-white"}>{formatScore()}</span>
          )}
        </div>
      </div>
      
      {/* Variations Tooltip - only for vertical */}
      {!isHorizontal && variations && variations.length > 1 && (
        <div className="absolute left-full ml-4 top-0 bg-neutral-900/90 backdrop-blur-md border border-white/10 p-3 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-50 w-48 shadow-2xl">
          <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Top Lines</div>
          <div className="space-y-2">
            {variations.map((v, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-400">#{v.multipv}</span>
                  <span className={cn("font-bold", (v.score || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {v.isMate ? `M${v.mateIn}` : (v.score / 100).toFixed(2)}
                  </span>
                </div>
                {v.pv && (
                  <div className="text-[9px] text-neutral-500 truncate font-mono">
                    {fen ? pvToSan(fen, v.pv, 3) : v.pv.split(' ').slice(0, 3).join(' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {evaluation && !isHorizontal && (
        <div className="absolute -bottom-6 text-[8px] text-neutral-500 font-mono flex flex-col items-center">
          <span>D{evaluation.depth}</span>
        </div>
      )}
    </div>
  );
};