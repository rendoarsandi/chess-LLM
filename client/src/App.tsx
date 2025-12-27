import { LoadingSpinner } from "@/components/LoadingSpinner"
import { ArenaContent } from "@/components/ArenaContent"
import { ArenaHeader } from "@/components/ArenaHeader"
import { useEffect, lazy, Suspense } from "react"
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router"
import { PageLayout } from "./components/PageLayout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useArenaState } from "./hooks/useArenaState"
import { cn } from "./lib/utils"
import { toast } from "sonner"

// Lazy-loaded components
const Leaderboard = lazy(() => import("@/components/Leaderboard").then(m => ({ default: m.Leaderboard })));
const PlayerProfile = lazy(() => import("@/components/PlayerProfile").then(m => ({ default: m.PlayerProfile })));
const GameHistory = lazy(() => import("@/components/GameHistory").then(m => ({ default: m.GameHistory })));
const AnalysisMode = lazy(() => import("@/components/AnalysisMode").then(m => ({ default: m.AnalysisMode })));
const AdminSettings = lazy(() => import("@/components/AdminSettings").then(m => ({ default: m.AdminSettings })));
const TournamentManagement = lazy(() => import("@/components/TournamentManagement").then(m => ({ default: m.TournamentManagement })));
const TournamentList = lazy(() => import("@/components/TournamentList").then(m => ({ default: m.TournamentList })));
const TournamentDetail = lazy(() => import("@/components/TournamentDetail").then(m => ({ default: m.TournamentDetail })));

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
  const state = useArenaState();

  useEffect(() => { 
    if (location.pathname === '/') navigate({ pathname: '/arena', search: location.search }, { replace: true }); 
  }, [location.pathname, location.search, navigate]);

  const commonLayoutProps = {
    isSidebarCollapsed: state.isSidebarCollapsed,
    setIsSidebarCollapsed: state.setIsSidebarCollapsed
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/arena" element={
          <PageLayout 
            {...commonLayoutProps} 
            customHeader={({ isMobileMenuOpen, setIsMobileMenuOpen }) => (
              <ArenaHeader 
                selectedGame={state.selectedGame}
                isLive={state.isLive}
                activeVariant={state.selectedGame?.variant || state.variant}
                whitePlayer={state.whitePlayer}
                blackPlayer={state.blackPlayer}
                spectatorCount={state.spectatorCount}
                handleCopyFen={() => {
                  navigator.clipboard.writeText(state.currentDisplayFen);
                  toast.success("FEN copied to clipboard");
                }}
                handleCopyPgn={() => {
                  navigator.clipboard.writeText(state.currentPgn);
                  toast.success("PGN copied to clipboard");
                }}
                setBoardOrientation={state.setBoardOrientation}
                handleTogglePause={state.handleTogglePause}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
            )}
          >
            <ArenaContent {...state} />
          </PageLayout>
        } />
        <Route path="/arena/:gameId" element={
          <PageLayout 
            {...commonLayoutProps} 
            customHeader={({ isMobileMenuOpen, setIsMobileMenuOpen }) => (
              <ArenaHeader 
                selectedGame={state.selectedGame}
                isLive={state.isLive}
                activeVariant={state.selectedGame?.variant || state.variant}
                whitePlayer={state.whitePlayer}
                blackPlayer={state.blackPlayer}
                spectatorCount={state.spectatorCount}
                handleCopyFen={() => {
                  navigator.clipboard.writeText(state.currentDisplayFen);
                  toast.success("FEN copied to clipboard");
                }}
                handleCopyPgn={() => {
                  navigator.clipboard.writeText(state.currentPgn);
                  toast.success("PGN copied to clipboard");
                }}
                setBoardOrientation={state.setBoardOrientation}
                handleTogglePause={state.handleTogglePause}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
            )}
          >
            <ArenaContent {...state} />
          </PageLayout>
        } />
        
        <Route path="/leaderboard" element={
          <PageLayout {...commonLayoutProps} title="LEADERBOARD">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">Model Rankings</h2>
                  <p className="text-muted-foreground font-medium">Comparative performance metrics across all integrated LLM architectures.</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6 shadow-xl">
                  <Leaderboard players={state.leaderboard} onSelectPlayer={(id) => navigate(`/profiles/${id}`)} />
                </div>
              </div>
            </div>
          </PageLayout>
        } />

        <Route path="/profiles" element={
          <PageLayout {...commonLayoutProps} title="PROFILES">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">PROFILES</h2>
                  <p className="text-muted-foreground font-medium">Select a model to view detailed performance metrics and history.</p>
                </div>
                {[
                  { label: "Google Gemini", color: "text-primary", provider: "gemini", description: "Models from the Google Gemini family." },
                  { label: "Groq Arena", color: "text-orange-500", provider: "groq", description: "Models hosted on Groq's LPU™ platform." },
                  { label: "System Engines", color: "text-blue-500", provider: "system", description: "Classical engines and built-in bots." }
                ].map(group => {
                  const groupPlayers = state.players.filter(p => p.type === 'llm' && p.provider === group.provider);
                  if (groupPlayers.length === 0) return null;
                  return (
                    <div key={group.label} className="space-y-6">
                      <div className={cn("space-y-1 border-l-4 border-current pl-6", group.color)}>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">{group.label}</h3>
                        <p className="text-muted-foreground text-xs font-medium max-w-2xl">{group.description}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupPlayers.map(player => (
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
                  );
                })}
              </div>
            </div>
          </PageLayout>
        } />

        <Route path="/profiles/:id" element={
          <PageLayout {...commonLayoutProps} title="PLAYER PROFILE">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PlayerProfileRoute navigate={navigate} />
              </div>
            </div>
          </PageLayout>
        } />

        <Route path="/history" element={
          <PageLayout {...commonLayoutProps} title="HISTORY">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">Arena History</h2>
                  <p className="text-muted-foreground font-medium">Review past encounters and analyze patterns.</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 md:p-8 shadow-xl">
                  <GameHistory games={state.games} players={state.players} selectedGameId={state.selectedGame?.id} onSelect={(game) => state.handleSelectGame(game)} onDelete={state.handleDeleteGame} onClearAll={state.handleClearHistory} />
                </div>
              </div>
            </div>
          </PageLayout>
        } />

        <Route path="/tournaments" element={
          <PageLayout {...commonLayoutProps} title="TOURNAMENTS">
            <div className="flex-1 overflow-y-auto"><TournamentList /></div>
          </PageLayout>
        } />
        
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/analysis/:gameId" element={<AnalysisMode />} />
        <Route path="/login" element={<Navigate to="/arena" replace />} />
        
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <PageLayout {...commonLayoutProps} title="SETTINGS">
              <div className="flex-1 overflow-y-auto"><AdminSettings /></div>
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/tournaments" element={
          <ProtectedRoute>
            <PageLayout {...commonLayoutProps} title="TOURNAMENT MANAGEMENT">
              <div className="flex-1 overflow-y-auto"><TournamentManagement /></div>
            </PageLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  )
}

export default App
