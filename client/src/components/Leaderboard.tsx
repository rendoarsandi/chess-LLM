import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Player } from "@/api"
import { useState } from "react"
import { PlayerProfile } from "./PlayerProfile"
import { motion, AnimatePresence } from "framer-motion"

interface LeaderboardProps {
  players: Player[]
}

export function Leaderboard({ players }: LeaderboardProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

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
    setSelectedPlayer(player)
    setIsProfileOpen(true)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">ELO</TableHead>
            <TableHead className="text-right">W/L/D</TableHead>
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
                <TableCell className="font-medium py-3">{index + 1}</TableCell>
                <TableCell className="py-3">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {player.type}
                  </div>
                </TableCell>
                <TableCell className="text-right py-3 font-bold text-primary">{player.rating}</TableCell>
                <TableCell className="text-right font-mono text-xs py-3">
                  {player.wins}/{player.losses}/{player.draws}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>

      <PlayerProfile 
        player={selectedPlayer}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />
    </div>
  )
}
