import { useState, useEffect, useRef, useCallback } from 'react';
import { StockfishWorker } from './StockfishWorker';
import type { EngineEvaluation } from './StockfishWorker';

export function useStockfish(fen: string | null) {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const engineRef = useRef<StockfishWorker | null>(null);
  const lastFenRef = useRef<string | null>(null);

  const onEngineMessage = useCallback((evalData: EngineEvaluation) => {
    setEvaluation(evalData);
  }, []);

  useEffect(() => {
    console.log('[useStockfish] Hook mounted');
    if (!engineRef.current) {
      engineRef.current = new StockfishWorker(onEngineMessage);
    }

    return () => {
      console.log('[useStockfish] Hook unmounting, terminating engine');
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (fen && engineRef.current && fen !== lastFenRef.current) {
      console.log(`[useStockfish] Analyzing new FEN: ${fen}`);
      lastFenRef.current = fen;
      engineRef.current.analyze(fen, 2000);
    }
  }, [fen]);

  return { evaluation };
}
