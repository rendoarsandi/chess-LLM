import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockfishPlayerService } from './StockfishPlayerService';

// Mock Worker
class MockWorker {
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

vi.stubGlobal('Worker', MockWorker);

describe('StockfishPlayerService', () => {
  let service: StockfishPlayerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StockfishPlayerService();
  });

  it('should initialize a worker', () => {
    expect(service).toBeDefined();
    expect((service as any).worker).toBeInstanceOf(MockWorker);
  });

  it('should resolve calculateMove when bestmove is received', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    // We need to trigger initialization sequence
    const mockWorker = (service as any).worker;
    mockWorker.simulateMessage('uciok');
    mockWorker.simulateMessage('readyok');

    // Wait for initialization to complete in the service
    await new Promise(resolve => setTimeout(resolve, 50));

    const movePromise = service.calculateMove(fen, 10);

    // Give it a moment to send messages
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockWorker.postMessage).toHaveBeenCalledWith(`position fen ${fen}`);
    expect(mockWorker.postMessage).toHaveBeenCalledWith('go depth 10');

    mockWorker.simulateMessage('bestmove e2e4');

    const move = await movePromise;
    expect(move).toBe('e2e4');
  });

  it('should terminate the worker on cleanup', () => {
    const mockWorker = (service as any).worker;
    service.terminate();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
