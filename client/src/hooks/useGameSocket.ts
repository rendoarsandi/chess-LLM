import { useState, useEffect, useCallback, useRef } from 'react'

const RECONNECT_DELAY_MS = 3000

export interface GameUpdate {
  fen: string
  status: 'ongoing' | 'completed' | 'draw' | 'paused'
  winnerId: string | null
  gameOverReason: string | null
  san: string
  pgn: string
}

export interface ChatMessage {
  username: string
  message: string
  timestamp: number
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
  | { type: 'CHAT'; username: string; message: string; timestamp: number }
  | { type: 'UPDATE_TRIGGER' }

export type ClientMessage =
  | { type: 'SUBMIT_MOVE'; gameId: string; move: string }
  | { type: 'CHAT'; gameId: string; username: string; message: string }

export function useGameSocket(gameId: string | undefined) {
  const [lastUpdate, setLastUpdate] = useState<GameUpdate | null>(null)
  const [thinkingStatus, setThinkingStatus] = useState<'thinking' | 'idle'>('idle')
  const [spectatorCount, setSpectatorCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const [prevGameId, setPrevGameId] = useState<string | undefined>(gameId)
  if (gameId !== prevGameId) {
    setPrevGameId(gameId)
    setChatMessages([])
  }
  
  const socketRef = useRef<WebSocket | null>(null)
  const connectRef = useRef<(() => void) | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        const msg = JSON.parse(event.data) as SocketMessage
        setLastMessage(msg)

        if (msg.type === 'UPDATE') {
          setLastUpdate({
            fen: msg.fen,
            status: msg.status,
            winnerId: msg.winnerId,
            gameOverReason: msg.gameOverReason,
            san: msg.san,
            pgn: msg.pgn,
          })
          setThinkingStatus('idle')
        } else if (msg.type === 'STATUS') {
          setThinkingStatus(msg.status)
        } else if (msg.type === 'SPECTATORS') {
          setSpectatorCount(msg.count)
        } else if (msg.type === 'CHAT') {
          setChatMessages((prev) => [
            ...prev,
            {
              username: msg.username,
              message: msg.message,
              timestamp: msg.timestamp || Date.now(),
            },
          ])
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err)
      }
    }

    socket.onclose = (event) => {
      setIsConnected(false)
      socketRef.current = null
      console.log(
        `[WebSocket] Disconnected from game ${gameId}. Code: ${event.code}, Reason: ${event.reason}`,
      )
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        if (connectRef.current) connectRef.current()
      }, RECONNECT_DELAY_MS)
    }

    socket.onerror = () => {
      console.error('[WebSocket] Error occurred on connection to:', wsUrl)
    }
  }, [gameId])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      // Clear reconnect timeout on cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
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
    lastMessage,
    chatMessages,
    sendMessage,
  }
}
