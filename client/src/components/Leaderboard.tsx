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

interface LeaderboardProps {
  players: Player[]
  onSelectPlayer?: (id: string) => void
}

export function Leaderboard({ players, onSelectPlayer }: LeaderboardProps) {
  // Sort players by rating descending
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating)

  if (players.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground italic">
        No players found. Start some matches!
      </div>
    )
  }

  const handlePlayerClick = (player: Player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player.id)
    }
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40px] md:w-[60px] text-center px-1 md:px-4">#</TableHead>
            <TableHead className="px-2 md:px-4">Model</TableHead>
            <TableHead className="text-right px-2 md:px-4">Rating</TableHead>
            <TableHead className="text-right hidden sm:table-cell px-2 md:px-4">Record</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {sortedPlayers.map((player, index) => (
              <motion.tr
                key={player.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-0"
                onClick={() => handlePlayerClick(player)}
              >
                <TableCell className="font-bold py-3 text-center text-muted-foreground px-1 md:px-4">{index + 1}</TableCell>
                <TableCell className="py-3 px-2 md:px-4">
                  <div className="font-black text-sm md:text-base leading-tight">{player.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    {player.type}
                  </div>
                </TableCell>
                <TableCell className="text-right py-3 font-black text-primary text-sm md:text-lg px-2 md:px-4">
                  {player.rating}
                </TableCell>
                <TableCell className="text-right font-mono text-[10px] md:text-xs py-3 hidden sm:table-cell px-2 md:px-4">
                  <span className="text-emerald-500">{player.wins}</span>/
                  <span className="text-red-500">{player.losses}</span>/
                  <span className="text-muted-foreground">{player.draws}</span>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  )
}
