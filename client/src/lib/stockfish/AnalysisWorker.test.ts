import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalysisWorker } from './AnalysisWorker'

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }
}

vi.stubGlobal('Worker', MockWorker)

describe('AnalysisWorker', () => {
  let worker: AnalysisWorker
  let mockWorker: MockWorker

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorker = new MockWorker()
    worker = new AnalysisWorker(mockWorker as unknown as Worker)
  })

  it('should analyze a position and return multi-pv results', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    mockWorker.simulateMessage('uciok')
    mockWorker.simulateMessage('readyok')

    const analysisPromise = worker.analyzePosition(fen, 10, 3)

    // Simulate Stockfish output
    mockWorker.simulateMessage(
      'info depth 1 seldepth 1 multipv 1 score cp 35 nodes 20 nps 20000 pv e2e4',
    )
    mockWorker.simulateMessage(
      'info depth 1 seldepth 1 multipv 2 score cp 20 nodes 20 nps 20000 pv d2d4',
    )
    mockWorker.simulateMessage(
      'info depth 1 seldepth 1 multipv 3 score cp 15 nodes 20 nps 20000 pv g1f3',
    )
    // ... more depth ...
    mockWorker.simulateMessage(
      'info depth 10 seldepth 15 multipv 1 score cp 40 nodes 1000 nps 100000 pv e2e4 e7e5',
    )
    mockWorker.simulateMessage(
      'info depth 10 seldepth 15 multipv 2 score cp 25 nodes 1000 nps 100000 pv d2d4 d7d5',
    )
    mockWorker.simulateMessage(
      'info depth 10 seldepth 15 multipv 3 score cp 10 nodes 1000 nps 100000 pv g1f3 d7d5',
    )
    mockWorker.simulateMessage('bestmove e2e4 ponder e7e5')

    const result = await analysisPromise

    expect(result.bestMove).toBe('e2e4')
    expect(result.pvs.length).toBe(3)
    expect(result.pvs[0].cp).toBe(40)
    expect(result.pvs[0].pv).toBe('e2e4 e7e5')
    expect(result.pvs[1].cp).toBe(25)
    expect(result.pvs[2].cp).toBe(10)
  })

  it('should handle mate scores', async () => {
    const fen = 'k7/8/K7/8/8/8/8/1R6 w - - 0 1' // Simple mate in 1

    mockWorker.simulateMessage('uciok')
    mockWorker.simulateMessage('readyok')

    const analysisPromise = worker.analyzePosition(fen, 10, 1)

    mockWorker.simulateMessage('info depth 1 multipv 1 score mate 1 pv b1b8')
    mockWorker.simulateMessage('bestmove b1b8')

    const result = await analysisPromise
    expect(result.pvs[0].mate).toBe(1)
    expect(result.pvs[0].cp).toBeUndefined()
  })

  it('should handle termination', () => {
    worker.terminate()
    expect(mockWorker.terminate).toHaveBeenCalled()
    expect(worker.getIsTerminated()).toBe(true)
    expect(worker.analyzePosition('fen')).rejects.toThrow('Worker terminated')
  })

  it('should handle malformed info lines', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    mockWorker.simulateMessage('uciok')
    mockWorker.simulateMessage('readyok')

    const analysisPromise = worker.analyzePosition(fen, 10, 1)

    // Missing 'pv' keyword
    mockWorker.simulateMessage('info depth 1 score cp 10 nodes 100')
    // Missing other keys
    mockWorker.simulateMessage('info pv e2e4')

    mockWorker.simulateMessage('bestmove e2e4')
    const result = await analysisPromise
    expect(result.pvs.length).toBe(0)
  })
})
