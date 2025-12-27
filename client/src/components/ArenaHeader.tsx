import React from "react"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet"
import { Sidebar } from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { RotateCcw, Pause, Play, Menu, Share2, Copy, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Game, Player } from "@/types"

interface ArenaHeaderProps {
  selectedGame: Game | null;
  isLive: boolean;
  activeVariant: string;
  whitePlayer?: Player;
  blackPlayer?: Player;
  spectatorCount: number;
  handleCopyFen: () => void;
  handleCopyPgn: () => void;
  setBoardOrientation: React.Dispatch<React.SetStateAction<"white" | "black">>;
  handleTogglePause: () => Promise<void>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export function ArenaHeader({
  selectedGame, isLive, activeVariant, whitePlayer, blackPlayer, spectatorCount,
  handleCopyFen, handleCopyPgn, setBoardOrientation, handleTogglePause,
  isMobileMenuOpen, setIsMobileMenuOpen
}: ArenaHeaderProps) {
  return (
    <header className="h-16 border-b border-border px-4 md:px-8 flex items-center justify-between bg-background/50 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="p-6 pb-0 sr-only"><SheetTitle>Navigation</SheetTitle><SheetDescription>Main navigation menu for mobile devices.</SheetDescription></SheetHeader>
            <Sidebar 
              isCollapsed={false} 
              setIsCollapsed={() => {}} 
              mobile 
              onItemClick={() => setIsMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic flex items-center gap-2 md:gap-3 shrink-0">
          ChessLLM <span className={cn(
            "not-italic text-[9px] md:text-[10px] px-2 py-0.5 rounded border tracking-widest transition-colors",
            isLive 
              ? (selectedGame ? (activeVariant === 'chess960' ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-primary bg-primary/10 border-primary/20") : "text-primary bg-primary/10 border-primary/20")
              : "text-muted-foreground bg-muted/10 border-border"
          )}>
            {isLive ? (selectedGame ? (activeVariant === 'chess960' ? 'CHESS 960 ARENA' : 'STANDARD ARENA') : 'ARENA') : (activeVariant === 'chess960' ? '960 HISTORY' : 'HISTORY MODE')}
          </span>
        </h1>
        
        {selectedGame && (
          <div className="flex items-center gap-3 font-black text-[10px] md:text-[11px] uppercase tracking-tighter truncate overflow-hidden">
            <span className="text-muted-foreground">Match:</span>
            <span className="text-foreground truncate">{whitePlayer?.name || '...'}</span>
            <span className="text-primary italic px-1">vs</span>
            <span className="text-foreground truncate">{blackPlayer?.name || '...'}</span>
            {selectedGame.variant === 'chess960' && selectedGame.startPosId !== null && (
              <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[8px] font-black border border-border">
                SP-ID: {selectedGame.startPosId}
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-border text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {spectatorCount}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0 items-center">
        {selectedGame && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            selectedGame.status === 'ongoing' ? "text-green-500 bg-green-500/10 border-green-500/20" :
            selectedGame.status === 'paused' ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
            "text-blue-500 bg-blue-500/10 border-blue-500/20"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", 
              selectedGame.status === 'ongoing' ? "bg-green-500 animate-pulse" :
              selectedGame.status === 'paused' ? "bg-amber-500" :
              "bg-blue-500"
            )} />
            {selectedGame.status}
            {selectedGame.gameOverReason && (
              <span className="ml-1 opacity-70 border-l border-current pl-1.5 leading-none">
                {selectedGame.gameOverReason}
              </span>
            )}
          </div>
        )}

        {selectedGame && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[9px] md:text-[10px] font-black px-2 md:px-3">
                <Share2 className="h-3 w-3 mr-1 md:mr-2" />
                <span className="hidden xs:inline">SHARE</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleCopyFen} className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                <Copy className="mr-2 h-3 w-3" />
                Copy FEN
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyPgn} className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                <FileText className="mr-2 h-3 w-3" />
                Copy PGN
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="outline" size="sm" className="h-8 text-[9px] md:text-[10px] font-black px-2 md:px-3" onClick={() => setBoardOrientation((prev) => prev === 'white' ? 'black' : 'white')}>
          <RotateCcw className="h-3 w-3 mr-1 md:mr-2" />
          <span className="hidden xs:inline">ROTATE</span>
        </Button>
        {selectedGame && (selectedGame.status === 'ongoing' || selectedGame.status === 'paused') && (
          <Button variant="outline" size="sm" className="h-8 text-[9px] md:text-[10px] font-black px-2 md:px-3" onClick={handleTogglePause}>
            {selectedGame.status === 'ongoing' ? (
              <><Pause className="h-3 w-3 mr-1 md:mr-2" /><span className="hidden xs:inline">PAUSE</span></>
            ) : (
              <><Play className="h-3 w-3 mr-1 md:mr-2" /><span className="hidden xs:inline">RESUME</span></>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
