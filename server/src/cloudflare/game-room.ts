/// <reference types="@cloudflare/workers-types" />

import { CloudflareEnv } from './env'

type WebSocketMessageBody = string | ArrayBuffer

export class GameRoom {
  constructor(
    private state: DurableObjectState,
    env: CloudflareEnv,
  ) {
    void env
  }

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.state.acceptWebSocket(server)
    this.broadcastSpectatorCount()

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(sender: WebSocket, message: WebSocketMessageBody) {
    const payload = typeof message === 'string' ? message : new TextDecoder().decode(message)

    for (const socket of this.state.getWebSockets()) {
      if (socket !== sender) {
        socket.send(payload)
      }
    }
  }

  async webSocketClose() {
    this.broadcastSpectatorCount()
  }

  async webSocketError() {
    this.broadcastSpectatorCount()
  }

  private broadcastSpectatorCount() {
    const sockets = this.state.getWebSockets()
    const payload = JSON.stringify({ type: 'SPECTATORS', count: sockets.length })

    for (const socket of sockets) {
      socket.send(payload)
    }
  }
}
