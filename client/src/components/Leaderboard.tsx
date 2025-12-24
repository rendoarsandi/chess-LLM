import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Player } from "@/api"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Medal, Award, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LeaderboardProps {
  players: Player[]
  onSelectPlayer?: (id: string) => void
  loading?: boolean
}

export function Leaderboard({ players, onSelectPlayer, loading }: LeaderboardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xl">
        <div className="p-8 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  // Sort players by rating descending
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating)

  if (players.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground italic bg-muted/10 rounded-xl border-2 border-dashed border-border">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
        No data available yet.
      </div>
    )
  }

  const handlePlayerClick = (player: Player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player.id)
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 1: return <Medal className="w-4 h-4 text-slate-400" />;
      case 2: return <Award className="w-4 h-4 text-amber-600" />;
      default: return <span className="text-[10px] font-black text-muted-foreground/50">#{index + 1}</span>;
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xl">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[60px] text-center text-[10px] font-black uppercase tracking-widest px-4">RANK</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest px-4">ARCHITECTURE</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-4">ELO RATING</TableHead>
            <TableHead className="text-right hidden sm:table-cell text-[10px] font-black uppercase tracking-widest px-4">WIN/LOSS/DRAW</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {sortedPlayers.map((player, index) => (
              <motion.tr
                key={player.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="group cursor-pointer hover:bg-primary/[0.03] transition-all border-b last:border-0"
                onClick={() => handlePlayerClick(player)}
              >
                <TableCell className="py-4 text-center px-4">
                  <div className="flex items-center justify-center">
                    {getRankIcon(index)}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border shadow-sm group-hover:scale-110 transition-transform",
                      index === 0 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600" : "bg-muted border-border"
                    )}>
                      {player.name[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-sm md:text-base tracking-tight">{player.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-70">
                          {player.type}
                        </span>
                        {player.provider && (
                          <span className={cn(
                            "text-[8px] px-1 py-0.5 rounded border leading-none font-black uppercase tracking-widest",
                            player.provider === 'gemini' ? "text-primary bg-primary/5 border-primary/20" :
                            player.provider === 'groq' ? "text-orange-500 bg-orange-500/5 border-orange-500/20" :
                            player.provider === 'system' ? "text-blue-500 bg-blue-500/5 border-blue-500/20" :
                            "text-muted-foreground bg-muted border-border"
                          )}>
                            {player.provider}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right py-4 px-4">
                  <span className="font-black text-primary text-sm md:text-lg tracking-tighter italic">
                    {player.rating}
                  </span>
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell py-4 px-4">
                  <div className="flex items-center justify-end gap-1 font-mono text-[10px] md:text-xs">
                    <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{player.wins}W</span>
                    <span className="text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">{player.losses}L</span>
                    <span className="text-muted-foreground font-bold bg-muted px-1.5 py-0.5 rounded border border-border">{player.draws}D</span>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  )
}
