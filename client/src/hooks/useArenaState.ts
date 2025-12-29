import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getGames,
  getGame,
  createGame,
  deleteGame,
  getMoves,
  getPlayers,
  getLeaderboard,
  pauseGame,
  resumeGame,
  clearHistory,
} from '../api'
import { useGameSocket } from './useGameSocket'
import { useGameBot } from './useGameBot'
import { useAnalysisWorker } from './useAnalysisWorker'
import { useStockfish } from '../lib/stockfish/useStockfish'
import { generate960Fen, safeNewChess } from '../lib/chess-utils'
import { toast } from 'sonner'
import type { Game, Move, Player } from '@/types'

const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'

export function useArenaState() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024)
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null)
  const [showResultOverlay, setShowResultOverlay] = useState(true)
  const [lastMoveFromUpdate, setLastMoveFromUpdate] = useState<{ from: string; to: string } | null>(
    null,
  )
  const [whitePlayerId, setWhitePlayerId] = useState(STOCKFISH_LOW_ID)
  const [blackPlayerId, setBlackPlayerId] = useState(STOCKFISH_MED_ID)
  const [isCreatingGame, setIsCreatingGame] = useState(false)

  const { lastUpdate, thinkingStatus, spectatorCount, lastMessage, sendMessage } = useGameSocket(
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
      setSelectedGame(game)
      setMoves([])
      setActiveMoveIndex(null)
      setLastMoveFromUpdate(null)
      setShowResultOverlay(true)
      navigate(`/arena/${game.id}`)
    },
    [navigate],
  )

  const fetchAllGames = useCallback(async () => {
    const allGames = await getGames()
    setGames(allGames)
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard()
      setLeaderboard(data)
    } catch (err) {
      console.error('Failed to fetch leaderboard', err)
    }
  }, [])

  const fetchPlayers = useCallback(async () => {
    const allPlayers = await getPlayers()
    setPlayers(allPlayers)
  }, [])

  const handleCreateGame = async (
    whiteId: string,
    blackId: string,
    variant: string = currentVariant,
  ) => {
    if (isCreatingGame) return
    setIsCreatingGame(true)
    setWhitePlayerId(whiteId)
    setBlackPlayerId(blackId)
    setLastMoveFromUpdate(null)
    try {
      const options: { variant?: string; startPosId?: number } = { variant }
      if (variant === 'chess960') options.startPosId = Math.floor(Math.random() * 960)
      const { id } = await createGame(whiteId, blackId, options)
      const newGame = await getGame(id)
      handleSelectGame(newGame)
      await Promise.all([fetchAllGames(), fetchLeaderboard()])
      setIsSidebarCollapsed(true)
    } catch (err) {
      toast.error('Failed to start match', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setIsCreatingGame(false)
    }
  }

  const handleDeleteGame = async (id: string) => {
    await deleteGame(id)
    if (selectedGame?.id === id) {
      setSelectedGame(null)
      setActiveMoveIndex(null)
      setLastMoveFromUpdate(null)
    }
    fetchAllGames()
  }

  const handleClearHistory = async () => {
    try {
      await clearHistory()
      setSelectedGame(null)
      setMoves([])
      setActiveMoveIndex(null)
      setLastMoveFromUpdate(null)
      fetchAllGames()
      toast.success('Game history cleared')
    } catch {
      toast.error('Failed to clear history')
    }
  }

  const handleTogglePause = async () => {
    if (!selectedGame) return
    if (selectedGame.status === 'ongoing') await pauseGame(selectedGame.id)
    else if (selectedGame.status === 'paused') await resumeGame(selectedGame.id)
    const updated = await getGame(selectedGame.id)
    setSelectedGame(updated)
    fetchAllGames()
  }

  useEffect(() => {
    fetchAllGames()
    fetchPlayers()
    fetchLeaderboard()
  }, [fetchAllGames, fetchPlayers, fetchLeaderboard])

  useEffect(() => {
    if (!selectedGame) return
    getMoves(selectedGame.id).then(setMoves)
  }, [selectedGame])

  useEffect(() => {
    if (lastUpdate && selectedGame) {
      if (lastProcessedFenRef.current === lastUpdate.fen) return
      lastProcessedFenRef.current = lastUpdate.fen

      setSelectedGame((prev) => {
        if (!prev) return null
        if (lastUpdate.san) {
          try {
            const chess = safeNewChess(prev.fen)
            const move = chess.move(lastUpdate.san)
            if (move) setLastMoveFromUpdate({ from: move.from, to: move.to })
          } catch {
            if (prev.fen !== lastUpdate.fen)
              console.warn('Could not derive squares for SAN:', lastUpdate.san)
          }
        }
        return {
          ...prev,
          fen: lastUpdate.fen,
          status: lastUpdate.status,
          winnerId: lastUpdate.winnerId,
          gameOverReason: lastUpdate.gameOverReason,
        }
      })
      getMoves(selectedGame.id).then(setMoves)
    }
  }, [lastUpdate, selectedGame])

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

  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    if (segments[0] === 'arena') {
      if (segments[1]) {
        if (selectedGame?.id !== segments[1])
          getGame(segments[1])
            .then((game) => {
              if (game) {
                setSelectedGame(game)
                setMoves([])
                setActiveMoveIndex(null)
              }
            })
            .catch((err) => {
              console.error('Failed to fetch game', err)
              navigate('/arena')
            })
      } else if (selectedGame !== null) {
        setSelectedGame(null)
        setMoves([])
        setActiveMoveIndex(null)
      }
    }
  }, [location.pathname, selectedGame, navigate])

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
    isCreatingGame,
    spectatorCount,
    thinkingStatus,
    variant: currentVariant,
    handleSelectGame,
    fetchAllGames,
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
  }
}
