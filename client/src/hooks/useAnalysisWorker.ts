import { useEffect, useRef } from 'react';
import { claimJob, getMoves, sendHeartbeat, submitResults, updateProgress } from '../api';
import type { MoveAnalysis } from '../api';
import { AnalysisWorker } from '../lib/stockfish/AnalysisWorker';
import { ClassificationEngine } from '../lib/ClassificationEngine';
import { Chess } from 'chess.js';

const WORKER_ID = `worker-${Math.random().toString(36).substring(2, 9)}`;
const POLLING_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 2000;

export function useAnalysisWorker(enabled: boolean = true) {
  const analysisWorkerRef = useRef<AnalysisWorker | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (!analysisWorkerRef.current) {
      analysisWorkerRef.current = new AnalysisWorker();
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (isProcessingRef.current) return;

      try {
        const job = await claimJob(WORKER_ID);
        if ('id' in job && job.status === 'processing') {
          isProcessingRef.current = true;
          console.log(`[useAnalysisWorker] Claimed job: ${job.id} for game ${job.gameId}`);

          // Start heartbeat
          heartbeatId = setInterval(() => {
            sendHeartbeat(job.id).catch(err => console.error('[useAnalysisWorker] Heartbeat failed:', err));
          }, HEARTBEAT_INTERVAL);

          await processJob(job.id, job.gameId);

          if (heartbeatId) clearInterval(heartbeatId);
          isProcessingRef.current = false;
        }
      } catch (error) {
        console.error('[useAnalysisWorker] Polling error:', error);
      }

      timeoutId = setTimeout(poll, POLLING_INTERVAL);
    };

    const processJob = async (reviewId: string, gameId: string) => {
      const moves = await getMoves(gameId);
      const totalMoves = moves.length;
      const analyses: MoveAnalysis[] = [];
      const chess = new Chess();

      // Analyze each move
      for (let i = 0; i < totalMoves; i++) {
        const move = moves[i];
        // We need the FEN BEFORE the move to know what the best move was
        const beforeFen = chess.fen();
        
        // Use depth 20 for analysis
        const result = await analysisWorkerRef.current!.analyzePosition(beforeFen, 20, 3);
        
        // Update chess board with the move played in the game
        const moveResult = chess.move(move.move);
        if (!moveResult) {
            console.error(`[useAnalysisWorker] Invalid move found in game history: ${move.move}`);
            break;
        }

        const moveEval = result.pvs.find(p => p.pv.startsWith(move.move))?.cp ?? result.pvs[0].cp ?? 0;
        const bestMoveEval = result.pvs[0].cp ?? 0;
        
        const classification = ClassificationEngine.classify({
            beforeEval: 0, // Placeholder if not needed for simple logic
            bestMoveEval: bestMoveEval / 100,
            moveEval: moveEval / 100,
            isBestMove: result.bestMove === move.move || result.pvs[0].pv.startsWith(move.move)
        });

        analyses.push({
          moveNumber: move.moveNumber,
          classification,
          evaluation: moveEval / 100,
          bestLine: result.pvs[0].pv
        });

        // Report progress
        await updateProgress(reviewId, i + 1, totalMoves);
      }

      await submitResults(reviewId, analyses);
      console.log(`[useAnalysisWorker] Submitted results for job: ${reviewId}`);
    };

    poll();

    return () => {
      clearTimeout(timeoutId);
      if (heartbeatId) clearInterval(heartbeatId);
      if (analysisWorkerRef.current) {
        analysisWorkerRef.current.terminate();
        analysisWorkerRef.current = null;
      }
    };
  }, [enabled]);
}
