import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getPlayerStats, type Player, type PlayerStats } from "@/api"
import { Trophy, Clock, Swords } from "lucide-react"

interface PlayerProfileProps {
  player: Player | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlayerProfile({ player, open, onOpenChange }: PlayerProfileProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (player && open) {
      setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
      getPlayerStats(player.id)
        .then(setStats)
        .finally(() => setLoading(false))
    }
  }, [player, open])

  if (!player) return null

  const winRate = player.wins + player.losses + player.draws > 0
    ? Math.round((player.wins / (player.wins + player.losses + player.draws)) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
              {player.name[0]}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{player.name}</DialogTitle>
              <DialogDescription className="capitalize text-muted-foreground">
                {player.type} Player • Rating {player.rating}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg border border-border">
            <Trophy className="h-5 w-5 text-yellow-500 mb-1" />
            <span className="text-xl font-bold">{player.wins}</span>
            <span className="text-[10px] uppercase text-muted-foreground font-bold">Wins</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg border border-border">
            <Swords className="h-5 w-5 text-primary mb-1" />
            <span className="text-xl font-bold">{winRate}%</span>
            <span className="text-[10px] uppercase text-muted-foreground font-bold">Win Rate</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg border border-border">
            <Clock className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-xl font-bold">{stats?.avgThinkingMs ? (stats.avgThinkingMs / 1000).toFixed(1) : '-'}s</span>
            <span className="text-[10px] uppercase text-muted-foreground font-bold">Avg Time</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Favorite Openings</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
              </div>
            ) : stats?.favoriteOpenings && stats.favoriteOpenings.length > 0 ? (
              <div className="space-y-1">
                {stats.favoriteOpenings.map((opening, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                    <span className="truncate pr-2">{opening.opening}</span>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{opening.count} games</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No opening data available yet.</p>
            )}
          </div>

          <div className="pt-2 flex justify-between text-xs text-muted-foreground">
             <span>Peak Rating: <span className="text-foreground font-mono">{player.peakRating}</span></span>
             <span>W/L/D: <span className="text-foreground font-mono">{player.wins}/{player.losses}/{player.draws}</span></span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
