import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(callback: (evaluation: EngineEvaluation) => void, _multiPv: number) {
        mockCallback = callback;
      }
      analyze = mockAnalyze;
      terminate = mockTerminate;
    },
  };
});

describe('useStockfish', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize engine and analyze FEN after debounce', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { result } = renderHook(() => useStockfish(fen));

    expect(result.current.isThinking).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAnalyze).toHaveBeenCalledWith(fen, 18, expect.any(Function));
  });

  it('should update evaluation state and clear thinking when engine reports', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { result } = renderHook(() => useStockfish(fen));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const mockEval: EngineEvaluation = { score: 50, isMate: false, depth: 10, multipv: 1 };

    act(() => {
      if (mockCallback) mockCallback(mockEval);
    });

    expect(result.current.evaluation).toEqual(mockEval);
    expect(result.current.isThinking).toBe(false);
  });

  it('should re-analyze when FEN changes', () => {
    const { rerender } = renderHook(({ fen }) => useStockfish(fen), {
      initialProps: { fen: 'startpos' },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAnalyze).toHaveBeenCalledWith('startpos', 18, expect.any(Function));

    const newFen = 'e4';
    rerender({ fen: newFen });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAnalyze).toHaveBeenCalledWith(newFen, 18, expect.any(Function));
  });

  it('should terminate engine on unmount', () => {
    const { unmount } = renderHook(() => useStockfish('startpos'));
    
    unmount();
    expect(mockTerminate).toHaveBeenCalled();
  });
});