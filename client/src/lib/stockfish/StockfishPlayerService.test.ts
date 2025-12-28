import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StockfishPlayerService } from './StockfishPlayerService'

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  addEventListener = vi.fn()

  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }
}

vi.stubGlobal('Worker', MockWorker)

describe('StockfishPlayerService', () => {
  let service: StockfishPlayerService
  let mockWorker: MockWorker

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorker = new MockWorker()
    service = new StockfishPlayerService(mockWorker as unknown as Worker)
  })

  it('should initialize a worker', () => {
    expect(service).toBeDefined()
    expect(service.getIsTerminated()).toBe(false)
  })

  it('should resolve calculateMove when bestmove is received', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    // We need to trigger initialization sequence
    mockWorker.simulateMessage('uciok')
    mockWorker.simulateMessage('readyok')

    // Wait for initialization to complete in the service
    await new Promise((resolve) => setTimeout(resolve, 150)) // Increased timeout for reliable test

    const movePromise = service.calculateMove(fen, 10)

    // Give it a moment to send messages
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockWorker.postMessage).toHaveBeenCalledWith(`position fen ${fen}`)
    expect(mockWorker.postMessage).toHaveBeenCalledWith('go depth 10')

    mockWorker.simulateMessage('bestmove e2e4')

    const move = await movePromise
    expect(move).toBe('e2e4')
  })

  it('should terminate the worker on cleanup', () => {
    service.terminate()
    expect(mockWorker.terminate).toHaveBeenCalled()
    expect(service.getIsTerminated()).toBe(true)
  })
})
