import { useState, useMemo } from "react";
import type { Game, Player } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export function GameHistory({ 
  games, 
  players,
  onSelect, 
  onDelete, 
  selectedGameId 
}: { 
  games: Game[], 
  players: Player[],
  onSelect: (game: Game) => void,
  onDelete: (id: string) => void,
  selectedGameId?: string 
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Filter by status
      if (statusFilter !== "all" && game.status !== statusFilter) {
        return false;
      }

      // Filter by search (id or player names)
      if (search.trim()) {
        const query = search.toLowerCase();
        const whitePlayer = players.find(p => p.id === game.whitePlayerId);
        const blackPlayer = players.find(p => p.id === game.blackPlayerId);
        
        const matchesId = game.id.toLowerCase().includes(query);
        const matchesWhite = whitePlayer?.name.toLowerCase().includes(query);
        const matchesBlack = blackPlayer?.name.toLowerCase().includes(query);

        if (!matchesId && !matchesWhite && !matchesBlack) {
          return false;
        }
      }

      return true;
    });
  }, [games, players, search, statusFilter]);

  return (
    <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden flex flex-col h-full max-h-[600px]">
      <div className="p-4 border-b border-border bg-muted/50 space-y-4">
        <h2 className="font-semibold text-lg">Game History</h2>
        
        <div className="space-y-2">
          <Input 
            placeholder="Search games..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="draw">Draw</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="divide-y divide-border overflow-y-auto flex-1">
        {filteredGames.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {games.length === 0 ? "No games found." : "No games match your filters."}
          </div>
        )}
        <AnimatePresence initial={false}>
          {filteredGames.map((game) => {
            const whitePlayer = players.find(p => p.id === game.whitePlayerId);
            const blackPlayer = players.find(p => p.id === game.blackPlayerId);

            return (
              <motion.div 
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`p-4 flex items-center justify-between hover:bg-muted/30 transition-colors ${selectedGameId === game.id ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {whitePlayer?.name || '...'} vs {blackPlayer?.name || '...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{game.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>{new Date(game.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase border ${
                      game.status === 'ongoing' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      game.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                      'bg-muted text-muted-foreground border-border'
                    }`}>
                      {game.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-4 text-xs" onClick={() => onSelect(game)}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 px-4 text-xs text-destructive hover:bg-destructive/10" onClick={() => onDelete(game.id)}>
                    Delete
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}