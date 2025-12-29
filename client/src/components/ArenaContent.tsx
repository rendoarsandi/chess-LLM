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
  } = props

  const turn = (currentDisplayFen || '').split(' ')[1] || 'w'
  const isWhiteTurn = turn === 'w'

  const [isWhiteThinkingExpanded, setIsWhiteThinkingExpanded] = useState(() => {
    if (selectedGame?.status === 'ongoing' && isLive) return !isPlayerNonLLM(whitePlayer)
    return true
  })

  const [isBlackThinkingExpanded, setIsBlackThinkingExpanded] = useState(() => {
    if (selectedGame?.status === 'ongoing' && isLive) return !isPlayerNonLLM(blackPlayer)
    return true
  })

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
            <CollapsibleSection
              title="White Thinking"
              className="md:hidden"
              isExpanded={isWhiteThinkingExpanded}
              onExpandedChange={setIsWhiteThinkingExpanded}
            >
              <ThinkingPanel
                side="white"
                modelName={whitePlayer?.name || 'Loading...'}
                isMobile={isMobile}
                {...whiteThinking}
              />
            </CollapsibleSection>
            <CollapsibleSection
              title="Black Thinking"
              className="md:hidden"
              isExpanded={isBlackThinkingExpanded}
              onExpandedChange={setIsBlackThinkingExpanded}
            >
              <ThinkingPanel
                side="black"
                modelName={blackPlayer?.name || 'Loading...'}
                isMobile={isMobile}
                {...blackThinking}
              />
            </CollapsibleSection>
            <CollapsibleSection title="Arena History" defaultExpanded={true}>
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
                />
              </ErrorBoundary>
            </CollapsibleSection>
            <CollapsibleSection title="Arena Controls">
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

          {selectedGame && (
            <div className="space-y-4">
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
                />
              </ErrorBoundary>
              <div className="pt-2">
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
