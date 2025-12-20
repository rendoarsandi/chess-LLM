import { Sidebar } from "@/components/Sidebar"
import type { View } from "@/components/Sidebar"
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
import { useEffect, useState, useCallback, useMemo } from "react"
import { getGames, getGame, createGame, deleteGame, getMoves, getPlayers, getLeaderboard, pauseGame, resumeGame } from "./api"
import type { Game, Move, Player } from "./api"
import { Chess } from "chess.js"
import { useStockfish } from "./lib/stockfish/useStockfish"
import { RotateCcw, Pause, Play } from "lucide-react"
import { cn } from "./lib/utils"
import { Routes, Route, useNavigate, useLocation, useParams } from "react-router"

const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'

function PlayerProfileRoute({ players, setSelectedPlayerId, navigate }: { players: Player[], setSelectedPlayerId: (id: string | null) => void, navigate: (path: string) => void }) {
  const { id } = useParams();
  
  useEffect(() => {
    if (id) {
      setSelectedPlayerId(id);
    }
  }, [id, setSelectedPlayerId]);

  if (!id) return null;

  return (
    <PlayerProfile 
      playerId={id} 
      onBack={() => {
        setSelectedPlayerId(null);
        navigate('/profiles');
      }} 
    />
  );
}

function App() {
  const [view, setView] = useState<View>('arena');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white")
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null) // null means "Live"
  const [showResultOverlay, setShowResultOverlay] = useState(true)

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGame(game)
    setMoves([]) // Clear old moves
    setActiveMoveIndex(null) // Reset to live
    setShowResultOverlay(true) // Reset overlay for new selection
  }, [])

  const fetchAllGames = useCallback(async () => {
    const allGames = await getGames()
    setGames(allGames)
    setSelectedGame(current => {
      if (!current && allGames.length > 0) {
        return allGames[0]
      }
      return current
    })
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard()
      setLeaderboard(data)
    } catch (err) {
      console.error("Failed to fetch leaderboard", err)
    }
  }, [])

  const handleCreateGame = async (whiteId: string, blackId: string) => {
    try {
      const { id } = await createGame(whiteId, blackId)
      const newGame = await getGame(id)
      handleSelectGame(newGame)
      fetchAllGames()
      fetchLeaderboard()
    } catch {
      console.error("Error creating game")
      console.error("Failed to create game. Check if the server is running.")
    }
  }

  const handleDeleteGame = async (id: string) => {
    await deleteGame(id)
    if (selectedGame?.id === id) {
      setSelectedGame(null)
      setActiveMoveIndex(null)
    }
    fetchAllGames()
  }

  const handleTogglePause = async () => {
    if (!selectedGame) return
    if (selectedGame.status === 'ongoing') {
      await pauseGame(selectedGame.id)
    } else if (selectedGame.status === 'paused') {
      await resumeGame(selectedGame.id)
    }
    const updated = await getGame(selectedGame.id)
    setSelectedGame(updated)
    fetchAllGames()
  }

  const fetchPlayers = useCallback(async () => {
    const allPlayers = await getPlayers()
    setPlayers(allPlayers)
  }, [])

  useEffect(() => {
    const initFetch = async () => {
      await fetchAllGames()
      await fetchPlayers()
      await fetchLeaderboard()
    }
    initFetch()
    const listInterval = setInterval(() => {
      fetchAllGames()
      fetchLeaderboard()
    }, 5000) // Poll every 5 seconds
    return () => clearInterval(listInterval)
  }, [fetchAllGames, fetchPlayers, fetchLeaderboard])

  useEffect(() => {
    if (!selectedGame) return
    const fetchMoves = async () => {
      const data = await getMoves(selectedGame.id)
      setMoves(data)
    }
    fetchMoves()
    const interval = setInterval(fetchMoves, 1000)
    return () => clearInterval(interval)
  }, [selectedGame])

  // Sync states on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentDisplayFen = useMemo(() => {
    if (moves.length === 0) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1
    const chess = new Chess()
    try {
      for (let i = 0; i <= index; i++) {
        chess.move(moves[i].move)
      }
    } catch (e) {
      console.error("Error replaying moves for FEN:", e)
    }
    return chess.fen()
  }, [moves, activeMoveIndex])

  const currentPgn = useMemo(() => {
    const chess = new Chess()
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1
    try {
      for (let i = 0; i <= index; i++) {
        chess.move(moves[i].move)
      }
    } catch (e) {
      console.error("Error replaying moves for PGN:", e)
    }
    return chess.pgn()
  }, [moves, activeMoveIndex])

  const lastMoveSquares = useMemo(() => {
    const index = activeMoveIndex !== null ? activeMoveIndex : moves.length - 1
    if (index < 0 || moves.length === 0) return undefined
    const chess = new Chess()
    try {
      for (let i = 0; i < index; i++) {
        chess.move(moves[i].move)
      }
      const move = chess.move(moves[index].move)
      return { from: move.from, to: move.to }
    } catch (e) {
      console.error("Error replaying moves for highlight:", e)
      return undefined
    }
  }, [moves, activeMoveIndex])

  const isLive = activeMoveIndex === null || activeMoveIndex === moves.length - 1

  const { evaluation, variations, isThinking } = useStockfish(currentDisplayFen)

  const whitePlayer = players.find(p => p.id === selectedGame?.whitePlayerId)
  const blackPlayer = players.find(p => p.id === selectedGame?.blackPlayerId)

  const whiteThinking = useMemo(() => {
    if (!selectedGame) return {}
    const lastMove = moves[moves.length - 1]
    const isWhiteThinking = (moves.length === 0 && selectedGame.status === 'ongoing') || (lastMove?.playerColor === 'black' && selectedGame.status === 'ongoing')
    
    if (isWhiteThinking) return {}

    const whiteLastMove = [...moves].reverse().find(m => m.playerColor === 'white')
    if (whiteLastMove) {
      let candidates = undefined
      try {
        candidates = whiteLastMove.candidates ? JSON.parse(whiteLastMove.candidates) : undefined
      } catch (e) {
        console.warn('Failed to parse white candidates', e)
      }
      return {
        opening: whiteLastMove.opening,
        candidates,
        reasoning: whiteLastMove.reasoning
      }
    }
    return {}
  }, [moves, selectedGame])

  const blackThinking = useMemo(() => {
    if (!selectedGame) return {}
    const lastMove = moves[moves.length - 1]
    const isBlackThinking = lastMove?.playerColor === 'white' && selectedGame.status === 'ongoing'
    
    if (isBlackThinking) return {}

    const blackLastMove = [...moves].reverse().find(m => m.playerColor === 'black')
    if (blackLastMove) {
      let candidates = undefined
      try {
        candidates = blackLastMove.candidates ? JSON.parse(blackLastMove.candidates) : undefined
      } catch (e) {
        console.warn('Failed to parse black candidates', e)
      }
      return {
        opening: blackLastMove.opening,
        candidates,
        reasoning: blackLastMove.reasoning
      }
    }
    return {}
  }, [moves, selectedGame])

  const [whitePlayerId, setWhitePlayerId] = useState(GEMINI_3_0_ID)
  const [blackPlayerId, setBlackPlayerId] = useState(RANDOM_BOT_ID)

  const navigate = useNavigate();
  const location = useLocation();

  // Sync view state with location for backward compatibility with Sidebar
  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'arena';
    if (['arena', 'leaderboard', 'profiles', 'history'].includes(path)) {
      setView(path as View);
    }
  }, [location.pathname]);

  const handleSetView = (newView: View) => {
    navigate(newView === 'arena' ? '/' : `/${newView}`);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar 
        view={view} 
        setView={handleSetView} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-background/50 backdrop-blur-md shrink-0">
          <h1 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            ChessLLM <span className="text-primary not-italic text-[10px] bg-primary/10 px-2 py-0.5 rounded border border-primary/20 tracking-widest">{view.toUpperCase()}</span>
          </h1>
          <div className="flex gap-2">
            {view === 'arena' && (
              <>
                <Button variant="outline" size="sm" className="h-8 text-[10px] font-black" onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}>
                  <RotateCcw className="h-3 w-3 mr-2" />
                  ROTATE
                </Button>
                {(selectedGame?.status === 'ongoing' || selectedGame?.status === 'paused') && (
                  <Button variant="outline" size="sm" className="h-8 text-[10px] font-black" onClick={handleTogglePause}>
                    {selectedGame.status === 'ongoing' ? (
                      <><Pause className="h-3 w-3 mr-2" />PAUSE</>
                    ) : (
                      <><Play className="h-3 w-3 mr-2" />RESUME</>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Routes>
            <Route path="/" element={
              <div className="max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-4 gap-8">
                {/* Left Column - White Thinking (lg+) */}
                <div className="hidden lg:block h-fit">
                  <ThinkingPanel 
                    side="white" 
                    modelName={whitePlayer?.name || 'Loading...'}
                    isMobile={isMobile}
                    {...whiteThinking}
                  />
                </div>

                {/* Center Column - Board & Main Controls */}
                <div className="lg:col-span-2 flex flex-col items-center">
                  {/* Tablet Layout (Shown only on md to lg) */}
                  <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 mb-8 w-full">
                    <ThinkingPanel 
                      side="white" 
                      modelName={whitePlayer?.name || 'Loading...'}
                      isMobile={isMobile}
                      {...whiteThinking}
                    />
                    <ThinkingPanel 
                      side="black" 
                      modelName={blackPlayer?.name || 'Loading...'}
                      isMobile={isMobile}
                      {...blackThinking}
                    />
                  </div>

                  <div className={cn(
                    "flex w-full justify-center items-start gap-2 md:gap-4",
                    isMobile ? "flex-col items-center" : "flex-row"
                  )}>
                    <div className={cn(
                      "py-1",
                      isMobile ? "w-full max-w-[300px] h-6 mb-2" : "h-[300px] md:h-[400px] lg:h-[500px]"
                    )}>
                      <AdvantageBar 
                        evaluation={evaluation} 
                        variations={variations} 
                        isThinking={isThinking} 
                        orientation={isMobile ? 'horizontal' : 'vertical'}
                        gameStatus={isLive ? selectedGame?.status : 'ongoing'}
                        winnerId={selectedGame?.winnerId}
                        whitePlayerId={selectedGame?.whitePlayerId}
                      />
                    </div>

                    <div className="relative group w-full max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
                      <ChessboardContainer 
                        fen={currentDisplayFen} 
                        boardOrientation={boardOrientation}
                        highlightSquares={lastMoveSquares}
                        gameId={selectedGame?.id}
                        pgn={currentPgn}
                      />
                      
                      {selectedGame && showResultOverlay && (
                        <GameResultOverlay 
                          status={selectedGame.status}
                          winnerId={selectedGame.winnerId}
                          whitePlayerId={selectedGame.whitePlayerId}
                          whitePlayerName={whitePlayer?.name}
                          blackPlayerName={blackPlayer?.name}
                          reason={selectedGame.gameOverReason}
                          onNewMatch={() => {
                            handleCreateGame(whitePlayerId, blackPlayerId);
                          }}
                          onClose={() => setShowResultOverlay(false)}
                        />
                      )}

                      {!isLive && (
                        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black shadow-lg animate-pulse">
                          HISTORY MODE
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 w-full max-w-[600px] space-y-4">
                    <PlaybackControls 
                      onFirst={() => setActiveMoveIndex(0)}
                      onPrev={() => setActiveMoveIndex(prev => prev === null ? moves.length - 1 : Math.max(0, prev - 1))}
                      onNext={() => {
                        if (activeMoveIndex === null) return
                        if (activeMoveIndex === moves.length - 1) setActiveMoveIndex(null)
                        else setActiveMoveIndex(activeMoveIndex + 1)
                      }}
                      onLast={() => setActiveMoveIndex(null)}
                      prevDisabled={moves.length === 0 || activeMoveIndex === 0}
                      nextDisabled={isLive}
                    />

                    {selectedGame && (
                      <div className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-sm">Status: <span className="text-primary font-black uppercase tracking-tighter ml-1">{selectedGame.status}</span></span>
                            {(selectedGame.status === 'ongoing' || selectedGame.status === 'paused') && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] font-black" onClick={handleTogglePause}>
                                {selectedGame.status === 'ongoing' ? (
                                  <><Pause className="h-3 w-3 mr-1" /> PAUSE</>
                                ) : (
                                  <><Play className="h-3 w-3 mr-1" /> RESUME</>
                                )}
                              </Button>
                            )}
                          </div>
                          {!isLive && (
                            <Button size="sm" variant="secondary" className="h-7 text-[10px] font-black tracking-widest" onClick={() => setActiveMoveIndex(null)}>
                              RETURN TO LIVE
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Sections (< lg) - Stacked and Collapsible */}
                  <div className="mt-8 w-full lg:hidden space-y-4">
                    <CollapsibleSection title="White Thinking" className="md:hidden">
                      <ThinkingPanel 
                        side="white" 
                        modelName={whitePlayer?.name || 'Loading...'}
                        isMobile={isMobile}
                        {...whiteThinking}
                      />
                    </CollapsibleSection>

                    <CollapsibleSection title="Black Thinking" className="md:hidden">
                      <ThinkingPanel 
                        side="black" 
                        modelName={blackPlayer?.name || 'Loading...'}
                        isMobile={isMobile}
                        {...blackThinking}
                      />
                    </CollapsibleSection>

                    <CollapsibleSection title="Move List">
                      <MoveList 
                        moves={moves} 
                        onMoveClick={setActiveMoveIndex} 
                        selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} 
                        isLive={isLive}
                      />
                    </CollapsibleSection>

                    <CollapsibleSection title="Arena Controls">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">White Engine</label>
                          <select 
                            value={whitePlayerId} 
                            onChange={(e) => setWhitePlayerId(e.target.value)}
                            className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                          >
                            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Black Engine</label>
                          <select 
                            value={blackPlayerId} 
                            onChange={(e) => setBlackPlayerId(e.target.value)}
                            className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                          >
                            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <Button className="w-full font-black tracking-widest" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)}>
                          LAUNCH MATCH
                        </Button>
                      </div>
                    </CollapsibleSection>
                  </div>
                </div>

                {/* Right Column - Black Thinking & Arena Controls (lg+) */}
                <div className="hidden lg:block space-y-8 h-fit lg:col-span-1">
                  <ThinkingPanel 
                    side="black" 
                    modelName={blackPlayer?.name || 'Loading...'}
                    isMobile={isMobile}
                    {...blackThinking}
                  />

                  <MoveList 
                    moves={moves} 
                    onMoveClick={setActiveMoveIndex} 
                    selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1} 
                    isLive={isLive}
                  />

                  <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h2 className="text-xl font-bold uppercase tracking-tighter mb-4">Arena Controls</h2>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">White Engine</label>
                        <select 
                          value={whitePlayerId} 
                          onChange={(e) => setWhitePlayerId(e.target.value)}
                          className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Black Engine</label>
                        <select 
                          value={blackPlayerId} 
                          onChange={(e) => setBlackPlayerId(e.target.value)}
                          className="w-full bg-muted text-foreground rounded border border-border px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <Button className="w-full font-black tracking-widest" onClick={() => handleCreateGame(whitePlayerId, blackPlayerId)}>
                        LAUNCH MATCH
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            } />
            
            <Route path="/leaderboard" element={
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">Model Rankings</h2>
                  <p className="text-muted-foreground font-medium">Comparative performance metrics across all integrated LLM architectures.</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6 shadow-xl">
                  <Leaderboard players={leaderboard} onSelectPlayer={(id) => {
                    setSelectedPlayerId(id);
                    navigate(`/profiles/${id}`);
                  }} />
                </div>
              </div>
            } />

            <Route path="/profiles" element={
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">LLM Profiles</h2>
                  <p className="text-muted-foreground font-medium">Select a model to view detailed performance metrics and history.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players.filter(p => p.type === 'llm').map(player => (
                    <div 
                      key={player.id} 
                      onClick={() => navigate(`/profiles/${player.id}`)}
                      className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg group"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {player.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{player.name}</h3>
                          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{player.rating} ELO</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase">
                        <div className="p-2 bg-muted rounded">
                          <div className="text-primary">{player.wins}</div>
                          <div className="text-muted-foreground">Wins</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-foreground">{player.losses}</div>
                          <div className="text-muted-foreground">Loss</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-foreground">{player.draws}</div>
                          <div className="text-muted-foreground">Draw</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            } />

            <Route path="/profiles/:id" element={
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PlayerProfileRoute 
                  players={players} 
                  setSelectedPlayerId={setSelectedPlayerId}
                  navigate={navigate}
                />
              </div>
            } />

            <Route path="/history" element={
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">Arena History</h2>
                  <p className="text-muted-foreground font-medium">Review past encounters and analyze model decision patterns.</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-8 shadow-xl">
                  <GameHistory 
                    games={games} 
                    players={players}
                    selectedGameId={selectedGame?.id} 
                    onSelect={(id) => {
                      handleSelectGame(id);
                      navigate('/');
                    }} 
                    onDelete={handleDeleteGame}
                  />
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App