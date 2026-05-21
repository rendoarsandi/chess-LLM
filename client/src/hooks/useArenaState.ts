import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { clearHistory } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGamesQuery,
  useGameQuery,
  useMovesQuery,
  usePlayersQuery,
  useLeaderboardQuery,
  useCreateGameMutation,
  useDeleteGameMutation,
  usePauseGameMutation,
  useResumeGameMutation,
} from './queries'
import { useGameSocket } from './useGameSocket'
import { useGameBot } from './useGameBot'
import { useAnalysisWorker } from './useAnalysisWorker'
import { useStockfish } from '../lib/stockfish/useStockfish'
import { generate960Fen, safeNewChess } from '../lib/chess-utils'
import { STOCKFISH_LOW_ID, STOCKFISH_MED_ID } from '../lib/constants'
import { toast } from 'sonner'
import { playMoveSound, soundManager } from '../lib/audio'
import type { Game, Move } from '@/types'

export function useArenaState() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024)
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null)
  const [showResultOverlay, setShowResultOverlay] = useState(true)
  const [lastMoveFromUpdate, setLastMoveFromUpdate] = useState<{ from: string; to: string } | null>(
    null,
  )
  const [whitePlayerId, setWhitePlayerId] = useState(STOCKFISH_LOW_ID)
  const [blackPlayerId, setBlackPlayerId] = useState(STOCKFISH_MED_ID)

  // Extract game ID from path
  const segments = location.pathname.split('/').filter(Boolean)
  const pathGameId = segments[0] === 'arena' ? segments[1] : undefined

  // Queries
  const { data: games = [] } = useGamesQuery()
  const { data: players = [] } = usePlayersQuery()
  const { data: leaderboard = [] } = useLeaderboardQuery()
  const { data: selectedGame = null } = useGameQuery(pathGameId)
  const { data: dbMoves = [] } = useMovesQuery(selectedGame?.id)

  const [moves, setMoves] = useState<Move[]>([])

  // Mutations
  const createGameMutation = useCreateGameMutation()
  const deleteGameMutation = useDeleteGameMutation()
  const pauseGameMutation = usePauseGameMutation()
  const resumeGameMutation = useResumeGameMutation()

  useEffect(() => {
    setMoves(dbMoves)
  }, [dbMoves])

  const { lastUpdate, thinkingStatus, spectatorCount, lastMessage, chatMessages, sendMessage } = useGameSocket(
    selectedGame?.id,
  )
  const lastProcessedFenRef = useRef<string | null>(null)

  const searchParams = new URLSearchParams(location.search)
  const currentVariant = (searchParams.get('variant') === 'chess960' ? 'chess960' : 'standard') as
    | 'standard'
    | 'chess960'

  useAnalysisWorker(false)

  const handleSelectGame = useCallback(
    (game: Game) => {
      if (!game?.id) return
      setMoves([])
      setActiveMoveIndex(null)
      setLastMoveFromUpdate(null)
      setShowResultOverlay(true)
      navigate(`/arena/${game.id}`)
    },
    [navigate],
  )

  const handleCreateGame = async (
    whiteId: string,
    blackId: string,
    variant: string = currentVariant,
  ) => {
    if (createGameMutation.isPending) return
    setWhitePlayerId(whiteId)
    setBlackPlayerId(blackId)
    setLastMoveFromUpdate(null)
    try {
      const result = await createGameMutation.mutateAsync({
        whitePlayerId: whiteId,
        blackPlayerId: blackId,
        variant,
      })
      navigate(`/arena/${result.id}`)
      setIsSidebarCollapsed(true)
    } catch (err) {
      toast.error('Failed to start match', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  const handleDeleteGame = async (id: string) => {
    try {
      await deleteGameMutation.mutateAsync(id)
      if (pathGameId === id) {
        setActiveMoveIndex(null)
        setLastMoveFromUpdate(null)
        navigate('/arena')
      }
    } catch {
      toast.error('Failed to delete game')
    }
  }

  const handleClearHistory = async () => {
    try {
      await clearHistory()
      setActiveMoveIndex(null)
      setLastMoveFromUpdate(null)
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      navigate('/arena')
      toast.success('Game history cleared')
    } catch (err) {
      console.error('Failed to clear history', err)
      toast.error('Failed to clear history', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  const handleTogglePause = async () => {
    if (!selectedGame) return
    try {
      if (selectedGame.status === 'ongoing') {
        await pauseGameMutation.mutateAsync(selectedGame.id)
      } else if (selectedGame.status === 'paused') {
        await resumeGameMutation.mutateAsync(selectedGame.id)
      }
    } catch {
      toast.error('Failed to toggle game status')
    }
  }

  useEffect(() => {
    if (lastUpdate && selectedGame) {
      if (lastProcessedFenRef.current === lastUpdate.fen) return
      lastProcessedFenRef.current = lastUpdate.fen

      if (lastUpdate.san) {
        try {
          const chess = safeNewChess(selectedGame.fen)
          const move = chess.move(lastUpdate.san)
          if (move) setLastMoveFromUpdate({ from: move.from, to: move.to })
        } catch {
          if (selectedGame.fen !== lastUpdate.fen)
            console.warn('Could not derive squares for SAN:', lastUpdate.san)
        }
        playMoveSound(lastUpdate.san)
      } else if (lastUpdate.status === 'completed' || lastUpdate.status === 'draw') {
        soundManager.play('notify')
      }

      queryClient.invalidateQueries({ queryKey: ['game', selectedGame.id] })
      queryClient.invalidateQueries({ queryKey: ['moves', selectedGame.id] })
      queryClient.invalidateQueries({ queryKey: ['games'] })
    }
  }, [lastUpdate, selectedGame, queryClient])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 1024) setIsSidebarCollapsed(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentDisplayFen = useMemo(() => {
    if (activeMoveIndex === null && selectedGame?.fen) return selectedGame.fen
    let startFen: string | undefined = undefined
    if (selectedGame?.variant === 'chess960' && selectedGame.startPosId != null)
      startFen = generate960Fen(selectedGame.startPosId)
    const chess = safeNewChess(startFen)
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1
    for (let i = 0; i <= index; i++)
      try {
        chess.move(moves[i].move)
      } catch (e) {
        console.debug('Move replay failed', e)
      }
    return chess.fen()
  }, [moves, activeMoveIndex, selectedGame])

  const currentPgn = useMemo(() => {
    let startFen: string | undefined = undefined
    if (selectedGame?.variant === 'chess960' && selectedGame.startPosId != null)
      startFen = generate960Fen(selectedGame.startPosId)
    const chess = safeNewChess(startFen)
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1
    for (let i = 0; i <= index; i++)
      try {
        chess.move(moves[i].move)
      } catch (e) {
        console.debug('PGN replay failed', e)
      }
    return chess.pgn()
  }, [moves, activeMoveIndex, selectedGame])

  const lastMoveSquares = useMemo(() => {
    if (activeMoveIndex === null && lastMoveFromUpdate) return lastMoveFromUpdate
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1
    if (index < 0 || moves.length === 0) return undefined
    let startFen: string | undefined = undefined
    if (selectedGame?.variant === 'chess960' && selectedGame.startPosId != null)
      startFen = generate960Fen(selectedGame.startPosId)
    const chess = safeNewChess(startFen)
    try {
      for (let i = 0; i < index; i++)
        try {
          chess.move(moves[i].move)
        } catch (e) {
          console.debug('Move history replay failed', e)
        }
      const move = chess.move(moves[index].move)
      return { from: move.from, to: move.to }
    } catch (e) {
      console.debug('Failed to derive move squares', e)
      return undefined
    }
  }, [moves, activeMoveIndex, lastMoveFromUpdate, selectedGame])

  const isLive = activeMoveIndex === null || activeMoveIndex === moves.length - 1
  useGameBot(selectedGame?.id, lastMessage, sendMessage, isLive && !!selectedGame)
  const { evaluation, variations, isThinking } = useStockfish(currentDisplayFen)

  const whitePlayer = players.find((p) => p.id === selectedGame?.whitePlayerId)
  const blackPlayer = players.find((p) => p.id === selectedGame?.blackPlayerId)
  const hasOngoingGame = games.some((g) => g.status === 'ongoing' || g.status === 'paused')

  const getThinking = useCallback(
    (color: 'white' | 'black') => {
      if (!selectedGame) return {}
      const effectiveMoves = activeMoveIndex === null ? moves : moves.slice(0, activeMoveIndex + 1)
      if (activeMoveIndex === null) {
        const lastMove = moves[moves.length - 1]
        const isThinkingNow =
          color === 'white'
            ? (moves.length === 0 && selectedGame.status === 'ongoing') ||
              (lastMove?.playerColor === 'black' && selectedGame.status === 'ongoing')
            : lastMove?.playerColor === 'white' && selectedGame.status === 'ongoing'
        if (isThinkingNow) return {}
      }
      const lastMove = [...effectiveMoves].reverse().find((m) => m.playerColor === color)
      if (lastMove) {
        let candidates = undefined
        try {
          candidates = lastMove.candidates ? JSON.parse(lastMove.candidates) : undefined
        } catch (err) {
          console.error('Failed to parse candidates', err)
        }
        return {
          opening: lastMove.opening,
          candidates,
          reasoning: lastMove.reasoning,
          moveNumber: lastMove.moveNumber,
          moveSAN: lastMove.move,
        }
      }
      return {}
    },
    [activeMoveIndex, moves, selectedGame],
  )

  const whiteThinking = useMemo(() => getThinking('white'), [getThinking])
  const blackThinking = useMemo(() => getThinking('black'), [getThinking])

  return {
    isMobile,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    games,
    selectedGame,
    moves,
    players,
    leaderboard,
    boardOrientation,
    setBoardOrientation,
    activeMoveIndex,
    setActiveMoveIndex,
    showResultOverlay,
    setShowResultOverlay,
    lastMoveSquares,
    whitePlayerId,
    setWhitePlayerId,
    blackPlayerId,
    setBlackPlayerId,
    isCreatingGame: createGameMutation.isPending,
    spectatorCount,
    thinkingStatus,
    variant: currentVariant,
    handleSelectGame,
    fetchAllGames: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
    handleCreateGame,
    handleDeleteGame,
    handleClearHistory,
    handleTogglePause,
    currentDisplayFen,
    currentPgn,
    isLive,
    evaluation,
    variations,
    isThinking,
    whitePlayer,
    blackPlayer,
    hasOngoingGame,
    whiteThinking,
    blackThinking,
    chatMessages,
    sendMessage,
  }
}
