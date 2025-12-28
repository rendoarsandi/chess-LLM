import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { StockfishWorker } from './StockfishWorker'
import type { EngineEvaluation } from './StockfishWorker'
import { safeNewChess } from '../chess-utils'

export function useStockfish(fen: string | null, onBestMove?: (move: string) => void) {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null)
  const [variations, setVariations] = useState<Record<number, EngineEvaluation>>({})
  const [isThinking, setIsThinking] = useState(false)
  const engineRef = useRef<StockfishWorker | null>(null)
  const activeFenRef = useRef<string | null>(null)
  const lastEvaluatedFenRef = useRef<string | null>(null)
  const STABILITY_THRESHOLD = 10

  const onEngineMessage = useCallback((evalData: EngineEvaluation) => {
    const currentFen = activeFenRef.current
    if (!currentFen) return

    const isNewFen = currentFen !== lastEvaluatedFenRef.current

    // If it's a new FEN, wait for stability before clearing/replacing the old data
    if (isNewFen && evalData.depth < STABILITY_THRESHOLD) {
      return
    }

    // If we reached stability for the new FEN, or it's an update for the already stable FEN
    if (isNewFen && evalData.depth >= STABILITY_THRESHOLD) {
      lastEvaluatedFenRef.current = currentFen
      // Clear variations entirely when we transition to the new FEN
      setVariations({ [evalData.multipv || 1]: evalData })
    } else {
      // Normal update for current stable FEN
      setVariations((prev) => ({
        ...prev,
        [evalData.multipv || 1]: evalData,
      }))
    }

    if (evalData.multipv === 1) {
      setEvaluation(evalData)
    }
  }, [])

  const handleBestMove = useCallback(
    (move: string) => {
      setIsThinking(false)
      if (onBestMove) onBestMove(move)
    },
    [onBestMove],
  )

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new StockfishWorker(onEngineMessage, 3, handleBestMove)
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate()
        engineRef.current = null
      }
    }
  }, [onEngineMessage, handleBestMove])

  useEffect(() => {
    if (fen && engineRef.current && fen !== activeFenRef.current) {
      activeFenRef.current = fen

      // Immediate detection of terminal positions
      try {
        const chess = safeNewChess(fen)
        if (chess.isGameOver()) {
          const sideToMove = fen.split(' ')[1] as 'w' | 'b'

          setTimeout(() => {
            const finalEval = chess.isCheckmate()
              ? { score: 0, isMate: true, mateIn: 0, depth: 0, sideToMove }
              : { score: 0, isMate: false, depth: 0, sideToMove }

            setEvaluation(finalEval)
            setVariations({ 1: finalEval })
            setIsThinking(false)
          }, 0)
          return
        }
      } catch (e) {
        console.warn('[useStockfish] Invalid FEN:', fen, e)
      }

      setTimeout(() => setIsThinking(true), 0)

      const timeoutId = setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.analyze(fen, 18)
        }
      }, 150) // Reduced delay slightly for better responsiveness

      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [fen])

  const getBestMove = useCallback((fen: string, depth: number = 18) => {
    if (engineRef.current) {
      setIsThinking(true)
      engineRef.current.getBestMove(fen, depth)
    }
  }, [])

  const sortedVariations = useMemo(() => {
    return Object.values(variations).sort((a, b) => (a.multipv || 1) - (b.multipv || 1))
  }, [variations])

  return {
    evaluation,
    variations: sortedVariations,
    isThinking,
    getBestMove,
  }
}
