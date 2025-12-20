import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { StockfishWorker, type EngineEvaluation } from './StockfishWorker';

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();

  // Helper to simulate message from Stockfish
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

vi.stubGlobal('Worker', MockWorker);

describe('StockfishWorker', () => {
  let worker: StockfishWorker;
  let mockCallback: Mock<(evaluation: EngineEvaluation) => void>;
  let activeWorker: MockWorker;

  beforeEach(() => {
    mockCallback = vi.fn();
    worker = new StockfishWorker(mockCallback);
    activeWorker = (worker as unknown as { worker: MockWorker }).worker;
  });

  it('should initialize with UCI commands', () => {
    expect(activeWorker.postMessage).toHaveBeenCalledWith('uci');
    expect(activeWorker.postMessage).toHaveBeenCalledWith('isready');
  });

  it('should parse CP scores correctly', () => {
    const infoMessage = 'info depth 10 seldepth 12 multipv 1 score cp 13 nodes 14041 nps 1404100 hashfull 0 tbhits 0 time 10 pv e2e4';
    activeWorker.simulateMessage(infoMessage);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      score: 13,
      isMate: false,
      mateIn: undefined,
      depth: 10,
    }));
  });

  it('should parse mate scores correctly', () => {
    const infoMessage = 'info depth 5 score mate 3 nodes 100 pv e2e4';
    activeWorker.simulateMessage(infoMessage);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      score: 0,
      isMate: true,
      mateIn: 3,
      depth: 5,
    }));
  });

  it('should send analyze commands correctly', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    worker.analyze(fen, 1000);

    expect(activeWorker.postMessage).toHaveBeenCalledWith('stop');
    expect(activeWorker.postMessage).toHaveBeenCalledWith(`position fen ${fen}`);
    expect(activeWorker.postMessage).toHaveBeenCalledWith('go depth 1000');
  });

  it('should terminate the worker', () => {
    worker.terminate();
    expect(activeWorker.terminate).toHaveBeenCalled();
  });
});
