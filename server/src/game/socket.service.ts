import { WSContext } from 'hono/ws'

export type SocketMessage =
  | {
      type: 'UPDATE'
      fen: string
      status: 'ongoing' | 'completed' | 'draw' | 'paused'
      winnerId: string | null
      gameOverReason: string | null
      san: string
      pgn: string
    }
  | { type: 'STATUS'; status: 'thinking' | 'idle' }
  | { type: 'SPECTATORS'; count: number }
  | { type: 'GAME_STARTED'; gameId: string }
  | {
      type: 'REQUEST_MOVE'
      gameId: string
      fen: string
      constraints: { depth: number; movetime?: number }
    }

export class SocketService {
  private rooms: Map<string, Set<WSContext>> = new Map()

  joinRoom(gameId: string, ws: WSContext) {
    if (!this.rooms.has(gameId)) {
      this.rooms.set(gameId, new Set())
    }
    this.rooms.get(gameId)!.add(ws)
    this.broadcastSpectatorCount(gameId)
  }

  leaveRoom(gameId: string, ws: WSContext) {
    const room = this.rooms.get(gameId)
    if (room) {
      room.delete(ws)
      if (room.size === 0) {
        this.rooms.delete(gameId)
      } else {
        this.broadcastSpectatorCount(gameId)
      }
    }
  }

  broadcast(gameId: string, message: SocketMessage) {
    const room = this.rooms.get(gameId)
    if (room) {
      const payload = JSON.stringify(message)
      room.forEach((ws) => {
        try {
          ws.send(payload)
        } catch (e) {
          console.error(`[SocketService] Failed to send message to client in room ${gameId}:`, e)
          // Handle cases where socket might be closed but still in our set
          room.delete(ws)
        }
      })
    }
  }

  private broadcastSpectatorCount(gameId: string) {
    const count = this.rooms.get(gameId)?.size || 0
    this.broadcast(gameId, { type: 'SPECTATORS', count })
  }
}
