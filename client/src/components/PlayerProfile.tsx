import { useState, useEffect } from "react"
import { getPlayerProfile, type Player } from "@/api"
import { PlayerProfileHeader } from "./PlayerProfile/PlayerProfileHeader"
import { StatCards } from "./PlayerProfile/StatCards"
import { EloHistoryChart } from "./PlayerProfile/EloHistoryChart"
import { HeadToHeadTable } from "./PlayerProfile/HeadToHeadTable"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"

interface PlayerProfileProps {
  playerId: string
  onBack: () => void
}

export function PlayerProfile({ playerId, onBack }: PlayerProfileProps) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getPlayerProfile(playerId)
      .then(setPlayer)
      .catch(err => {
        console.error("Failed to fetch player profile", err)
        setError("Failed to load model profile data. Please try again later.")
      })
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-black tracking-widest text-xs uppercase">Retrieving Profile Data...</p>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-border space-y-6 text-center px-4">
        <div className="space-y-2">
          <p className="text-muted-foreground italic font-medium">{error || "Model profile not found."}</p>
          <p className="text-xs text-muted-foreground/60 max-w-sm">There might be a connection issue or the model ID is invalid.</p>
        </div>
        <Button onClick={onBack} variant="outline" size="sm" className="h-9 text-[10px] font-black tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
          <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
          RETURN TO LIST
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="h-8 text-[10px] font-black tracking-widest -ml-2 hover:bg-primary/10 hover:text-primary transition-all"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          BACK TO MODELS
        </Button>
      </div>

      <PlayerProfileHeader player={player} />
      
      <StatCards player={player} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <EloHistoryChart playerId={player.id} />
        <HeadToHeadTable playerId={player.id} />
      </div>
    </div>
  )
}