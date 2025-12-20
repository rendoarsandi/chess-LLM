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
    if (!engineRef.current) {
      engineRef.current = new StockfishWorker(onEngineMessage);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, [onEngineMessage]); // Only run once on mount (onEngineMessage is stable due to useCallback)

  useEffect(() => {
    if (fen && engineRef.current && fen !== lastFenRef.current) {
      lastFenRef.current = fen;
      engineRef.current.analyze(fen, 2000);
    }
  }, [fen]);

  return { evaluation };
}
