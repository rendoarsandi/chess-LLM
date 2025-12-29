import { useState, useMemo } from 'react'
import type { Game, Player } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Trash2, Eye } from 'lucide-react'

export function GameHistory({
  games,
  players,
  onSelect,
  onDelete,
  onClearAll,
  selectedGameId,
}: {
  games: Game[]
  players: Player[]
  onSelect: (game: Game) => void
  onDelete: (id: string) => void
  onClearAll?: () => void
  selectedGameId?: string
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [variantFilter, setVariantFilter] = useState<string>('all')

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (statusFilter !== 'all' && game.status !== statusFilter) return false
      if (variantFilter !== 'all' && game.variant !== variantFilter) return false
      if (search.trim()) {
        const query = search.toLowerCase()
        const whitePlayer = players.find((p) => p.id === game.whitePlayerId)
        const blackPlayer = players.find((p) => p.id === game.blackPlayerId)
        if (
          !game.id.toLowerCase().includes(query) &&
          !whitePlayer?.name.toLowerCase().includes(query) &&
          !blackPlayer?.name.toLowerCase().includes(query)
        )
          return false
      }
      return true
    })
  }, [games, players, search, statusFilter, variantFilter])

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 md:p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-black text-xl uppercase tracking-tighter italic italic flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Game History
          </h2>
          {onClearAll && games.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Permanently delete all game history?')) onClearAll()
              }}
              className="text-[9px] font-black uppercase tracking-widest text-destructive hover:underline text-left w-fit"
            >
              Clear All History
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Input
            placeholder="Search engines or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-64 text-xs font-bold"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full sm:w-32 text-[10px] font-black uppercase tracking-widest">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL STATUS</SelectItem>
              <SelectItem value="ongoing">ONGOING</SelectItem>
              <SelectItem value="completed">COMPLETED</SelectItem>
              <SelectItem value="draw">DRAW</SelectItem>
            </SelectContent>
          </Select>
          <Select value={variantFilter} onValueChange={setVariantFilter}>
            <SelectTrigger className="h-9 w-full sm:w-32 text-[10px] font-black uppercase tracking-widest">
              <SelectValue placeholder="VARIANT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL VARIANTS</SelectItem>
              <SelectItem value="standard">STANDARD</SelectItem>
              <SelectItem value="chess960">CHESS 960</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest">
                ID
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">
                Matchup
              </TableHead>
              <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-widest">
                Started
              </TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">
                Status
              </TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {filteredGames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    {games.length === 0 ? 'No records found.' : 'No results matching criteria.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGames.map((game) => {
                  const whitePlayer = players.find((p) => p.id === game.whitePlayerId)
                  const blackPlayer = players.find((p) => p.id === game.blackPlayerId)

                  return (
                    <motion.tr
                      key={game.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'group cursor-pointer border-b last:border-0',
                        selectedGameId === game.id ? 'bg-primary/5' : 'hover:bg-muted/30',
                      )}
                      onClick={() => onSelect(game)}
                    >
                      <TableCell className="font-mono text-[10px] font-bold text-muted-foreground">
                        {game.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs md:text-sm">
                              {whitePlayer?.name || '...'}{' '}
                              <span className="text-[10px] text-muted-foreground font-normal mx-1 tracking-tighter uppercase italic">
                                vs
                              </span>{' '}
                              {blackPlayer?.name || '...'}
                            </span>
                            {game.variant === 'chess960' && (
                              <span className="text-[8px] font-black bg-primary/10 text-primary border border-primary/20 px-1 rounded uppercase tracking-tighter">
                                960
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-[10px] font-medium text-muted-foreground">
                        {new Date(game.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'text-[9px] px-2 py-0.5 rounded-full font-black uppercase border',
                            game.status === 'ongoing'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : game.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          {game.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(game)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(game.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
