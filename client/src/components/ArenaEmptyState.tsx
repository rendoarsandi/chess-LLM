import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

interface ArenaEmptyStateProps {
  hasOngoingGame: boolean
  handleCreateGame: (whiteId: string, blackId: string, variant?: string) => Promise<void>
  whitePlayerId: string
  blackPlayerId: string
  isCreatingGame: boolean
}

export function ArenaEmptyState({
  hasOngoingGame,
  handleCreateGame,
  whitePlayerId,
  blackPlayerId,
  isCreatingGame,
}: ArenaEmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] border-2 border-dashed border-border rounded-2xl bg-muted/10 p-6 md:p-12 text-center space-y-6">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
        <Play className="w-8 h-8 md:w-10 md:h-10 fill-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">
          Ready for Battle?
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-md mx-auto">
          {hasOngoingGame
            ? 'A match is currently in progress. You can view it in the arena or history.'
            : 'Select two engines from the controls or visit the History tab to resume a previous encounter.'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          size="lg"
          className="font-black tracking-widest px-6 md:px-8 text-xs md:text-sm"
          onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)}
          disabled={isCreatingGame}
        >
          {isCreatingGame ? 'STARTING...' : 'START NEW MATCH'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="font-black tracking-widest px-6 md:px-8 text-xs md:text-sm border-2"
          onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'chess960')}
          disabled={isCreatingGame}
        >
          {isCreatingGame ? 'STARTING...' : 'START CHESS 960'}
        </Button>
      </div>
    </div>
  )
}
