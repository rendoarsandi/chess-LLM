import { useState, useEffect, useCallback, useRef } from 'react'

export interface GameUpdate {
  fen: string
  status: 'ongoing' | 'completed' | 'draw' | 'paused'
  winnerId: string | null
  gameOverReason: string | null
  san: string
  pgn: string
}

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
      constraints: { depth: number; skillLevel?: number; movetime?: number }
    }

export type ClientMessage = { type: 'SUBMIT_MOVE'; gameId: string; move: string }

export function useGameSocket(gameId: string | undefined) {
  const [lastUpdate, setLastUpdate] = useState<GameUpdate | null>(null)
  const [thinkingStatus, setThinkingStatus] = useState<'thinking' | 'idle'>('idle')
  const [spectatorCount, setSpectatorCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const connectRef = useRef<(() => void) | null>(null)

  const sendMessage = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message))
    }
  }, [])

  const connect = useCallback(() => {
    if (!gameId) {
      return
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    let host = window.location.host
    // Normalize 0.0.0.0 to localhost for browsers that don't like 0.0.0.0 in WS URLs
    if (host.startsWith('0.0.0.0')) {
      host = host.replace('0.0.0.0', 'localhost')
    }
    // If we are on the Vite dev port, target the backend port directly for WS
    if (host.includes(':5173')) {
      host = host.replace(':5173', ':3001')
    }
    const wsUrl = `${protocol}//${host}/ws?gameId=${gameId}`
    console.log(`[WebSocket] Connecting to: ${wsUrl}`)

    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      console.log(`[WebSocket] Connected to game ${gameId}`)
    }

    socket.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data)
        setLastMessage(message)
        switch (message.type) {
          case 'UPDATE':
            setLastUpdate({
              fen: message.fen,
              status: message.status,
              winnerId: message.winnerId,
              gameOverReason: message.gameOverReason,
              san: message.san,
              pgn: message.pgn,
            })
            setThinkingStatus('idle')
            break
          case 'STATUS':
            setThinkingStatus(message.status)
            break
          case 'SPECTATORS':
            setSpectatorCount(message.count)
            break
        }
      } catch (e) {
        console.error('[WebSocket] Error parsing message:', e)
      }
    }

    socket.onclose = (event) => {
      setIsConnected(false)
      socketRef.current = null
      console.log(
        `[WebSocket] Disconnected from game ${gameId}. Code: ${event.code}, Reason: ${event.reason}`,
      )
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (connectRef.current) connectRef.current()
      }, 3000)
    }

    socket.onerror = () => {
      // WebSocket error events are generic and don't contain much info,
      // but we can at least log that it occurred.
      console.error('[WebSocket] Error occurred on connection to:', wsUrl)
      // Don't close manually here, as onclose will be triggered anyway if it's fatal
    }
  }, [gameId])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [connect])

  return {
    lastUpdate,
    thinkingStatus,
    spectatorCount,
    isConnected,
    sendMessage,
    lastMessage,
  }
}
