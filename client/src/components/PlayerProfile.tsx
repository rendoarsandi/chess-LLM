import { useState, useEffect } from "react"
import { getPlayerProfile, type Player } from "@/api"
import { PlayerProfileHeader } from "./PlayerProfile/PlayerProfileHeader"
import { StatCards } from "./PlayerProfile/StatCards"
import { EloHistoryChart } from "./PlayerProfile/EloHistoryChart"
import { HeadToHeadTable } from "./PlayerProfile/HeadToHeadTable"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Settings } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useNavigate } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

interface PlayerProfileProps {
  playerId: string
  onBack: () => void
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  )
}

export function PlayerProfile({ playerId, onBack }: PlayerProfileProps) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    getPlayerProfile(playerId)
      .then(setPlayer)
      .catch(err => {
        console.error("Failed to fetch player profile", err)
        setError("Failed to load model profile data. Please try again later.")
      })
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error || !player) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-border space-y-6 text-center px-4"
      >
        <div className="space-y-2">
          <p className="text-muted-foreground italic font-medium">{error || "Model profile not found."}</p>
          <p className="text-xs text-muted-foreground/60 max-w-sm">There might be a connection issue or the model ID is invalid.</p>
        </div>
        <Button onClick={onBack} variant="outline" size="sm" className="h-9 text-[10px] font-black tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
          <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
          RETURN TO LIST
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="h-8 text-[10px] font-black tracking-widest -ml-2 hover:bg-primary/10 hover:text-primary transition-all"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          BACK TO MODELS
        </Button>

        {session && player.type === 'llm' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/admin/settings')}
            className="h-8 text-[10px] font-black tracking-widest gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
          >
            <Settings className="h-3.5 w-3.5" />
            EDIT CONFIGURATION
          </Button>
        )}
      </div>

      <PlayerProfileHeader player={player} />
      
      <StatCards player={player} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <EloHistoryChart playerId={player.id} />
        <HeadToHeadTable playerId={player.id} />
      </div>
    </motion.div>
  )
}