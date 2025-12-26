import { Sidebar } from "@/components/Sidebar"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { ArenaContent } from "@/components/ArenaContent"
import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react"
import { getGames, getGame, createGame, deleteGame, getMoves, getPlayers, getLeaderboard, pauseGame, resumeGame, clearHistory } from "./api"
import type { Game, Move, Player } from "@/types"
import { useStockfish } from "./lib/stockfish/useStockfish"
import { Menu } from "lucide-react"
import { cn } from "./lib/utils"
import { Routes, Route, useNavigate, useLocation, useParams } from "react-router"
import { toast } from "sonner"
import { useGameSocket } from "./hooks/useGameSocket"
import { useGameBot } from "./hooks/useGameBot"
import { useAnalysisWorker } from "./hooks/useAnalysisWorker"
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet"
import { Button } from "./components/ui/button"
import { generate960Fen, safeNewChess } from "./lib/chess-utils"

// Lazy-loaded components
const Leaderboard = lazy(() => import("@/components/Leaderboard").then(m => ({ default: m.Leaderboard })));
const PlayerProfile = lazy(() => import("@/components/PlayerProfile").then(m => ({ default: m.PlayerProfile })));
const GameHistory = lazy(() => import("@/components/GameHistory").then(m => ({ default: m.GameHistory })));
const AnalysisMode = lazy(() => import("@/components/AnalysisMode").then(m => ({ default: m.AnalysisMode })));
const AdminLogin = lazy(() => import("@/components/AdminLogin").then(m => ({ default: m.AdminLogin })));
const AdminSettings = lazy(() => import("@/components/AdminSettings").then(m => ({ default: m.AdminSettings })));
const TournamentManagement = lazy(() => import("@/components/TournamentManagement").then(m => ({ default: m.TournamentManagement })));
const TournamentList = lazy(() => import("@/components/TournamentList").then(m => ({ default: m.TournamentList })));
const TournamentDetail = lazy(() => import("@/components/TournamentDetail").then(m => ({ default: m.TournamentDetail })));

const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'

function PlayerProfileRoute({ navigate }: { navigate: (path: string) => void }) {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PlayerProfile playerId={id} onBack={() => navigate('/profiles')} />
    </Suspense>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white")
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null)
  const [showResultOverlay, setShowResultOverlay] = useState(true)
  const [lastMoveFromUpdate, setLastMoveFromUpdate] = useState<{ from: string; to: string } | null>(null)

  const { lastUpdate, thinkingStatus, spectatorCount, lastMessage, sendMessage } = useGameSocket(selectedGame?.id)

  const [whitePlayerId, setWhitePlayerId] = useState(STOCKFISH_LOW_ID)
  const [blackPlayerId, setBlackPlayerId] = useState(STOCKFISH_MED_ID)
  const [isCreatingGame, setIsCreatingGame] = useState(false)

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const lastProcessedFenRef = useRef<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const currentVariant = (searchParams.get('variant') === 'chess960' ? 'chess960' : 'standard') as 'standard' | 'chess960';

  useAnalysisWorker(false)

  const handleSelectGame = useCallback((game: Game) => {
    if (!game?.id) return;
    setSelectedGame(game);
    setMoves([]);
    setActiveMoveIndex(null);
    setLastMoveFromUpdate(null);
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

  const handleCreateGame = async (whiteId: string, blackId: string, variant: string = currentVariant) => {
    if (isCreatingGame) return;
    setIsCreatingGame(true);
    setWhitePlayerId(whiteId);
    setBlackPlayerId(blackId);
    setLastMoveFromUpdate(null);
    try {
      const options: { variant?: string, startPosId?: number } = { variant };
      if (variant === 'chess960') options.startPosId = Math.floor(Math.random() * 960);
      const { id } = await createGame(whiteId, blackId, options);
      const newGame = await getGame(id);
      handleSelectGame(newGame);
      await Promise.all([fetchAllGames(), fetchLeaderboard()]);
      setIsSidebarCollapsed(true);
    } catch (err) {
      toast.error("Failed to start match", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    await deleteGame(id);
    if (selectedGame?.id === id) {
      setSelectedGame(null);
      setActiveMoveIndex(null);
      setLastMoveFromUpdate(null);
    }
    fetchAllGames();
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setSelectedGame(null);
      setMoves([]);
      setActiveMoveIndex(null);
      setLastMoveFromUpdate(null);
      fetchAllGames();
      toast.success("Game history cleared");
    } catch {
      toast.error("Failed to clear history");
    }
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
    fetchAllGames();
    fetchPlayers();
    fetchLeaderboard();
  }, [fetchAllGames, fetchPlayers, fetchLeaderboard]);

  useEffect(() => {
    if (!selectedGame) return;
    getMoves(selectedGame.id).then(setMoves);
  }, [selectedGame]);

  useEffect(() => {
    if (lastUpdate && selectedGame) {
      if (lastProcessedFenRef.current === lastUpdate.fen) return;
      lastProcessedFenRef.current = lastUpdate.fen;

      setSelectedGame(prev => {
        if (!prev) return null;
        if (lastUpdate.san) {
          try {
            const chess = safeNewChess(prev.fen);
            const move = chess.move(lastUpdate.san);
            if (move) setLastMoveFromUpdate({ from: move.from, to: move.to });
          } catch {
             if (prev.fen !== lastUpdate.fen) console.warn('Could not derive squares for SAN:', lastUpdate.san);
          }
        }
        return { ...prev, fen: lastUpdate.fen, status: lastUpdate.status, winnerId: lastUpdate.winnerId, gameOverReason: lastUpdate.gameOverReason };
      });
      getMoves(selectedGame.id).then(setMoves);
    }
  }, [lastUpdate, selectedGame]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentDisplayFen = useMemo(() => {
    if (activeMoveIndex === null && selectedGame?.fen) return selectedGame.fen;
    let startFen: string | undefined = undefined;
    if (selectedGame?.variant === 'chess960' && selectedGame.startPosId != null) startFen = generate960Fen(selectedGame.startPosId);
    const chess = safeNewChess(startFen);
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    for (let i = 0; i <= index; i++) try { chess.move(moves[i].move); } catch (e) { console.debug('Move replay failed', e); }
    return chess.fen();
  }, [moves, activeMoveIndex, selectedGame]);

  const currentPgn = useMemo(() => {
    let startFen: string | undefined = undefined;
    if (selectedGame?.variant === 'chess960' && selectedGame.startPosId != null) startFen = generate960Fen(selectedGame.startPosId);
    const chess = safeNewChess(startFen);
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    for (let i = 0; i <= index; i++) try { chess.move(moves[i].move); } catch (e) { console.debug('PGN replay failed', e); }
    return chess.pgn();
  }, [moves, activeMoveIndex, selectedGame]);

  const lastMoveSquares = useMemo(() => {
    if (activeMoveIndex === null && lastMoveFromUpdate) return lastMoveFromUpdate;
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1;
    if (index < 0 || moves.length === 0) return undefined;
    let startFen: string | undefined = undefined;
    if (selectedGame?.variant === 'chess960' && selectedGame.startPosId != null) startFen = generate960Fen(selectedGame.startPosId);
    const chess = safeNewChess(startFen);
    try {
      for (let i = 0; i < index; i++) try { chess.move(moves[i].move); } catch (e) { console.debug('Move history replay failed', e); }
      const move = chess.move(moves[index].move);
      return { from: move.from, to: move.to };
    } catch (e) { console.debug('Failed to derive move squares', e); return undefined; }
  }, [moves, activeMoveIndex, lastMoveFromUpdate, selectedGame]);

  const isLive = activeMoveIndex === null || activeMoveIndex === moves.length - 1;
  useGameBot(selectedGame?.id, lastMessage, sendMessage, isLive && !!selectedGame)
  const { evaluation, variations, isThinking } = useStockfish(currentDisplayFen);

  const whitePlayer = players.find(p => p.id === selectedGame?.whitePlayerId);
  const blackPlayer = players.find(p => p.id === selectedGame?.blackPlayerId);
  const hasOngoingGame = games.some(g => g.status === 'ongoing' || g.status === 'paused');

  const getThinking = useCallback((color: 'white' | 'black') => {
    if (!selectedGame) return {};
    const effectiveMoves = activeMoveIndex === null ? moves : moves.slice(0, activeMoveIndex + 1);
    if (activeMoveIndex === null) {
      const lastMove = moves[moves.length - 1];
      const isThinkingNow = color === 'white' ? ((moves.length === 0 && selectedGame.status === 'ongoing') || (lastMove?.playerColor === 'black' && selectedGame.status === 'ongoing'))
                                              : (lastMove?.playerColor === 'white' && selectedGame.status === 'ongoing');
      if (isThinkingNow) return {};
    }
    const lastMove = [...effectiveMoves].reverse().find(m => m.playerColor === color);
    if (lastMove) {
      let candidates = undefined;
      try { candidates = lastMove.candidates ? JSON.parse(lastMove.candidates) : undefined; } catch (err) { console.error('Failed to parse candidates', err); }
      return { opening: lastMove.opening, candidates, reasoning: lastMove.reasoning, moveNumber: lastMove.moveNumber, moveSAN: lastMove.move };
    }
    return {};
  }, [activeMoveIndex, moves, selectedGame]);

  const whiteThinking = useMemo(() => getThinking('white'), [getThinking]);
  const blackThinking = useMemo(() => getThinking('black'), [getThinking]);

  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] === 'arena') {
      if (segments[1]) {
        if (selectedGame?.id !== segments[1]) getGame(segments[1]).then(game => { if (game) { setSelectedGame(game); setMoves([]); setActiveMoveIndex(null); } }).catch((err) => { console.error('Failed to fetch game', err); navigate('/arena'); });
      } else {
        const matchingGame = games.find(g => g.variant === currentVariant && (g.status === 'ongoing' || g.status === 'paused')) || games.find(g => g.variant === currentVariant);
        if (matchingGame && selectedGame?.id !== matchingGame.id) { setSelectedGame(matchingGame); setMoves([]); setActiveMoveIndex(null); }
      }
    }
  }, [location.pathname, selectedGame, games, navigate, currentVariant]);

  useEffect(() => { if (location.pathname === '/') navigate({ pathname: '/arena', search: location.search }, { replace: true }); }, [location.pathname, location.search, navigate]);

  const arenaProps = {
    whitePlayer, blackPlayer, isMobile, whiteThinking, blackThinking, evaluation, variations, isThinking,
    isLive, selectedGame, currentDisplayFen, boardOrientation, lastMoveSquares,
    currentPgn, showResultOverlay, whitePlayerId, blackPlayerId, setWhitePlayerId, setBlackPlayerId,
    isCreatingGame, hasOngoingGame, handleCreateGame, handleTogglePause,
    setShowResultOverlay, setActiveMoveIndex, activeMoveIndex, moves, players,
    setBoardOrientation, spectatorCount, thinkingStatus, variant: currentVariant
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/arena" element={<ArenaContent {...arenaProps} />} />
          <Route path="/arena/:gameId" element={<ArenaContent {...arenaProps} />} />
          <Route path="/leaderboard" element={
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                <header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0">
                  <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic">LEADERBOARD</h2>
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col gap-2"><h2 className="text-4xl font-black tracking-tighter uppercase italic">Model Rankings</h2><p className="text-muted-foreground font-medium">Comparative performance metrics across all integrated LLM architectures.</p></div>
                    <div className="bg-card rounded-xl border border-border p-6 shadow-xl"><Leaderboard players={leaderboard} onSelectPlayer={(id) => navigate(`/profiles/${id}`)} /></div>
                  </div>
                </div>
            </div>
          } />
          <Route path="/profiles" element={
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
              <header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0">
                  <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic">PROFILES</h2>
              </header>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col gap-2"><h2 className="text-4xl font-black tracking-tighter uppercase italic">PROFILES</h2><p className="text-muted-foreground font-medium">Select a model to view detailed performance metrics and history.</p></div>
                  {[
                      { label: "Google Gemini", color: "text-primary", provider: "gemini", description: "Models from the Google Gemini family." },
                      { label: "Groq Arena", color: "text-orange-500", provider: "groq", description: "Models hosted on Groq's LPU™ platform." },
                      { label: "System Engines", color: "text-blue-500", provider: "system", description: "Classical engines and built-in bots." }
                  ].map(group => {
                      const groupPlayers = players.filter(p => p.type === 'llm' && (p.provider === group.provider));
                      if (groupPlayers.length === 0) return null;
                      return (
                          <div key={group.label} className="space-y-6">
                              <div className={cn("space-y-1 border-l-4 border-current pl-6", group.color)}><h3 className="text-2xl font-black uppercase tracking-tighter italic">{group.label}</h3><p className="text-muted-foreground text-xs font-medium max-w-2xl">{group.description}</p></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupPlayers.map(player => (
                                  <div key={player.id} onClick={() => navigate(`/profiles/${player.id}`)} className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg group">
                                    <div className="flex items-center gap-4 mb-4"><div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{player.name[0]}</div><div><h3 className="font-bold text-lg">{player.name}</h3><p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{player.rating} ELO</p></div></div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase"><div className="p-2 bg-muted rounded"><div className="text-primary">{player.wins}</div><div className="text-muted-foreground">Wins</div></div><div className="p-2 bg-muted rounded"><div className="text-foreground">{player.losses}</div><div className="text-muted-foreground">Loss</div></div><div className="p-2 bg-muted rounded"><div className="text-foreground">{player.draws}</div><div className="text-muted-foreground">Draw</div></div></div>
                                  </div>
                                ))}
                              </div>
                          </div>
                      );
                  })}
                </div>
              </div>
            </div>
          } />
          <Route path="/profiles/:id" element={
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
              <header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0">
                <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet>
                <h2 className="text-xl font-black tracking-tighter uppercase italic">PLAYER PROFILE</h2>
              </header>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar"><div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"><PlayerProfileRoute navigate={navigate} /></div></div>
            </div>
          } />
          <Route path="/history" element={
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
              <header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0">
                <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet>
                <h2 className="text-xl font-black tracking-tighter uppercase italic">HISTORY</h2>
              </header>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col gap-2"><h2 className="text-4xl font-black tracking-tighter uppercase italic">Arena History</h2><p className="text-muted-foreground font-medium">Review past encounters and analyze patterns.</p></div>
                  <div className="bg-card rounded-xl border border-border p-4 md:p-8 shadow-xl"><GameHistory games={games} players={players} selectedGameId={selectedGame?.id} onSelect={(game) => handleSelectGame(game)} onDelete={handleDeleteGame} onClearAll={handleClearHistory} /></div>
                </div>
              </div>
            </div>
          } />
          <Route path="/analysis/:gameId" element={<AnalysisMode />} />
          <Route path="/tournaments" element={
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
               <header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0">
                 <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet>
                 <h2 className="text-xl font-black tracking-tighter uppercase italic">TOURNAMENTS</h2>
               </header>
               <div className="flex-1 overflow-y-auto"><TournamentList /></div>
            </div>
          } />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/settings" element={<ProtectedRoute><div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden"><header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0"><Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet><h2 className="text-xl font-black tracking-tighter uppercase italic">SETTINGS</h2></header><div className="flex-1 overflow-y-auto"><AdminSettings /></div></div></ProtectedRoute>} />
          <Route path="/admin/tournaments" element={<ProtectedRoute><div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden"><header className="h-16 border-b border-border px-4 md:px-8 flex items-center gap-4 bg-background/50 backdrop-blur-md shrink-0"><Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="p-0 w-72"><Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile onItemClick={() => setIsMobileNavOpen(false)} /></SheetContent></Sheet><h2 className="text-xl font-black tracking-tighter uppercase italic">TOURNAMENT MANAGEMENT</h2></header><div className="flex-1 overflow-y-auto"><TournamentManagement /></div></div></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App