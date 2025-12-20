import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Player } from "@/api"

interface LeaderboardProps {
  players: Player[]
}

export function Leaderboard({ players }: LeaderboardProps) {
  // Sort players by rating descending
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating)

  if (players.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground italic">
        No players found. Start some matches!
      </div>
    )
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
          {sortedPlayers.map((player, index) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{player.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {player.type}
                </div>
              </TableCell>
              <TableCell className="text-right">{player.rating}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {player.wins}/{player.losses}/{player.draws}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
