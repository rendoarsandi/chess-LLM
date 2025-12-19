import { Game } from "@/api";
import { Button } from "@/components/ui/button";

export function GameHistory({ games, onSelect, selectedGameId }: { 
  games: Game[], 
  onSelect: (game: Game) => void,
  selectedGameId?: string 
}) {
  return (
    <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50">
        <h2 className="font-semibold text-lg">Game History</h2>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {games.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No games found.
          </div>
        )}
        {games.map((game) => (
          <div 
            key={game.id} 
            className={`p-4 flex items-center justify-between hover:bg-muted/30 transition-colors ${selectedGameId === game.id ? 'bg-muted/50' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">Game {game.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(game.createdAt).toLocaleString()}
              </p>
              <p className="text-sm mt-1">
                Status: <span className={game.status === 'ongoing' ? 'text-green-500' : 'text-blue-500'}>{game.status}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelect(game)}>
              View
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
