import React, { useState } from 'react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { ChessboardContainer } from '@/components/Chessboard'
import { ThinkingPanel } from '@/components/ThinkingPanel'
import { MoveList } from '@/components/MoveList'
import { PlaybackControls } from '@/components/PlaybackControls'
import { AdvantageBar } from '@/components/AdvantageBar'
import { GameResultOverlay } from '@/components/GameResultOverlay'
import { ErrorBoundary } from './ErrorBoundary'
import { ArenaEmptyState } from './ArenaEmptyState'
import { ArenaControls } from './ArenaControls'
import { cn } from '@/lib/utils'
import { isPlayerNonLLM } from '@/lib/chess-utils'
import { ChatPanel } from '@/components/ChatPanel'
import type { ChatMessage, ClientMessage } from '@/hooks/useGameSocket'
import { Swords, MessageSquare, Brain, Volume2, VolumeX } from 'lucide-react'
import { soundManager } from '@/lib/audio'
import { toast } from 'sonner'
import type { Game, Move, Player, ThinkingData } from '@/types'
import type { EngineEvaluation } from '@/lib/stockfish/StockfishWorker'

interface ArenaContentProps {
  whitePlayer?: Player
  blackPlayer?: Player
  isMobile: boolean
  whiteThinking: ThinkingData
  blackThinking: ThinkingData
  evaluation: EngineEvaluation | null
  variations: EngineEvaluation[]
  isThinking: boolean
  isLive: boolean
  selectedGame: Game | null
  currentDisplayFen: string
  boardOrientation: 'white' | 'black'
  lastMoveSquares?: { from: string; to: string }
  currentPgn: string
  showResultOverlay: boolean
  whitePlayerId: string
  blackPlayerId: string
  setWhitePlayerId: (id: string) => void
  setBlackPlayerId: (id: string) => void
  isCreatingGame: boolean
  hasOngoingGame: boolean
  handleCreateGame: (whiteId: string, blackId: string, variant?: string) => Promise<void>
  handleTogglePause: () => Promise<void>
  setShowResultOverlay: (show: boolean) => void
  setActiveMoveIndex: (index: number | null) => void
  activeMoveIndex: number | null
  moves: Move[]
  players: Player[]
  setBoardOrientation: React.Dispatch<React.SetStateAction<'white' | 'black'>>
  spectatorCount: number
  thinkingStatus: 'thinking' | 'idle'
  variant: 'standard' | 'chess960'
  chatMessages: ChatMessage[]
  sendMessage: (message: ClientMessage) => void
}

export function ArenaContent(props: ArenaContentProps) {
  const {
    whitePlayer,
    blackPlayer,
    isMobile,
    whiteThinking,
    blackThinking,
    evaluation,
    variations,
    isThinking,
    isLive,
    selectedGame,
    currentDisplayFen,
    boardOrientation,
    lastMoveSquares,
    showResultOverlay,
    whitePlayerId,
    blackPlayerId,
    setWhitePlayerId,
    setBlackPlayerId,
    isCreatingGame,
    hasOngoingGame,
    handleCreateGame,
    setShowResultOverlay,
    setActiveMoveIndex,
    activeMoveIndex,
    moves,
    players,
    thinkingStatus,
    variant,
    chatMessages,
    sendMessage,
    spectatorCount,
  } = props

  const turn = (currentDisplayFen || '').split(' ')[1] || 'w'
  const isWhiteTurn = turn === 'w'

  const [activeTab, setActiveTab] = useState<'moves' | 'chat' | 'thinking'>('moves')
  const [isMuted, setIsMuted] = useState(() => soundManager.isMuted())

  const toggleMute = () => {
    const nextMute = !isMuted
    setIsMuted(nextMute)
    soundManager.setMute(nextMute)
    toast.success(nextMute ? 'Audio muted' : 'Audio unmuted')
  }

  const renderTabbedSidebar = () => {
    if (!selectedGame) return null

    const tabs = [
      { id: 'moves', label: 'Moves', icon: Swords },
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'thinking', label: 'Thinking', icon: Brain },
    ]

    return (
      <div className="flex flex-col h-[520px] bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
        {/* Tab Buttons & Audio Control */}
        <div className="flex items-center justify-between px-2 bg-neutral-950 border-b border-neutral-800 shrink-0">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'moves' | 'chat' | 'thinking')}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer',
                    isActive
                      ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/30',
                  )}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={toggleMute}
            className="p-2 text-neutral-400 hover:text-neutral-200 cursor-pointer rounded-lg hover:bg-neutral-900 transition-colors mr-1"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX size={14} className="text-neutral-500" /> : <Volume2 size={14} className="text-amber-500" />}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 bg-neutral-950/20">
          {activeTab === 'moves' && (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-1 min-h-0">
                <ErrorBoundary
                  fallback={
                    <div className="p-4 bg-muted text-xs text-destructive font-bold uppercase">
                      Move List Error
                    </div>
                  }
                >
                  <MoveList
                    moves={moves}
                    onMoveClick={setActiveMoveIndex}
                    selectedMoveIndex={activeMoveIndex !== null ? activeMoveIndex : moves.length - 1}
                    isLive={isLive}
                    variations={variations}
                    isEngineThinking={isThinking}
                    borderless={true}
                  />
                </ErrorBoundary>
              </div>
              <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 shrink-0">
                <PlaybackControls
                  onFirst={() => setActiveMoveIndex(0)}
                  onPrev={() =>
                    setActiveMoveIndex(
                      activeMoveIndex === null
                        ? Math.max(0, moves.length - 2)
                        : Math.max(0, activeMoveIndex - 1),
                    )
                  }
                  onNext={() => {
                    if (activeMoveIndex !== null) {
                      if (activeMoveIndex === moves.length - 1) setActiveMoveIndex(null)
                      else setActiveMoveIndex(activeMoveIndex + 1)
                    }
                  }}
                  onLast={() => setActiveMoveIndex(null)}
                  prevDisabled={moves.length === 0 || activeMoveIndex === 0}
                  nextDisabled={isLive}
                />
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatPanel
              gameId={selectedGame.id}
              chatMessages={chatMessages}
              sendMessage={sendMessage}
              spectatorCount={spectatorCount}
              borderless={true}
            />
          )}

          {activeTab === 'thinking' && (
            <div className="p-4 space-y-4 overflow-y-auto h-full custom-scrollbar">
              {/* White Player Thinking */}
              <div
                className={cn(
                  'p-4 rounded-xl border transition-all duration-300',
                  isWhiteTurn && thinkingStatus === 'thinking' && isLive
                    ? 'bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/10'
                    : 'bg-neutral-900/40 border-neutral-800/80',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white border border-neutral-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">
                      White Player
                    </span>
                    {isLive && isWhiteTurn && thinkingStatus === 'thinking' && (
                      <span className="flex items-center gap-0.5 px-1 py-0.25 text-[8px] font-black bg-amber-500/10 text-amber-400 rounded-sm uppercase tracking-widest animate-pulse">
                        Thinking
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-400 truncate max-w-[150px]">
                    {whitePlayer?.name || 'Loading...'}
                  </span>
                </div>

                {whiteThinking.reasoning || whiteThinking.candidates || whiteThinking.opening ? (
                  <div className="space-y-3">
                    {whiteThinking.opening && (
                      <div>
                        <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">
                          Opening
                        </div>
                        <div className="text-xs font-bold text-neutral-200">{whiteThinking.opening}</div>
                      </div>
                    )}
                    {whiteThinking.candidates && whiteThinking.candidates.length > 0 && (
                      <div>
                        <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                          Top Candidate Moves
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {whiteThinking.candidates.map((move: string, i: number) => (
                            <span
                              key={i}
                              className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-neutral-700/50 text-neutral-300"
                            >
                              <span className="text-amber-500 mr-0.5">{i + 1}.</span> {move}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {whiteThinking.reasoning && (
                      <div>
                        <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                          Reasoning & Search Log
                        </div>
                        <div className="text-xs leading-relaxed text-neutral-300 italic bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
                          "{whiteThinking.reasoning}"
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-neutral-600 text-xs italic">
                    Waiting for White's move...
                  </div>
                )}
              </div>

              {/* Black Player Thinking */}
              <div
                className={cn(
                  'p-4 rounded-xl border transition-all duration-300',
                  !isWhiteTurn && thinkingStatus === 'thinking' && isLive
                    ? 'bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/10'
                    : 'bg-neutral-900/40 border-neutral-800/80',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-neutral-800 border border-neutral-600" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">
                      Black Player
                    </span>
                    {isLive && !isWhiteTurn && thinkingStatus === 'thinking' && (
                      <span className="flex items-center gap-0.5 px-1 py-0.25 text-[8px] font-black bg-amber-500/10 text-amber-400 rounded-sm uppercase tracking-widest animate-pulse">
                        Thinking
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-400 truncate max-w-[150px]">
                    {blackPlayer?.name || 'Loading...'}
                  </span>
                </div>

                {blackThinking.reasoning || blackThinking.candidates || blackThinking.opening ? (
                  <div className="space-y-3">
                    {blackThinking.opening && (
                      <div>
                        <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">
                          Opening
                        </div>
                        <div className="text-xs font-bold text-neutral-200">{blackThinking.opening}</div>
                      </div>
                    )}
                    {blackThinking.candidates && blackThinking.candidates.length > 0 && (
                      <div>
                        <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                          Top Candidate Moves
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {blackThinking.candidates.map((move: string, i: number) => (
                            <span
                              key={i}
                              className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-neutral-700/50 text-neutral-300"
                            >
                              <span className="text-amber-500 mr-0.5">{i + 1}.</span> {move}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {blackThinking.reasoning && (
                      <div>
                        <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                          Reasoning & Search Log
                        </div>
                        <div className="text-xs leading-relaxed text-neutral-300 italic bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
                          "{blackThinking.reasoning}"
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-neutral-600 text-xs italic">
                    Waiting for Black's move...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar text-foreground">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-4 gap-8">
        <div className="hidden lg:block h-fit">
          {!isPlayerNonLLM(whitePlayer) && (
            <ThinkingPanel
              side="white"
              modelName={selectedGame ? whitePlayer?.name || 'Loading...' : 'Inactive'}
              isMobile={isMobile}
              {...whiteThinking}
              isThinking={isLive && isWhiteTurn && thinkingStatus === 'thinking'}
            />
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col items-center">
          {!selectedGame ? (
            <ArenaEmptyState
              hasOngoingGame={hasOngoingGame}
              handleCreateGame={handleCreateGame}
              whitePlayerId={whitePlayerId}
              blackPlayerId={blackPlayerId}
              isCreatingGame={isCreatingGame}
            />
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

              <div
                className={cn(
                  'flex w-full justify-center items-start gap-2 md:gap-4',
                  isMobile ? 'flex-col items-center' : 'flex-row',
                )}
              >
                <div
                  className={cn(
                    'py-1',
                    isMobile
                      ? 'w-full max-w-[300px] md:max-w-none h-6 mb-4 md:mb-6'
                      : 'h-[300px] md:h-[400px] lg:h-[500px]',
                  )}
                >
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
                  <ErrorBoundary
                    fallback={
                      <div className="aspect-square w-full bg-muted flex items-center justify-center border border-destructive/20 rounded-lg text-[10px] font-black uppercase text-destructive tracking-widest p-4 text-center">
                        Chessboard Error
                      </div>
                    }
                  >
                    <ChessboardContainer
                      fen={currentDisplayFen}
                      boardOrientation={boardOrientation}
                      highlightSquares={lastMoveSquares}
                    />
                  </ErrorBoundary>
                  {selectedGame && showResultOverlay && (
                    <GameResultOverlay
                      winner={
                        selectedGame.winnerId === selectedGame.whitePlayerId
                          ? 'white'
                          : selectedGame.winnerId === selectedGame.blackPlayerId
                            ? 'black'
                            : selectedGame.status === 'draw'
                              ? 'draw'
                              : null
                      }
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
                  onPrev={() =>
                    setActiveMoveIndex(
                      activeMoveIndex === null
                        ? Math.max(0, moves.length - 2)
                        : Math.max(0, activeMoveIndex - 1),
                    )
                  }
                  onNext={() => {
                    if (activeMoveIndex !== null) {
                      if (activeMoveIndex === moves.length - 1) setActiveMoveIndex(null)
                      else setActiveMoveIndex(activeMoveIndex + 1)
                    }
                  }}
                  onLast={() => setActiveMoveIndex(null)}
                  prevDisabled={moves.length === 0 || activeMoveIndex === 0}
                  nextDisabled={isLive}
                />
              </div>
            </>
          )}

          <div className="mt-8 w-full lg:hidden space-y-4">
            {selectedGame ? (
              <>
                {renderTabbedSidebar()}
                <CollapsibleSection title="Arena Controls" defaultExpanded={false}>
                  <ArenaControls
                    whitePlayerId={whitePlayerId}
                    setWhitePlayerId={setWhitePlayerId}
                    blackPlayerId={blackPlayerId}
                    setBlackPlayerId={setBlackPlayerId}
                    players={players}
                    handleCreateGame={handleCreateGame}
                    isCreatingGame={isCreatingGame}
                  />
                </CollapsibleSection>
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden lg:block space-y-8 h-fit lg:col-span-1">
          {!isPlayerNonLLM(blackPlayer) && (
            <ThinkingPanel
              side="black"
              modelName={selectedGame ? blackPlayer?.name || 'Loading...' : 'Inactive'}
              isMobile={isMobile}
              {...blackThinking}
              isThinking={isLive && !isWhiteTurn && thinkingStatus === 'thinking'}
            />
          )}

          {selectedGame && renderTabbedSidebar()}

          <ArenaControls
            whitePlayerId={whitePlayerId}
            setWhitePlayerId={setWhitePlayerId}
            blackPlayerId={blackPlayerId}
            setBlackPlayerId={setBlackPlayerId}
            players={players}
            handleCreateGame={handleCreateGame}
            isCreatingGame={isCreatingGame}
            className="bg-card p-6 rounded-lg border border-border shadow-sm"
          />
        </div>
      </div>
    </main>
  )
}
