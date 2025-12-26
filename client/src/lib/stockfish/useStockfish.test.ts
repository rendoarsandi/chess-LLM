/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStockfish } from './useStockfish';
import type { EngineEvaluation } from './StockfishWorker';

// Mock StockfishWorker
const mockAnalyze = vi.fn();
const mockGetBestMove = vi.fn();
const mockTerminate = vi.fn();
let mockCallback: ((evaluation: EngineEvaluation) => void) | null = null;
let mockBestMoveCallback: ((move: string) => void) | null = null;

vi.mock('./StockfishWorker', () => {
  return {
    StockfishWorker: class {
      constructor(
        callback: (evaluation: EngineEvaluation) => void, 
        _multiPv: number,
        onBestMove?: (move: string) => void
      ) {
        mockCallback = callback;
        mockBestMoveCallback = onBestMove || null;
      }
      analyze = mockAnalyze;
      getBestMove = mockGetBestMove;
      terminate = mockTerminate;
    },
  };
});

describe('useStockfish', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCallback = null;
    mockBestMoveCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize engine and analyze FEN after debounce', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { result } = renderHook(() => useStockfish(fen));

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isThinking).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAnalyze).toHaveBeenCalledWith(fen, 18);
  });

  it('should update evaluation state when engine reports info', () => {
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
  });

  it('should clear thinking when engine reports bestmove', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { result } = renderHook(() => useStockfish(fen));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isThinking).toBe(true);

    act(() => {
      if (mockBestMoveCallback) mockBestMoveCallback('e2e4');
    });

    expect(result.current.isThinking).toBe(false);
  });

  it('should re-analyze when FEN changes', () => {
    const { rerender } = renderHook(({ fen }) => useStockfish(fen), {
      initialProps: { fen: 'startpos' },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAnalyze).toHaveBeenCalledWith('startpos', 18);

    const newFen = 'e4';
    rerender({ fen: newFen });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAnalyze).toHaveBeenCalledWith(newFen, 18);
  });

  it('should terminate engine on unmount', () => {
    const { unmount } = renderHook(() => useStockfish('startpos'));
    
    unmount();
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('should detect terminal FEN immediately without engine analysis', () => {
    // Fool's mate position (White is checkmated)
    const checkmateFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1';
    const { result } = renderHook(() => useStockfish(checkmateFen));

    act(() => {
      vi.advanceTimersByTime(0);
    });

    // Should update immediately (no need to wait for debounce)
    expect(result.current.evaluation).toEqual(expect.objectContaining({
      isMate: true,
      mateIn: 0,
      sideToMove: 'w'
    }));
    expect(result.current.isThinking).toBe(false);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });
});