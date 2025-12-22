import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGameBot } from './useGameBot'
import { StockfishPlayerService } from '../lib/stockfish/StockfishPlayerService'

const mockPlayerServiceInstance = {
  calculateMove: vi.fn(),
  terminate: vi.fn()
}

vi.mock('../lib/stockfish/StockfishPlayerService', () => {
  return {
    StockfishPlayerService: vi.fn().mockImplementation(function() {
      return mockPlayerServiceInstance;
    })
  }
})

describe('useGameBot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlayerServiceInstance.calculateMove.mockReset()
    mockPlayerServiceInstance.terminate.mockReset()
  })

  it('should not initialize if not enabled', () => {
    renderHook(() => useGameBot('game-1', null, vi.fn(), false))
    expect(StockfishPlayerService).not.toHaveBeenCalled()
  })

  it('should initialize and terminate player service', () => {
    const { unmount } = renderHook(() => useGameBot('game-1', null, vi.fn(), true))
    expect(StockfishPlayerService).toHaveBeenCalled()
    unmount()
    expect(mockPlayerServiceInstance.terminate).toHaveBeenCalled()
  })

  it('should calculate and submit move when REQUEST_MOVE is received', async () => {
    mockPlayerServiceInstance.calculateMove.mockResolvedValue('e2e4')

    const gameId = 'game-1'
    const sendMessage = vi.fn()
    const lastMessage = {
      type: 'REQUEST_MOVE' as const,
      gameId: 'game-1',
      fen: 'startpos',
      constraints: { depth: 10 }
    }

    const { rerender } = renderHook(
      ({ lastMsg }) => useGameBot(gameId, lastMsg, sendMessage, true),
      { initialProps: { lastMsg: null as any } }
    )

    // Trigger message
    rerender({ lastMsg: lastMessage })

    // Wait for promise resolution
    await vi.waitFor(() => {
      expect(mockPlayerServiceInstance.calculateMove).toHaveBeenCalledWith('startpos', 10)
      expect(sendMessage).toHaveBeenCalledWith({
        type: 'SUBMIT_MOVE',
        gameId: 'game-1',
        move: 'e2e4'
      })
    })
  })
})
