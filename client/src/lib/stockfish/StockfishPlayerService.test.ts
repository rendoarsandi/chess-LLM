import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockWorker = new MockWorker()
    service = new StockfishPlayerService(mockWorker as unknown as Worker)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize a worker', () => {
    expect(service).toBeDefined()
    expect(service.getIsTerminated()).toBe(false)
  })

  it('should resolve calculateMove when bestmove is received', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    // Advance 100ms for UCI handshake init
    vi.advanceTimersByTime(100)

    mockWorker.simulateMessage('uciok')
    mockWorker.simulateMessage('readyok')

    const movePromise = service.calculateMove(fen, 10)

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
