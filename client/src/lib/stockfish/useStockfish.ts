import { useState, useEffect, useRef, useCallback } from 'react';
import { StockfishWorker } from './StockfishWorker';
import type { EngineEvaluation } from './StockfishWorker';

export function useStockfish(fen: string | null) {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [variations, setVariations] = useState<Record<number, EngineEvaluation>>({});
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

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new StockfishWorker(onEngineMessage, 3);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, [onEngineMessage]);

  useEffect(() => {
    if (fen && engineRef.current && fen !== lastFenRef.current) {
      lastFenRef.current = fen;
      engineRef.current.analyze(fen, 18, () => {
        setVariations({});
      });
    }
  }, [fen]);

  return { 
    evaluation,
    variations: Object.values(variations).sort((a, b) => (a.multipv || 1) - (b.multipv || 1))
  };
}
