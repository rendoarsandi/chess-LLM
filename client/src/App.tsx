import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"
import { GameHistory } from "@/components/GameHistory"
import { ThinkingPanel } from "@/components/ThinkingPanel"
import { MoveList } from "@/components/MoveList"
import { PlaybackControls } from "@/components/PlaybackControls"
import { useEffect, useState } from "react"
import { getGames, getGame, createGame, deleteGame, clearHistory, getMoves, getPlayers } from "./api"
import type { Game, Move, Player } from "./api"
import { Chess } from "chess.js"

const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'
const GEMINI_2_5_ID = '00000000-0000-0000-0000-000000000004'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white")
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null) // null means "Live"

  const fetchAllGames = async () => {
    const allGames = await getGames()
    setGames(allGames)
    if (!selectedGame && allGames.length > 0) {
      handleSelectGame(allGames[0])
    }
  }

  const fetchPlayers = async () => {
    const allPlayers = await getPlayers()
    setPlayers(allPlayers)
  }

  useEffect(() => {
    fetchAllGames()
    fetchPlayers()
    const listInterval = setInterval(fetchAllGames, 10000)
    return () => clearInterval(listInterval)
  }, [selectedGame?.id])

  useEffect(() => {
    const gameId = selectedGame?.id
    if (!gameId) return

    async function pollSelectedGame() {
      if (!gameId) return
      const [updated, gameMoves] = await Promise.all([
        getGame(gameId),
        getMoves(gameId)
      ])
      
      const sortedMoves = [...gameMoves].sort((a, b) => {
        if (a.moveNumber !== b.moveNumber) return a.moveNumber - b.moveNumber
        return a.playerColor === 'white' ? -1 : 1
      })

      setSelectedGame(updated)
      setMoves(sortedMoves)
    }

    pollSelectedGame()
    const gameInterval = setInterval(pollSelectedGame, 2000)
    return () => clearInterval(gameInterval)
  }, [selectedGame?.id])

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game)
    setActiveMoveIndex(null) // Reset to live
  }

  const handleCreateGame = async (whiteId: string, blackId: string) => {
    const { id } = await createGame(whiteId, blackId)
    const newGame = await getGame(id)
    handleSelectGame(newGame)
    fetchAllGames()
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

  const currentDisplayFen = activeMoveIndex !== null && moves[activeMoveIndex]
    ? moves[activeMoveIndex].fen
    : selectedGame?.fen

  const getPlayerThinking = (side: 'white' | 'black') => {
    if (!selectedGame || moves.length === 0) return undefined
    
    // In browsing mode, we show thinking for the specific move
    if (activeMoveIndex !== null) {
      const move = moves[activeMoveIndex]
      if (move.playerColor === side) {
        let candidates: string[] = []
        try {
          if (move.candidates) candidates = JSON.parse(move.candidates)
        } catch (e) {}
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
      } catch (e) {}
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
    } catch (e) {}

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
    } catch (e) {
      console.error("Error parsing move for highlight:", e);
    }
    return undefined;
  })();

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
      
      <main className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Left Sidebar - White Thinking */}
        <div className="hidden xl:block h-fit">
          <ThinkingPanel 
            side="white" 
            modelName={whitePlayer?.name || 'Loading...'}
            {...whiteThinking}
          />
        </div>

        {/* Center - Board */}
        <div className="xl:col-span-2 flex flex-col items-center">
          <div className="relative group">
            <ChessboardContainer 
              fen={currentDisplayFen} 
              boardOrientation={boardOrientation}
              highlightSquares={lastMoveSquares}
            />
            {!isLive && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                BROWSING HISTORY
              </div>
            )}
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
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-lg">Game {selectedGame.id.slice(0, 8)}</span>
                  <div className="flex gap-2">
                    {!isLive && (
                      <Button size="sm" variant="secondary" onClick={() => setActiveMoveIndex(null)}>
                        Return to Live
                      </Button>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      selectedGame.status === 'ongoing' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {selectedGame.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  FEN: <code className="bg-muted px-1 py-0.5 rounded text-xs truncate block mt-1">{currentDisplayFen}</code>
                </p>
              </div>
            )}
          </div>
          
          {/* Mobile Thinking Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 w-full xl:hidden">
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
          <div className="hidden xl:block">
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
          />

          <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
            <h2 className="text-xl font-bold mb-4">Arena Controls</h2>
            <div className="space-y-4">
              <Button className="w-full text-xs" size="sm" onClick={() => handleCreateGame(RANDOM_BOT_ID, GEMINI_3_0_ID)}>
                Random vs Gemini 3.0
              </Button>
              <Button variant="outline" className="w-full text-xs" size="sm" onClick={() => handleCreateGame(RANDOM_BOT_ID, GEMINI_2_5_ID)}>
                Random vs Gemini 2.5
              </Button>
              <Button variant="secondary" className="w-full text-xs" size="sm" onClick={() => handleCreateGame(GEMINI_2_5_ID, GEMINI_3_0_ID)}>
                Gemini 2.5 vs 3.0
              </Button>
            </div>
          </div>

          <GameHistory 
            games={games} 
            selectedGameId={selectedGame?.id} 
            onSelect={handleSelectGame} 
            onDelete={handleDeleteGame}
          />
        </div>
      </main>
    </div>
  )
}

export default App