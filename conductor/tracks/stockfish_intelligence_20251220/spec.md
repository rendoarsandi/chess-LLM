# Track Spec: Stockfish Evaluation & Search Intelligence Fixes

## Overview
Address critical issues in Stockfish engine integration where evaluations are displayed with incorrect polarity (perspective error), and the engine's playing strength is severely hampered by state management issues and inefficient search parameters.

## Functional Requirements

### 1. Correct Evaluation Polarity (Perspective Fix)
- **Engine Logic:** Modify `StockfishWorker.ts` and `AdvantageBar.tsx` to account for the "side to move" in the FEN.
- **Display:** Ensure that if it is Black's turn, a positive score from Stockfish is correctly interpreted as an advantage for Black.
- **Mate Detection:** Fix the "False Mate" bug where a mate for Black is reported as a mate for White.

### 2. Search Optimization & Intelligence
- **State Persistence:** Remove redundant `ucinewgame` calls in `StockfishPlayer.ts` and `StockfishWorker.ts`. The engine should maintain its hash/history across moves in the same game.
- **Engine Settings:** 
    - Increase `Hash` to 64MB or 128MB (system permitting) to improve search efficiency.
    - Implement basic time management (e.g., `movetime` vs `depth`) to prevent 20s+ delays on obvious moves.
- **MultiPV Reliability:** Ensure MultiPV lines are correctly sorted and cleared when a new position is loaded to prevent "ghost" lines from previous moves.

### 3. Opening & Tactical Plan Improvements
- **Syzygy/Opening Support (Optional):** Ensure the engine isn't restricted by low-level skill settings if depth is requested.
- **Move Selection:** Improve the `StockfishPlayer` implementation to use `go depth X` more effectively or switch to `go movetime X` for more consistent response times.

## Acceptance Criteria
- [ ] Evaluations in the `AdvantageBar` correctly reflect the material state regardless of whose turn it is.
- [ ] A mate for Black is displayed as a negative mate (e.g., M-1) and correctly colors the bar.
- [ ] Stockfish response time for depth 15-17 is reduced to under 5-10 seconds for typical positions.
- [ ] The engine no longer misses "free piece" captures that are obvious at the requested depth.

## Out of Scope
- Implementing a full opening book (Polyglot).
- Moving Stockfish to a server-side cluster (remaining on local/worker for now).
