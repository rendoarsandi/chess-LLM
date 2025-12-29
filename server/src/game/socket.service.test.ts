import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SocketService } from './socket.service'
import { WSContext } from 'hono/ws'

describe('SocketService', () => {
  let socketService: SocketService
  let mockWs: WSContext

  beforeEach(() => {
    socketService = new SocketService()
    mockWs = {
      send: vi.fn(),
    } as unknown as WSContext
  })

  it('should allow joining a room and broadcast spectator count', () => {
    socketService.joinRoom('game1', mockWs)
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'SPECTATORS', count: 1 }))
  })

  it('should broadcast messages to all clients in a room', () => {
    const mockWs2 = { send: vi.fn() } as unknown as WSContext
    socketService.joinRoom('game1', mockWs)
    socketService.joinRoom('game1', mockWs2)

    const message = {
      type: 'UPDATE' as const,
      fen: 'some-fen',
      status: 'ongoing' as const,
      winnerId: null,
      gameOverReason: null,
      san: 'e4',
      pgn: '1. e4',
    }
    socketService.broadcast('game1', message)

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message))
    expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message))
  })

  it('should update spectator count when leaving a room', () => {
    const mockWs2 = { send: vi.fn() } as unknown as WSContext
    socketService.joinRoom('game1', mockWs)
    socketService.joinRoom('game1', mockWs2)

    // Clear initial spectator count calls
    vi.mocked(mockWs.send).mockClear()
    vi.mocked(mockWs2.send).mockClear()

    socketService.leaveRoom('game1', mockWs)

    expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'SPECTATORS', count: 1 }))
  })
})
