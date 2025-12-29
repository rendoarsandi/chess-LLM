# Specification: Distributed Game Review System

## 1. Overview

This feature implements a "Game Review" system similar to major chess platforms (Chess.com, Lichess), but leverages a distributed, client-side processing model to minimize server costs. When a user requests a review, the server manages the request state. If the game has already been reviewed, the results are served immediately. If not, the request is queued. Connected clients (acting as "workers") pick up these jobs, execute the Stockfish analysis locally to a specific depth (e.g., depth 20) using Multi-PV, classify the moves (Brilliant, Blunder, etc.), and submit the structured results back to the server for persistent storage.

## 2. Functional Requirements

### 2.1 Server-Side (Coordination & Storage)

- **Job Queue Management:**
  - Maintain a queue of games waiting for analysis.
  - Track the status of each game: `Not Reviewed`, `Queued`, `Processing`, `Completed`, `Failed`.
  - **Heartbeat/Timeout Mechanism:**
    - When a worker picks up a job, the status becomes `Processing`.
    - The worker must send a "heartbeat" (e.g., every 2 seconds) to confirm they are still working.
    - If the server misses a heartbeat (user disconnects, closes tab), the job is released back to the `Queued` state for another worker to pick up immediately.
- **API Endpoints:**
  - `POST /api/games/:id/review`: Request a review for a game.
  - `GET /api/games/:id/review/status`: specific endpoint to poll/stream status (or use WebSocket).
  - `POST /api/worker/job`: (For Workers) Request a pending job from the queue.
  - `POST /api/worker/heartbeat`: (For Workers) Signal continued activity.
  - `POST /api/worker/submit`: (For Workers) Submit the results of a completed analysis.
- **Data Storage (Relational):**
  - Store move-by-move analysis in a structured format (e.g., `analysis_moves` table linked to `games`).

### 2.2 Client-Side (Worker & Visualization)

- **Analysis Worker Logic:**
  - Capability to request a job from the server.
  - Run Stockfish (WASM) locally on the browser.
  - **Heartbeat:** Send a heartbeat signal every 2 seconds while processing.
  - **Configuration:** Analysis must run to a fixed depth (e.g., Depth 20) and use Multiple Principal Variations (Multi-PV) to find alternative lines.
  - **Classification Engine:** Translate raw Stockfish evaluations (centipawn loss, win rate changes) into categories:
    - **Brilliant (!!):** Sacrifice that leads to a winning position.
    - **Great Move (!):** Only winning move or significant advantage.
    - **Best Move (★):** Top engine line.
    - **Excellent (Thumbs Up):** Nearly as good as best.
    - **Good (Checkmark):** Maintains position.
    - **Book Move (📖):** Established opening theory.
    - **Inaccuracy (?!):** Slight loss of advantage.
    - **Mistake (?):** Significant loss of advantage.
    - **Blunder (??):** Turns win/draw into loss.
    - **Miss (X):** Missed tactical opportunity.
- **User Interface (Requester):**
  - **Status Indicators:** Display "Analyzing..." spinner or progress bar.
  - **Real-time Updates:** Show progress (e.g., "Analyzing move 12/35") if possible.
  - **Result View:** Once complete, overlay the move classifications (icons) on the move list and board.

## 3. Non-Functional Requirements

- **Robustness:** The system must gracefully handle worker disconnections. Jobs should not be "stuck" in `Processing` state indefinitely.
- **Scalability:** The system must handle multiple concurrent workers without race conditions.
- **Performance:** Client-side analysis should not freeze the UI (run in a Web Worker).

## 4. Acceptance Criteria

- [ ] A user can request a review for a finished game.
- [ ] If the review exists, it loads instantly from the database.
- [ ] If not, the status shows "Queued" or "Processing" with a progress indicator.
- [ ] A client picks up the job and runs Stockfish to Depth 20 + Multi-PV.
- [ ] **Recovery:** If the processing client disconnects (simulated by closing tab), the job becomes available for another client within a short timeout window (e.g., >5 seconds).
- [ ] Moves are correctly classified (Brilliant, Blunder, etc.).
- [ ] Results are saved to the database.

## 5. Out of Scope

- Server-side Stockfish analysis (fallback is not required for MVP).
- "Coach" persona text generation (natural language explanation is a separate feature).
