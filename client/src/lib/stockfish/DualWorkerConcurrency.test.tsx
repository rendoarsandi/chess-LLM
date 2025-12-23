import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStockfish } from './useStockfish';
import { StockfishPlayerService } from './StockfishPlayerService';

// Mock Worker
class MockWorkerInstance {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();

  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

const activeWorkers: MockWorkerInstance[] = [];
const MockWorkerSpy = vi.fn().mockImplementation(function () {
  const w = new MockWorkerInstance();
  activeWorkers.push(w);
  return w;
});

vi.stubGlobal('Worker', MockWorkerSpy);

describe('Dual Worker Concurrency', () => {
  beforeEach(() => {
    activeWorkers.length = 0;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should allow both workers to run simultaneously without interference', async () => {
    // 1. Initialize useStockfish (Analysis Worker)
    const { result } = renderHook(() => useStockfish('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
    
    // 2. Initialize StockfishPlayerService (Player Worker)
    const playerService = new StockfishPlayerService();

    // Verify two distinct workers were created
    expect(activeWorkers.length).toBe(2);
    const analysisWorker = activeWorkers[0];
    const playerWorker = activeWorkers[1];

    // Initialize both (UCI handshake)
    analysisWorker.simulateMessage('uciok');
    analysisWorker.simulateMessage('readyok');
    playerWorker.simulateMessage('uciok');
    playerWorker.simulateMessage('readyok');

    // Wait for the 250ms debounce in useStockfish
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // 3. Start move calculation on Player Worker
    const movePromise = playerService.calculateMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10);

    // Player worker should have received position and go commands
    expect(playerWorker.postMessage).toHaveBeenCalledWith(expect.stringContaining('position fen'));
    expect(playerWorker.postMessage).toHaveBeenCalledWith('go depth 10');

    // 4. Send analysis updates on Analysis Worker while Player is "thinking"
    await act(async () => {
      analysisWorker.simulateMessage('info depth 10 score cp 15 multipv 1 pv e2e4');
    });
    
    expect(result.current.evaluation?.score).toBe(15);

    // 5. Complete Player calculation
    await act(async () => {
      playerWorker.simulateMessage('bestmove e2e4');
    });
    const move = await movePromise;
    expect(move).toBe('e2e4');

    // 6. Verify Analysis worker can still send updates
    await act(async () => {
      analysisWorker.simulateMessage('info depth 11 score cp 20 multipv 1 pv e2e4');
    });
    expect(result.current.evaluation?.score).toBe(20);

    playerService.terminate();
  });
});
