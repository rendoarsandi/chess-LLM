import { WebSocketServer } from 'ws'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { LocalPlatform } from './local-platform'

interface UpgradeServer {
  on(
    event: 'upgrade',
    listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void,
  ): unknown
}

export function attachLiveSockets(server: UpgradeServer, platform: LocalPlatform) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 })
  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return
    const match = url.pathname.match(/^\/api\/runs\/([0-9a-f-]{36})\/live$/i)
    if (!match || !(await platform.getRun(match[1]))) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n')
      return
    }
    sockets.handleUpgrade(request, socket, head, (connection) => {
      const unsubscribe = platform.subscribe(match[1], (event) => {
        if (connection.readyState === 1) connection.send(JSON.stringify(event))
      })
      connection.on('message', (message) => {
        if (message.toString() === 'ping') connection.send('{"type":"pong"}')
      })
      connection.on('close', unsubscribe)
      connection.on('error', unsubscribe)
    })
  })
  return sockets
}
