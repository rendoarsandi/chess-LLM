import React from 'react';
import type { EngineEvaluation } from '../lib/stockfish/StockfishWorker';
import { cn } from '../lib/utils';

interface AdvantageBarProps {
  evaluation: EngineEvaluation | null;
  orientation?: 'white' | 'black';
}

export const AdvantageBar: React.FC<AdvantageBarProps> = ({ evaluation }) => {
  // Normalize score to percentage (0 to 100)
  // +5.0 or more is 100% white, -5.0 or less is 0% white (100% black)
  const getPercentage = () => {
    if (!evaluation) {
      return 50;
    }
    
    if (evaluation.isMate) {
      const mateIn = evaluation.mateIn || 0;
      return mateIn > 0 ? 100 : 0;
    }

    const score = evaluation.score / 100; // convert to pawns
    if (isNaN(score)) return 50;

    // Clamp score between -5 and 5 for the visual bar
    const clampedScore = Math.max(-5, Math.min(5, score));
    // Map -5..5 to 0..100
    const calculated = ((clampedScore + 5) / 10) * 100;
    return isNaN(calculated) ? 50 : calculated;
  };

  const percentage = getPercentage();

  const formatScore = () => {
    if (!evaluation) return '';
    if (evaluation.isMate) return `M${Math.abs(evaluation.mateIn || 0)}`;
    
    const score = evaluation.score / 100;
    const sign = score > 0 ? '+' : '';
    return `${sign}${score.toFixed(1)}`;
  };

  return (
    <div className="flex flex-col items-center h-full gap-2 px-1">
      <div className="text-[10px] font-bold text-neutral-500 uppercase">Black</div>
      <div className={cn(
        "relative w-8 h-full bg-neutral-900 overflow-hidden rounded-md border-2",
        !evaluation ? "border-neutral-800" : "border-neutral-600 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
      )}>
        {/* White portion (Bottom up) */}
        <div 
          className="absolute bottom-0 w-full bg-white transition-all duration-700 ease-in-out shadow-[0_-2px_10px_rgba(255,255,255,0.3)]"
          style={{ height: `${percentage}%` }}
        />
        
        {/* Score overlay (Black on white, White on black) */}
        <div className={cn(
          "absolute w-full text-[10px] font-black text-center z-10 select-none pointer-events-none transition-all duration-500",
          percentage > 50 ? "bottom-4 text-black" : "top-4 text-white"
        )}>
          {formatScore()}
        </div>
      </div>
      <div className="text-[10px] font-bold text-neutral-500 uppercase">White</div>
      
      <div className="text-[9px] text-neutral-500 font-mono flex flex-col items-center mt-1">
        {evaluation ? (
          <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">D{evaluation.depth}</span>
        ) : (
          <span className="animate-pulse text-neutral-600">WAITING</span>
        )}
      </div>
    </div>
  );
};
