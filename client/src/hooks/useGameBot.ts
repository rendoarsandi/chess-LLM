import { useEffect, useRef } from 'react'
import { StockfishPlayerService } from '../lib/stockfish/StockfishPlayerService'
import type { SocketMessage, ClientMessage } from './useGameSocket'

export function useGameBot(
  gameId: string | undefined,
  lastMessage: SocketMessage | null,
  sendMessage: (message: ClientMessage) => void,
  enabled: boolean = true,
) {
  const playerServiceRef = useRef<StockfishPlayerService | null>(null)

  useEffect(() => {
    if (enabled && !playerServiceRef.current) {
      playerServiceRef.current = new StockfishPlayerService()
    }
    return () => {
      if (playerServiceRef.current) {
        playerServiceRef.current.terminate()
        playerServiceRef.current = null
      }
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !gameId || !lastMessage || !playerServiceRef.current) return

    if (lastMessage.type === 'REQUEST_MOVE' && lastMessage.gameId === gameId) {
      const { fen, constraints } = lastMessage

      console.log(`[GameBot] Received REQUEST_MOVE for game ${gameId}, FEN: ${fen}`)

      playerServiceRef.current
        .calculateMove(fen, constraints.depth, constraints.skillLevel, constraints.movetime)
        .then((move) => {
          console.log(`[GameBot] Calculated move: ${move}`)
          sendMessage({
            type: 'SUBMIT_MOVE',
            gameId,
            move,
          })
        })
        .catch((err) => {
          if (err.message === 'Request cancelled by a newer move request') {
            console.log(`[GameBot] Move request for game ${gameId} was superseded.`)
          } else {
            console.error(`[GameBot] Error calculating move:`, err)
          }
        })
    }
  }, [gameId, lastMessage, enabled, sendMessage])
}
