# Implementation Plan - Stockfish Evaluation & Intelligence Fixes

## Phase 1: Core Logic & Evaluation Polarity [checkpoint: 9f6d067]
Fix the fundamental coordinate/perspective errors where evaluations and mates are attributed to the wrong player.

- [x] Task: Update `EngineEvaluation` interface to include `sideToMove` context. 68cfccc
- [x] Task: Modify `StockfishWorker.ts` to parse the side to move from FEN and normalize scores to "White-relative" (CP > 0 = White advantage). 3d6f41b
- [x] Task: Update `AdvantageBar.tsx` to handle normalized scores and fix the mate display logic. 3a0c5f0
- [x] Task: Write unit tests in `StockfishWorker.test.ts` to verify polarity for specific FENs (e.g., Black winning positions). 3d6f41b
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Polarity' (Protocol in workflow.md)

## Phase 2: Search Optimization (Server-side Bot)
Improve the intelligence and speed of the `StockfishPlayer` bot by managing state more effectively.

- [x] Task: Refactor `StockfishPlayer.ts` to maintain a persistent UCI session across a game (remove per-move `ucinewgame`). 1b889e1
- [x] Task: Increase `Hash` and `Threads` configuration for the server-side Stockfish process. 1b889e1
- [x] Task: Implement `movetime` as a fallback or primary limit to ensure consistent move delivery. 1b889e1
- [ ] Task: Add logging to `StockfishPlayer.ts` to monitor engine depth and search time in real-time.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Intelligence' (Protocol in workflow.md)

## Phase 3: Frontend Stability & WASM Reliability
Address the "function signature mismatch" and improve evaluation responsiveness.

- [~] Task: Refactor `StockfishWorker.ts` to implement a "Busy/Ready" state machine that waits for `bestmove` after `stop` before sending new commands.
- [ ] Task: Implement a cancellation token or "Generation ID" in `StockfishWorker.ts` to ignore stale evaluation messages from previous FENs.
- [ ] Task: Increase debounce and add a "Loading/Thinking" indicator to the UI to prevent rapid re-triggering.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: WASM Stability' (Protocol in workflow.md)

## Phase 4: UI/UX & Reliability (Merged)
Ensure the frontend evaluation is stable and reflects the true engine state without ghosting.

- [ ] Task: Refactor `useStockfish.ts` to properly clear stale variations and handle engine restarts gracefully.
- [ ] Task: Optimize the debounce timing in `useStockfish.ts` to balance responsiveness and CPU usage.
- [ ] Task: Verify that "free piece" captures are correctly reflected in the `AdvantageBar` after the move is made.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Frontend Stability' (Protocol in workflow.md)
