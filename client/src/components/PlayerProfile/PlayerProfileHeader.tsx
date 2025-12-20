import type { Player } from "@/api"
import { Calendar, Cpu, ShieldCheck } from "lucide-react"

interface PlayerProfileHeaderProps {
  player: Player
}

export function PlayerProfileHeader({ player }: PlayerProfileHeaderProps) {
  const joinDate = new Date(player.createdAt).toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
        <div className="h-24 w-24 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-4xl font-black shadow-lg shadow-primary/20 shrink-0">
          {player.name[0]}
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">{player.name}</h2>
            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>{player.provider || 'Arena'} {player.version && `v${player.version}`}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary">{player.rating} ELO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
          
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            {player.bio || "This model competes in the automated ChessLLM arena, contributing to the benchmarking of strategic reasoning across different architectures."}
          </p>
        </div>
      </div>
    </div>
  )
}
