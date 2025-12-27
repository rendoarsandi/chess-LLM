import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StockfishWorker } from './StockfishWorker';
import type { EngineEvaluation } from './StockfishWorker';
import { safeNewChess } from "../chess-utils";

export function useStockfish(fen: string | null, onBestMove?: (move: string) => void) {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [variations, setVariations] = useState<Record<number, EngineEvaluation>>({});
  const [isThinking, setIsThinking] = useState(false);
  const engineRef = useRef<StockfishWorker | null>(null);
  const lastFenRef = useRef<string | null>(null);

  const onEngineMessage = useCallback((evalData: EngineEvaluation) => {
    // We only update the main evaluation for the bar if it's the primary line (MultiPV 1)
    if (evalData.multipv === 1) {
      setEvaluation(evalData);
    }
    
    // Track all variations for potential UI display (Top 3 lines)
    if (evalData.multipv) {
      setVariations(prev => ({
        ...prev,
        [evalData.multipv!]: evalData
      }));
    }
  }, []);

  const handleBestMove = useCallback((move: string) => {
    setIsThinking(false);
    if (onBestMove) onBestMove(move);
  }, [onBestMove]);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new StockfishWorker(onEngineMessage, 3, handleBestMove);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, [onEngineMessage, handleBestMove]);

  useEffect(() => {
    if (fen && engineRef.current && fen !== lastFenRef.current) {
      lastFenRef.current = fen;
      
      // Clear previous analysis state immediately to avoid stale data
      // Use setTimeout to satisfy ESLint react-hooks/set-state-in-effect
      setTimeout(() => {
        setEvaluation(null);
        setVariations({});
      }, 0);
      
      // Immediate detection of terminal positions to avoid stale evaluations
      try {
        const chess = safeNewChess(fen);
        if (chess.isGameOver()) {
          const sideToMove = fen.split(' ')[1] as 'w' | 'b';
          
          // Use setTimeout to avoid synchronous setState in effect
          setTimeout(() => {
            if (chess.isCheckmate()) {
              setEvaluation({
                score: 0,
                isMate: true,
                mateIn: 0,
                depth: 0,
                sideToMove
              });
            } else {
              // Draw
              setEvaluation({
                score: 0,
                isMate: false,
                depth: 0,
                sideToMove
              });
            }
            setIsThinking(false);
          }, 0);
          return;
        }
      } catch (e) {
        console.warn('[useStockfish] Invalid FEN:', fen, e);
      }

      // We use a small timeout to avoid "setState in effect" lint error for synchronous calls
      setTimeout(() => setIsThinking(true), 0);
      
      // Debounce analysis to prevent crashes during rapid move navigation
      // 250ms is safer for WASM stability during rapid history browsing
      const timeoutId = setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.analyze(fen, 18);
        }
      }, 250);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [fen]);

  const getBestMove = useCallback((fen: string, depth: number = 18) => {
    if (engineRef.current) {
      setIsThinking(true);
      engineRef.current.getBestMove(fen, depth);
    }
  }, []);

  const sortedVariations = useMemo(() => {
    return Object.values(variations).sort((a, b) => (a.multipv || 1) - (b.multipv || 1));
  }, [variations]);

  return { 
    evaluation,
    variations: sortedVariations,
    isThinking,
    getBestMove
  };
}

