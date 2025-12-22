import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getGame, getMoves, getReviewStatus, type Game, type Move, type GameReview, type MoveAnalysis, type Player, getPlayers } from '../api';
import { AnalysisBoard } from './AnalysisBoard';
import { MoveList } from './MoveList';
import { PlaybackControls } from './PlaybackControls';
import { GameReviewDashboard } from './GameReviewDashboard';
import { useStockfish } from '../lib/stockfish/useStockfish';
import { Button } from './ui/button';
import { ChevronLeft, Share2, Download } from 'lucide-react';
import { Chess } from 'chess.js';

export const AnalysisMode: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [review, setReview] = useState<(GameReview & { analyses?: MoveAnalysis[] }) | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [boardOrientation] = useState<'white' | 'black'>('white');

  useEffect(() => {
    if (!gameId) return;
    
    const fetchData = async () => {
      try {
        const [gameData, movesData, playersData, reviewData] = await Promise.all([
          getGame(gameId),
          getMoves(gameId),
          getPlayers(),
          getReviewStatus(gameId).catch(() => null)
        ]);
        
        setGame(gameData);
        setMoves(movesData);
        setPlayers(playersData);
        setReview(reviewData);
        setActiveIndex(movesData.length - 1);
      } catch (error) {
        console.error('Failed to fetch analysis data:', error);
      }
    };
    
    fetchData();
  }, [gameId]);

  const currentDisplayFen = useMemo(() => {
    const chess = new Chess();
    if (moves.length === 0 || activeIndex === null) return chess.fen();
    for (let i = 0; i <= activeIndex; i++) {
      try { chess.move(moves[i].move); } catch { /* ignore */ }
    }
    return chess.fen();
  }, [moves, activeIndex]);

  const currentPgn = useMemo(() => {
    const chess = new Chess();
    if (moves.length === 0 || activeIndex === null) return "";
    for (let i = 0; i <= activeIndex; i++) {
      try { chess.move(moves[i].move); } catch { /* ignore */ }
    }
    return chess.pgn();
  }, [moves, activeIndex]);

  const lastMoveSquares = useMemo(() => {
    if (activeIndex === null || activeIndex < 0 || moves.length === 0) return undefined;
    const chess = new Chess();
    try {
      for (let i = 0; i < activeIndex; i++) {
        try { chess.move(moves[i].move); } catch { /* ignore */ }
      }
      const move = chess.move(moves[activeIndex].move);
      return { from: move.from, to: move.to };
    } catch {
      return undefined;
    }
  }, [moves, activeIndex]);

  const { evaluation, variations } = useStockfish(currentDisplayFen);

  const whitePlayer = players.find(p => p.id === game?.whitePlayerId);
  const blackPlayer = players.find(p => p.id === game?.blackPlayerId);

  const currentAnalysis = activeIndex !== null && review?.analyses ? review.analyses[activeIndex] : null;

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
              gameId={game?.id}
              pgn={currentPgn}
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
            
            {currentAnalysis && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engine Review</span>
                  <div className="text-[10px] font-mono text-primary">Eval: {(currentAnalysis.evaluation).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold uppercase italic text-primary">
                    {currentAnalysis.classification}
                  </div>
                  {currentAnalysis.bestLine && (
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      Best: {currentAnalysis.bestLine.split(' ').slice(0, 5).join(' ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Review Dashboard & Move List */}
        <div className="flex-1 flex flex-col gap-6 min-w-[350px] max-w-[450px]">
          <GameReviewDashboard 
            review={review}
            whitePlayer={whitePlayer}
            blackPlayer={blackPlayer}
          />
          
          <div className="flex-1 min-h-0">
            <MoveList 
              moves={moves}
              onMoveClick={setActiveIndex}
              selectedMoveIndex={activeIndex ?? undefined}
              analyses={review?.analyses}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
