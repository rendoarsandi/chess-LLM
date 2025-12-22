# Implementation Plan - Client-Side Stockfish "Durable Object" Simulation

## Phase 1: Client-Side Dual Worker Architecture
*   [x] Task: Refactor Stockfish Worker Management ba7f067
    *   [x] Create `StockfishPlayerService.ts` to manage the specialized "Player Worker" instance (distinct from the existing hook used for analysis).
    *   [x] Implement method `calculateMove(fen: string, depth: number): Promise<string>` that resolves when the worker returns `bestmove`.
    *   [x] Ensure proper cleanup/termination of this second worker when the component unmounts.
*   [x] Task: Test Dual Worker Concurrency b87e316
    *   [x] Create a temporary test component that runs both the existing `useStockfish` (Analysis) and the new `StockfishPlayerService` simultaneously.
    *   [x] Verify that the Analysis evaluation bar keeps updating while the Player service is calculating a move.
*   [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: WebSocket Protocol Expansion
*   [ ] Task: Update Client WebSocket Types
    *   [ ] Extend `SocketMessage` type in `useGameSocket.ts` to include `REQUEST_MOVE` payload.
    *   [ ] Define `ClientMessage` types for `SUBMIT_MOVE` to ensure type safety when sending data back to server.
*   [ ] Task: Update Server WebSocket Handling
    *   [ ] Modify `game-loop.service.ts` (or relevant socket handler) to emit `REQUEST_MOVE` instead of performing internal/HTTP-based move generation when the player provider is 'stockfish'.
    *   [ ] Add a listener/handler for `SUBMIT_MOVE` messages from the client.
    *   [ ] Validate that the move received matches the current game state and player turn.
*   [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Integration & Game Loop
*   [ ] Task: Implement Client-Side Command Handler
    *   [ ] In `useGameSocket.ts` (or a new `useGameBot.ts` hook), listen for `REQUEST_MOVE`.
    *   [ ] When triggered, call `StockfishPlayerService.calculateMove`.
    *   [ ] Upon result, emit `SUBMIT_MOVE` back to the server.
*   [ ] Task: Server Game Loop Refactor
    *   [ ] Update the `GameManager` or `GameLoopService` to support the "Async Wait" state for Stockfish players (waiting for socket response rather than immediate function return).
    *   [ ] Ensure the Alarm/Timeout system correctly flags the game if `SUBMIT_MOVE` never arrives.
*   [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: End-to-End Verification
*   [ ] Task: "Bot vs Bot" Manual Test
    *   [ ] Start a game with White=Stockfish(Client) and Black=Stockfish(Client).
    *   [ ] Verify the game plays out automatically move-by-move.
    *   [ ] Verify performance (no UI lag).
*   [ ] Task: Cleanup
    *   [ ] Remove any temporary test components.
    *   [ ] Ensure logging is appropriate (debug level).
*   [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
