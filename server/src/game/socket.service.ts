import { WSContext } from 'hono/ws'

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

  broadcast(gameId: string, message: any) {
    const room = this.rooms.get(gameId)
    if (room) {
      const payload = JSON.stringify(message)
      room.forEach((ws) => {
        try {
          ws.send(payload)
        } catch {
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
