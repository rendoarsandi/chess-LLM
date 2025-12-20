import { useState, useEffect } from "react"
import { getHeadToHead, type HeadToHeadRecord } from "@/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"

interface HeadToHeadTableProps {
  playerId: string
}

export function HeadToHeadTable({ playerId }: HeadToHeadTableProps) {
  const [records, setRecords] = useState<HeadToHeadRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHeadToHead(playerId)
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border italic text-muted-foreground text-sm">
        No head-to-head records found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Head-to-Head Statistics</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-[10px] font-black uppercase tracking-widest px-2 md:px-4">Opponent</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-1 md:px-4">W</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-1 md:px-4">L</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-1 md:px-4 hidden sm:table-cell">D</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-2 md:px-4">Win %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const total = record.wins + record.losses + record.draws
              const winRate = total > 0 ? Math.round((record.wins / total) * 100) : 0
              
              return (
                <TableRow key={record.opponentId} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-bold py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm">
                    {record.opponentName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-500 font-bold px-1 md:px-4 text-xs md:text-sm">{record.wins}</TableCell>
                  <TableCell className="text-right font-mono text-red-500 font-bold px-1 md:px-4 text-xs md:text-sm">{record.losses}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground font-bold px-1 md:px-4 hidden sm:table-cell text-xs md:text-sm">{record.draws}</TableCell>
                  <TableCell className="text-right font-mono font-black px-2 md:px-4 text-xs md:text-sm">{winRate}%</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
