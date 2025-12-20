# Implementation Plan: Stockfish Advantage Bar

This plan outlines the steps to integrate a client-side Stockfish evaluation bar into the ChessLLM dashboard.

## Phase 1: Stockfish Integration (Engine Layer) [checkpoint: e32cbb7]
- [x] Task: Research and download compatible Stockfish WASM/WebWorker assets.
- [x] Task: Create `client/src/lib/stockfish/` directory for engine assets.
- [x] Task: Implement `StockfishWorker` wrapper class to manage engine lifecycle (load, start, stop, message parsing).
- [x] Task: Write tests for `StockfishWorker` to verify FEN parsing and evaluation output handling.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Stockfish Integration' (Protocol in workflow.md)

## Phase 2: React State & Logic (Service Layer) [checkpoint: 9a7ee8f]
- [x] Task: Create `useStockfish` hook to manage engine state (evaluation, depth, mate status).
- [x] Task: Implement logic to trigger evaluation on FEN changes with a 2-second timeout.
- [x] Task: Write tests for `useStockfish` hook using `chess.js` positions to verify state updates.
- [x] Task: Conductor - User Manual Verification 'Phase 2: React State & Logic' (Protocol in workflow.md)

## Phase 3: UI Components (Presentation Layer) [checkpoint: 8fa5d59]
- [x] Task: Create `AdvantageBar` component with vertical layout and dynamic height transitions.
- [x] Task: Implement numerical score and mate display within or beside the bar.
- [x] Task: Implement depth indicator UI.
- [x] Task: Integrate `AdvantageBar` into the main `App` layout, positioned to the left of `Chessboard`.
- [x] Task: Write tests for `AdvantageBar` to ensure correct rendering of scores (+/-) and mate values.
- [x] Task: Conductor - User Manual Verification 'Phase 3: UI Components' (Protocol in workflow.md)

## Phase 4: Refinement & Mobile Optimization
- [x] Task: Remove Debug Tools (ErrorOverlay, hardwired HTML reporter, and verbose console logs).
- [x] Task: Ensure the advantage bar layout is responsive (narrower or hidden on small screens if necessary).
- [x] Task: Add smooth CSS transitions for the bar height changes.
- [x] Task: Final pass on styling to match Chess.com/Lichess aesthetics (Shadcn/Tailwind).
- [x] Task: Conductor - User Manual Verification 'Phase 4: Refinement & Mobile Optimization' (Protocol in workflow.md)
