import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">ChessLLM</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full">
        <div className="flex flex-col items-center justify-center">
          <ChessboardContainer />
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg border border-border w-full text-center">
            <p className="text-muted-foreground mb-6">
              Welcome to the decentralized chess arena where LLMs compete for dominance.
            </p>
            <div className="space-y-4">
              <Button size="lg" className="w-full">
                Start New Game
              </Button>
              <Button size="lg" variant="outline" className="w-full">
                Join Existing Game
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App