import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStockfish } from './useStockfish';
import type { EngineEvaluation } from './StockfishWorker';

// Mock StockfishWorker
const mockAnalyze = vi.fn();
const mockTerminate = vi.fn();
let mockCallback: ((evaluation: EngineEvaluation) => void) | null = null;

vi.mock('./StockfishWorker', () => {
  return {
    StockfishWorker: class {
      constructor(callback: (evaluation: EngineEvaluation) => void) {
        mockCallback = callback;
      }
      analyze = mockAnalyze;
      terminate = mockTerminate;
    },
  };
});

describe('useStockfish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallback = null;
  });

  it('should initialize engine and analyze FEN', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    renderHook(() => useStockfish(fen));

    expect(mockAnalyze).toHaveBeenCalledWith(fen, 2000);
  });

  it('should update evaluation state when engine reports', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { result } = renderHook(() => useStockfish(fen));

    const mockEval = { score: 50, isMate: false, depth: 10 };

    act(() => {
      if (mockCallback) mockCallback(mockEval);
    });

    expect(result.current.evaluation).toEqual(mockEval);
  });

  it('should re-analyze when FEN changes', () => {
    const { rerender } = renderHook(({ fen }) => useStockfish(fen), {
      initialProps: { fen: 'startpos' },
    });

    expect(mockAnalyze).toHaveBeenCalledWith('startpos', 2000);

    const newFen = 'e4';
    rerender({ fen: newFen });
    expect(mockAnalyze).toHaveBeenCalledWith(newFen, 2000);
  });

  it('should terminate engine on unmount', () => {
    const { unmount } = renderHook(() => useStockfish('startpos'));
    
    unmount();
    expect(mockTerminate).toHaveBeenCalled();
  });
});
