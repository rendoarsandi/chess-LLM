import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getGame, getMoves, getReviewStatus, type Game, type Move, type GameReview, type MoveAnalysis } from '../api';
import { AnalysisBoard } from './AnalysisBoard';
import { MoveList } from './MoveList';
import { PlaybackControls } from './PlaybackControls';
import { useStockfish } from '../lib/stockfish/useStockfish';
import { Button } from './ui/button';
import { ChevronLeft, Share2, Download } from 'lucide-react';
import { generate960Fen, safeNewChess } from '../lib/chess-utils';

export const AnalysisMode: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [review, setReview] = useState<(GameReview & { analyses?: MoveAnalysis[] }) | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [boardOrientation] = useState<'white' | 'black'>('white');

  const fetchStatus = useCallback(async () => {
    if (!gameId) return;
    try {
      const status = await getReviewStatus(gameId);
      setReview(status);
    } catch {
      // Ignore not found
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    
    const fetchData = async () => {
      try {
        const [gameData, movesData] = await Promise.all([
          getGame(gameId),
          getMoves(gameId)
        ]);
        
        setGame(gameData);
        setMoves(movesData);
        setActiveIndex(movesData.length - 1);

        // Initial check for review
        try {
          console.log(`[AnalysisMode] Checking status for game: ${gameId}`);
          const reviewData = await getReviewStatus(gameId);
          console.log(`[AnalysisMode] Found existing review:`, reviewData);
          setReview(reviewData);
        } catch (error) {
          console.log(`[AnalysisMode] No review found:`, error);
        }
      } catch (error) {
        console.error('Failed to fetch analysis data:', error);
      }
    };
    
    fetchData();
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !review || review.status === 'completed' || review.status === 'failed') return;

    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [gameId, review, fetchStatus]);

  const currentDisplayFen = useMemo(() => {
    let startFen: string | undefined = undefined;
    if (game?.variant === 'chess960' && game.startPosId !== null && game.startPosId !== undefined) {
      try {
        startFen = generate960Fen(game.startPosId);
      } catch (e) {
        console.error('[AnalysisMode] Failed to generate 960 FEN:', e);
      }
    }

    const chess = safeNewChess(startFen);
    if (moves.length === 0 || activeIndex === null) return chess.fen();
    for (let i = 0; i <= activeIndex; i++) {
      try { chess.move(moves[i].move); } catch { /* ignore */ }
    }
    return chess.fen();
  }, [moves, activeIndex, game]);

  const lastMoveSquares = useMemo(() => {
    if (activeIndex === null || activeIndex < 0 || moves.length === 0) return undefined;

    let startFen: string | undefined = undefined;
    if (game?.variant === 'chess960' && game.startPosId !== null && game.startPosId !== undefined) {
      try {
        startFen = generate960Fen(game.startPosId);
      } catch (e) {
        console.error('[AnalysisMode] Failed to generate 960 FEN:', e);
      }
    }

    const chess = safeNewChess(startFen);
    try {
      for (let i = 0; i < activeIndex; i++) {
        try { chess.move(moves[i].move); } catch { /* ignore */ }
      }
      const move = chess.move(moves[activeIndex].move);
      return { from: move.from, to: move.to };
    } catch {
      return undefined;
    }
  }, [moves, activeIndex, game]);

  const { evaluation, variations, isThinking } = useStockfish(currentDisplayFen);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-muted/30 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            BACK
          </Button>
          <h1 className="text-sm font-black uppercase tracking-widest italic">
            Review Mode <span className="text-primary not-italic font-mono ml-2">#{gameId?.slice(0, 8)}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
            <Download className="w-3 h-3 mr-2" /> PGN
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
            <Share2 className="w-3 h-3 mr-2" /> SHARE
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-8">
        {/* Left: Board & Controls */}
        <div className="flex-[1.5] flex flex-col items-center gap-6 min-w-0">
          <div className="w-full max-w-[650px]">
            <AnalysisBoard 
              fen={currentDisplayFen}
              orientation={boardOrientation}
              evaluation={evaluation}
              variations={variations}
              lastMoveSquares={lastMoveSquares}
              gameStatus={game?.status}
              winnerId={game?.winnerId}
              whitePlayerId={game?.whitePlayerId}
            />
          </div>
          <div className="w-full max-w-[600px] flex flex-col gap-4">
            <PlaybackControls 
              onFirst={() => setActiveIndex(0)}
              onPrev={() => setActiveIndex(prev => Math.max(0, (prev ?? 0) - 1))}
              onNext={() => setActiveIndex(prev => Math.min(moves.length - 1, (prev ?? 0) + 1))}
              onLast={() => setActiveIndex(moves.length - 1)}
              prevDisabled={activeIndex === 0}
              nextDisabled={activeIndex === moves.length - 1}
            />
          </div>
        </div>

        {/* Right: Analysis Info & Move List */}
        <div className="flex-1 flex flex-col gap-6 min-w-[350px] max-w-[450px]">
          {/* Dashboard disabled for now
          <GameReviewDashboard 
            review={review}
            whitePlayer={whitePlayer}
            blackPlayer={blackPlayer}
            onRetry={handleRetry}
          />
          */}
          
          <div className="flex-1 min-h-0">
            <MoveList 
              moves={moves}
              onMoveClick={setActiveIndex}
              selectedMoveIndex={activeIndex}
              variations={variations}
              isEngineThinking={isThinking}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
