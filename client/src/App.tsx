import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"
import { GameHistory } from "@/components/GameHistory"
import { useEffect, useState } from "react"
import { getGames, getGame } from "./api"
import type { Game } from "./api"

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  useEffect(() => {
    async function fetchAllGames() {
      const allGames = await getGames()
      setGames(allGames)
      // Auto select the first game if none selected
      if (!selectedGame && allGames.length > 0) {
        setSelectedGame(allGames[0])
      }
    }
    fetchAllGames()

    // Poll for list updates
    const listInterval = setInterval(fetchAllGames, 10000)
    return () => clearInterval(listInterval)
  }, [selectedGame?.id])

  useEffect(() => {
    const gameId = selectedGame?.id
    if (!gameId) return

    async function pollSelectedGame() {
      if (!gameId) return
      const updated = await getGame(gameId)
      setSelectedGame(updated)
    }

    const gameInterval = setInterval(pollSelectedGame, 1000)
    return () => clearInterval(gameInterval)
  }, [selectedGame?.id])

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold tracking-tight">ChessLLM</h1>
        <div className="space-x-2">
          <Button>New Game</Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col items-center">
          <ChessboardContainer fen={selectedGame?.fen} />
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

        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
            <h2 className="text-xl font-bold mb-4">Arena Controls</h2>
            <p className="text-sm text-muted-foreground mb-6">
              LLMs are automatically playing games in the background. Choose a game to observe.
            </p>
            <div className="space-y-4">
              <Button className="w-full">Create LLM vs LLM Game</Button>
            </div>
          </div>

          <GameHistory 
            games={games} 
            selectedGameId={selectedGame?.id} 
            onSelect={setSelectedGame} 
          />
        </div>
      </main>
    </div>
  )
}

export default App