# Track Specification: Stockfish Advantage Bar

## Overview

Integrate a client-side Stockfish engine (WASM) to provide real-time position evaluation. The evaluation will be displayed as a vertical advantage bar positioned to the left of the chessboard, mimicking the experience of popular platforms like Chess.com.

## Functional Requirements

- **Client-Side Engine:** Run Stockfish in the browser using WebAssembly (WASM) and WebWorkers to ensure UI responsiveness.
- **Real-time Evaluation:** Trigger engine analysis whenever the board position changes (new moves or history navigation).
- **Fixed-Time Analysis:** Limit engine analysis to 2 seconds per move to provide quick feedback while preserving device battery and performance.
- **Advantage Bar UI:**
  - **Visual Bar:** A vertical bar that shifts height to represent the balance of power between White and Black.
  - **Numerical Display:** Show the evaluation score (e.g., `+1.5` or `-0.8`).
  - **Mate Detection:** Display `M` followed by the number of moves to mate when a forced sequence is found.
  - **Depth Indicator:** Show the current analysis depth reached by the engine within the time limit.
- **Positioning:** The bar must be located vertically to the left of the chessboard.

## Technical Constraints

- **WASM Support:** Stockfish must be loaded as a WASM module.
- **Worker Thread:** Analysis must happen in a separate WebWorker thread.
- **React Integration:** The evaluation state must be managed within the React component tree to update the UI efficiently.

## Acceptance Criteria

- [ ] Stockfish engine successfully loads and initializes in the client.
- [ ] Making a move on the board triggers a new evaluation.
- [ ] The advantage bar updates its height and colors dynamically.
- [ ] Numerical scores and depth are visible to the user.
- [ ] Forced mates are clearly identified (e.g., "M3").
- [ ] The bar remains responsive and correctly aligned on mobile and desktop views.

## Out of Scope

- Server-side persistence of evaluations (evaluations are strictly local/temporary).
- Multi-engine selection (Stockfish is the sole engine).
- Full engine line analysis (only the main evaluation is shown).
