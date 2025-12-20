import type { Player } from "@/api"
import { Trophy, XCircle, MinusCircle, TrendingUp, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardsProps {
  player: Player
}

export function StatCards({ player }: StatCardsProps) {
  const totalGames = player.wins + player.losses + player.draws
  const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0

  const stats = [
    {
      label: "Current Rating",
      value: player.rating,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      label: "Peak Rating",
      value: player.peakRating,
      icon: Target,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      label: "Total Wins",
      value: player.wins,
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10"
    },
    {
      label: "Total Losses",
      value: player.losses,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10"
    },
    {
      label: "Total Draws",
      value: player.draws,
      icon: MinusCircle,
      color: "text-slate-400",
      bg: "bg-slate-400/10"
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: Trophy,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-card border border-border p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
          <div className={cn("p-1.5 md:p-2 rounded-lg", stat.bg)}>
            <stat.icon className={cn("h-4 w-4 md:h-5 md:w-5", stat.color)} />
          </div>
          <div className="space-y-0.5">
            <div className="text-xl md:text-2xl font-black tracking-tighter">{stat.value}</div>
            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
