import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"
import { GameHistory } from "@/components/GameHistory"
import { ThinkingPanel } from "@/components/ThinkingPanel"
import { MoveList } from "@/components/MoveList"
import { PlaybackControls } from "@/components/PlaybackControls"
import { AdvantageBar } from "@/components/AdvantageBar"
import { Leaderboard } from "@/components/Leaderboard"
import { useEffect, useState, useCallback } from "react"
import { getGames, getGame, createGame, deleteGame, clearHistory, getMoves, getPlayers, getLeaderboard } from "./api"
import type { Game, Move, Player } from "./api"
import { Chess } from "chess.js"
import { useStockfish } from "./lib/stockfish/useStockfish"

const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white")
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null) // null means "Live"

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGame(game)
    setActiveMoveIndex(null) // Reset to live
  }, [])

  const fetchAllGames = useCallback(async () => {
    const allGames = await getGames()
    setGames(allGames)
    if (!selectedGame && allGames.length > 0) {
      handleSelectGame(allGames[0])
    }
  }, [selectedGame, handleSelectGame])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard()
      setLeaderboard(data)
    } catch (err) {
      console.error("Failed to fetch leaderboard", err)
    }
  }, [])

  const handleCreateGame = async (whiteId: string, blackId: string) => {
    try {
      const { id } = await createGame(whiteId, blackId)
      const newGame = await getGame(id)
      handleSelectGame(newGame)
      fetchAllGames()
      fetchLeaderboard()
    } catch {
      console.error("Error creating game")
      alert("Failed to create game. Check if the server is running.")
    }
  }

  const handleDeleteGame = async (id: string) => {
    await deleteGame(id)
    if (selectedGame?.id === id) {
      setSelectedGame(null)
      setActiveMoveIndex(null)
    }
    fetchAllGames()
  }

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all game history?')) {
      await clearHistory()
      setSelectedGame(null)
      setActiveMoveIndex(null)
      fetchAllGames()
    }
  }

  const fetchPlayers = useCallback(async () => {
    const allPlayers = await getPlayers()
    setPlayers(allPlayers)
  }, [])

  useEffect(() => {
    fetchAllGames() // eslint-disable-line react-hooks/set-state-in-effect
    fetchPlayers() // eslint-disable-line react-hooks/set-state-in-effect
    fetchLeaderboard() // eslint-disable-line react-hooks/set-state-in-effect
    const listInterval = setInterval(() => {
      fetchAllGames()
      fetchLeaderboard()
    }, 5000) // Poll every 5 seconds
    return () => clearInterval(listInterval)
  }, [fetchAllGames, fetchPlayers, fetchLeaderboard])

  useEffect(() => {
    const gameId = selectedGame?.id
    if (!gameId) return

    async function pollSelectedGame() {
      if (!gameId) return
      try {
        const [updated, gameMoves] = await Promise.all([
          getGame(gameId),
          getMoves(gameId)
        ])
        
        const sortedMoves = [...gameMoves].sort((a, b) => {
          if (a.moveNumber !== b.moveNumber) return a.moveNumber - b.moveNumber
          return a.playerColor === 'white' ? -1 : 1
        })

        // If game just finished, refresh leaderboard
        if (selectedGame?.status === 'ongoing' && updated.status !== 'ongoing') {
          fetchLeaderboard()
        }

        setSelectedGame(updated)
        setMoves(sortedMoves)
      } catch {
        console.error("Error polling game")
      }
    }

    pollSelectedGame()
    const gameInterval = setInterval(pollSelectedGame, 2000)
    return () => clearInterval(gameInterval)
  }, [selectedGame?.id])

  const currentDisplayFen = activeMoveIndex !== null && moves[activeMoveIndex]
    ? moves[activeMoveIndex].fen
    : (moves.length > 0 ? moves[moves.length - 1].fen : selectedGame?.fen)

  const { evaluation } = useStockfish(currentDisplayFen || null)

  const getPlayerThinking = (side: 'white' | 'black') => {
    if (!selectedGame || moves.length === 0) return undefined
    
    // In browsing mode, we show thinking for the specific move
    if (activeMoveIndex !== null) {
      const move = moves[activeMoveIndex]
      if (!move) return undefined
      
      if (move.playerColor === side) {
        let candidates: string[] = []
        try {
          if (move.candidates) candidates = JSON.parse(move.candidates)
        } catch {
          console.warn("Failed to parse candidates")
        }
        return {
          opening: move.opening || undefined,
          candidates: candidates.length > 0 ? candidates : undefined,
          reasoning: move.reasoning || undefined
        }
      }
      // If browsing and move is for the other side, find the PREVIOUS move by this side
      const prevMove = [...moves.slice(0, activeMoveIndex)]
        .reverse()
        .find(m => m.playerColor === side)
      if (!prevMove) return undefined
      
      let candidates: string[] = []
      try {
        if (prevMove.candidates) candidates = JSON.parse(prevMove.candidates)
      } catch {
        console.warn("Failed to parse previous candidates")
      }
      return {
        opening: prevMove.opening || undefined,
        candidates: candidates.length > 0 ? candidates : undefined,
        reasoning: prevMove.reasoning || undefined
      }
    }

    // In live mode, find the last move made by this side
    const lastMove = [...moves]
      .reverse()
      .find(m => m.playerColor === side)
    
    if (!lastMove) return undefined

    let candidates: string[] = []
    try {
      if (lastMove.candidates) {
        candidates = JSON.parse(lastMove.candidates)
      }
    } catch {
      console.warn("Failed to parse last move candidates")
    }

    return {
      opening: lastMove.opening || undefined,
      candidates: candidates.length > 0 ? candidates : undefined,
      reasoning: lastMove.reasoning || undefined
    }
  }

  const whitePlayer = players.find(p => p.id === selectedGame?.whitePlayerId)
  const blackPlayer = players.find(p => p.id === selectedGame?.blackPlayerId)
  const whiteThinking = getPlayerThinking('white')
  const blackThinking = getPlayerThinking('black')

  const isLive = activeMoveIndex === null

  const currentPgn = (() => {
    if (moves.length === 0) return ""
    try {
      const chess = new Chess()
      for (const m of moves) {
        chess.move(m.move)
      }
      return chess.pgn()
    } catch {
      return ""
    }
  })()

  const lastMoveSquares = (() => {
    const moveIdx = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    if (moveIdx < 0 || !moves[moveIdx]) return undefined;
    
    const move = moves[moveIdx];
    const prevFen = moveIdx === 0 
      ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" 
      : moves[moveIdx - 1].fen;
    
    try {
      const chess = new Chess(prevFen);
      const m = chess.move(move.move);
      if (m) {
        return { from: m.from, to: m.to };
      }
    } catch {
      console.error("Error parsing move for highlight");
    }
    return undefined;
  })();

  const [whitePlayerId, setWhitePlayerId] = useState(RANDOM_BOT_ID)
  const [blackPlayerId, setBlackPlayerId] = useState(GEMINI_3_0_ID)

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold tracking-tight">ChessLLM</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}>
            Rotate Board
          </Button>
          <Button variant="outline" onClick={handleClearHistory} className="text-destructive border-destructive hover:bg-destructive/10">
            Clear History
          </Button>
        </div>
      </header>
      
      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar - White Thinking - Hidden on mobile/tablet, shown on lg+ */}
        <div className="hidden lg:block h-fit">
          <ThinkingPanel 
            side="white" 
            modelName={whitePlayer?.name || 'Loading...'}
            {...whiteThinking}
          />
        </div>

        {/* Center - Board */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {/* Tablet Thinking Panels (Shown only on md to lg) */}
          <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 mb-8 w-full">
            <ThinkingPanel 
              side="white" 
              modelName={whitePlayer?.name || 'Loading...'}
              {...whiteThinking}
            />
            <ThinkingPanel 
              side="black" 
              modelName={blackPlayer?.name || 'Loading...'}
              {...blackThinking}
            />
          </div>

          <div className="flex gap-2 md:gap-4 w-full justify-center items-start">
            <div className="h-[300px] md:h-[400px] lg:h-[500px] py-1">
              <AdvantageBar evaluation={evaluation} />
            </div>

            <div className="relative group w-full max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
              <ChessboardContainer 
                fen={currentDisplayFen} 
                boardOrientation={boardOrientation}
                highlightSquares={lastMoveSquares}
                gameId={selectedGame?.id}
                pgn={currentPgn}
              />
              {!isLive && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                  BROWSING HISTORY
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 w-full max-w-[600px] space-y-4">
            <PlaybackControls 
              onFirst={() => setActiveMoveIndex(0)}
              onPrev={() => setActiveMoveIndex(prev => prev === null ? moves.length - 1 : Math.max(0, prev - 1))}
              onNext={() => {
                if (activeMoveIndex === null) return
                if (activeMoveIndex === moves.length - 1) setActiveMoveIndex(null)
                else setActiveMoveIndex(activeMoveIndex + 1)
              }}
              onLast={() => setActiveMoveIndex(null)}
              prevDisabled={moves.length === 0 || activeMoveIndex === 0}
              nextDisabled={isLive}
            />

            {selectedGame && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">Status: <span className="text-primary">{selectedGame.status.toUpperCase()}</span></span>
                  {!isLive && (
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setActiveMoveIndex(null)}>
                      Return to Live
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Thinking Panels (Shown only on < md) */}
          <div className="grid grid-cols-1 gap-4 mt-8 w-full md:hidden">
            <ThinkingPanel 
              side="white" 
              modelName={whitePlayer?.name || 'Loading...'}
              {...whiteThinking}
            />
            <ThinkingPanel 
              side="black" 
              modelName={blackPlayer?.name || 'Loading...'}
              {...blackThinking}
            />
          </div>
        </div>

        {/* Right Sidebar - Black Thinking & Arena Controls */}
        <div className="space-y-8 h-fit">
          <div className="hidden lg:block">
            <ThinkingPanel 
              side="black" 
              modelName={blackPlayer?.name || 'Loading...'}
              {...blackThinking}
            />
          </div>

          <MoveList 
            moves={moves} 
            onMoveClick={setActiveMoveIndex} 
            selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} 
            isLive={isLive}
          />

          <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-xl font-bold">Arena Controls</h2>
              <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">
                {games.filter(g => g.status === 'ongoing').length} ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Select players and start a new match</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">White Player</label>
                <select 
                  value={whitePlayerId} 
                  onChange={(e) => setWhitePlayerId(e.target.value)}
                  className="w-full bg-muted text-foreground rounded border border-border px-2 py-1 text-sm"
                >
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Black Player</label>
                <select 
                  value={blackPlayerId} 
                  onChange={(e) => setBlackPlayerId(e.target.value)}
                  className="w-full bg-muted text-foreground rounded border border-border px-2 py-1 text-sm"
                >
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Button className="w-full" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)}>
                Start New Match
              </Button>
            </div>
          </div>

          <GameHistory 
            games={games} 
            selectedGameId={selectedGame?.id} 
            onSelect={handleSelectGame} 
            onDelete={handleDeleteGame}
          />

          <div className="space-y-4">
            <h2 className="text-xl font-bold px-1">Leaderboard</h2>
            <Leaderboard players={leaderboard} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App