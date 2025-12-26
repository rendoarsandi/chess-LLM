import React, { useState, useCallback } from "react"
import { Sidebar } from "@/components/Sidebar"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"
import { ThinkingPanel } from "@/components/ThinkingPanel"
import { MoveList } from "@/components/MoveList"
import { PlaybackControls } from "@/components/PlaybackControls"
import { AdvantageBar } from "@/components/AdvantageBar"
import { GameResultOverlay } from "@/components/GameResultOverlay"
import { ErrorBoundary } from "./ErrorBoundary"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { RotateCcw, Pause, Play, Menu, Share2, Copy, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Game, Move, Player, ThinkingData } from "@/types"
import type { EngineEvaluation } from "@/lib/stockfish/StockfishWorker"

const STOCKFISH_IDS = [
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013'
];

interface ArenaContentProps {
  whitePlayer?: Player;
  blackPlayer?: Player;
  isMobile: boolean;
  whiteThinking: ThinkingData;
  blackThinking: ThinkingData;
  evaluation: EngineEvaluation | null;
  variations: EngineEvaluation[];
  isThinking: boolean;
  isLive: boolean;
  selectedGame: Game | null;
  currentDisplayFen: string;
  boardOrientation: "white" | "black";
  lastMoveSquares?: { from: string; to: string };
  currentPgn: string;
  showResultOverlay: boolean;
  whitePlayerId: string;
  blackPlayerId: string;
  setWhitePlayerId: (id: string) => void;
  setBlackPlayerId: (id: string) => void;
  isCreatingGame: boolean;
  hasOngoingGame: boolean;
  handleCreateGame: (whiteId: string, blackId: string, variant?: string) => Promise<void>;
  handleTogglePause: () => Promise<void>;
  setShowResultOverlay: (show: boolean) => void;
  setActiveMoveIndex: (index: number | null) => void;
  activeMoveIndex: number | null;
  moves: Move[];
  players: Player[];
  setBoardOrientation: React.Dispatch<React.SetStateAction<"white" | "black">>;
  spectatorCount: number;
  thinkingStatus: 'thinking' | 'idle';
  variant: 'standard' | 'chess960';
}

export function ArenaContent({ 
  whitePlayer, blackPlayer, isMobile, whiteThinking, blackThinking, evaluation, variations, isThinking,
  isLive, selectedGame, currentDisplayFen, boardOrientation, lastMoveSquares, 
  currentPgn, showResultOverlay, whitePlayerId, blackPlayerId, setWhitePlayerId, setBlackPlayerId,
  isCreatingGame, hasOngoingGame, 
  handleCreateGame, handleTogglePause, setShowResultOverlay, setActiveMoveIndex, activeMoveIndex, 
  moves, players, setBoardOrientation, spectatorCount, thinkingStatus, variant
}: ArenaContentProps) {
  const turn = (currentDisplayFen || '').split(' ')[1] || 'w';
  const isWhiteTurn = turn === 'w';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeVariant = selectedGame?.variant || variant;

  const isPlayerNonLLM = useCallback((player?: Player) => {
    return !!(player?.id && STOCKFISH_IDS.includes(player.id));
  }, []);

  const [isWhiteThinkingExpanded, setIsWhiteThinkingExpanded] = useState(() => {
    if (selectedGame?.status === 'ongoing' && isLive) {
      return !isPlayerNonLLM(whitePlayer);
    }
    return true;
  });

  const [isBlackThinkingExpanded, setIsBlackThinkingExpanded] = useState(() => {
    if (selectedGame?.status === 'ongoing' && isLive) {
      return !isPlayerNonLLM(blackPlayer);
    }
    return true;
  });

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentDisplayFen);
    toast.success("FEN copied to clipboard");
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(currentPgn);
    toast.success("PGN copied to clipboard");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
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

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar text-foreground">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-4 gap-8">
          <div className="hidden lg:block h-fit">
            {!isPlayerNonLLM(whitePlayer) && (
              <ThinkingPanel 
                side="white" 
                modelName={selectedGame ? (whitePlayer?.name || 'Loading...') : 'Inactive'} 
                isMobile={isMobile} 
                {...whiteThinking} 
                isThinking={isLive && isWhiteTurn && thinkingStatus === 'thinking'}
              />
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col items-center">
            {!selectedGame ? (
              <div className="w-full flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] border-2 border-dashed border-border rounded-2xl bg-muted/10 p-6 md:p-12 text-center space-y-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                  <Play className="w-8 h-8 md:w-10 md:h-10 fill-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">Ready for Battle?</h2>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-md mx-auto">
                    {hasOngoingGame 
                      ? "A match is currently in progress. You can view it in the arena or history." 
                      : "Select two engines from the controls or visit the History tab to resume a previous encounter."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                   <Button size="lg" className="font-black tracking-widest px-6 md:px-8 text-xs md:text-sm" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)} disabled={isCreatingGame}>
                     {isCreatingGame ? 'STARTING...' : 'START NEW MATCH'}
                   </Button>
                   <Button size="lg" variant="outline" className="font-black tracking-widest px-6 md:px-8 text-xs md:text-sm border-2" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'chess960')} disabled={isCreatingGame}>
                     {isCreatingGame ? 'STARTING...' : 'START CHESS 960'}
                   </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 mb-8 w-full">
                  {!isPlayerNonLLM(whitePlayer) && (
                    <ThinkingPanel 
                      side="white" 
                      modelName={whitePlayer?.name || 'Loading...'} 
                      isMobile={isMobile} 
                      {...whiteThinking} 
                      isThinking={isLive && isWhiteTurn && thinkingStatus === 'thinking'}
                    />
                  )}
                  {!isPlayerNonLLM(blackPlayer) && (
                    <ThinkingPanel 
                      side="black" 
                      modelName={blackPlayer?.name || 'Loading...'} 
                      isMobile={isMobile} 
                      {...blackThinking} 
                      isThinking={isLive && !isWhiteTurn && thinkingStatus === 'thinking'}
                    />
                  )}
                </div>

                <div className={cn("flex w-full justify-center items-start gap-2 md:gap-4", isMobile ? "flex-col items-center" : "flex-row")}>
                                <div className={cn("py-1", isMobile ? "w-full max-w-[300px] md:max-w-none h-6 mb-4 md:mb-6" : "h-[300px] md:h-[400px] lg:h-[500px]")}>
                                  <AdvantageBar 
                                    evaluation={evaluation} 
                                    variations={variations} 
                                    orientation={isMobile ? 'horizontal' : 'vertical'} 
                                    gameStatus={isLive ? selectedGame?.status : 'ongoing'} 
                                    winnerId={selectedGame?.winnerId} 
                                    whitePlayerId={selectedGame?.whitePlayerId}
                                    boardOrientation={boardOrientation}
                                  />
                                </div>
                                    <div className="relative group w-full max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
                    <ErrorBoundary fallback={<div className="aspect-square w-full bg-muted flex items-center justify-center border border-destructive/20 rounded-lg text-[10px] font-black uppercase text-destructive tracking-widest p-4 text-center">Chessboard Error - Reload Recommended</div>}>
                      <ChessboardContainer fen={currentDisplayFen} boardOrientation={boardOrientation} highlightSquares={lastMoveSquares} />
                    </ErrorBoundary>
                    {selectedGame && showResultOverlay && (
                      <GameResultOverlay 
                        winner={selectedGame.winnerId === selectedGame.whitePlayerId ? 'white' : selectedGame.winnerId === selectedGame.blackPlayerId ? 'black' : selectedGame.status === 'draw' ? 'draw' : null}
                        reason={selectedGame.gameOverReason ?? null}
                        whitePlayerName={whitePlayer?.name}
                        blackPlayerName={blackPlayer?.name}
                        onNewGame={() => handleCreateGame(whitePlayerId, blackPlayerId, variant)}
                        onClose={() => setShowResultOverlay(false)}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-6 w-full max-w-[600px]">
                  <PlaybackControls 
                    onFirst={() => setActiveMoveIndex(0)} 
                    onPrev={() => setActiveMoveIndex(activeMoveIndex === null ? Math.max(0, moves.length - 2) : Math.max(0, activeMoveIndex - 1))} 
                    onNext={() => { if (activeMoveIndex !== null) { if (activeMoveIndex === moves.length - 1) setActiveMoveIndex(null); else setActiveMoveIndex(activeMoveIndex + 1); } }} 
                    onLast={() => setActiveMoveIndex(null)} 
                    prevDisabled={moves.length === 0 || activeMoveIndex === 0} 
                    nextDisabled={isLive} 
                  />
                </div>
              </>
            )}

            <div className="mt-8 w-full lg:hidden space-y-4">
              <CollapsibleSection 
                title="White Thinking" 
                className="md:hidden"
                isExpanded={isWhiteThinkingExpanded}
                onExpandedChange={setIsWhiteThinkingExpanded}
              >
                <ThinkingPanel side="white" modelName={whitePlayer?.name || 'Loading...'} isMobile={isMobile} {...whiteThinking} />
              </CollapsibleSection>
              <CollapsibleSection 
                title="Black Thinking" 
                className="md:hidden"
                isExpanded={isBlackThinkingExpanded}
                onExpandedChange={setIsBlackThinkingExpanded}
              >
                <ThinkingPanel side="black" modelName={blackPlayer?.name || 'Loading...'} isMobile={isMobile} {...blackThinking} />
              </CollapsibleSection>

              <CollapsibleSection title="Arena History" defaultExpanded={true}>
                <ErrorBoundary fallback={<div className="p-4 bg-muted text-xs text-destructive font-bold uppercase">Move List Error</div>}>
                  <MoveList 
                    moves={moves} 
                    onMoveClick={setActiveMoveIndex} 
                    selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} 
                    isLive={isLive} 
                    variations={variations}
                    isEngineThinking={isThinking}
                  />
                </ErrorBoundary>
              </CollapsibleSection>
              
              <CollapsibleSection title="Arena Controls">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">White Engine</label>
                    <select value={whitePlayerId} onChange={(e) => setWhitePlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                      <optgroup label="Google Gemini" className="text-primary font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => p.provider === 'gemini').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                      <optgroup label="Groq Arena" className="text-orange-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => p.provider === 'groq').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                      <optgroup label="System Engines" className="text-blue-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => p.provider === 'system').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                      {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).length > 0 && (
                        <optgroup label="Other" className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-background">
                          {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Black Engine</label>
                    <select value={blackPlayerId} onChange={(e) => setBlackPlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                      <optgroup label="Google Gemini" className="text-primary font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => p.provider === 'gemini').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                      <optgroup label="Groq Arena" className="text-orange-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => p.provider === 'groq').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                      <optgroup label="System Engines" className="text-blue-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => p.provider === 'system').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                      {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).length > 0 && (
                        <optgroup label="Other" className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-background">
                          {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="font-black tracking-widest h-10" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'standard')} disabled={isCreatingGame}>
                      {isCreatingGame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                      PLAY STANDARD
                    </Button>
                    <Button variant="outline" className="font-black tracking-widest h-10 border-2" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'chess960')} disabled={isCreatingGame}>
                      {isCreatingGame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <div className="relative mr-2"><Play className="h-4 w-4 fill-current" /><span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-primary text-[4px] font-black text-white">960</span></div>}
                      PLAY CHESS 960
                    </Button>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          <div className="hidden lg:block space-y-8 h-fit lg:col-span-1">
            {!isPlayerNonLLM(blackPlayer) && (
              <ThinkingPanel 
                side="black" 
                modelName={selectedGame ? (blackPlayer?.name || 'Loading...') : 'Inactive'} 
                isMobile={isMobile} 
                {...blackThinking} 
                isThinking={isLive && !isWhiteTurn && thinkingStatus === 'thinking'}
              />
            )}

            {selectedGame && (
              <div className="space-y-4">
                <ErrorBoundary fallback={<div className="p-4 bg-muted text-xs text-destructive font-bold uppercase">Move List Error</div>}>
                  <MoveList 
                    moves={moves} 
                    onMoveClick={setActiveMoveIndex} 
                    selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} 
                    isLive={isLive} 
                    variations={variations}
                    isEngineThinking={isThinking}
                  />
                </ErrorBoundary>

                <div className="pt-2">
                  <PlaybackControls 
                    onFirst={() => setActiveMoveIndex(0)} 
                    onPrev={() => setActiveMoveIndex(activeMoveIndex === null ? Math.max(0, moves.length - 2) : Math.max(0, activeMoveIndex - 1))} 
                    onNext={() => { if (activeMoveIndex !== null) { if (activeMoveIndex === moves.length - 1) setActiveMoveIndex(null); else setActiveMoveIndex(activeMoveIndex + 1); } }} 
                    onLast={() => setActiveMoveIndex(null)} 
                    prevDisabled={moves.length === 0 || activeMoveIndex === 0} 
                    nextDisabled={isLive} 
                  />
                </div>
              </div>
            )}

            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <h2 className="text-xl font-bold uppercase tracking-tighter mb-4">Arena Controls</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">White Engine</label>
                  <select value={whitePlayerId} onChange={(e) => setWhitePlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                    <optgroup label="Google Gemini" className="text-primary font-bold uppercase text-[10px] tracking-widest bg-background">
                      {players.filter(p => p.provider === 'gemini').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                    </optgroup>
                    <optgroup label="Groq Arena" className="text-orange-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                      {players.filter(p => p.provider === 'groq').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                    </optgroup>
                    <optgroup label="System Engines" className="text-blue-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                      {players.filter(p => p.provider === 'system').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                    </optgroup>
                    {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).length > 0 && (
                      <optgroup label="Other" className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Black Engine</label>
                  <select value={blackPlayerId} onChange={(e) => setBlackPlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                    <optgroup label="Google Gemini" className="text-primary font-bold uppercase text-[10px] tracking-widest bg-background">
                      {players.filter(p => p.provider === 'gemini').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                    </optgroup>
                    <optgroup label="Groq Arena" className="text-orange-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                      {players.filter(p => p.provider === 'groq').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                    </optgroup>
                    <optgroup label="System Engines" className="text-blue-500 font-bold uppercase text-[10px] tracking-widest bg-background">
                      {players.filter(p => p.provider === 'system').map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                    </optgroup>
                    {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).length > 0 && (
                      <optgroup label="Other" className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-background">
                        {players.filter(p => !['gemini', 'groq', 'system'].includes(p.provider || '')).map((p) => <option key={p.id} value={p.id} className="text-sm font-medium normal-case bg-background">{p.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Button className="font-black tracking-widest h-10" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'standard')} disabled={isCreatingGame}>
                    {isCreatingGame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                    PLAY STANDARD
                  </Button>
                  <Button variant="outline" className="font-black tracking-widest h-10 border-2" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId, 'chess960')} disabled={isCreatingGame}>
                    {isCreatingGame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <div className="relative mr-2"><Play className="h-4 w-4 fill-current" /><span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-primary text-[4px] font-black text-white">960</span></div>}
                    PLAY CHESS 960
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
