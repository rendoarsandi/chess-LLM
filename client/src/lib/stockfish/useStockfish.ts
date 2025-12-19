import { useState, useEffect, useRef, useCallback } from 'react';
import { StockfishWorker, EngineEvaluation } from './StockfishWorker';

export function useStockfish(fen: string | null) {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const engineRef = useRef<StockfishWorker | null>(null);

  const onEngineMessage = useCallback((evalData: EngineEvaluation) => {
    setEvaluation(evalData);
  }, []);

  useEffect(() => {
    // Initialize engine once
    if (!engineRef.current) {
      engineRef.current = new StockfishWorker(onEngineMessage);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, [onEngineMessage]);

  useEffect(() => {
    if (fen && engineRef.current) {
      // Analyze with a fixed time limit as per spec (2 seconds)
      engineRef.current.analyze(fen, 2000);
    }
  }, [fen]);

  return { evaluation };
}
