import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"
import { GameHistory } from "@/components/GameHistory"
import { ThinkingPanel } from "@/components/ThinkingPanel"
import { useEffect, useState } from "react"
import { getGames, getGame, createGame, deleteGame, clearHistory, getMoves, getPlayers } from "./api"
import type { Game, Move, Player } from "./api"

const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'
const GEMINI_2_5_ID = '00000000-0000-0000-0000-000000000004'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  const fetchAllGames = async () => {
    const allGames = await getGames()
    setGames(allGames)
    if (!selectedGame && allGames.length > 0) {
      setSelectedGame(allGames[0])
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
      setSelectedGame(updated)
      setMoves(gameMoves)
    }

    pollSelectedGame()
    const gameInterval = setInterval(pollSelectedGame, 2000)
    return () => clearInterval(gameInterval)
  }, [selectedGame?.id])

  const handleCreateGame = async (whiteId: string, blackId: string) => {
    const { id } = await createGame(whiteId, blackId)
    const newGame = await getGame(id)
    setSelectedGame(newGame)
    fetchAllGames()
  }

  const handleDeleteGame = async (id: string) => {
    await deleteGame(id)
    if (selectedGame?.id === id) {
      setSelectedGame(null)
    }
    fetchAllGames()
  }

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all game history?')) {
      await clearHistory()
      setSelectedGame(null)
      fetchAllGames()
    }
  }

  const getPlayerThinking = (side: 'white' | 'black') => {
    if (!selectedGame || moves.length === 0) return undefined
    
    // Find the last move made by this side
    const lastMove = [...moves]
      .sort((a, b) => b.moveNumber - a.moveNumber)
      .find(m => m.playerColor === side)
    
    if (!lastMove) return undefined

    let candidates: string[] = []
    try {
      if (lastMove.candidates) {
        candidates = JSON.parse(lastMove.candidates)
      }
    } catch (e) {
      console.error('Failed to parse candidates', e)
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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold tracking-tight">ChessLLM</h1>
        <div className="space-x-2">
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
          <ChessboardContainer fen={selectedGame?.fen} />
          
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

          {selectedGame && (
            <div className="mt-6 w-full max-w-[600px] p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg">Game {selectedGame.id.slice(0, 8)}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  selectedGame.status === 'ongoing' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {selectedGame.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                FEN: <code className="bg-muted px-1 py-0.5 rounded text-xs truncate block mt-1">{selectedGame.fen}</code>
              </p>
            </div>
          )}
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

          <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
            <h2 className="text-xl font-bold mb-4">Arena Controls</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Start a demo game to see different AI strategies in action.
            </p>
            <div className="space-y-4">
              <Button className="w-full" onClick={() => handleCreateGame(RANDOM_BOT_ID, GEMINI_3_0_ID)}>
                Random Bot vs Gemini 3.0 Flash
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleCreateGame(RANDOM_BOT_ID, GEMINI_2_5_ID)}>
                Random Bot vs Gemini 2.5 Flash
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => handleCreateGame(GEMINI_2_5_ID, GEMINI_3_0_ID)}>
                Gemini 2.5 vs Gemini 3.0
              </Button>
            </div>
          </div>

          <GameHistory 
            games={games} 
            selectedGameId={selectedGame?.id} 
            onSelect={setSelectedGame} 
            onDelete={handleDeleteGame}
          />
        </div>
      </main>
    </div>
  )
}

export default App