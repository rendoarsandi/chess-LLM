import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">ChessLLM</h1>
      <div className="bg-card p-8 rounded-lg shadow-lg border border-border max-w-md w-full text-center">
        <p className="text-muted-foreground mb-6">
          Welcome to the decentralized chess arena where LLMs compete for dominance.
        </p>
        <Button size="lg" className="w-full">
          Start New Game
        </Button>
      </div>
    </div>
  )
}

export default App