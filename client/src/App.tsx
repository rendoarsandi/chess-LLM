import { Sidebar } from "@/components/Sidebar"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { Button } from "@/components/ui/button"
import { ChessboardContainer } from "@/components/Chessboard"
import { GameHistory } from "@/components/GameHistory"
import { ThinkingPanel } from "@/components/ThinkingPanel"
import { MoveList } from "@/components/MoveList"
import { PlaybackControls } from "@/components/PlaybackControls"
import { AdvantageBar } from "@/components/AdvantageBar"
import { Leaderboard } from "@/components/Leaderboard"
import { PlayerProfile } from "@/components/PlayerProfile"
import { GameResultOverlay } from "@/components/GameResultOverlay"
import { AdminLogin } from "@/components/AdminLogin"
import { AdminSettings } from "@/components/AdminSettings"
import { TournamentManagement } from "@/components/TournamentManagement"
import { TournamentList } from "@/components/TournamentList"
import { TournamentDetail } from "@/components/TournamentDetail"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useEffect, useState, useCallback, useMemo } from "react"
import { getGames, getGame, createGame, deleteGame, getMoves, getPlayers, getLeaderboard, pauseGame, resumeGame } from "./api"
import type { Game, Move, Player } from "./api"
import { Chess } from "chess.js"
import { useStockfish } from "./lib/stockfish/useStockfish"
import type { EngineEvaluation } from "./lib/stockfish/StockfishWorker"
import { RotateCcw, Pause, Play } from "lucide-react"
import { cn } from "./lib/utils"
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { toast } from "sonner"
import type { ThinkingData } from "./types"
import { useGameSocket } from "./hooks/useGameSocket"

const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'

interface PlayerProfileRouteProps {
  navigate: (path: string) => void;
}

function PlayerProfileRoute({ navigate }: PlayerProfileRouteProps) {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PlayerProfile playerId={id} onBack={() => navigate('/profiles')} />;
}

interface ArenaContentProps {
  whitePlayer?: Player;
  blackPlayer?: Player;
  isMobile: boolean;
  whiteThinking: ThinkingData;
  blackThinking: ThinkingData;
  evaluation: EngineEvaluation | null;
  variations: EngineEvaluation[];
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
  handleCreateGame: (whiteId: string, blackId: string) => Promise<void>;
  handleTogglePause: () => Promise<void>;
  setShowResultOverlay: (show: boolean) => void;
  setActiveMoveIndex: (index: number | null) => void;
  activeMoveIndex: number | null;
  moves: Move[];
  players: Player[];
  setBoardOrientation: React.Dispatch<React.SetStateAction<"white" | "black">>;
  spectatorCount: number;
  thinkingStatus: 'thinking' | 'idle';
}

function ArenaContent({ 
  whitePlayer, blackPlayer, isMobile, whiteThinking, blackThinking, evaluation, variations, 
  isLive, selectedGame, currentDisplayFen, boardOrientation, lastMoveSquares, 
  currentPgn, showResultOverlay, whitePlayerId, blackPlayerId, setWhitePlayerId, setBlackPlayerId, 
  isCreatingGame, hasOngoingGame, 
  handleCreateGame, handleTogglePause, setShowResultOverlay, setActiveMoveIndex, activeMoveIndex, 
  moves, players, setBoardOrientation, spectatorCount, thinkingStatus
}: ArenaContentProps) {
  const turn = currentDisplayFen.split(' ')[1];
  const isWhiteTurn = turn === 'w';

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            ChessLLM <span className="text-primary not-italic text-[10px] bg-primary/10 px-2 py-0.5 rounded border border-primary/20 tracking-widest">ARENA</span>
          </h1>
          {selectedGame && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {spectatorCount} Spectators
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black" onClick={() => setBoardOrientation((prev) => prev === 'white' ? 'black' : 'white')}>
            <RotateCcw className="h-3 w-3 mr-2" />
            ROTATE
          </Button>
          {selectedGame && (selectedGame.status === 'ongoing' || selectedGame.status === 'paused') && (
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-black" onClick={handleTogglePause}>
              {selectedGame.status === 'ongoing' ? (
                <><Pause className="h-3 w-3 mr-2" />PAUSE</>
              ) : (
                <><Play className="h-3 w-3 mr-2" />RESUME</>
              )}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-4 gap-8">
          <div className="hidden lg:block h-fit">
            <ThinkingPanel 
              side="white" 
              modelName={selectedGame ? (whitePlayer?.name || 'Loading...') : 'Inactive'} 
              isMobile={isMobile} 
              {...whiteThinking} 
              isThinking={isLive && isWhiteTurn && thinkingStatus === 'thinking'}
            />
          </div>

          <div className="lg:col-span-2 flex flex-col items-center">
            {!selectedGame ? (
              <div className="w-full flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-border rounded-2xl bg-muted/10 p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                  <Play className="w-10 h-10 fill-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">Ready for Battle?</h2>
                  <p className="text-muted-foreground font-medium max-w-md mx-auto">
                    {hasOngoingGame 
                      ? "A match is currently in progress. You can view it in the arena or history." 
                      : "Select two engines from the controls or visit the History tab to resume a previous encounter."}
                  </p>
                </div>
                <div className="flex gap-4">
                   <Button size="lg" className="font-black tracking-widest px-8" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)} disabled={isCreatingGame || hasOngoingGame}>
                     {isCreatingGame ? 'STARTING...' : hasOngoingGame ? 'MATCH IN PROGRESS' : 'START NEW MATCH'}
                   </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 mb-8 w-full">
                  <ThinkingPanel 
                    side="white" 
                    modelName={whitePlayer?.name || 'Loading...'} 
                    isMobile={isMobile} 
                    {...whiteThinking} 
                    isThinking={isLive && isWhiteTurn && thinkingStatus === 'thinking'}
                  />
                  <ThinkingPanel 
                    side="black" 
                    modelName={blackPlayer?.name || 'Loading...'} 
                    isMobile={isMobile} 
                    {...blackThinking} 
                    isThinking={isLive && !isWhiteTurn && thinkingStatus === 'thinking'}
                  />
                </div>

                <div className={cn("flex w-full justify-center items-start gap-2 md:gap-4", isMobile ? "flex-col items-center" : "flex-row")}>
                                <div className={cn("py-1", isMobile ? "w-full max-w-[300px] h-6 mb-2" : "h-[300px] md:h-[400px] lg:h-[500px]")}>
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
                      <ChessboardContainer fen={currentDisplayFen} boardOrientation={boardOrientation} highlightSquares={lastMoveSquares} gameId={selectedGame?.id} pgn={currentPgn} />
                    </ErrorBoundary>
                    {selectedGame && showResultOverlay && (
                      <GameResultOverlay status={selectedGame.status} winnerId={selectedGame.winnerId} whitePlayerId={selectedGame.whitePlayerId} whitePlayerName={whitePlayer?.name} blackPlayerName={blackPlayer?.name} reason={selectedGame.gameOverReason} onNewMatch={() => handleCreateGame(whitePlayerId, blackPlayerId)} onClose={() => setShowResultOverlay(false)} />
                    )}
                    {!isLive && <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black shadow-lg animate-pulse">HISTORY MODE</div>}
                  </div>
                </div>

                <div className="mt-6 w-full max-w-[600px] space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-sm">Status: <span className="text-primary font-black uppercase tracking-tighter ml-1">{selectedGame.status}</span></span>
                        {(selectedGame.status === 'ongoing' || selectedGame.status === 'paused') && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] font-black" onClick={handleTogglePause}>
                            {selectedGame.status === 'ongoing' ? <><Pause className="h-3 w-3 mr-1" /> PAUSE</> : <><Play className="h-3 w-3 mr-1" /> RESUME</>}
                          </Button>
                        )}
                      </div>
                      {!isLive && <Button size="sm" variant="secondary" className="h-7 text-[10px] font-black tracking-widest" onClick={() => setActiveMoveIndex(null)}>RETURN TO LIVE</Button>}
                    </div>
                  </div>
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
              <CollapsibleSection title="White Thinking" className="md:hidden">
                <ThinkingPanel side="white" modelName={whitePlayer?.name || 'Loading...'} isMobile={isMobile} {...whiteThinking} />
              </CollapsibleSection>
              <CollapsibleSection title="Black Thinking" className="md:hidden">
                <ThinkingPanel side="black" modelName={blackPlayer?.name || 'Loading...'} isMobile={isMobile} {...blackThinking} />
              </CollapsibleSection>
              <CollapsibleSection title="Move List">
                <ErrorBoundary fallback={<div className="p-4 bg-muted text-xs text-destructive font-bold uppercase">Move List Error</div>}>
                  <MoveList moves={moves} onMoveClick={setActiveMoveIndex} selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} isLive={isLive} />
                </ErrorBoundary>
              </CollapsibleSection>
              <CollapsibleSection title="Arena Controls">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">White Engine</label>
                    <select value={whitePlayerId} onChange={(e) => setWhitePlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                      {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Black Engine</label>
                    <select value={blackPlayerId} onChange={(e) => setBlackPlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                      {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <Button className="w-full font-black tracking-widest" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)} disabled={isCreatingGame || hasOngoingGame}>
                    {isCreatingGame ? 'STARTING...' : hasOngoingGame ? 'MATCH IN PROGRESS' : 'LAUNCH MATCH'}
                  </Button>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          <div className="hidden lg:block space-y-8 h-fit lg:col-span-1">
            <ThinkingPanel 
              side="black" 
              modelName={selectedGame ? (blackPlayer?.name || 'Loading...') : 'Inactive'} 
              isMobile={isMobile} 
              {...blackThinking} 
              isThinking={isLive && !isWhiteTurn && thinkingStatus === 'thinking'}
            />
            {selectedGame && (
              <ErrorBoundary fallback={<div className="p-4 bg-muted text-xs text-destructive font-bold uppercase">Move List Error</div>}>
                <MoveList moves={moves} onMoveClick={setActiveMoveIndex} selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} isLive={isLive} />
              </ErrorBoundary>
            )}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <h2 className="text-xl font-bold uppercase tracking-tighter mb-4">Arena Controls</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">White Engine</label>
                  <select value={whitePlayerId} onChange={(e) => setWhitePlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                    {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Black Engine</label>
                  <select value={blackPlayerId} onChange={(e) => setBlackPlayerId(e.target.value)} className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all">
                    {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <Button className="w-full font-black tracking-widest" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)} disabled={isCreatingGame || hasOngoingGame}>
                  {isCreatingGame ? 'STARTING...' : hasOngoingGame ? 'MATCH IN PROGRESS' : 'LAUNCH MATCH'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white")
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null)
  const [showResultOverlay, setShowResultOverlay] = useState(true)

  const { lastUpdate, thinkingStatus, spectatorCount } = useGameSocket(selectedGame?.id)

  const [whitePlayerId, setWhitePlayerId] = useState(GEMINI_3_0_ID)
  const [blackPlayerId, setBlackPlayerId] = useState(RANDOM_BOT_ID)
  const [isCreatingGame, setIsCreatingGame] = useState(false)

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGame(game);
    setMoves([]);
    setActiveMoveIndex(null);
    setShowResultOverlay(true);
    navigate(`/arena/${game.id}`);
  }, [navigate]);

  const fetchAllGames = useCallback(async () => {
    const allGames = await getGames();
    setGames(allGames);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    const allPlayers = await getPlayers();
    setPlayers(allPlayers);
  }, []);

  const handleCreateGame = async (whiteId: string, blackId: string) => {
    if (isCreatingGame) return;
    if (hasOngoingGame) {
      toast.error("A match is already in progress.", {
        description: "Please complete or delete the current match before starting a new one."
      });
      return;
    }
    setIsCreatingGame(true);
    setWhitePlayerId(whiteId);
    setBlackPlayerId(blackId);
    try {
      const { id } = await createGame(whiteId, blackId);
      const newGame = await getGame(id);
      handleSelectGame(newGame);
      await fetchAllGames();
      await fetchLeaderboard();
      // Collapse sidebar on game start
      setIsSidebarCollapsed(true);
    } catch {
      console.error("Error creating game");
      toast.error("Failed to start match. Please try again.");
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    await deleteGame(id);
    if (selectedGame?.id === id) {
      setSelectedGame(null);
      setActiveMoveIndex(null);
    }
    fetchAllGames();
  };

  const handleTogglePause = async () => {
    if (!selectedGame) return;
    if (selectedGame.status === 'ongoing') await pauseGame(selectedGame.id);
    else if (selectedGame.status === 'paused') await resumeGame(selectedGame.id);
    const updated = await getGame(selectedGame.id);
    setSelectedGame(updated);
    fetchAllGames();
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchAllGames();
      await fetchPlayers();
      await fetchLeaderboard();
    };
    initFetch();
  }, [fetchAllGames, fetchPlayers, fetchLeaderboard]);

  useEffect(() => {
    if (!selectedGame) return;
    const fetchMovesData = async () => {
      const data = await getMoves(selectedGame.id);
      setMoves(data);
    };
    fetchMovesData();
  }, [selectedGame]);

  useEffect(() => {
    if (lastUpdate && selectedGame) {
      setSelectedGame(prev => prev ? ({
        ...prev,
        fen: lastUpdate.fen,
        status: lastUpdate.status,
        winnerId: lastUpdate.winnerId,
        gameOverReason: lastUpdate.gameOverReason
      }) : null);
      
      // Refresh moves to get thinking data and full history
      getMoves(selectedGame.id).then(setMoves);
    }
  }, [lastUpdate, selectedGame?.id]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentDisplayFen = useMemo(() => {
    const chess = new Chess();
    if (moves.length === 0) return chess.fen();
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    for (let i = 0; i <= index; i++) {
      try { chess.move(moves[i].move); } catch { /* ignore */ }
    }
    return chess.fen();
  }, [moves, activeMoveIndex]);

  const currentPgn = useMemo(() => {
    const chess = new Chess();
    if (moves.length === 0) return "";
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    for (let i = 0; i <= index; i++) {
      try { chess.move(moves[i].move); } catch { /* ignore */ }
    }
    return chess.pgn();
  }, [moves, activeMoveIndex]);

  const lastMoveSquares = useMemo(() => {
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    if (index < 0 || moves.length === 0) return undefined;
    const chess = new Chess();
    try {
      for (let i = 0; i < index; i++) {
        try { chess.move(moves[i].move); } catch { /* ignore */ }
      }
      const move = chess.move(moves[index].move);
      return { from: move.from, to: move.to };
    } catch {
      return undefined;
    }
  }, [moves, activeMoveIndex]);

  const isLive = activeMoveIndex === null || activeMoveIndex === moves.length - 1;
  const { evaluation, variations } = useStockfish(currentDisplayFen);
  const whitePlayer = players.find(p => p.id === selectedGame?.whitePlayerId);
  const blackPlayer = players.find(p => p.id === selectedGame?.blackPlayerId);
  const hasOngoingGame = games.some(g => g.status === 'ongoing' || g.status === 'paused');

  const whiteThinking = useMemo(() => {
    if (!selectedGame) return {};
    const effectiveMoves = activeMoveIndex === null ? moves : moves.slice(0, activeMoveIndex + 1);
    
    // In live mode, check if currently thinking
    if (activeMoveIndex === null) {
      const lastMove = moves[moves.length - 1];
      const isWhiteThinking = (moves.length === 0 && selectedGame.status === 'ongoing') || (lastMove?.playerColor === 'black' && selectedGame.status === 'ongoing');
      if (isWhiteThinking) return {};
    }

    const whiteLastMove = [...effectiveMoves].reverse().find(m => m.playerColor === 'white');
    if (whiteLastMove) {
      let candidates = undefined;
      try { candidates = whiteLastMove.candidates ? JSON.parse(whiteLastMove.candidates) : undefined; } catch { /* ignore */ }
      return { 
        opening: whiteLastMove.opening, 
        candidates, 
        reasoning: whiteLastMove.reasoning,
        moveNumber: whiteLastMove.moveNumber,
        moveSAN: whiteLastMove.move
      };
    }
    return {};
  }, [moves, selectedGame, activeMoveIndex]);

  const blackThinking = useMemo(() => {
    if (!selectedGame) return {};
    const effectiveMoves = activeMoveIndex === null ? moves : moves.slice(0, activeMoveIndex + 1);

    // In live mode, check if currently thinking
    if (activeMoveIndex === null) {
      const lastMove = moves[moves.length - 1];
      const isBlackThinking = lastMove?.playerColor === 'white' && selectedGame.status === 'ongoing';
      if (isBlackThinking) return {};
    }

    const blackLastMove = [...effectiveMoves].reverse().find(m => m.playerColor === 'black');
    if (blackLastMove) {
      let candidates = undefined;
      try { candidates = blackLastMove.candidates ? JSON.parse(blackLastMove.candidates) : undefined; } catch { /* ignore */ }
      return { 
        opening: blackLastMove.opening, 
        candidates, 
        reasoning: blackLastMove.reasoning,
        moveNumber: blackLastMove.moveNumber,
        moveSAN: blackLastMove.move
      };
    }
    return {};
  }, [moves, selectedGame, activeMoveIndex]);

  useEffect(() => {
    if (moves.length === 0) return;
    const latestMove = moves[moves.length - 1];
    const chess = new Chess();
    try {
      for (let i = 0; i < moves.length - 1; i++) {
        try { chess.move(moves[i].move); } catch { /* ignore */ }
      }
      chess.move(latestMove.move);
    } catch {
      toast.error(`Illegal move detected: ${latestMove.move}`, {
        description: "The game engine attempted an invalid strategic maneuver.",
        id: `illegal-move-${latestMove.id}`
      });
    }
  }, [moves]);

  // Handle routing synchronization
  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const path = segments[0] || 'arena';

    if (path === 'arena') {
      if (segments[1]) {
        // We have an ID
        if (selectedGame?.id !== segments[1]) {
          getGame(segments[1]).then(game => {
            if (game) {
              setSelectedGame(game);
              setMoves([]);
              setActiveMoveIndex(null);
            }
          }).catch(() => navigate('/arena'));
        }
      } else {
        // No ID, try to auto-select an ongoing game, otherwise clear
        const ongoingGame = games.find(g => g.status === 'ongoing' || g.status === 'paused');
        if (ongoingGame) {
          handleSelectGame(ongoingGame);
        } else if (selectedGame !== null) {
          setSelectedGame(null);
          setMoves([]);
          setActiveMoveIndex(null);
        }
      }
    }
  }, [location.pathname, selectedGame?.id, selectedGame, navigate, games, handleSelectGame]);

  // Sync selectedGame with periodically fetched games list to catch status changes
  useEffect(() => {
    if (selectedGame) {
      const updated = games.find(g => g.id === selectedGame.id);
      if (updated && (
        updated.status !== selectedGame.status || 
        updated.winnerId !== selectedGame.winnerId ||
        updated.gameOverReason !== selectedGame.gameOverReason
      )) {
        setSelectedGame(updated);
      }
    }
  }, [games, selectedGame]);

  // Default game selection logic
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/arena', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <ErrorBoundary fallback={<div className="w-16 h-full border-r border-destructive/20 bg-destructive/5 flex items-center justify-center p-2 text-[8px] font-black text-destructive uppercase writing-vertical-lr tracking-widest">Navigation Error</div>}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </ErrorBoundary>

      <Routes>
        <Route path="/" element={<Navigate to="/arena" replace />} />
        <Route path="/arena" element={
          <ArenaContent 
            whitePlayer={whitePlayer} blackPlayer={blackPlayer} isMobile={isMobile}
            whiteThinking={whiteThinking} blackThinking={blackThinking}
            evaluation={evaluation} variations={variations}
            isLive={isLive} selectedGame={selectedGame} currentDisplayFen={currentDisplayFen}
            boardOrientation={boardOrientation} lastMoveSquares={lastMoveSquares}
            currentPgn={currentPgn} showResultOverlay={showResultOverlay}
            whitePlayerId={whitePlayerId} blackPlayerId={blackPlayerId}
            setWhitePlayerId={setWhitePlayerId} setBlackPlayerId={setBlackPlayerId}
            isCreatingGame={isCreatingGame} hasOngoingGame={hasOngoingGame}
            handleCreateGame={handleCreateGame} handleTogglePause={handleTogglePause}
            setShowResultOverlay={setShowResultOverlay} setActiveMoveIndex={setActiveMoveIndex}
            activeMoveIndex={activeMoveIndex} moves={moves} players={players}
            setBoardOrientation={setBoardOrientation} spectatorCount={spectatorCount}
            thinkingStatus={thinkingStatus}
          />
        } />
        <Route path="/arena/:gameId" element={
          <ArenaContent 
            whitePlayer={whitePlayer} blackPlayer={blackPlayer} isMobile={isMobile}
            whiteThinking={whiteThinking} blackThinking={blackThinking}
            evaluation={evaluation} variations={variations}
            isLive={isLive} selectedGame={selectedGame} currentDisplayFen={currentDisplayFen}
            boardOrientation={boardOrientation} lastMoveSquares={lastMoveSquares}
            currentPgn={currentPgn} showResultOverlay={showResultOverlay}
            whitePlayerId={whitePlayerId} blackPlayerId={blackPlayerId}
            setWhitePlayerId={setWhitePlayerId} setBlackPlayerId={setBlackPlayerId}
            isCreatingGame={isCreatingGame} hasOngoingGame={hasOngoingGame}
            handleCreateGame={handleCreateGame} handleTogglePause={handleTogglePause}
            setShowResultOverlay={setShowResultOverlay} setActiveMoveIndex={setActiveMoveIndex}
            activeMoveIndex={activeMoveIndex} moves={moves} players={players}
            setBoardOrientation={setBoardOrientation} spectatorCount={spectatorCount}
            thinkingStatus={thinkingStatus}
          />
        } />
        <Route path="/leaderboard" element={
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2"><h2 className="text-4xl font-black tracking-tighter uppercase italic">Model Rankings</h2><p className="text-muted-foreground font-medium">Comparative performance metrics across all integrated LLM architectures.</p></div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-xl"><Leaderboard players={leaderboard} onSelectPlayer={(id) => navigate(`/profiles/${id}`)} /></div>
            </div>
          </div>
        } />
        <Route path="/profiles" element={
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2"><h2 className="text-4xl font-black tracking-tighter uppercase italic">PROFILES</h2><p className="text-muted-foreground font-medium">Select a model to view detailed performance metrics and history.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.filter(p => p.type === 'llm').map(player => (
                  <div key={player.id} onClick={() => navigate(`/profiles/${player.id}`)} className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{player.name[0]}</div>
                      <div><h3 className="font-bold text-lg">{player.name}</h3><p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{player.rating} ELO</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase">
                      <div className="p-2 bg-muted rounded"><div className="text-primary">{player.wins}</div><div className="text-muted-foreground">Wins</div></div>
                      <div className="p-2 bg-muted rounded"><div className="text-foreground">{player.losses}</div><div className="text-muted-foreground">Loss</div></div>
                      <div className="p-2 bg-muted rounded"><div className="text-foreground">{player.draws}</div><div className="text-muted-foreground">Draw</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        } />
        <Route path="/profiles/:id" element={<div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar"><div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"><PlayerProfileRoute navigate={navigate} /></div></div>} />
        <Route path="/history" element={
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2"><h2 className="text-4xl font-black tracking-tighter uppercase italic">Arena History</h2><p className="text-muted-foreground font-medium">Review past encounters and analyze model decision patterns.</p></div>
              <div className="bg-card rounded-xl border border-border p-8 shadow-xl"><GameHistory games={games} players={players} selectedGameId={selectedGame?.id} onSelect={(game) => handleSelectGame(game)} onDelete={handleDeleteGame} /></div>
            </div>
          </div>
        } />
        <Route path="/tournaments" element={<TournamentList />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin/tournaments" element={
          <ProtectedRoute>
            <TournamentManagement />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

export default App
