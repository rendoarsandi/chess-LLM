import { useEffect, useRef } from 'react';
import { claimJob, getMoves, sendHeartbeat, submitResults, updateProgress, reportFailure } from '../api';
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
      if (isProcessingRef.current) {
        console.debug('[useAnalysisWorker] Already processing, skipping poll');
        return;
      }

      try {
        console.debug(`[useAnalysisWorker] Polling for jobs... (ID: ${WORKER_ID})`);
        const job = await claimJob(WORKER_ID);
        
        if (job && 'id' in job && job.status === 'processing') {
          if (isProcessingRef.current) {
             console.warn('[useAnalysisWorker] Race condition detected, ignoring second job');
             return;
          }
          isProcessingRef.current = true;
          console.info(`[useAnalysisWorker] === STARTING JOB: ${job.id} ===`);

          // Start heartbeat
          heartbeatId = setInterval(() => {
            sendHeartbeat(job.id).catch(err => console.error('[useAnalysisWorker] Heartbeat failed:', err));
          }, HEARTBEAT_INTERVAL);

          try {
            await processJob(job.id, job.gameId);
            console.info(`[useAnalysisWorker] === FINISHED JOB: ${job.id} ===`);
          } catch (processError) {
            const errorMsg = processError instanceof Error ? processError.message : String(processError);
            console.error(`[useAnalysisWorker] !!! JOB FAILED: ${job.id} !!!`, errorMsg);
            await reportFailure(job.id, errorMsg).catch(err => console.error('[useAnalysisWorker] Failed to report failure:', err));
          } finally {
            if (heartbeatId) {
                clearInterval(heartbeatId);
                heartbeatId = null;
            }
            isProcessingRef.current = false;
          }
        } else {
          console.log('[useAnalysisWorker] No jobs available', job);
        }
      } catch (error) {
        console.error('[useAnalysisWorker] Polling error:', error);
      }

      timeoutId = setTimeout(poll, POLLING_INTERVAL);
    };

    const processJob = async (reviewId: string, gameId: string) => {
      console.log(`[useAnalysisWorker] [${reviewId}] Step 1: Fetching moves...`);
      const moves = await getMoves(gameId);
      const totalMoves = moves.length;
      console.log(`[useAnalysisWorker] [${reviewId}] Step 2: Found ${totalMoves} moves`);
      
      const analyses: MoveAnalysis[] = [];
      const chess = new Chess();

      const getNumericEval = (pv: { cp?: number; mate?: number } | undefined, isWhiteTurn: boolean) => {
        if (!pv) return 0;
        if (pv.mate !== undefined) {
          // Absolute evaluation: Positive is better for the player whose turn it is in the PV result
          // But Stockfish returns mate from the perspective of the side to move.
          // We want to normalize this so Positive is always White advantage.
          const mateValue = pv.mate > 0 ? 10000 - pv.mate : -10000 - pv.mate;
          return isWhiteTurn ? mateValue : -mateValue;
        }
        return isWhiteTurn ? (pv.cp ?? 0) : -(pv.cp ?? 0);
      };

      // Analyze each move
      for (let i = 0; i < totalMoves; i++) {
        const move = moves[i];
        const beforeFen = chess.fen();
        const isWhiteToMove = beforeFen.split(' ')[1] === 'w';
        
        console.log(`[useAnalysisWorker] [${reviewId}] Step 3: Analyzing move ${i + 1}/${totalMoves} (${move.move})`);
        
        const result = await analysisWorkerRef.current!.analyzePosition(beforeFen, 18, 3);
        
        // Safe result handling
        const topPV = result.pvs[0];
        if (!topPV) {
            console.warn(`[useAnalysisWorker] [${reviewId}] No engine PVs for position: ${beforeFen}`);
            analyses.push({
                moveNumber: move.moveNumber,
                playerColor: move.playerColor,
                classification: 'good',
                evaluation: 0,
                bestLine: ''
            });
            continue;
        }

        // Find if played move is in top PVs
        let movePV = result.pvs.find(p => p.pv.startsWith(move.move));
        
        // If move is NOT in top 3, we MUST evaluate it specifically to get its real score
        if (!movePV) {
            console.log(`[useAnalysisWorker] [${reviewId}] Move ${move.move} not in top 3, performing dedicated evaluation...`);
            const chessTemp = new Chess(beforeFen);
            try {
                chessTemp.move(move.move);
                const afterFen = chessTemp.fen();
                
                // Analyze the position AFTER the move
                const afterResult = await analysisWorkerRef.current!.analyzePosition(afterFen, 18, 1);
                const afterTopPV = afterResult.pvs[0];
                
                // The eval for the move (from perspective of side to move in beforeFen)
                // is the negative of the eval of the resulting position (from perspective of side to move in afterFen)
                let afterCp = 0;
                if (afterTopPV) {
                    if (afterTopPV.mate !== undefined) {
                        afterCp = afterTopPV.mate > 0 ? 10000 - afterTopPV.mate : -10000 - afterTopPV.mate;
                    } else {
                        afterCp = afterTopPV.cp ?? 0;
                    }
                }
                
                movePV = { cp: -afterCp, pv: move.move, multipv: 0, depth: 18 };
            } catch (e) {
                console.warn(`[useAnalysisWorker] [${reviewId}] Failed to evaluate custom move:`, e);
                movePV = topPV; // Fallback
            }
        }

        const moveEval = getNumericEval(movePV, isWhiteToMove); 
        const bestMoveEval = getNumericEval(topPV, isWhiteToMove);
        
        const classification = ClassificationEngine.classify({
            beforeEval: 0,
            bestMoveEval: bestMoveEval / 100,
            moveEval: moveEval / 100,
            isBestMove: result.bestMove === move.move || topPV.pv.startsWith(move.move)
        });

        analyses.push({
          moveNumber: move.moveNumber,
          playerColor: move.playerColor,
          classification,
          evaluation: moveEval / 100,
          bestLine: topPV.pv
        });

        // Report progress
        await updateProgress(reviewId, i + 1, totalMoves);

        // Also update chess instance for next iteration
        chess.move(move.move);
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
