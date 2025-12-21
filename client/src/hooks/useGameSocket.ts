import { useState, useEffect, useCallback, useRef } from 'react'

export interface GameUpdate {
  fen: string
  status: 'ongoing' | 'completed' | 'draw'
  winnerId: string | null
  gameOverReason: string | null
  san: string
  pgn: string
}

export type SocketMessage = 
  | { type: 'UPDATE'; fen: string; status: any; winnerId: any; gameOverReason: any; san: string; pgn: string }
  | { type: 'STATUS'; status: 'thinking' | 'idle' }
  | { type: 'SPECTATORS'; count: number }
  | { type: 'GAME_STARTED'; gameId: string }

export function useGameSocket(gameId: string | undefined) {
  const [lastUpdate, setLastUpdate] = useState<GameUpdate | null>(null)
  const [thinkingStatus, setThinkingStatus] = useState<'thinking' | 'idle'>('idle')
  const [spectatorCount, setSpectatorCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!gameId) return
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    // In development, if using Vite proxy, this might need adjustment 
    // but typically /ws will be proxied to the backend port.
    const wsUrl = `${protocol}//${host}/ws?gameId=${gameId}`

    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      console.log(`[WebSocket] Connected to game ${gameId}`)
    }

    socket.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data)
        switch (message.type) {
          case 'UPDATE':
            setLastUpdate({
              fen: message.fen,
              status: message.status,
              winnerId: message.winnerId,
              gameOverReason: message.gameOverReason,
              san: message.san,
              pgn: message.pgn
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

    socket.onclose = () => {
      setIsConnected(false)
      socketRef.current = null
      console.log(`[WebSocket] Disconnected from game ${gameId}`)
      // Reconnect after 3 seconds
      setTimeout(connect, 3000)
    }

    socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
      socket.close()
    }
  }, [gameId])

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
    isConnected
  }
}
