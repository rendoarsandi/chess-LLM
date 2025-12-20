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

  it('should initialize with UCI command', () => {
    expect(activeWorker.postMessage).toHaveBeenCalledWith('uci');
  });

  it('should send isready after uciok', () => {
    activeWorker.simulateMessage('uciok');
    expect(activeWorker.postMessage).toHaveBeenCalledWith('isready');
  });

  it('should parse CP scores correctly', () => {
    activeWorker.simulateMessage('uciok');
    activeWorker.simulateMessage('readyok');
    
    // Start an analysis to set current generation
    worker.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10);
    
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
    activeWorker.simulateMessage('uciok');
    activeWorker.simulateMessage('readyok');
    worker.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10);

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
    activeWorker.simulateMessage('uciok');
    activeWorker.simulateMessage('readyok');
    
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    worker.analyze(fen, 1000);

    expect(activeWorker.postMessage).toHaveBeenCalledWith(`position fen ${fen}`);
    expect(activeWorker.postMessage).toHaveBeenCalledWith('go depth 1000');
  });

  it('should normalize scores for Black perspective', () => {
    activeWorker.simulateMessage('uciok');
    activeWorker.simulateMessage('readyok');

    // FEN with Black to move
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    worker.analyze(fen, 10);
    
    // If Stockfish says +50 for Black to move, it means Black is +0.5
    // Normalized to White-relative, it should be -50
    const infoMessage = 'info depth 10 score cp 50 pv e7e5';
    activeWorker.simulateMessage(infoMessage);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      score: -50,
      sideToMove: 'b'
    }));
  });

  it('should normalize mate for Black perspective', () => {
    activeWorker.simulateMessage('uciok');
    activeWorker.simulateMessage('readyok');

    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    worker.analyze(fen, 10);
    
    // Mate in 3 for Black
    const infoMessage = 'info depth 10 score mate 3 pv f7f5';
    activeWorker.simulateMessage(infoMessage);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      isMate: true,
      mateIn: -3,
      sideToMove: 'b'
    }));
  });

  it('should wait for bestmove after stop before starting next analysis', () => {
    activeWorker.simulateMessage('uciok');
    activeWorker.simulateMessage('readyok');

    const fen1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    worker.analyze(fen1, 10);
    expect(activeWorker.postMessage).toHaveBeenCalledWith(`position fen ${fen1}`);
    expect(activeWorker.postMessage).toHaveBeenCalledWith('go depth 10');

    const fen2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    worker.analyze(fen2, 10);
    
    // Should have sent stop but NOT the new position yet
    expect(activeWorker.postMessage).toHaveBeenCalledWith('stop');
    expect(activeWorker.postMessage).not.toHaveBeenCalledWith(`position fen ${fen2}`);

    // Simulate bestmove from the first search
    activeWorker.simulateMessage('bestmove e2e4');

    // Now it should have processed the queue
    expect(activeWorker.postMessage).toHaveBeenCalledWith(`position fen ${fen2}`);
    expect(activeWorker.postMessage).toHaveBeenCalledWith('go depth 10');
  });

  it('should terminate the worker', () => {
    worker.terminate();
    expect(activeWorker.terminate).toHaveBeenCalled();
  });
});