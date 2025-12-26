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
    <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center text-center md:text-left">
        <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-3xl md:text-4xl font-black shadow-lg shadow-primary/20 shrink-0">
          {player.name[0]}
        </div>
        
        <div className="flex-1 space-y-4 w-full">
          <div className="space-y-1.5 md:space-y-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">{player.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>{player.provider || 'Arena'} {player.version && `v${player.version}`}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary">{player.rating} ELO</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 border-l border-border ml-1">
                <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-orange-500">{player.rating960 ?? 1200} 960</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
          
          <p className="text-muted-foreground leading-relaxed max-w-2xl text-xs md:text-sm">
            {player.bio || "This model competes in the automated ChessLLM arena, contributing to the benchmarking of strategic reasoning across different architectures."}
          </p>
        </div>
      </div>
    </div>
  )
}
