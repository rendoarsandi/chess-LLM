# Implementation Plan - Stockfish Evaluation & Intelligence Fixes

## Phase 1: Core Logic & Evaluation Polarity
Fix the fundamental coordinate/perspective errors where evaluations and mates are attributed to the wrong player.

- [x] Task: Update `EngineEvaluation` interface to include `sideToMove` context. 68cfccc
- [x] Task: Modify `StockfishWorker.ts` to parse the side to move from FEN and normalize scores to "White-relative" (CP > 0 = White advantage). 3d6f41b
- [x] Task: Update `AdvantageBar.tsx` to handle normalized scores and fix the mate display logic. 3a0c5f0
- [ ] Task: Write unit tests in `StockfishWorker.test.ts` to verify polarity for specific FENs (e.g., Black winning positions).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Polarity' (Protocol in workflow.md)

## Phase 2: Search Optimization (Server-side Bot)
Improve the intelligence and speed of the `StockfishPlayer` bot by managing state more effectively.

- [ ] Task: Refactor `StockfishPlayer.ts` to maintain a persistent UCI session across a game (remove per-move `ucinewgame`).
- [ ] Task: Increase `Hash` and `Threads` configuration for the server-side Stockfish process.
- [ ] Task: Implement `movetime` as a fallback or primary limit to ensure consistent move delivery.
- [ ] Task: Add logging to `StockfishPlayer.ts` to monitor engine depth and search time in real-time.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Intelligence' (Protocol in workflow.md)

## Phase 3: UI/UX & Reliability
Ensure the frontend evaluation is stable and reflects the true engine state without ghosting.

- [ ] Task: Refactor `useStockfish.ts` to properly clear stale variations and handle engine restarts gracefully.
- [ ] Task: Optimize the debounce timing in `useStockfish.ts` to balance responsiveness and CPU usage.
- [ ] Task: Verify that "free piece" captures are correctly reflected in the `AdvantageBar` after the move is made.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Stability' (Protocol in workflow.md)
