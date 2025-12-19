# Implementation Plan: Stockfish Advantage Bar

This plan outlines the steps to integrate a client-side Stockfish evaluation bar into the ChessLLM dashboard.

## Phase 1: Stockfish Integration (Engine Layer)
- [x] Task: Research and download compatible Stockfish WASM/WebWorker assets.
- [x] Task: Create `client/src/lib/stockfish/` directory for engine assets.
- [x] Task: Implement `StockfishWorker` wrapper class to manage engine lifecycle (load, start, stop, message parsing).
- [x] Task: Write tests for `StockfishWorker` to verify FEN parsing and evaluation output handling.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Stockfish Integration' (Protocol in workflow.md)

## Phase 2: React State & Logic (Service Layer)
- [ ] Task: Create `useStockfish` hook to manage engine state (evaluation, depth, mate status).
- [ ] Task: Implement logic to trigger evaluation on FEN changes with a 2-second timeout.
- [ ] Task: Write tests for `useStockfish` hook using `chess.js` positions to verify state updates.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: React State & Logic' (Protocol in workflow.md)

## Phase 3: UI Components (Presentation Layer)
- [ ] Task: Create `AdvantageBar` component with vertical layout and dynamic height transitions.
- [ ] Task: Implement numerical score and mate display within or beside the bar.
- [ ] Task: Implement depth indicator UI.
- [ ] Task: Integrate `AdvantageBar` into the main `App` layout, positioned to the left of `Chessboard`.
- [ ] Task: Write tests for `AdvantageBar` to ensure correct rendering of scores (+/-) and mate values.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Components' (Protocol in workflow.md)

## Phase 4: Refinement & Mobile Optimization
- [ ] Task: Ensure the advantage bar layout is responsive (narrower or hidden on small screens if necessary).
- [ ] Task: Add smooth CSS transitions for the bar height changes.
- [ ] Task: Final pass on styling to match Chess.com/Lichess aesthetics (Shadcn/Tailwind).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Refinement & Mobile Optimization' (Protocol in workflow.md)
